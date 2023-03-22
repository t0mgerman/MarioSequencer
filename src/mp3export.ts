import { SoundEntity } from "./sound";
import { App, InstrumentChordRecord, MarioSequencerSong, Mp3UpdateEvent } from "app.types";
import { MarioSequencer } from "app";

/* 
    This file handles Audio Export for the sequencer. 
    Important information to consider:

    Framerate of is assumed 60fps
    TEMPO is in BPM (beats per min)

    1 frame = 1/ 60
    Beats per Second = TEMPO / 60
    Seconds per each beat = 60 / TEMPO

*/

/**
 * Not currently used but can be used to get the duration of an AudioBufferSourceNode
 * @param sourceNode AudioBufferSourceNode (must have buffer set to return a duration)
 * @returns Duration in seconds
 */
function getSourceNodeDuration(sourceNode: AudioBufferSourceNode): number {
  const { buffer, playbackRate } = sourceNode;
  if (!buffer) return 0;
  return buffer.length / (buffer.sampleRate * playbackRate.value);
}

/**
 * Converts an array of notes encoded with instrument and scale information to a dictionary-style list of instruments and notes to be played
 * @param beatNotes A note array representing a single beat from the score
 * @returns A dictionary-like object where key is the instrument number, and value is an array of notes to be played at the same time
 */
function beatToInstrumentChords(beatNotes: (string | number)[]) {
  const beatChords: InstrumentChordRecord = {};
  beatNotes.forEach((note, i) => {
    if (typeof note === "string") return;
    const instrumentNum = note >> 8;
    const noteValue = note & 0xFF;
    if (!beatChords[instrumentNum]) {
      beatChords[instrumentNum] = [noteValue];
    } else {
      beatChords[instrumentNum].push(noteValue);
    }
  });
  return beatChords;
}

/**
 * Generates a silent AudioBuffer at a specific length, used to 
 * insert silence in to the generated audio when no notes are played on a given beat
 * @param context AudioContext to be used to generate silence
 * @param durationInSeconds Duration of silence
 * @returns Silent AudioBuffer for the duration specified
 */
function createSilentBuffer(context: OfflineAudioContext, durationInSeconds: number): AudioBuffer {
  const buffer = context.createBuffer(1, durationInSeconds * context.sampleRate, context.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      data[i] = 0; // Set all samples to 0 (silence)
    }
  }
  return buffer;
}

/**
 * Generates chords for instruments that are played on each beat, outputting them to an AudioBuffer using OfflineAudioContext 
 * @param sounds Sounds loaded by the app
 * @param chords Object containing the notes played simultaneously by each instrument on each beat
 * @param lengthInSecs Duration that sound should play for (varies by song Tempo)
 * @returns AudioBuffer for an entire song beat
 */
async function getChordBuffer(app: MarioSequencer, chords: InstrumentChordRecord, nextChords: InstrumentChordRecord, lengthInSecs: number, beatCount: number, totalBeats: number) {

  const { SOUNDS: sounds } = app.ASSETS;

  // Before we generate any sounds for the current beat
  // we need to know if the next beat is silent or not. 
  // Instrument samples can be longer than the time available, if
  // they are allowed to play in to the next beat it can sound messy,
  // but if we cut them off and nothing plays on the next beat
  // that's jarring too. 

  /** 
   * Reducer function to transform an Instrument Chord dictionary
   * in to an array of unique notes played on the current/next beat
   */
  const reduceNotes = (chordObj: InstrumentChordRecord) => {
    return (prev: number[], cur: string, idx: number, arr: string[]) => {
      const instrumentNotes = chordObj[parseInt(cur, 10)];
      instrumentNotes.forEach((note) => {
        if (prev.indexOf(note) < 0) prev.push(note);
      });
      return prev;
    };
  }
  const notes = Object.keys(chords).reduce(reduceNotes(chords), [] as number[]);
  const nextNotes = Object.keys(nextChords).reduce(reduceNotes(nextChords), [] as number[]);

  // By default we will restrict the length of all sounds on this beat
  // to the correct length for TEMPO
  let restrictLength = true;

  // If the next beat is a rest beat, we can let current samples
  // play out fully
  notes.forEach((note) => {
    if (nextNotes.length === 0) {
      restrictLength = false;
    }
  });

  // Get a reference to all instrument sounds needed for this beat
  const instrumentNums = Object.keys(chords).map((i) => parseInt(i, 10));
  let longestSound: number = 0;
  const buffers: Record<number, AudioBuffer> =
    instrumentNums.reduce((prev, cur, idx, arr) => {
      const instrumentBuffer = sounds[cur].buffer;
      if (instrumentBuffer && instrumentBuffer.duration > longestSound) longestSound = instrumentBuffer.duration;
      if (instrumentBuffer && !prev[cur]) prev[cur] = instrumentBuffer;
      return prev;
    }, {} as Record<number, AudioBuffer>);

  // Setup AudioContext at set duration
  const context = new OfflineAudioContext(2, 44100 * (restrictLength ? lengthInSecs : longestSound), 44100);
  context.addEventListener("complete", (ev) => {
    const evt = new Event("mp3update") as Mp3UpdateEvent;
    evt.data = {
      type: "chordGenUpdate",
      value: beatCount / totalBeats
    }
    app.container.dispatchEvent(evt);
  });
  const destination = context.destination;
  const semitoneRatio = Math.pow(2, 1 / 12);
  const diff = [14, 12, 11, 9, 7, 6, 4, 2, 0, -1, -3, -5, -6];

  // for each instrument
  instrumentNums.forEach((instrumentNum) => {
    const notes = chords[instrumentNum];

    // for each note, add an audio source
    // the instrument pitched to the right note 
    notes.forEach((note) => {
      const source = context.createBufferSource();
      const scale = note & 0x0F;
      let semitone = diff[scale];
      if ((note & 0x80) != 0) semitone++;
      else if ((note & 0x40) != 0) semitone--;
      source.buffer = buffers[instrumentNum];
      source.playbackRate.value = Math.pow(semitoneRatio, semitone);
      source.connect(destination);
      source.start(0);

      // If any instrument in the next beat plays this same note,
      // we need to silence this note at the correct time
      // if (nextNotes.indexOf(note) >= 0) {
      //   source.stop(Math.ceil(lengthInSecs));
      // }
    });
  });

  // return this chord
  return await context.startRendering();
}

/**
 * Exports a Mario Paint Sequencer song to MP3. Does not currently support dynamic Tempo changes that may be present in some MSQ files.
 * @param worker A reference to the web worker
 * @param sounds Instrument sounds currently loaded by the app
 * @param tempo The song Tempo
 * @param score The song itself. An array of beats, each containing an array of instrument notes.
 */
export async function songToAudio(app: MarioSequencer) {
  const { curScore: song } = app.appState;
  const { notes: score, end, tempo } = song;

  // Setup timing (examples in comments)
  const bps = Number(tempo) / 60; // 287bpm / 60 = 4.7833333333
  const noBeats = end; // 96 beats
  const seconds = noBeats / bps; // ~20 seconds
  const singleBeatSeconds = seconds / noBeats; // ~.208 seconds for a single beat

  // OfflineAudioContext to generate sound buffer without outputting to speakers
  const context = new OfflineAudioContext(2, 44100 * seconds, 44100);
  
  // In order to fake a progress-like event for the OfflineAudioContext renderer
  // we can tell it to suspend for every 2 seconds of audio rendering
  // and use the onstatechange to post back rendering progress to the page
  for (let i = 0; i < seconds; i += 2) {
    context.suspend(i);
  }
  context.onstatechange = function (e: Event) {
    if (context.state === "suspended") {
      const evt = new Event("mp3update") as Mp3UpdateEvent;
      evt.data = {
        type: "songProgressUpdate",
        value: context.currentTime / seconds
      };
      app.container.dispatchEvent(evt);
      context.resume();
    }
  }
  // When this fires, rendering is complete but the page still has to 
  // generate a Blob URL and attach the Audio element to the page
  context.oncomplete = function (e: Event) {
    const evt = new Event("mp3update") as Mp3UpdateEvent;
      evt.data = {
        type: "songProgressUpdate",
        value: 1
      };
      app.container.dispatchEvent(evt);
  }
  const destination = context.destination;

  const chords = score.map((beat) => beatToInstrumentChords(beat));

  // For each beat, merge all chords / instrument sounds, or 
  // play silence if necessary
  for (let i = 0; i < end; i++) {
    const beat = score[i];

    let beatBuffer: AudioBuffer;
    if (beat.length === 0) {
      // No notes, output silence
      //beatBuffer = createSilentBuffer(context, singleBeatSeconds);
      continue;
    } else {
      // Get merged AudioBuffer representing all sounds played on this beat
      beatBuffer = await getChordBuffer(app, chords[i], chords[i + 1], singleBeatSeconds, i + 1, end);
    }

    // Create source node
    const source = context.createBufferSource();
    source.buffer = beatBuffer;
    source.connect(destination);

    // Set timing of this beat / sound and output
    source.start(i * singleBeatSeconds);
  }

  // Output all beats to a single song AudioBuffer
  const songBuffer = await context.startRendering();

  // Generate MP3 as Blob URL
  const blob = new Blob([await audioBufferToMp3(songBuffer)], { type: 'audio/mp3' });
  const url = URL.createObjectURL(blob);

  return url;
}

/**
 * LameJS' Mp3Encoder.encodeBuffer method expects each channel to be of type Int16Array. 
 * AudioBuffer.getChannelData returns Float32Array. This method can be used to convert between the two.
 * @param buffer Float32Array returned by AudioBuffer.getChannelData
 * @returns Int16Array suitable for Mp3Encoder.encodeBuffer
 */
function convertFloat32ToInt16(buffer: Float32Array): Int16Array {
  const int16Buffer = new Int16Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    const floatVal = buffer[i];
    const intVal = floatVal * 0x7fff; // convert float to signed 16-bit integer
    int16Buffer[i] = intVal < 0 ? intVal + 0x10000 : intVal; // handle two's complement representation
  }
  return int16Buffer;
}

/**
 * Given an AudioBuffer object, returns an MP3 Blob object
 * @param audioBuffer Song in AudioBuffer format
 * @returns Mp3 Blob
 */
function audioBufferToMp3(audioBuffer: AudioBuffer): Promise<Blob> {
  return new Promise(async (resolve) => {
    // Lazy load LameJS to save on bundle size
    const ljs = await import("lamejs");

    const mp3Encoder = new ljs.Mp3Encoder(audioBuffer.numberOfChannels, audioBuffer.sampleRate, 128);
    const samples = convertFloat32ToInt16(audioBuffer.getChannelData(0)).length;
    const sampleBlockSize = 1152; // This value is fixed in the MP3 format
    const mp3Data: Int8Array[] = [];

    // Iterate through all samples, pushing an encoded stereo buffer to the mp3Data array 
    for (let i = 0; i < samples; i += sampleBlockSize) {
      const left = convertFloat32ToInt16(audioBuffer.getChannelData(0)).subarray(i, i + sampleBlockSize);
      const right = audioBuffer.numberOfChannels === 2 ? convertFloat32ToInt16(audioBuffer.getChannelData(1)).subarray(i, i + sampleBlockSize) : left;
      const mp3Block = mp3Encoder.encodeBuffer(left, right);
      if (mp3Block.length > 0) {
        mp3Data.push(mp3Block);
      }
    }

    // Convert to Blob
    const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
    resolve(mp3Blob);
  });
}