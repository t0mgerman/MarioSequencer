import {
    App,
    BeatButton,
    GameStatus,
    IMarioSequencerAssets,
    IMarioSequencerProps,
    InstrumentButton,
    ISequencerBtnCreationArgs,
    MarioSequencerAppState,
    MarioSequencerSong,
    Mp3UpdateEvent,
    SequencerBtnEvent,
    SequencerButton,
    SequencerSlider,
    ToggleButton
} from "./app.types";
import { SoundEntity, SoundManager } from "./sound";
import EasyTimer from "./timer";
import EmbeddedSongs from "./songs";
import { Mario } from "./mario";
import UI from "./ui";
import Utils from "./utils";

import styles from "./app.module.scss";
import { AddEvents, EmitClickEvent } from "./eventHandling";
import { songToAudio } from "./mp3export";
import { CanvasRecorder } from "./recorder";

// Ensure all assets are bundled as necessary
function requireAll(r: any) { r.keys().forEach(r); }
requireAll(require.context('../public/wav', true, /\.wav$/));
requireAll(require.context('../public/image', true, /\.(png|gif)$/));
require('../public/gh-fork-ribbon.css');

// Service worker for cached offline loading
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').then(registration => {
            console.log('SW registered: ', registration);
        }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
        });
    });
}

// Shim for RAF
window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        (window as any).webkitRequestAnimationFrame ||
        (window as any).mozRequestAnimationFrame ||
        (window as any).oRequestAnimationFrame ||
        (window as any).msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();;

export class MarioSequencer {

    /** UI Loader - UI setup kept separate from rest of app logic */
    private ui: UI.Loader;

    private soundManager: SoundManager;

    /** Moustachioed plumber and hero of the Mushroom Kingdom */
    public mario?: Mario;

    /** Web AudioContext, used for audio playback */
    public AC: AudioContext = (window.AudioContext) ? new AudioContext() : new window.webkitAudioContext();

    public MSDestination: MediaStreamAudioDestinationNode | null = null;

    /** Layer 1 Canvas - for rendering of Mario Paint composer background / UI elements */
    public Layer1?: HTMLCanvasElement;

    /** Layer 2 Canvas - for rendering of Mario Paint composer score and mario etc */
    public Layer2?: HTMLCanvasElement;

    /** Layer 1 Rendering Context (2D) */
    public L1C: CanvasRenderingContext2D | null = null;

    /** Layer 2 Rendering Context (2D) */
    public L2C: CanvasRenderingContext2D | null = null;

    /** HTML Container for the app */
    public container: HTMLElement;

    /** App state */
    public appState: MarioSequencerAppState = {
        mouseX: 0,
        mouseY: 0,
        keyPresses: [],
        animeId: 0,
        resizing: false,
        currentTool: 0,
        curPos: 0,
        curScore: {
            beats: 4,
            end: 0,
            loop: false,
            notes: [],
            tempo: "0"
        },
        history: [],
        gameStatus: GameStatus.Edit
    }

    /** Stores any parameters/options passed to the app using the URL Query String */
    private _urlOptions: Record<string, any> = {};

    /** Maximum number of bars in score */
    public curMaxBars: number;

    private _maxHistory: number = 10;

    /** App constants - updated on window resize */
    public CONST: IMarioSequencerProps;

    /** Image assets, sound assets and button references */
    public ASSETS: IMarioSequencerAssets = {
        BUTTONS: [],
        SOUNDS: [],
    };

    /** Timers used by the app to facilitate certain sprite animations */
    public TIMERS: Record<string, EasyTimer> = {};

    /** External Utils */
    private getConstants: (this: MarioSequencer, opts: any, container: HTMLElement) => IMarioSequencerProps;

    /** Canvas recorder for video recording */
    public canvasRecorder: CanvasRecorder | null = null;

    /**
     * A new Mario Paint Sequencer
     * @param containerSelector The container in which to draw the game
     */
    constructor(containerSelector: string) {

        // Class fn bindings
        this.getConstants = Utils.getConstants.bind(this);

        this.doAnimation = this.doAnimation.bind(this);
        this.doMarioEnter = this.doMarioEnter.bind(this);
        this.doMarioLeave = this.doMarioLeave.bind(this);
        this.doMarioPlay = this.doMarioPlay.bind(this);
        this._downloadJSON = this._downloadJSON.bind(this);
        this._downloadMP3 = this._downloadMP3.bind(this);

        const sequencer = this;
        this.ui = new UI.Loader(this);
        this.soundManager = new SoundManager(this);

        const containerEl = document.querySelector(containerSelector) as App;
        if (containerEl) {
            const initialMagnify = Utils.getScaledMagnify();
            containerEl.addEventListener("mp3update", this._onMp3Update);
            containerEl.classList.add(styles.marioSequencer);
            containerEl.style.setProperty('--scaledMagnify', initialMagnify.toString());

            // Get manual options from URL / Search String
            window.location.search.substr(1).split('&').forEach((s) => {
                const tmp = s.split('=');
                this._urlOptions[tmp[0]] = tmp[1];
            });

            // Set constants based on set options
            this.CONST = this.getConstants(this._urlOptions, containerEl);
            this.curMaxBars = this.CONST.DEFAULTMAXBARS;
            this.container = containerEl;

            // Resize UI option event listener
            const b = document.getElementById("magnify") as HTMLSelectElement;
            b.addEventListener("change", (e) => {
                let mag = (e.target as HTMLSelectElement).selectedIndex + 1;
                this._resizeScreen(mag);
            });

            // Respond to resize events if magnifaction is set to "Scale"
            window.addEventListener("resize", () => {
                const select = document.getElementById('magnify') as HTMLSelectElement;
                if (select) {
                    const magIdx = select.selectedIndex + 1;
                    this._resizeScreen(magIdx);
                }
            });

            // Score download
            const downloadJSONBtn = document.querySelector('button#dlJSON');
            if (downloadJSONBtn) {
                downloadJSONBtn.addEventListener("click", this._downloadJSON);
            }
            const downloadMP3Btn = document.querySelector('button#dlMP3');
            if (downloadMP3Btn) {
                downloadMP3Btn.addEventListener("click", this._downloadMP3);
            }
            const backBtn = document.querySelector('button#dismissDL');
            if (backBtn) {
                backBtn.addEventListener("click", () => {
                    document.querySelector('audio#export')?.remove();
                    document.querySelector('.downloadOpts')?.classList.remove('rendering', 'dlReady');
                });
            }

            // Sharing
            document.getElementById('shareLink')?.addEventListener('click', (e) => {
                const url = document.getElementById('shareUrl') as HTMLInputElement;
                (document.getElementById('inclSong') as HTMLInputElement).checked = false;
                url.value = window.location.href;
            });
            document.getElementById('inclSong')?.addEventListener('click', function(e) {
                const url = document.getElementById('shareUrl') as HTMLInputElement; 
                let port = window.location.port;
                let urlVal = `${window.location.protocol}//${window.location.hostname}${port !== "80" ? ":" + port : ""}${window.location.pathname}`;
                if ((this as HTMLInputElement).checked) {
                    const bars = sequencer.appState.curScore.notes;
                    let s = "";
                    bars.forEach((bar) => {
                        // MSQ parsing code expects 3 notes max per bar
                        for (let i = 0; i <= Math.min(bar.length,2); i++) {
                            const note = bar[i] as number;
                            if (!note) {
                                s += [...Array(2-i+1)].reduce((prev,cur) => prev + "0", "");
                            } else {
                                const scale = (note & 0xff) + 1;
                                const tone = ((note >> 8) & 0xff) + 1;
                                s += scale.toString(16);
                                if (scale > 0) s += tone.toString(16);
                            }
                        }
                        s += '\r';
                    });
                    urlVal += `?S=${s}&T=${sequencer.appState.curScore.tempo}&L=${sequencer.appState.curScore.loop ? 'T' : 'F'}&E=${sequencer.appState.curScore.end}&B=${sequencer.appState.curScore.beats === 4 ? "T" : "F"}`;
                } 
                url.value = urlVal;
            });
            document.getElementById('shareCopy')?.addEventListener('click', (e) => {
                const url = document.getElementById('shareUrl') as HTMLInputElement; 
                url.select(); 
                url.setSelectionRange(0,99999); 
                navigator.clipboard.writeText(url.value);
            });

            // Setup UI
            this.soundManager.loadSounds().then(() => {
                this.ui.init().then(() => {

                    if (this.Layer2) this.canvasRecorder = new CanvasRecorder(this, this.Layer2);

                    AddEvents(this);

                    // Remove loading 'spinner'
                    const spinner = document.getElementById("spinner");
                    if (spinner) {
                        this.container.removeChild(spinner);
                    }

                    // Action any URL params
                    this._actionUrlParams();

                });
            });
        } else {
            throw new Error(`Unable to find selector: ${containerSelector}`);
        }
    }

    private _actionUrlParams() {
        const OPTS = this._urlOptions;
        const sequencer = this;
        try {
            if (Object.keys(OPTS).length == 0) return;

            if (OPTS['url'] != undefined) {

                this.resetScore();
                const url = OPTS['url'];

                // Load url
                new Promise(function (resolve, reject) {
                    const req = new XMLHttpRequest();
                    req.open('GET', url);
                    req.onload = function () {
                        if (req.status == 200) {
                            resolve(req.response);
                        } else {
                            reject(Error(req.statusText));
                        }
                    };

                    req.onerror = function () {
                        reject(Error("Network Error"));
                    };

                    req.send();
                }).then(function (response) {

                    // Parse response as MSQ or Sequencer JSON
                    let msq = false;
                    if (url.slice(-3) == "msq") {
                        sequencer.addMSQ(response as string);
                    } else {
                        sequencer.addJSON(response as string);
                    }

                    sequencer._reInitButtonsFromScore();

                    sequencer._autoPlayIfDemanded(OPTS);

                }).catch(function (err) {
                    alert("Downloading File: " + url + " failed :" + err);
                    console.error("Downloading File: " + url + " failed :" + err.stack);
                });

            } else if (OPTS.S != undefined || OPTS.SCORE != undefined) {

                // Song passed in as Query String param
                const score = OPTS.SCORE || OPTS.S;
                const tempo = OPTS.TEMPO || OPTS.T;
                let loop = (OPTS.LOOP || OPTS.L);
                const end = OPTS.END || OPTS.E;
                let beats = (OPTS.TIME44 || OPTS.B);

                if (tempo == undefined || loop == undefined || end == undefined ||
                    beats == undefined) {
                    throw new Error("Not enough parameters");
                }

                loop = loop.toUpperCase();
                beats = beats.toUpperCase();

                const text = "SCORE=" + score + "\n" +
                    "TEMPO=" + tempo + "\n" +
                    "LOOP=" + ((loop == "T" || loop == "TRUE") ? "TRUE" : "FALSE") + "\n" +
                    "END=" + end + "\n" +
                    "TIME44=" + ((beats == "T" || beats == "TRUE") ? "TRUE" : "FALSE");

                sequencer.resetScore();
                sequencer.addMSQ(text);
                sequencer._reInitButtonsFromScore();

                sequencer._autoPlayIfDemanded(OPTS);
            }
        } catch (err: unknown) {

        }
    }

    /**
     * Resets music score
     */
    public resetScore() {
        this.appState.curScore.notes = [];
        this.curMaxBars = 0;
        this.appState.curScore.beats = 4;
        // Loop button itself has a state, so keep current value;
        // CurScore.loop = false;
        this.appState.curScore.end = 0;
        this.appState.curScore.tempo = 0;
    }

    /**
     * Initialises the music / score
     */
    public initMusicScore() {
        const { DEFAULTMAXBARS, DEFAULTTEMPO } = this.CONST;
        const tmpa = [];
        for (let i = 0; i < DEFAULTMAXBARS; i++) tmpa[i] = [];
        this.appState.curScore.notes = tmpa;
        this.curMaxBars = DEFAULTMAXBARS;
        const s = document.getElementById("scroll") as SequencerSlider;
        s.max = (DEFAULTMAXBARS - 6).toString();
        s.value = "0";
        this.appState.curScore.loop = false;
        (document.getElementById("loop") as ToggleButton)?.reset();
        this.appState.curScore.end = DEFAULTMAXBARS - 1;
        this.appState.curScore.tempo = DEFAULTTEMPO;
        const tempoInput = document.getElementById("tempo") as SequencerSlider;
        if (tempoInput) tempoInput.value = DEFAULTTEMPO.toString();
        this.appState.curScore.beats = 4;
        const e = new Event("click");
        (e as any).soundOff = true;
        const beatBtn = document.getElementById("4beats") as ToggleButton;
        if (beatBtn) beatBtn.dispatchEvent(e);
    }

    private _reInitButtonsFromScore() {
        const b = document.getElementById(this.appState.curScore.beats == 3 ? '3beats' : '4beats') as HTMLButtonElement;
        const e = new Event("click");
        (e as any).soundOff = true;
        b.dispatchEvent(e);

        const r = document.getElementById('scroll') as HTMLInputElement;
        this.curMaxBars = this.appState.curScore.end + 1;
        r.max = (this.curMaxBars - 6).toString();
        r.value = "0";
        this.appState.curPos = 0;

        const tempoRange = document.getElementById("tempo") as HTMLInputElement;
        let tempo = this.appState.curScore.notes[0][0];
        if (typeof tempo == "string" && tempo.substr(0, 5) == "TEMPO") {
            tempo = tempo.split("=")[1];
            this.appState.curScore.tempo = tempo;
            tempoRange.value = tempo;
        }
    }

    public addMSQ(text: string) {
        const lines = text.split(/\r\n|\r|\n/);
        const keyword = ["SCORE", "TEMPO", "LOOP", "END", "TIME44"];
        const values: any = {};
        lines.forEach(function (line, i) {
            if (line === "") return;
            const kv = line.split("=");
            const k = kv[0];
            const v = kv[1];
            if (i < keyword.length && k !== keyword[i]) {
                throw new Error("Line " + i + " must start with '" + keyword[i] + "'");
            }
            values[k] = v;
        });

        const oldEnd = this.appState.curScore.end;
        const s = values.SCORE;
        let i = 0, count = this.appState.curScore.end;
        // MSQ format is variable length string.
        out:
        while (i < s.length) {
            const bar = [];
            for (let j = 0; j < 3; j++) {
                if (s[i] === "\r" || s[i] == undefined) break out;
                let scale = parseInt(s[i++], 16);
                if (scale !== 0) {
                    scale -= 1;
                    const tone = parseInt(s[i++], 16) - 1;
                    const note = (tone << 8) | scale;
                    bar.push(note);
                }
            }
            this.appState.curScore.notes[count++] = bar;
        }

        this.appState.curScore.end += parseInt(values.END) - 1;
        if (this.appState.curScore.tempo != values.TEMPO)
            this.appState.curScore.notes[oldEnd].splice(0, 0, "TEMPO=" + values.TEMPO);
        this.appState.curScore.tempo = values.TEMPO;
        const beats = (values.TIME44 == "TRUE") ? 4 : 3;
        this.appState.curScore.beats = beats;
        // click listener will set CurScore.loop
        const b = document.getElementById("loop") as ToggleButton;
        (values.LOOP == "TRUE") ? b.set() : b.reset();
    }

    public addJSON(text: string) {
        const json = JSON.parse(text);
        for (let i = 0; i < json.end; i++)
            this.appState.curScore.notes.push(json.notes[i]);

        const notes = this.appState.curScore.notes[this.appState.curScore.end];
        if (this.appState.curScore.tempo != json.tempo && notes.length != 0) {
            const tempostr = notes[0];
            if (typeof tempostr != "string") {
                notes.splice(0, 0, "TEMPO=" + json.tempo);
            }
        }
        this.appState.curScore.tempo = json.tempo;

        this.appState.curScore.end += json.end;

        const b = document.getElementById("loop") as ToggleButton;
        if (this.appState.curScore.loop) b.set; else b.reset();
    }

    public updateHistory() {
        this.appState.history.push({ ...this.appState });
        if (this.appState.history.length > this._maxHistory) {
            this.appState.history = this.appState.history.slice(0 - this._maxHistory);
        }
    }

    //#endregion

    //#region draw functions

    /**
     * Draw the musical score for a given position
     * @param pos The musical bar index / position in the score, usually incremented by Mario.play()
     * @param notes The notes of the song
     * @param scroll Used for Mario's position, helping to determine when Mario should jump and notes should bounce etc
     */
    public drawScore(pos: number, notes: (string | number)[][], scroll: number) {
        const { CHARSIZE, HALFCHARSIZE, MAGNIFY, OFFSETLEFT, OFFSETTOP, SCRHEIGHT } = this.CONST;
        const { IMAGES, SOUNDS } = this.ASSETS;
        const SCREEN = this.Layer2;
        if (this.mario && IMAGES && SCREEN && this.L1C && this.L2C) {

            // Clip note area on X-axis, within score area (8,41 to 247,148)
            this.L2C.clearRect(0, 0, SCREEN.width, SCREEN.height);
            this.L2C.save();
            this.L2C.rect(8 * MAGNIFY, 0, (247 - 8 + 1) * MAGNIFY, SCRHEIGHT * MAGNIFY);
            this.L2C.clip();

            // Get Grid Co-ordinates of mouse
            const realX: number = this.appState.mouseX - OFFSETLEFT;
            const realY: number = this.appState.mouseY - OFFSETTOP;
            const g: boolean | number[] = this.ui.toGrid(realX, realY);
            let gridX: number | undefined;
            let gridY: number | undefined;

            // Coordinates only needed in Edit mode
            if (this.appState.gameStatus == GameStatus.Edit && g !== false) {
                gridX = g[0];
                gridY = g[1];
                // If mouse cursor on or under the C, draw horizontal line
                if (gridY >= 11) this._drawHorizontalBar(gridX, 0);
            }

            // If G-Clef should be drawn, draw it
            if (this.ASSETS.IMAGES && pos == 0) {
                const w = this.ASSETS.IMAGES.GClef.width;
                const h = this.ASSETS.IMAGES.GClef.height;

                this.L2C.drawImage(
                    this.ASSETS.IMAGES.GClef,
                    0, 0, w, h,
                    (9 - scroll) * MAGNIFY,
                    48 * MAGNIFY,
                    w * MAGNIFY,
                    h * MAGNIFY
                );

                // If song loops, draw repeat head
                if (this.appState.curScore.loop) {
                    this._drawRepeatHead(41 - scroll);
                }
                // If at position 1 and song loops, draw repeat head
            } else if (pos == 1 && this.appState.curScore.loop) {
                this._drawRepeatHead(9 - scroll);
            }

            const beats = this.appState.curScore.beats;

            /** A vertical orange bar is drawn to demarcate each bar / measure in the score.
             * Because we are scrolling and clipping the timeline as we edit or play the song, 
             * the positional indexes (relative to the left of the screen) at which we should 
             * draw these orange lines also changes.
             * 
             * Because the G-Clef and Repeat Head take up the first two grid positions -  
             * when pos is zero, we must draw each orange line (representing the start of a 
             * measure) at pos + 2, every N beats. N is 4 in 4/4, or 3 in 3/4.
             * 
             * An orange line will be drawn on:
             * 
             *    barBeingDrawn % beats == (beats - 1) - (pos+1 % beats)
             * 
             * For an explanation of why this works, consider the scenario where the current
             * position is 0, the current song is in 4/4, and the bar being drawn is 2nd from
             * the left of the screen. 
             * 
             * 2 % 4 == (4-1) - (0 + 1 % 4) ... OR: 
             * 
             * 2 == 3 - 1  (which is true... so an orange bar will be drawn)
             * 
             * The result of:
             * 
             *    (beats - 1) - (position + 1 % beats)
             * 
             * is:
             * 
             *    2, 1, 0, 3, 2, 1, 0, 3, ..... (if beats = 4)
             * 
             *    2, 1, 0, 2, 1, 0, 2, 1, ..... (if beats = 3)
             */
            const orange = (beats == 4) ? 3 - ((pos + 1) % 4) : 2 - ((pos + 3) % 3);


            /* DRAW VERTICAL BARS:
             * Iterate through the vertical drawing positions on the grid
             * That run along the X-axis
             */

            /* If pos < 2, start with the 1st or 2nd bars as the G-Clef and 
             * Repeat Head take up the first two grid positions
             */
            let i = (pos < 2) ? (2 - pos) : 0;

            // There are 9 drawable positions on the X-axis, using the game's grid system
            for (; i < 9; i++) {
                const xorg = 16 + 32 * i - scroll;
                const x = xorg * MAGNIFY;

                /** The bar in the entire score the current loop iteration i represents */
                const barnum = pos + i - 2;

                // If we are drawing the final bar, draw the Repeat symbol or End Mark
                if (barnum == this.appState.curScore.end) {
                    const img = this.appState.curScore.loop ? IMAGES.Repeat[1] : IMAGES.EndMark;
                    this.L2C.drawImage(img, x - 7 * MAGNIFY, 56 * MAGNIFY);
                }

                // Draw vertical line on each beat
                this.L2C.beginPath();
                this.L2C.setLineDash([MAGNIFY, MAGNIFY]);
                this.L2C.lineWidth = MAGNIFY;
                if (i % beats == orange) {
                    if (this.appState.gameStatus == GameStatus.Edit) this._drawBarNumber(i, barnum / beats + 1);
                    this.L2C.strokeStyle = '#F89000'; // Orange
                } else {
                    this.L2C.strokeStyle = '#A0C0B0';
                }
                this.L2C.moveTo(x, 41 * MAGNIFY);
                this.L2C.lineTo(x, 148 * MAGNIFY);
                this.L2C.stroke();

                /** Notes for the current beat */
                const b = notes[barnum];

                // If no notes to draw, skip 
                if (b == undefined) continue;

                /* DRAW THE NOTES
                 * Notes bounce as Mario jumps on them (visual feedback for the notes sounding out), 
                 * and because Mario is not always in the center of the screen - 
                 * he enters stage left, leaves stage right - we may need to position them accordingly
                 */

                /**
                 * The amount by which the drawn character should drawn bouncing downward
                 */
                let bounceDelta = 0;

                // If music is playing and Mario has already hit the beat being drawn...
                if (this.appState.gameStatus == GameStatus.Playing && this.mario.pos - 2 == barnum) {
                    /** Distance from Mario is used to determine the bounce */
                    let idx;
                    // If Mario is center screen
                    if (this.mario.x == 120) {
                        idx = (this.mario.scroll >= 16) ? this.mario.scroll - 16 : this.mario.scroll + 16;
                    } else {
                        idx = this.mario.x + 8 - xorg;
                    }
                    const tbl = [0, 1, 2, 3, 3, 4, 5, 5, 6, 6, 7, 7, 8, 8, 8, 8,
                        8, 8, 8, 8, 8, 7, 7, 6, 6, 5, 5, 4, 3, 3, 2, 1, 0];
                    bounceDelta = tbl[Math.round(idx)];
                }

                /** Set to true when the current note is below middle C. Ensures a horizontal line is drawn behind the note. */
                let hflag = false;

                // For each note in the current beat
                for (let j = 0; j < b.length; j++) {
                    const bNote = b[j];
                    if (typeof bNote === "string") continue; // for dynamic TEMPO

                    const sndnum = bNote >> 8;
                    const scale = bNote & 0x0F;

                    // When CurChar is eraser, and the mouse cursor is on the note,
                    // an Image of note blinks.
                    if (this.appState.currentTool == 16 && g != false && i == gridX && scale == gridY &&
                        this.TIMERS.eraser.currentFrame == 1) { continue; }

                    if (!hflag && (scale >= 11)) {
                        hflag = true;
                        this._drawHorizontalBar(i, scroll);
                    }

                    // Draw instrument icon
                    const soundImage = SOUNDS[sndnum].image;
                    if (soundImage) {
                        this.L2C.drawImage(soundImage, x - HALFCHARSIZE,
                            (40 + scale * 8 + bounceDelta) * MAGNIFY);
                    }

                    // Draw flat or sharp symbol if appropriate
                    const x2 = (x - 13 * MAGNIFY);
                    const y = (44 + scale * 8 + bounceDelta) * MAGNIFY;
                    if ((bNote & 0x80) != 0) {
                        this.L2C.drawImage(IMAGES.Semitone[0], x2, y);
                    } else if ((bNote & 0x40) != 0) {
                        this.L2C.drawImage(IMAGES.Semitone[1], x2, y);
                    }
                }
            }

            // Draw red placeholder / cursor when in edit mode and hovering grid position
            if (this.appState.gameStatus == GameStatus.Edit && gridX && gridY) {
                this.L2C.beginPath();
                this.L2C.setLineDash([7 * MAGNIFY, 2 * MAGNIFY, 7 * MAGNIFY, 0]);
                this.L2C.lineWidth = MAGNIFY;
                this.L2C.strokeStyle = '#F00';
                const xorg = (16 + 32 * gridX - 8);
                const x = xorg * MAGNIFY;
                const y = (40 + gridY * 8) * MAGNIFY;
                this.L2C.rect(x, y, CHARSIZE, CHARSIZE);
                this.L2C.stroke();
            }
            this.L2C.restore();
        }
    }

    private _drawHorizontalBar(gridX: number, scroll: number) {
        const { HALFCHARSIZE, MAGNIFY } = this.CONST;
        // X is the x of vertical bar (in grid)
        const width = 24 * MAGNIFY;
        this.L2C?.fillRect((4 + 32 * gridX - scroll) * MAGNIFY,
            (38 + 11 * 8) * MAGNIFY + HALFCHARSIZE,
            width, 2 * MAGNIFY);
    }

    private _drawRepeatHead(x: number) {
        const { MAGNIFY } = this.CONST;
        const { IMAGES } = this.ASSETS;
        if (this.L2C && IMAGES) {
            const w = IMAGES.Repeat[0].width;
            const h = IMAGES.Repeat[0].height;
            this.L2C.drawImage(IMAGES.Repeat[0], x * MAGNIFY, 56 * MAGNIFY);
        }
    }

    public drawEndMarkIcon(img: HTMLImageElement) {
        const { MAGNIFY } = this.CONST;
        if (this.L1C) {
            this.L1C.clearRect(4 * MAGNIFY, 8 * MAGNIFY, 16 * MAGNIFY, 14 * MAGNIFY);
            this.L1C.drawImage(img, 5 * MAGNIFY, 8 * MAGNIFY);
        }
    }

    private _drawBarNumber(gridX: number, barnum: number) {
        const { MAGNIFY } = this.CONST;
        const { IMAGES } = this.ASSETS;
        if (IMAGES && this.L2C) {
            let x = (16 + 32 * gridX) * MAGNIFY - 1;
            const y = (40 - 7) * MAGNIFY;
            const nums = [];
            while (barnum > 0) {
                nums.push(barnum % 10);
                barnum = Math.floor(barnum / 10);
            }
            const len = nums.length;
            if (len == 1) x += 2 * MAGNIFY;
            while (nums.length > 0) {
                const n = nums.pop();
                if (n !== undefined) {
                    const width = (n == 4) ? 5 : 4;
                    this.L2C.drawImage(IMAGES.Numbers[n], x, y, 5 * MAGNIFY, 7 * MAGNIFY);
                    x += width * MAGNIFY;
                }
            }
        }
    }

    public drawEraserIcon() {
        const { MAGNIFY } = this.CONST;
        if (this.L1C) this.L1C.clearRect(4 * MAGNIFY, 8 * MAGNIFY, 16 * MAGNIFY, 14 * MAGNIFY);
    }

    public drawMario(marioImage: HTMLImageElement, x: number, y: number) {
        const { MAGNIFY } = this.CONST;
        const sequencer = this;
        if (this.L2C) {
            this.L2C.drawImage(marioImage, x * MAGNIFY, y * MAGNIFY);
        }
    }

    public drawMarioSweat(marioImage: HTMLImageElement,
        sx: number, sy: number, sw: number, sh: number,
        dx: number, dy: number, dw: number, dh: number
    ) {
        const { MAGNIFY } = this.CONST;
        if (this.L2C) {
            this.L2C.drawImage(
                marioImage,
                sx, sy, sw, sh,
                dx * MAGNIFY, dy * MAGNIFY,
                dw * MAGNIFY, dh * MAGNIFY
            );
        }
    }

    //#endregion

    //#region mario state / animation functions

    private _autoPlayIfDemanded(opts: any) {
        let auto = opts['a'] || opts['auto'];
        if (auto != undefined) {
            auto = auto.toUpperCase();
            if (auto == "T" || auto == "TRUE") {
                const playBtn = document.getElementById("play") as HTMLButtonElement;
                if (playBtn) playBtn.dispatchEvent(new Event("click"));
            }
        }
    }

    public doMarioEnter(timeStamp: number) {
        this.TIMERS.bomb.checkAndFire(timeStamp);
        this.drawScore(0, this.appState.curScore.notes, 0);
        if (this.mario) {
            this.mario.enter(timeStamp);

            if (this.mario.x < 40) {
                this.appState.animeId = window.requestAnimFrame(this.doMarioEnter);
            } else {
                this.mario.init4playing(timeStamp);
                this.appState.gameStatus = GameStatus.Playing;
                this.appState.animeId = window.requestAnimFrame(this.doMarioPlay);
            }
        }
    }

    public doMarioPlay(timeStamp: number) {
        this.TIMERS.bomb.checkAndFire(timeStamp);
        if (this.mario) {
            this.mario.play(timeStamp);
            if (this.appState.gameStatus == GameStatus.Playing) {
                if (this.mario.pos - 2 != this.appState.curScore.end - 1) {
                    this.appState.animeId = window.requestAnimFrame(this.doMarioPlay);
                } else if (this.appState.curScore.loop) {
                    this.appState.curPos = 0;
                    this.mario.pos = 1;
                    this.mario.x = 40;
                    this.mario.init4playing(timeStamp);
                    this.appState.animeId = window.requestAnimFrame(this.doMarioPlay);
                } else {
                    // Calls stopListener without a event arg
                    const stopBtn = document.getElementById('stop') as SequencerButton;
                    EmitClickEvent(stopBtn, true);
                }
            }
        }
    }

    public doMarioLeave(timeStamp: number) {
        this.TIMERS.bomb.checkAndFire(timeStamp);
        if (this.mario) {
            this.drawScore(this.appState.curPos, this.appState.curScore.notes, this.mario.scroll);
            this.mario.leave(timeStamp);

            if (this.mario.x < 247) {
                window.requestAnimFrame(this.doMarioLeave);
            } else {
                this.appState.gameStatus = GameStatus.Edit;

                ["toLeft", "toRight", "scroll", "play", "clear", "frog", "beak", "1up"].
                    map(function (id) {
                        (document.getElementById(id) as HTMLButtonElement).disabled = false;
                    });

                window.requestAnimFrame(this.doAnimation);
            }
        }
    }

    public doAnimation(time: number) {
        if (!this.appState.resizing) {
            this.TIMERS.bomb?.checkAndFire(time);
            this.TIMERS.eraser?.checkAndFire(time);
            this.TIMERS.endMark?.checkAndFire(time);

            this.drawScore(this.appState.curPos, this.appState.curScore['notes'], 0);

            if (this.appState.gameStatus != GameStatus.Edit) return;
        }

        window.requestAnimFrame(this.doAnimation);
    }

    public scheduleAndPlay(notes: (string | number)[], time: number) {
        const { SOUNDS } = this.ASSETS;
        if (time < 0) time = 0;
        if (notes == undefined || notes.length == 0) return;
        const dic: Record<number, number[]> = {};
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];

            // Dynamic tempo change
            if (typeof note == "string") {
                const tempo = note.split("=")[1];
                this.appState.curScore.tempo = tempo;
                const tempoEl = document.getElementById("tempo") as HTMLInputElement;
                if (tempoEl) tempoEl.value = tempo;
                continue;
            }

            const num = note >> 8;
            const scale = note & 0xFF;
            if (!dic[num]) dic[num] = [scale];
            else dic[num].push(scale);
        }
        for (let i in dic) {
            SOUNDS[i].playChord(dic[i], time / 1000); // [ms] -> [s]
        }
    }

    //#endregion

    //#region button image util functions

    public resizeDOM(b: SequencerButton | SequencerSlider, w: number, h: number) {
        const { MAGNIFY } = this.CONST;
        b.style.width = w * MAGNIFY + "px";
        b.style.height = h * MAGNIFY + "px";
    }

    public moveDOM(b: SequencerButton | SequencerSlider, x: number, y: number) {
        const { MAGNIFY } = this.CONST;
        b.style.left = x * MAGNIFY + "px";
        b.style.top = y * MAGNIFY + "px";
    }

    private async _resizeScreen(magIdx: number) {
        let { CHARSIZE, HALFCHARSIZE, MAGNIFY, ORGWIDTH, ORGHEIGHT, OFFSETLEFT, OFFSETTOP, SCRHEIGHT } = this.CONST;
        this.appState.resizing = true;

        const clearCanvas = () => {
            if (this.L1C) {
                this.L1C.clearRect(0, 0, ORGWIDTH * MAGNIFY, ORGHEIGHT * MAGNIFY);
            }
            if (this.L2C) {
                this.L2C.clearRect(0, 0, ORGWIDTH * MAGNIFY, SCRHEIGHT * MAGNIFY);
            }
        };

        let newMagnify = magIdx;
        const scaledMagnify = Utils.getScaledMagnify();
        if (magIdx > 3) {
            newMagnify = scaledMagnify;
        }
        MAGNIFY = newMagnify;
        CHARSIZE = 16 * MAGNIFY;
        HALFCHARSIZE = Math.floor(CHARSIZE / 2);

        this.container.style.width = ORGWIDTH * MAGNIFY + "px";
        this.container.style.height = ORGHEIGHT * MAGNIFY + "px";
        this.container.style.setProperty('--scaledMagnify', magIdx > 3 ? scaledMagnify.toString() : "0");
        OFFSETLEFT = this.container.offsetLeft;
        OFFSETTOP = this.container.offsetTop;

        if (this.container) {
            this.container.classList.remove(styles.mag1x, styles.mag2x, styles.mag3x);
            switch (newMagnify) {
                case 1:
                    this.container.classList.add(styles.mag1x);
                    break;
                case 2:
                    this.container.classList.add(styles.mag2x);
                    break;
                case 3:
                    this.container.classList.add(styles.mag3x);
                    break;
            }
        }

        clearCanvas();

        this.CONST = {
            ...this.CONST,
            CHARSIZE,
            HALFCHARSIZE,
            MAGNIFY,
            OFFSETLEFT,
            OFFSETTOP
        };

        await new UI.Loader(this).init(true);
        this.container.querySelectorAll('button.game, input[type="range"]').forEach((element) => {
            (element as SequencerButton | SequencerSlider).redraw();
        });
        this.ui.changeCursor(this.appState.currentTool);

        this.appState.resizing = false;
    }

    //#endregion

    //#region file handling 

    private _downloadJSON() {
        const link = document.createElement("a");
        link.download = 'MSQ_Data.json';
        const json = JSON.stringify(this.appState.curScore);
        const blob = new Blob([json], { type: "octet/stream" });
        const url = window.URL.createObjectURL(blob);
        link.href = url;
        link.click();
    }

    private _downloadMP3() {
        const downloadOpts = document.querySelector('.downloadOpts') as HTMLDivElement;
        downloadOpts.classList.remove("rendering", "dlReady");
        songToAudio(this).then((song) => {
            const e = new Event("mp3update") as Mp3UpdateEvent;
            e.data = {
                type: "song",
                value: song
            };
            this.container.dispatchEvent(e);
        });

        // songToAudio(this.ASSETS.SOUNDS, Number(this.appState.curScore.tempo), this.appState.curScore);
    }

    private _onMp3Update(ev: Mp3UpdateEvent) {
        const downloadOpts = document.querySelector('.downloadOpts') as HTMLDivElement;
        const progressBar = document.querySelector('progress') as HTMLProgressElement;
        switch (ev.data.type) {
            case "chordGenUpdate":
            case "songProgressUpdate":
                if (!downloadOpts.classList.contains("rendering"))
                    downloadOpts.classList.add("rendering");
                progressBar.value = ev.data.value * 100;
                break;
            case "song":
                if (!downloadOpts.classList.contains("dlReady")) {
                    downloadOpts.classList.remove("rendering");
                    downloadOpts.classList.add("dlReady");
                }
                // Check if audio element with id 'export' exists
                let audioEl = downloadOpts.querySelector('#export') as HTMLAudioElement;

                if (!audioEl) {
                    // If it doesn't exist, create a new one and append it to the body
                    audioEl = document.createElement('audio');
                    audioEl.id = 'export';
                    audioEl.controls = true;
                    downloadOpts.appendChild(audioEl);
                }

                // Set the src attribute to the blob URL
                audioEl.src = ev.data.value;
                break;
        }
    }

    //#endregion

    public setState(stateUpdate: Partial<MarioSequencerAppState>) {
        this.updateHistory();
        this.appState = Object.assign(this.appState, stateUpdate);
    }
}

new MarioSequencer('#app');