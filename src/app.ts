import { GameStatus, getConstants, IMarioSequencerAssets, IMarioSequencerProps } from "./const";
import { SoundEntity } from "./sound";
import EasyTimer from "./timer";
import { EmbeddedSongs } from "./songs";
import { Mario } from "./mario";

window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame ||
        (window as any).webkitRequestAnimationFrame ||
        (window as any).mozRequestAnimationFrame    ||
        (window as any).oRequestAnimationFrame      ||
        (window as any).msRequestAnimationFrame     ||
        function( callback ){
          window.setTimeout(callback, 1000 / 60);
        };
    })();;

export class MarioSequencer {

    private _mario?: Mario;
    private AC: AudioContext = (window.AudioContext) ? new AudioContext() : new window.webkitAudioContext();
    private Layer1?: HTMLCanvasElement;
    private Layer2?: HTMLCanvasElement;
    private L1C: CanvasRenderingContext2D | null = null;
    private L2C: CanvasRenderingContext2D | null = null;
    private _container: HTMLElement;
    private _pseudoSheet: CSSStyleSheet | null = null;
    private _mouseX = 0;
    private _mouseY = 0;
    private _animeId = 0;
    private _resizing = false;

    private _urlOptions: Record<string,any> = {};
    private _curChar = 0;
    public curPos = 0;
    private _curSong?: any;
    public curScore: any = {};
    private _curMaxBars: number;
    private _gameStatus: GameStatus = GameStatus.Edit;
    
    private CONST: IMarioSequencerProps;
    public ASSETS: IMarioSequencerAssets = {
        BUTTONS: [],
        SOUNDS: [],
    };
    private TIMERS: Record<string, EasyTimer> = {};

    /**
     * A new Mario Paint Sequencer
     * @param containerSelector The container in which to draw the game
     */
    constructor(containerSelector: string) {

        this._doAnimation = this._doAnimation.bind(this);
        this._doMarioEnter = this._doMarioEnter.bind(this);
        this._doMarioLeave = this._doMarioLeave.bind(this);
        this._doMarioPlay = this._doMarioPlay.bind(this);
        this._download = this._download.bind(this);
        this._onMouse = this._onMouse.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._readDroppedFiles = this._readDroppedFiles.bind(this);

        const i = this._getImageElFromPath;
        const containerEl = document.querySelector(containerSelector) as HTMLElement;
        if (containerEl) {
            // Get manual options from URL / Search String
            window.location.search.substr(1).split('&').forEach((s) => {
                const tmp = s.split('=');
                this._urlOptions[tmp[0]] = tmp[1];
            });

            // Set constants based on set options
            this.CONST = getConstants(this._urlOptions, containerEl);
            this._curMaxBars = this.CONST.DEFAULTMAXBARS;
            this._container = containerEl;

            this.init();

            const downloadBtn = document.querySelector('button#download');
            if (downloadBtn) {
                downloadBtn.addEventListener("click", this._download);
            }

        } else {
            throw new Error(`Unable to find selector: ${containerSelector}`);
        }
    }

    private async init() {
        // Prepare drawing surfaces / layers
        await this._initLayers();

        // Inject style tag to head to help with styling pseudo-elements
        this._injectStyleTag();

        // Perform additional initialisation
        this._loadSoundsAsync();
        await this._initImageAssets();
        this._initBomb();
        this._initInstrumentButtons();
        this._initEndMarkButton();
        this._initPlayButton();
        this._initStopButton();
        this._initLoopButton();
        this._initScrollRange();
        this._initBeatButtons();
        this._initSongButtons();
        this._initEraserButton();
        this._initTempoRange();
        this._initClearButton();

        this._initMusicScore();

        this._initMario();

        const b = document.getElementById("magnify") as HTMLSelectElement;
        b.addEventListener("change", (e) => {
            this._resizeScreen((e.target as HTMLSelectElement).selectedIndex + 1);
        });

        // Load all sounds in to respective buffers and
        // Load any music passed in by URL params
        Promise.all(this.ASSETS.SOUNDS.map((s) => s.load()))
            .then((all) => {
                all.map((buffer, i) => {
                    this.ASSETS.SOUNDS[i].buffer = buffer;
                });

                // Remove loading 'spinner'
                const spinner = document.getElementById("spinner");
                if (spinner) {
                    this._container.removeChild(spinner);
                }

                // Action any URL params
                this._actionUrlParams();

                this._initScreen();
                this._initMouseEvents();
            });
    }

    private _initMouseEvents() {
        if (this.Layer2) {
            this.Layer2.addEventListener("contextmenu", this._onMouse);
            this.Layer2.addEventListener("click", this._onMouse);
            this.Layer2.addEventListener("mousemove", this._onMouseMove);
            this.Layer2.addEventListener("dragover", (e) => {
                e.preventDefault();
                return false;
            });
            this.Layer2.addEventListener("drop", this._readDroppedFiles);
        }
    }

    private _actionUrlParams() {
        const OPTS = this._urlOptions;
        const sequencer = this;
        try {
            if (Object.keys(OPTS).length == 0) return;

            if (OPTS['url'] != undefined) {
                
                this._fullInitScore();
                const url = OPTS['url'];
                
                // Load url
                new Promise(function (resolve, reject) {
                    const req = new XMLHttpRequest();
                    req.open('GET', url);
                    req.onload = function() {
                    if (req.status == 200) {
                        resolve(req.response);
                    } else {
                        reject(Error(req.statusText));
                    }
                    };

                    req.onerror = function() {
                        reject(Error("Network Error"));
                    };

                    req.send();
                }).then(function(response) {

                    // Parse response as MSQ or Sequencer JSON
                    let msq = false;
                    if (url.slice(-3) == "msq") {
                        sequencer._addMSQ(response as string);
                    } else {
                        sequencer._addJSON(response as string);
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
                let loop  = (OPTS.LOOP  || OPTS.L);
                const end   = OPTS.END   || OPTS.E;
                let beats = (OPTS.TIME44 || OPTS.B);

                if (tempo == undefined || loop == undefined || end == undefined ||
                    beats == undefined) {
                    throw new Error("Not enough parameters");
                }

                loop  = loop.toUpperCase();
                beats = beats.toUpperCase();

                const text = "SCORE=" + score + "\n" +
                            "TEMPO=" + tempo + "\n" +
                            "LOOP=" + ((loop == "T" || loop == "TRUE") ? "TRUE" : "FALSE") + "\n" +
                            "END=" + end + "\n" +
                            "TIME44=" + ((beats == "T" || beats == "TRUE") ? "TRUE" : "FALSE");
            
                sequencer._fullInitScore();
                sequencer._addMSQ(text);
                sequencer._reInitButtonsFromScore();

                sequencer._autoPlayIfDemanded(OPTS);
            }
        } catch (err: unknown) {

        }
    }

    //#region Initialisation 

    private _injectStyleTag() {
        const s = document.createElement("style");
        document.head.appendChild(s);
        this._pseudoSheet = s.sheet;
    }

    private _loadSoundsAsync() {
        const SOUNDS = this.ASSETS.SOUNDS;
        for (let i = 1; i < 21; i++) {
            let tmp = '0';
            tmp += i.toString();
            const file = "wav/sound" + tmp.slice(-2) + ".wav";
            const e = new SoundEntity(this.AC, this.CONST, file);
            SOUNDS[i-1] = e;
        }
    }

    private async _initImageAssets() {
        const i = this._getImageElFromPath;
        const charSheet = await i("image/character_sheet.png");
        const bombSheet = await i("image/bomb.png");
        const endMark = await i("image/end_mark.png");
        const playBtnSheet = await i("image/play_button.png");
        const repeatSheet = await i("image/repeat_head.png");
        const semitoneSheet = await i("image/semitone.png");
        const numbersSheet = await i("image/numbers.png");
        const stopSheet = await i("image/stop_button.png");
        const beatSheet = await i("image/beat_button.png");
        const songSheet = await i("image/song_buttons.png");
        const thumbSliderSheet = await i("image/slider_thumb.png");
        const clearBtnSheet = await i("image/clear_button.png");
        const marioSheet = await i("image/Mario.png");
        const repeatMarks = this._sliceImage(repeatSheet, 13, 62);
        this.ASSETS.IMAGES = {
            CharSheet: this._sliceImage(charSheet, 16, 16),
            Bomb: this._sliceImage(bombSheet, 14, 18),
            GClef: await i("image/G_Clef.png"),
            Numbers: this._sliceImage(numbersSheet, 5, 7),
            Mario: this._sliceImage(marioSheet, 16, 22),
            Sweat: await i("image/mario_sweat.png"),
            PlayBtn: this._sliceImage(playBtnSheet, 12, 15),
            StopBtn: this._sliceImage(stopSheet, 16, 15),
            ClearBtn: this._sliceImage(clearBtnSheet, 34, 16),
            ThumbSlider: this._sliceImage(thumbSliderSheet, 5, 8),
            BeatBtn: this._sliceImage(beatSheet, 14, 15),
            SongBtns: this._sliceImage(songSheet, 15, 17),
            EndMarkBtn: this._sliceImage(endMark, 14, 13), // Note: Different size from the button,
            EndMark: repeatMarks[2],
            Semitone: this._sliceImage(semitoneSheet, 5, 12),
            Repeat: repeatMarks
        };
    }

    private _initPlayButton() {
        const { IMAGES } = this.ASSETS;
        if (IMAGES) {
            const b = this._makeButton(55, 168, 12, 15);
            b.id = 'play';
            b.images = IMAGES.PlayBtn;
            b.style.backgroundImage = "url(" + b.images[0].src + ")";
            b.addEventListener("click", this._onPlayListener(this));
            this._pseudoSheet?.insertRule('#play:focus {outline: none !important;}', 0);
            this._container.appendChild(b);
        }
    }

    private _initStopButton() {
        const { IMAGES } = this.ASSETS;
        if (IMAGES) {
            const b = this._makeButton(21, 168, 16, 15);
            b.id = 'stop';
            b.disabled = false;
            // stopbtn image including loop button (next)
            const imgs = IMAGES.StopBtn;
            b.images = [imgs[0], imgs[1]];
            b.style.backgroundImage = "url(" + b.images[1].src + ")";
            b.addEventListener("click", this._onStopListener(this));
            if (this._pseudoSheet) this._pseudoSheet.insertRule('#stop:focus {outline: none !important;}', 0);
            this._container.appendChild(b);
        }
    }

    private _initLoopButton() {
        const { IMAGES } = this.ASSETS;
        const sequencer = this;
        if (IMAGES) {
            const imgs = IMAGES.StopBtn;
            const b = this._makeButton(85, 168, 16, 15);
            b.id = 'loop';
            b.images = [imgs[2], imgs[3]]; // made in Stop button (above)
            b.style.backgroundImage = "url(" + b.images[0].src + ")";
            this.curScore.loop = false;
            b.addEventListener("click", function(e) {
                let num;
                if (sequencer.curScore.loop) {
                sequencer.curScore.loop = false;
                num = 0;
                } else {
                sequencer.curScore.loop = true;
                num = 1;
                }
                this.style.backgroundImage = "url(" + this.images[num].src + ")";
                sequencer.ASSETS.SOUNDS[17].play(8);
            });
            b.reset = function () {
                sequencer.curScore.loop = false;
                this.style.backgroundImage = "url(" + this.images[0].src + ")";
            };
            b.set   = function () {
                sequencer.curScore.loop = true;
                this.style.backgroundImage = "url(" + this.images[1].src + ")";
            }
            this._pseudoSheet?.insertRule('#loop:focus {outline: none !important;}', 0);
            this._container.appendChild(b);
        }
    }

    private _initScrollRange() {
        const { MAGNIFY } = this.CONST;
        const sequencer = this;
        const r = document.createElement('input') as HTMLInputElement;
        r.id = 'scroll';
        r.type = 'range';
        r.value = "0";
        r.max = (this._curMaxBars - 6).toString();
        r.min = "0";
        r.step = "1";
        (r.style as any)['-webkit-appearance']='none';
        (r.style as any)['border-radius'] = '0px';
        (r.style as any)['background-color'] = '#F8F8F8';
        (r.style as any)['box-shadow'] = 'inset 0 0 0 #000';
        (r.style as any)['vertical-align'] = 'middle';
        r.style.position = 'absolute';
        r.style.margin = "0";
        r.originalX = 191;
        r.originalY = 159;
        r.originalW = 50;
        r.originalH = 7;
        this._moveDOM(r, r.originalX, r.originalY);
        this._resizeDOM(r, r.originalW, r.originalH);
        r.redraw = () => {
            this._moveDOM(r, r.originalX, r.originalY);
            this._resizeDOM(r, r.originalW, r.originalH);
        };
        r.addEventListener("input", function(e) {
            sequencer.curPos = parseInt(this.value);
        });
        this._container.appendChild(r);

        // It's very hard to set values to a pseudo element with JS.
        // http://pankajparashar.com/posts/modify-pseudo-elements-css/
        this._pseudoSheet?.insertRule('#scroll::-webkit-slider-thumb {' +
            "-webkit-appearance: none !important;" +
            "border-radius: 0px;" +
            "background-color: #A870D0;" +
            "box-shadow:inset 0 0 0px;" +
            "border: 0px;" +
            "width: " + 5 * MAGNIFY + "px;" +
            "height:" + 7 * MAGNIFY + "px;}", 0
        );
        this._pseudoSheet?.insertRule('#scroll:focus {outline: none !important;}', 0);
    }

    private _initBeatButtons() {
        const { IMAGES } = this.ASSETS;
        const sequencer = this;
        if (IMAGES) {
            const imgs = IMAGES.BeatBtn;
            const b1 = this._makeButton(81, 203, 14, 15);
            b1.id = '3beats';
            b1.beats = 3;
            b1.images = [imgs[0], imgs[1]];
            b1.style.backgroundImage = "url(" + b1.images[0].src + ")";
            b1.disabled = false;
            this._container.appendChild(b1);
            
            const b2 = this._makeButton(96, 203, 14, 15);
            b2.id = '4beats';
            b2.beats = 4;
            b2.images = [imgs[2], imgs[3]];
            b2.style.backgroundImage = "url(" + b2.images[1].src + ")";
            b2.disabled = true;
            this._container.appendChild(b2);
            
            const func = function(self: HTMLButtonElement) {sequencer.curScore.beats = self.beats};
            
            b1.addEventListener("click", this._makeExclusiveFunction([b1, b2], 0, func));
            b2.addEventListener("click", this._makeExclusiveFunction([b1, b2], 1, func));
        }
    }

    private _initSongButtons() {
        const { IMAGES } = this.ASSETS;
        const sequencer = this;
        if (IMAGES) {
            const imgs = IMAGES.SongBtns;
            const b = ['frog','beak','1up'].map(function (id, idx) {
                const b = sequencer._makeButton(136 + 24 * idx, 202, 15, 17);
                b.id = id;
                b.num = idx;
                b.images = imgs.slice(idx * 3, idx * 3 + 3);
                b.style.backgroundImage = "url(" + b.images[0].src + ")";
                b.disabled = false;
                sequencer._container.appendChild(b);
                return b;
            });
            const func = function (self: HTMLButtonElement) {
                sequencer.curScore = sequencer._clone(EmbeddedSongs[self.num]);
                const tempoEl = document.getElementById("tempo") as HTMLInputElement;
                if (tempoEl) tempoEl.value = sequencer.curScore.tempo;
                const b = document.getElementById("loop") as HTMLButtonElement;
                if (sequencer.curScore.loop) b.set(); else b.reset();
                const s = document.getElementById("scroll") as HTMLInputElement;
                s.max = (sequencer.curScore.end - 5).toString();
                s.value = "0";
                sequencer.curPos = 0;
                sequencer._curSong = self;
                sequencer.drawScore(sequencer.curPos, sequencer.curScore['notes'], 0);
            };
            b[0].addEventListener("click", this._makeExclusiveFunction(b, 0, func));
            b[1].addEventListener("click", this._makeExclusiveFunction(b, 1, func));
            b[2].addEventListener("click", this._makeExclusiveFunction(b, 2, func));
        }
    }

    private _initEraserButton() {
        const { IMAGES } = this.ASSETS;
        const sequencer = this;
        if (IMAGES) {
            const imgs = IMAGES.SongBtns;
            const b = this._makeButton(40, 202, 15, 17);
            b.id = 'eraser';
            b.images = [imgs[9], imgs[10], imgs[11]]; // In the Song button images
            b.style.backgroundImage = "url(" + b.images[0].src + ")";
            this.TIMERS.eraser = new EasyTimer(200, function () {
                // If current is not end mark, just return;
                if (sequencer._curChar != 16) {
                this.switch = false;
                return;
                }
                this.currentFrame = (this.currentFrame == 0) ? 1 : 0;
            });
            this.TIMERS.eraser.currentFrame = 0;
            b.addEventListener("click", function() {
                sequencer.TIMERS.eraser.switch = true;
                sequencer._curChar = 16;
                sequencer.ASSETS.SOUNDS[17].play(8);
                sequencer._drawEraserIcon();
                sequencer._clearSongButtons();
                this.style.backgroundImage = "url(" + this.images[1].src + ")";
                if (sequencer.Layer2) sequencer.Layer2.style.cursor = 'url(' + this.images[2].src + ')' + ' 0 0, auto';
            });
            this._container.appendChild(b);
        }
    }

    private _initTempoRange() {
        const { MAGNIFY } = this.CONST;
        const { IMAGES } = this.ASSETS;
        const sequencer = this;
        if (IMAGES) {

            const r = document.createElement('input');
            r.id = "tempo";
            r.type = "range";
            r.value = "525";
            r.max = "1000";
            r.min = "50";
            r.step = "1";
            (r.style as any)['-webkit-appearance']='none';
            (r.style as any)['border-radius'] = '0px';
            (r.style as any)['background-color'] = 'rgba(0, 0, 0, 0.0)';
            (r.style as any)['box-shadow'] = 'inset 0 0 0 #000';
            (r.style as any)['vertical-align'] = 'middle';
            r.style.position = "absolute";
            r.style.margin = "0";
            r.originalX = 116;
            r.originalY = 172;
            r.originalW = 40;
            r.originalH = 8;
            this._moveDOM(r, r.originalX, r.originalY);
            this._resizeDOM(r, r.originalW, r.originalH);
            r.redraw = () => {
                this._moveDOM(r, r.originalX, r.originalY);
                this._resizeDOM(r, r.originalW, r.originalH);
            };
            r.addEventListener("input", function(e) {
                sequencer.curScore.tempo = parseInt(this.value);
            });
            this._container.appendChild(r);
    
            const t = IMAGES.ThumbSlider[0];
            r.image = t;
            // It's very hard to set values to a pseudo element with JS.
            // http://pankajparashar.com/posts/modify-pseudo-elements-css/
            this._pseudoSheet?.insertRule('#tempo::-webkit-slider-thumb {' +
                "-webkit-appearance: none !important;" +
                "background-image: url('" + t.src + "');" +
                "background-repeat: no-repeat;" +
                "background-size: 100% 100%;" +
                "border: 0px;" +
                "width: " + 5 * MAGNIFY + "px;" +
                "height:" + 8 * MAGNIFY + 'px;}', 0
            );
            this._pseudoSheet?.insertRule('#tempo:focus {outline: none !important;}', 0);
    
            // Prepare range's side buttons for inc/decrements
            const bLeft = this._makeButton(184, 158, 7, 9);
            bLeft.id = 'toLeft';
            bLeft.addEventListener("click", function (e) {
                const r = document.getElementById('scroll') as HTMLInputElement;
                let val = parseInt(r.value, 10);
                if (val > 0) {
                    sequencer.curPos = --val;
                }
            });
            this._container.appendChild(bLeft);
    
            const bRight = this._makeButton(241, 158, 7, 9);
            bRight.id = 'toRight';
            bRight.addEventListener("click", function (e) {
                const r = document.getElementById('scroll') as HTMLInputElement;
                let val = parseInt(r.value, 10);
                if (val < sequencer._curMaxBars - 6) {
                    sequencer.curPos = ++val;
                }
            });
            this._container.appendChild(bRight);
        }
    }

    private _initClearButton() {
        const { IMAGES } = this.ASSETS;
        if (IMAGES) {
            const b = this._makeButton(200, 176, 34, 16);
            b.id = 'clear';
            b.images = IMAGES.ClearBtn;
            b.style.backgroundImage = "url(" + b.images[0].src + ")";
            b.addEventListener("click", this._onClearListener(this));
            this._container.appendChild(b);
            this._pseudoSheet?.insertRule('#clear:focus {outline: none !important;}', 0);
        }
    }

    private _initBomb() {
        const { MAGNIFY } = this.CONST;
        const { IMAGES } = this.ASSETS;
        const sequencer = this;
        if (IMAGES && sequencer.L1C) {
            this.TIMERS.bomb = new EasyTimer(150, function() {
                const x = 9 * MAGNIFY;
                const y = 202 * MAGNIFY;
                const img = IMAGES.Bomb[this.currentFrame];
                if (sequencer.L1C) sequencer.L1C.drawImage(img, x, y);
                switch (this.currentFrame) {
                    case 0:
                        this.currentFrame = 1;
                        break;
                    case 1:
                        this.currentFrame = 0;
                        break;
                    case 2:
                        break;
                }
                if (sequencer._curSong == undefined || sequencer._gameStatus != GameStatus.Playing) return;
                sequencer._curSong.style.backgroundImage =
                    "url(" + sequencer._curSong.images[this.currentFrame + 1].src + ")";
            });
            this.TIMERS.bomb.switch = true; // always true for the bomb
            this.TIMERS.bomb.currentFrame = 0;
        }
    }

    private _initInstrumentButtons() {
        const { BUTTONS, SOUNDS, IMAGES } = this.ASSETS;
        const sequencer = this;
        if (IMAGES) {
            // Make buttons for changing a kind of notes.
            //   1st mario:   x=24, y=8, width=13, height=14
            //   2nd Kinopio: X=38, y=8, width=13, height=14
            //   and so on...
            const bimgs = IMAGES.CharSheet;
            for (let i = 0; i < 15; i++) {
                const b = this._makeButton((24 + 14 * i), 8, 13, 14);
                b.num = i;
                b.se = SOUNDS[i];
                b.se.image = bimgs[i];
                b.addEventListener("click", () => {
                    b.se.play(8); // Note F
                    this._curChar = b.num;
                    this._clearEraserButton();
                    this._changeCursor(b.num);
                    this._drawCurChar(b.se.image);
                });
                this._container.appendChild(b);
                BUTTONS[i] = b;
            }
        }
    }

    private async _initLayers() {
        const { MAGNIFY, ORGHEIGHT, ORGWIDTH, SCRHEIGHT } = this.CONST;
        const i = this._getImageElFromPath;

        // Check specified container has necessary canvas layers, if not create them
        let layer1 = document.querySelector('#layer1') as HTMLCanvasElement;
        let layer2 = document.querySelector('#layer2') as HTMLCanvasElement;
        if (layer1) {
            this.Layer1 = layer1;
        } else {
            layer1 = document.createElement('canvas');
            layer1.id = "layer1";
            layer1.classList.add("game");
            this._container.appendChild(layer1);
            this.Layer1 = layer1;
        }
        if (layer2) {
            this.Layer2 = layer2;
        } else {
            layer2 = document.createElement('canvas');
            layer2.id = "layer2";
            layer2.classList.add("game");
            this._container.appendChild(layer1);
            this.Layer2 = layer2;
        }

        // Store drawing context(s)
        this.L1C = this.Layer1.getContext('2d');
        this.L2C = this.Layer2.getContext('2d');
        if (this.L1C) this.L1C.imageSmoothingEnabled = false;
        if (this.L2C) this.L2C.imageSmoothingEnabled = false;

        // Draw background
        this.Layer1.width = ORGWIDTH * MAGNIFY;
        this.Layer1.height = ORGHEIGHT * MAGNIFY;
        this.Layer2.width = ORGWIDTH * MAGNIFY;
        this.Layer2.height = SCRHEIGHT * MAGNIFY;
        const bg = await i("image/mat.png");
        if (this.L1C) this.L1C.drawImage(bg, 0, 0, bg.width * MAGNIFY, bg.height * MAGNIFY);
        // bg.onload = () => {
        // }
    }

    private _initEndMarkButton() {
        const { MAGNIFY } = this.CONST;
        const { IMAGES } = this.ASSETS;
        if (IMAGES) {
            const sequencer = this;
            const b = this._makeButton(235, 8, 13, 14);
            b.images = IMAGES.EndMarkBtn;
            this.TIMERS.endMark = new EasyTimer(150, function () {
                // If current is not end mark, just return;
                if (sequencer._curChar != 15) {
                    this.switch = false;
                    return;
                }
                this.currentFrame = (this.currentFrame == 0) ? 1 : 0;
                if (sequencer.Layer2) sequencer.Layer2.style.cursor = 'url(' + this.images[this.currentFrame].src + ')' +
                7 * MAGNIFY +' '+ 7 * MAGNIFY + ', auto';
            }, b.images);
            b.addEventListener("click", () => {
                this.TIMERS.endMark.switch = true;
                this._curChar = 15;
                this.ASSETS.SOUNDS[15].play(8);
                this._clearEraserButton();
                this._drawEndMarkIcon(b.images[0]);
            });
            this._container.appendChild(b);
            this.ASSETS.BUTTONS[15] = b;
        }
    }

    private _initScreen() {
        const { SOUNDS } = this.ASSETS;
        this.curPos = 0;
        this._curChar = 0;
        const img = SOUNDS[this._curChar].image;
        if (img) {
            this._drawCurChar(img);
        }
        this._changeCursor(this._curChar);
        this.drawScore(this.curPos, this.curScore['notes'], 0);
        window.requestAnimFrame(this._doAnimation);
    }

    private _initMario() {
        this._mario = new Mario(this);
    }

    private _makeExclusiveFunction(doms: HTMLButtonElement[], num: number, success: (el: HTMLButtonElement) => void) {
        const sequencer = this;
        const clone = doms.slice(0); // Clone the Array
        const self = clone[num];
        clone.splice(num, 1); // Remove No.i element
        const theOthers = clone;

        return function(this: HTMLButtonElement, e: MouseEvent) {
            // Sound Off for file loading
            if (!(e as any).soundOff) sequencer.ASSETS.SOUNDS[17].play(8);
            this.disabled = true;
            this.style.backgroundImage = "url(" + this.images[1].src + ")";
            theOthers.map(function (x) {
                x.disabled = false;
                x.style.backgroundImage = "url(" + x.images[0].src + ")";
            });
            success(self);
        };
    }

    //#endregion 

    //#region button event listeners

    private _onPlayListener(sequencer: MarioSequencer) {
        return function (this: HTMLButtonElement, e: MouseEvent) {
            this.style.backgroundImage = "url(" + this.images[1].src + ")";
            sequencer.ASSETS.SOUNDS[17].play(8);
            const b = document.getElementById("stop") as HTMLButtonElement;
            b.style.backgroundImage = "url(" + b.images[0].src + ")";
            b.disabled = false;
            this.disabled = true; // Would be unlocked by stop button

            ["toLeft", "toRight", "scroll", "clear", "frog", "beak", "1up"].
                map(function (id) {
                    (document.getElementById(id) as HTMLButtonElement).disabled = true;
                });

            sequencer._gameStatus = GameStatus.MarioEntering; // Mario Entering the stage
            sequencer.curPos = 0;     // doAnimation will draw POS 0 and stop
            sequencer._mario?.init();
            window.requestAnimFrame(sequencer._doMarioEnter);
        };
    }

    private _onStopListener(sequencer: MarioSequencer) {
        return function (this: HTMLButtonElement, e: MouseEvent) {
            this.style.backgroundImage = "url(" + this.images[1].src + ")";
            // Sound ON: click , OFF: called by doMarioPlay
            if (e != undefined) sequencer.ASSETS.SOUNDS[17].play(8);
            const b = document.getElementById("play") as HTMLButtonElement;
            b.style.backgroundImage = "url(" + b.images[0].src + ")";
            //b.disabled = false; // Do after Mario left the stage
            this.disabled = true; // Would be unlocked by play button

            sequencer._gameStatus = GameStatus.MarioLeaving; // Mario leaves from the stage
            sequencer._mario?.init4leaving();
            if (sequencer._animeId != 0) cancelAnimationFrame(sequencer._animeId);
            window.requestAnimFrame(sequencer._doMarioLeave);
        }
    }

    private _onClearListener(sequencer: MarioSequencer) {
        return function (this: HTMLButtonElement, e: MouseEvent) {
            this.style.backgroundImage = "url(" + this.images[1].src + ")";
            sequencer.ASSETS.SOUNDS[19].play(8);
            const btn = this;
            function makePromise(num: number) {
                return new Promise<void>(function (resolve, reject) {
                    setTimeout(function() {
                        btn.style.backgroundImage = "url(" + btn.images[num].src + ")";
                        resolve()
                    }, 150);
                });
            }

            makePromise(2).then(function () {
                return makePromise(1);
            }).then(function () {
                return makePromise(0);
            }).then(function () {
                sequencer._initMusicScore();
                sequencer.curPos = 0;
            });

            sequencer._clearSongButtons();
        }
    }

    /**
     * Initialises score when file loaded
     */
    private _fullInitScore() {
        this.curScore.notes = [];
        this._curMaxBars = 0;
        this.curScore.beats = 4;
        // Loop button itself has a state, so keep current value;
        // CurScore.loop = false;
        this.curScore.end = 0;
        this.curScore.tempo = 0;
    }

    /**
     * Initialises the music / score
     */
    private _initMusicScore() {
        const { DEFAULTMAXBARS, DEFAULTTEMPO} = this.CONST;
        const tmpa = [];
        for (let i = 0; i < DEFAULTMAXBARS; i++) tmpa[i] = [];
        this.curScore.notes = tmpa;
        this._curMaxBars = DEFAULTMAXBARS;
        const s = document.getElementById("scroll") as HTMLInputElement;
        s.max = (DEFAULTMAXBARS - 6).toString();
        s.value = "0";
        this.curScore.loop = false;
        (document.getElementById("loop") as HTMLButtonElement)?.reset();
        this.curScore.end = DEFAULTMAXBARS - 1;
        this.curScore.tempo = DEFAULTTEMPO;
        const tempoInput = document.getElementById("tempo") as HTMLInputElement;
        if (tempoInput) tempoInput.value = DEFAULTTEMPO.toString();
        this.curScore.beats = 4;
        const e = new Event("click");
        (e as any).soundOff = true;
        const beatBtn = document.getElementById("4beats") as HTMLButtonElement;
        if (beatBtn) beatBtn.dispatchEvent(e);
    }

    private _reInitButtonsFromScore() {
        const b = document.getElementById(this.curScore.beats == 3 ? '3beats' : '4beats') as HTMLButtonElement;
        const e = new Event("click");
        (e as any).soundOff = true;
        b.dispatchEvent(e);

        const r = document.getElementById('scroll') as HTMLInputElement;
        this._curMaxBars = this.curScore.end + 1;
        r.max = (this._curMaxBars - 6).toString();
        r.value = "0";
        this.curPos = 0;

        const tempoRange = document.getElementById("tempo") as HTMLInputElement;
        let tempo = this.curScore.notes[0][0];
        if (typeof tempo == "string" && tempo.substr(0, 5) == "TEMPO") {
            tempo = tempo.split("=")[1];
            this.curScore.tempo = tempo;
            tempoRange.value = tempo;
        }
    }

    private _addMSQ(text: string) {
        const lines = text.split(/\r\n|\r|\n/);
        const keyword = ["SCORE", "TEMPO", "LOOP", "END", "TIME44"];
        const values: any = {};
        lines.forEach(function(line, i) {
            if (line === "") return;
            const kv = line.split("=");
            const k = kv[0];
            const v = kv[1];
            if (i < keyword.length && k !== keyword[i]) {
                throw new Error("Line " + i + " must start with '" + keyword[i] + "'");
            }
            values[k] = v;
        });

        const oldEnd = this.curScore.end;
        const s = values.SCORE;
        let i = 0, count = this.curScore.end;
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
            this.curScore.notes[count++] = bar;
        }

        this.curScore.end  += parseInt(values.END) - 1;
        if (this.curScore.tempo != values.TEMPO)
            this.curScore.notes[oldEnd].splice(0, 0, "TEMPO=" + values.TEMPO);
        this.curScore.tempo = values.TEMPO;
        const beats = (values.TIME44 == "TRUE") ? 4 : 3;
        this.curScore.beats = beats;
        // click listener will set CurScore.loop
        const b = document.getElementById("loop") as HTMLButtonElement;
        (values.LOOP == "TRUE") ? b.set() : b.reset();
    }

    private _addJSON(text: string) {
        const json = JSON.parse(text);
        for (let i = 0; i < json.end; i++)
            this.curScore.notes.push(json.notes[i]);

        const notes = this.curScore.notes[this.curScore.end];
        if (this.curScore.tempo != json.tempo && notes.length != 0) {
            const tempostr = notes[0];
            if (typeof tempostr != "string") {
                notes.splice(0, 0, "TEMPO=" + json.tempo);
            }
        }
        this.curScore.tempo = json.tempo;

        this.curScore.end += json.end;

        const b = document.getElementById("loop") as HTMLButtonElement;
        if (this.curScore.loop) b.set; else b.reset();
    }

    //#endregion

    //#region mouse event listeners 

    private _onMouse(e: MouseEvent) {
        const { OFFSETLEFT, OFFSETTOP } = this.CONST;
        const { SOUNDS } = this.ASSETS;
        if (this._gameStatus != GameStatus.Edit) return;
        e.preventDefault();

        const realX = e.clientX - OFFSETLEFT;
        const realY = e.clientY - OFFSETTOP;

        const g = this._toGrid(realX, realY);
        if (g == false) return;
        const gridX = g[0];
        let gridY = g[1];

        // Map logical x to real bar number
        const b = this.curPos + gridX - 2;

        // process End Mark
        if (this._curChar == 15) {
            this.curScore.end = b;
            return;
        }

        if (b >= this.curScore.end) return;

        const notes = this.curScore['notes'][b];
        // Delete
        if (this._curChar == 16 || e.button == 2) {
            // Delete Top of the stack
            for (let i = notes.length - 1; i >= 0; i--) {
            if ((notes[i] & 0x3F) == gridY) {
                notes.splice(i, 1);
                this.curScore.notes[b] = notes;
                SOUNDS[17].play(8);
                break;
            }
            }
            return;
        }

        let note = (this._curChar << 8) | gridY;
        if (notes.indexOf(note) != -1) return;
        
        // Handle semitone
        if (e.shiftKey) gridY |= 0x80;
        if (e.ctrlKey ) gridY |= 0x40;
        SOUNDS[this._curChar].play(gridY);
        note = (this._curChar << 8) | gridY;
        notes.push(note);
        this.curScore['notes'][b] = notes;
    }

    private _onMouseMove(e: MouseEvent) {
        this._mouseX = e.clientX;
        this._mouseY = e.clientY;
    }

    private _readDroppedFiles(e: DragEvent) {
        const sequencer = this;
        e.preventDefault();
        this._clearSongButtons();
        this._fullInitScore();
        // function to read a given file
        // Input is a instance of a File object.
        // Returns a instance of a Promise.
        function readFile(file: File) {
            return new Promise<FileReader|null>(function(resolve, reject) {
                var reader = new FileReader();
                (reader as any).name = file.name;
                reader.addEventListener("load", function(e) {
                    resolve(e.target);
                });
                reader.readAsText(file, 'shift-jis');
            });
        }

        if (e.dataTransfer) {
            // FileList to Array for Mapping
            var files = [].slice.call(e.dataTransfer.files);
            // Support Mr.Phenix's files. He numbered files with decimal numbers :-)
            // http://music.geocities.jp/msq_phenix/
            // For example, suite15.5.msq must be after the suite15.msq
            files.sort(function(a: File,b: File) {
                var n1 = a.name;
                var n2 = b.name;
                function strip(name: string) {
                    let n = /\d+\.\d+|\d+/.exec(name);
                    if (n == null) return 0;
                    if (!n[0]) return 0;
                    return parseFloat(n[0]);
                }
                return strip(n1) - strip(n2);
            });
            files.map(readFile).reduce(function(chain, fp, idx) {
                return chain.then(function() {
                    return fp;
                }).then(function(fileReader: FileReader|null) {
                    if (fileReader) {
                        var ext = (fileReader as any).name.slice(-3);
                        if (ext == "msq") {
                            sequencer._addMSQ(fileReader.result as string);
                        } else {
                            sequencer._addJSON(fileReader.result as string);
                        }
                    }
                }).catch(function(err) {
                    alert("Loading MSQ failed: " + err.message);
                    console.log(err);
                });
            }, Promise.resolve())
            .then(this._reInitButtonsFromScore);
        }

        return false;
    }

    //#endregion

    //#region keyboard event listeners

    private _initKeyboardEventListeners() {
        const sequencer = this;
        document.addEventListener('keydown',function(e) {
            const playBtn = document.getElementById('play') as HTMLButtonElement;
            const stopBtn = document.getElementById('stop') as HTMLButtonElement;
            const r = document.getElementById('scroll') as HTMLInputElement;
            let val: number;
            switch (e.keyCode) {
              case 32: // space -> play/stop or restart with shift
                if (playBtn.disabled == false || e.shiftKey) {
                  sequencer._onPlayListener.call(playBtn, sequencer);
                } else {
                    
                  sequencer._onStopListener.call(stopBtn, sequencer);
                }
                e.preventDefault();
                break;
        
              case 37: // left -> scroll left
                val = parseInt(r.value, 10);
                if (val > 0) sequencer.curPos = --val;
                e.preventDefault();
                break;
        
              case 39: // right -> scroll right
                val = parseInt(r.value, 10);
                if (val < sequencer._curMaxBars - 6) sequencer.curPos = ++val;
                e.preventDefault();
                break;
            }
        });
    }

    //#endregion

    //#region clear button functions

    private _clearEraserButton() {
        const b = document.getElementById('eraser') as HTMLButtonElement;
        b.style.backgroundImage = "url(" + b.images[0].src + ")";
        this.TIMERS.eraser.switch = false;
    }

    private _clearSongButtons() {
        ['frog','beak','1up'].map(function (id, idx) {
            const b = document.getElementById(id) as HTMLButtonElement;
            b.disabled = false;
            b.style.backgroundImage = "url(" + b.images[0].src + ")";
        });
        this._curSong = undefined;
    }

    //#endregion

    //#region draw functions

    private _changeCursor(num: number) {
        const { HALFCHARSIZE } = this.CONST;
        const { SOUNDS } = this.ASSETS;
        const SCREEN = this.Layer2;
        const img = SOUNDS[num].image;
        if (SCREEN && img) {
            SCREEN.style.cursor = 'url(' + img.src + ')' + HALFCHARSIZE +' '+ HALFCHARSIZE + ', auto';
        }
    }

    private _drawCurChar(image: HTMLImageElement) {
        const { CHARSIZE, MAGNIFY } = this.CONST;
        const x = 4 * MAGNIFY;
        const y = 7 * MAGNIFY;
        if (this.L1C) {
            this.L1C.beginPath();
            this.L1C.imageSmoothingEnabled = false;
            this.L1C.clearRect(x, y, CHARSIZE, CHARSIZE);
            this.L1C.drawImage(image, x, y);
            this.L1C.fillRect(x, y, CHARSIZE, MAGNIFY);
            this.L1C.fillRect(x, y + CHARSIZE - MAGNIFY, CHARSIZE, MAGNIFY);
        }
    }

    public drawScore(pos: number, notes: number[][], scroll: number) {
        // Score Area (8, 41) to (247, 148)
        const { CHARSIZE, HALFCHARSIZE, MAGNIFY, OFFSETLEFT, OFFSETTOP, SCRHEIGHT } = this.CONST;
        const { IMAGES, SOUNDS } = this.ASSETS;
        const SCREEN = this.Layer2;
        if (this._mario && IMAGES && SCREEN && this.L1C && this.L2C) {
            // Clip only X
            this.L2C.clearRect(0, 0, SCREEN.width, SCREEN.height);
            this.L2C.save();
            this.L2C.rect(8 * MAGNIFY, 0, (247 - 8 + 1) * MAGNIFY, SCRHEIGHT * MAGNIFY);
            this.L2C.clip();

            // If mouse cursor on or under the C, draw horizontal line
            const realX: number = this._mouseX - OFFSETLEFT;
            const realY: number = this._mouseY - OFFSETTOP;
            const g: boolean | number[] = this._toGrid(realX, realY);
            let gridX: number | undefined;
            let gridY: number | undefined;
            // Edit mode only, no scroll
            if (this._gameStatus == GameStatus.Edit && g !== false) {
                gridX = g[0];
                gridY = g[1];
                if (gridY >= 11) this._drawHorizontalBar(gridX, 0);
            }

            if (this.ASSETS.IMAGES && pos == 0) {
                const w = this.ASSETS.IMAGES.GClef.width;
                const h = this.ASSETS.IMAGES.GClef.height;
                
                // GClef image is NOT magnified yet.
                this.L2C.drawImage(
                    this.ASSETS.IMAGES.GClef,
                    0, 0, w, h,
                    (9 - scroll) * MAGNIFY, 
                    48 * MAGNIFY, 
                    w * MAGNIFY, 
                    h * MAGNIFY
                );

                if (this.curScore.loop) {
                this._drawRepeatHead(41 - scroll);
                }
            } else if (pos == 1 && this.curScore.loop) {
                this._drawRepeatHead(9 - scroll);
            }

            //ORANGE #F89000
            const beats = this.curScore.beats;
            // orange = 2, 1, 0, 3, 2, 1, 0, 3, ..... (if beats = 4)
            //        = 2, 1, 0, 2, 1, 0, 2, 1, ..... (if beats = 3)
            const orange = (beats == 4) ? 3 - ((pos + 1) % 4) : 2 - ((pos + 3) % 3);
            let i = (pos < 2) ? (2 - pos) : 0;
            for (; i < 9; i++) {
                const xorg = 16 + 32 * i - scroll;
                const x = xorg * MAGNIFY;
                const barnum = pos + i - 2;

                if (barnum == this.curScore.end) {
                    const img = this.curScore.loop ? IMAGES.Repeat[1] : IMAGES.EndMark;
                    this.L2C.drawImage(img, x - 7 * MAGNIFY, 56 * MAGNIFY);
                }

                this.L2C.beginPath();
                this.L2C.setLineDash([MAGNIFY, MAGNIFY]);
                this.L2C.lineWidth = MAGNIFY;
                if (i % beats == orange) {
                    if (this._gameStatus == GameStatus.Edit) this._drawBarNumber(i, barnum / beats + 1);
                    this.L2C.strokeStyle = '#F89000';
                } else {
                    this.L2C.strokeStyle = '#A0C0B0';
                }
                this.L2C.moveTo(x,  41 * MAGNIFY);
                this.L2C.lineTo(x, 148 * MAGNIFY);
                this.L2C.stroke();

                const b = notes[barnum];
                if (b == undefined) continue;

                // Get notes down
                let delta = 0;
                if (this._gameStatus == GameStatus.Playing  && this._mario.pos - 2 == barnum) {
                    let idx;
                    if (this._mario.x == 120) {
                        idx = (this._mario.scroll >= 16) ? this._mario.scroll - 16 : this._mario.scroll + 16;
                    } else {
                        idx = this._mario.x + 8 - xorg;
                    }
                    const tbl = [0, 1, 2, 3, 3, 4, 5, 5, 6, 6, 7, 7, 8, 8, 8, 8,
                                8, 8, 8, 8, 8, 7, 7, 6, 6, 5, 5, 4, 3, 3, 2, 1, 0];
                    delta = tbl[Math.round(idx)];
                }
                let hflag = false;
                for (let j = 0; j < b.length; j++) {
                    if (typeof b[j] == "string") continue; // for dynamic TEMPO

                    const sndnum = b[j] >> 8;
                    const scale  = b[j] & 0x0F;

                    // When CurChar is eraser, and the mouse cursor is on the note,
                    // an Image of note blinks.
                    if (this._curChar == 16 && g != false && i == gridX && scale == gridY &&
                        this.TIMERS.eraser.currentFrame == 1) {continue;}

                    if (!hflag && (scale >= 11)) {
                        hflag = true;
                        this._drawHorizontalBar(i, scroll);
                    }
                    const soundImage = SOUNDS[sndnum].image;
                    if (soundImage) {
                        this.L2C.drawImage(soundImage, x - HALFCHARSIZE,
                            (40 + scale * 8 + delta) * MAGNIFY);
                    } 

                    const x2 = (x - 13 * MAGNIFY);
                    const y = (44 + scale * 8 + delta) * MAGNIFY;
                    if ((b[j] & 0x80) != 0) {
                        this.L2C.drawImage(IMAGES.Semitone[0], x2, y);
                    } else if ((b[j] & 0x40) != 0) {
                        this.L2C.drawImage(IMAGES.Semitone[1], x2, y);
                    }
                }
            }
            if (this._gameStatus == GameStatus.Edit && gridX && gridY) {
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

    private _drawEndMarkIcon(img: HTMLImageElement) {
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

    private _drawEraserIcon() {
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

    private _doMarioEnter(timeStamp: number) {
        this.TIMERS.bomb.checkAndFire(timeStamp);
        this.drawScore(0, this.curScore.notes, 0);
        if (this._mario) {
            this._mario.enter(timeStamp);
    
            if (this._mario.x < 40) {
                this._animeId = window.requestAnimFrame(this._doMarioEnter);
            } else {
                this._mario.init4playing(timeStamp);
                this._gameStatus = GameStatus.Playing;
                this._animeId = window.requestAnimFrame(this._doMarioPlay);
            }
        }
    }

    private _doMarioPlay(timeStamp: number) {
        this.TIMERS.bomb.checkAndFire(timeStamp);
        if (this._mario) {
            this._mario.play(timeStamp);
            if (this._gameStatus == GameStatus.Playing) {
                if (this._mario.pos - 2 != this.curScore.end - 1) {
                    this._animeId = window.requestAnimFrame(this._doMarioPlay);
                } else if (this.curScore.loop) {
                    this.curPos = 0;
                    this._mario.pos = 1;
                    this._mario.x = 40;
                    this._mario.init4playing(timeStamp);
                    this._animeId = window.requestAnimFrame(this._doMarioPlay);
                } else {
                    // Calls stopListener without a event arg
                    const stopBtn = document.getElementById('stop') as HTMLButtonElement;
                    const e = new MouseEvent("click");
                    if (stopBtn) {
                        this._onStopListener(this).call(stopBtn, e);
                    }
                }
            }
        }
    }

    private _doMarioLeave(timeStamp: number) {
        this.TIMERS.bomb.checkAndFire(timeStamp);
        if (this._mario) {
            this.drawScore(this.curPos, this.curScore.notes, this._mario.scroll);
            this._mario.leave(timeStamp);
    
            if (this._mario.x < 247) {
                window.requestAnimFrame(this._doMarioLeave);
            } else {
                this._gameStatus = GameStatus.Edit;
    
                ["toLeft", "toRight", "scroll", "play", "clear", "frog", "beak", "1up"].
                map(function (id) {
                    (document.getElementById(id) as HTMLButtonElement).disabled = false;
                });
    
                window.requestAnimFrame(this._doAnimation);
            }
        }
    }

    private _doAnimation(time: number) {
        if (!this._resizing) {
            this.TIMERS.bomb?.checkAndFire(time);
            this.TIMERS.eraser?.checkAndFire(time);
            this.TIMERS.endMark?.checkAndFire(time);
    
            this.drawScore(this.curPos, this.curScore['notes'], 0);
    
            if (this._gameStatus != GameStatus.Edit) return;
        }

        window.requestAnimFrame(this._doAnimation);
    }

    public scheduleAndPlay(notes: (string|number)[], time: number) {
        const { SOUNDS } = this.ASSETS;
        if (time < 0) time = 0;
        if (notes == undefined || notes.length == 0) return;
        const dic: Record<number, number[]> = {};
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];

            // Dynamic tempo change
            if (typeof note == "string") {
                const tempo = note.split("=")[1];
                this.curScore.tempo = tempo;
                const tempoEl = document.getElementById("tempo") as HTMLInputElement;
                if (tempoEl) tempoEl.value = tempo;
                continue;
            }

            const num = note >> 8;
            const scale = note & 0xFF;
            if  (!dic[num]) dic[num] = [scale];
            else dic[num].push(scale);
        }
        for (let i in dic) {
            SOUNDS[i].playChord(dic[i], time / 1000); // [ms] -> [s]
        }
    }

    //#endregion

    //#region button image util functions

    private async _getImageElFromPath(path: string) {
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.src = path;
            image.onload = () => {
                resolve(image);
            };
            image.onerror = () => {
                // handle later
            }
        });
    }

    private _makeButton(x: number, y: number, w: number, h: number) {
        const b = document.createElement("button");
        b.className = "game";
        b.style.position = 'absolute';
        this._moveDOM(b, x, y);
        this._resizeDOM(b, w, h);
        b.style.zIndex = "3";
        b.style.background = "rgba(0,0,0,0)";

        // Save position and size for later use
        b.originalX = x;
        b.originalY = y;
        b.originalW = w;
        b.originalH = h;
        b.redraw = () => {
            this._moveDOM(b, b.originalX, b.originalY);
            this._resizeDOM(b, b.originalW, b.originalH);
        }
        return b;
    }

    private _sliceImage(img: HTMLImageElement, width: number, height: number) {
        const { MAGNIFY } = this.CONST;
        const result: HTMLImageElement[] = [];
        const imgw = img.width * MAGNIFY;
        const imgh = img.height * MAGNIFY;
        const num = Math.floor(img.width / width);
        const all = num * Math.floor(img.height / height);
        const charw = width * MAGNIFY;
        const charh = height * MAGNIFY;

        for (let i = 0; i < all; i++) {
            const tmpcan = document.createElement("canvas");
            tmpcan.width  = charw;
            tmpcan.height = charh;
            const tmpctx = tmpcan.getContext('2d');
            if (tmpctx) {
                tmpctx.imageSmoothingEnabled = false;
                tmpctx.drawImage(
                    img, 
                    (i % num) * width, Math.floor(i / num) * height,
                    width, height, 0, 0, charw, charh
                );
            }
            const charimg = new Image();
            charimg.src = tmpcan.toDataURL();
            result[i] = charimg;
        }
        return result;
    }

    private _resizeDOM(b: HTMLButtonElement | HTMLInputElement, w: number, h: number) {
        const { MAGNIFY } = this.CONST;
        b.style.width = w * MAGNIFY + "px";
        b.style.height = h * MAGNIFY + "px";
    }
      
    private _moveDOM(b: HTMLButtonElement | HTMLInputElement, x: number, y: number) {
        const { MAGNIFY } = this.CONST;
        b.style.left = x * MAGNIFY + "px";
        b.style.top = y * MAGNIFY + "px";
    }

    private async _resizeScreen(newMagnify: number) {
        let { CHARSIZE, HALFCHARSIZE, MAGNIFY, ORGWIDTH, ORGHEIGHT, OFFSETLEFT, OFFSETTOP, SCRHEIGHT } = this.CONST;
        this._resizing = true;

        const clearCanvas = () => {
            if (this.L1C) {
                this.L1C.clearRect(0, 0, ORGWIDTH * MAGNIFY, ORGHEIGHT * MAGNIFY);
            }
            if (this.L2C) {
                this.L2C.clearRect(0, 0, ORGWIDTH * MAGNIFY, SCRHEIGHT * MAGNIFY);
            }
        };

        MAGNIFY = newMagnify;
        CHARSIZE = 16 * MAGNIFY;
        HALFCHARSIZE = Math.floor(CHARSIZE / 2);

        this._container.style.width  = ORGWIDTH  * MAGNIFY + "px";
        this._container.style.height = ORGHEIGHT * MAGNIFY + "px";
        OFFSETLEFT = this._container.offsetLeft;
        OFFSETTOP  = this._container.offsetTop;

        clearCanvas();

        this.CONST = {
            ...this.CONST,
            CHARSIZE,
            HALFCHARSIZE,
            MAGNIFY,
            OFFSETLEFT,
            OFFSETTOP
        };
        
        this._container.querySelectorAll('button.game, input[type="range"]').forEach((element) => {
            element.remove();
        });
        await this.init();

        this._resizing = false;
    }

    //#endregion

    //#region file handling 

    private _download() {
        const link = document.createElement("a");
        link.download = 'MSQ_Data.json';
        const json = JSON.stringify(this.curScore);
        const blob = new Blob([json], {type: "octet/stream"});
        const url = window.URL.createObjectURL(blob);
        link.href = url;
        link.click();
    }

    //#endregion

    private _toGrid(realX: number, realY: number) {
        const { CHARSIZE, HALFCHARSIZE, MAGNIFY } = this.CONST;
        const gridLeft   = (8   + 0) * MAGNIFY;
        const gridTop    = (41     ) * MAGNIFY;
        const gridRight  = (247 - 4) * MAGNIFY;
        const gridBottom = (148 - 4) * MAGNIFY;
        if (realX < gridLeft || realX > gridRight ||
            realY < gridTop  || realY > gridBottom)
            return false;

        let gridX = Math.floor((realX - gridLeft) / CHARSIZE);
        if (gridX % 2 != 0) return false; // Not near the bar
        gridX /= 2;
        const gridY = Math.floor((realY - gridTop) / HALFCHARSIZE);

        // Consider G-Clef and repeat head area
        if (this.curPos == 0 && gridX < 2 || this.curPos == 1 && gridX == 0)
            return false;
        else
            return [gridX, gridY];
    }

    private _clone(obj: any) {
        return JSON.parse(JSON.stringify(obj));
    }
}

new MarioSequencer('#app');