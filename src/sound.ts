import { MarioSequencer } from "./app";
import { IMarioSequencerProps } from "./app.types";

interface ISoundEntity {
    play(scale: number, delay: number): void;
    playChord(noteList: number[], delay: number): void;
    load(): void;
}

export class SoundEntity implements ISoundEntity {
    private AC: AudioContext;
    private app: MarioSequencer;
    private path: string;
    public buffer: AudioBuffer | null;
    private prevChord: any[];
    private diff: number[];
    private settings: IMarioSequencerProps;
    public image: HTMLImageElement | null = null;
    
    constructor(app: MarioSequencer, settings: IMarioSequencerProps, path: string) {
        this.app = app;
        this.AC = app.AC;
        this.path = path;
        this.buffer = null;
        this.prevChord = [];
        this.diff = [14, 12, 11, 9, 7, 6, 4, 2, 0, -1, -3, -5, -6];
        this.settings = settings;
    }

    /**
     * Plays a note at a given playback rate
     * @param scale Determines the note that will be played
     * @param delay Delay before note is played
     */
    public play(scale: number, delay?: number) {
        var source = this.AC.createBufferSource();
        var tmps = scale & 0x0F;
        var semitone = this.diff[tmps];
        if ((scale & 0x80) != 0) semitone++;
        else if ((scale & 0x40) != 0) semitone--;
        if (delay == undefined) delay = 0;
        source.buffer = this.buffer;
        source.playbackRate.value = Math.pow(this.settings.SEMITONERATIO, semitone);
        source.connect(this.AC.destination);
        if (this.app.MSDestination) source.connect(this.app.MSDestination);
        source.start(delay);
    }

    /**
     * Play a chord
     * In fact, can be a single note.
     * Purpose is to cancel the sounds in previous bar
     * if the kind of note is the same.
     * Even the chord will be canceled (stoped) playing
     * SNES has channels limit, so that succesive notes
     * cancels previous note when next note comes.
     * Long note like Yoshi can be canceled often
     * BufferSource.stop won't throw an error even if the
     * previous note has already ended.
     * @param noteList 
     * @param delay 
     */
    public playChord(noteList: number[], delay?: number) {
        // Cancel previous chord first
        for (var i = 0; i < this.prevChord.length; i++) {
            this.prevChord[i].stop();
        }
        this.prevChord = [];
        if (delay == undefined) delay = 0;
        // I heard that Array#map is slower than for loop because of costs of calling methods.
        for (var i = 0; i < noteList.length; i++) {
            var source = this.AC.createBufferSource();
            var scale = (noteList[i] & 0x0F);
            var semitone = this.diff[scale];
            if ((noteList[i] & 0x80) != 0) semitone++;
            else if ((noteList[i] & 0x40) != 0) semitone--;
            source.buffer = this.buffer;
            source.playbackRate.value = Math.pow(this.settings.SEMITONERATIO, semitone);
        
            // Compressor: Suppress harsh distortions
            //var compressor = AC.createDynamicsCompressor();
            //source.connect(compressor);
            //compressor.connect(AC.destination);
            source.connect(this.AC.destination);
            if (this.app.MSDestination) source.connect(this.app.MSDestination);
            source.start(delay);
            this.prevChord.push(source);
        }
    }

    public load() {
        var filepath = this.path;
        return new Promise<AudioBuffer>((resolve, reject) => {
            // Load buffer asynchronously
            var request = new XMLHttpRequest();
            request.open("GET", filepath, true);
            request.responseType = "arraybuffer";
        
            request.onload = () => {
                // Asynchronously decode the audio file data in request.response
                this.AC.decodeAudioData(
                    request.response,
                    function(buffer) {
                        if (!buffer) {
                        reject('error decoding file data: ' + filepath);
                        }
                        resolve(buffer);
                    },
                    function(error) {
                        reject('decodeAudioData error:' + error);
                    }
                );
            };
        
            request.onerror = function() {
                reject('BufferLoader: XHR error');
            };
        
            request.send();
        });
    }
}

export class SoundManager {
    private _sequencer: MarioSequencer;
    constructor(sequencer: MarioSequencer) {
        this._sequencer = sequencer;
    }

    public async loadSounds() {
        const s = this._sequencer;
        const SOUNDS = s.ASSETS.SOUNDS;
        for (let i = 1; i < 21; i++) {
            let tmp = '0';
            tmp += i.toString();
            const file = "wav/sound" + tmp.slice(-2) + ".wav";
            const e = new SoundEntity(this._sequencer, s.CONST, file);
            SOUNDS[i-1] = e;
        }
        await Promise.all(s.ASSETS.SOUNDS.map((s) => s.load())).then((all) => {
            all.map((buffer, i) => {
                s.ASSETS.SOUNDS[i].buffer = buffer;
            });
        });
    }
}