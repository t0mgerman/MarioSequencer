import { MarioSequencer } from "./app";
import { 
    BeatButton, 
    GameStatus, 
    InstrumentButton, 
    ISequencerBtnCreationArgs, 
    MarioSequencerSong, 
    SequencerBtnEvent, 
    SequencerButton, 
    SequencerSlider, 
    ToggleButton 
} from "./app.types";
import { Mario } from "./mario";
import EmbeddedSongs from "./songs";
import EasyTimer from "./timer";
import { EmitClickEvent } from "./eventHandling";
import Utils from "./utils";

import styles from "./app.module.scss";

export namespace UI {
    export class Loader {
        private _sequencer: MarioSequencer;
        
        private _sliceImage: (...args: Parameters<typeof Utils.sliceImage>) => ReturnType<typeof Utils.sliceImage>;
        private _createButton: (...args: Parameters<typeof Utils.createButton>) => ReturnType<typeof Utils.createButton>;
        private _createChoiceGroupFunction: (...args: Parameters<typeof Utils.createChoiceGroupFunction>) => ReturnType<typeof Utils.createChoiceGroupFunction>;
    
        constructor(sequencer: MarioSequencer) {
            this._sequencer = sequencer;
            this._onMouse = this._onMouse.bind(this);
            this._onMouseMove = this._onMouseMove.bind(this);
            this._sliceImage = Utils.boundFn(sequencer, Utils.sliceImage);
            this._createButton = Utils.createButton.bind(sequencer);
            this._createChoiceGroupFunction = Utils.createChoiceGroupFunction.bind(sequencer);
        }
        public async init(reInit?: boolean) {
            // Prepare drawing surfaces / layers
            await this._initLayers();
    
            await this._initImageAssets(reInit);
    
            this._initBomb();
            this._initInstrumentButtons();
            this._initEndMarkButton();
            this._initPlayButton();
            this._initStopButton();
            this._initLoopButton();
            this._initScrollRange();
            this._initBeatButtons();
            this._initSongButtons();
            this._initUndoDog();
            this._initEraserButton();
            this._initTempoRange();
            this._initClearButton();
            this._sequencer.mario = new Mario(this._sequencer);
            
            if (!reInit) {
            
                this._sequencer.initMusicScore();
                this._initScreen();
                this._initKeyboardEventListeners();
                this._initMouseEvents();
    
            } 
        }
    
        /** Adds the necessary Canvas layers to the DOM, sizes them appropriately and stores a reference to the 2D Canvas Contexts in the App */
        private async _initLayers() {
            const s = this._sequencer;
            const { MAGNIFY, ORGHEIGHT, ORGWIDTH, SCRHEIGHT } = s.CONST;
            const i = Utils.getImageElFromPath;
    
            // Check specified container has necessary canvas layers, if not create them
            let layer1 = document.querySelector('#layer1') as HTMLCanvasElement;
            let layer2 = document.querySelector('#layer2') as HTMLCanvasElement;
            if (layer1) {
                s.Layer1 = layer1;
            } else {
                layer1 = document.createElement('canvas');
                layer1.id = "layer1";
                layer1.classList.add("game");
                s.container.appendChild(layer1);
                s.Layer1 = layer1;
            }
            if (layer2) {
                s.Layer2 = layer2;
            } else {
                layer2 = document.createElement('canvas');
                layer2.id = "layer2";
                layer2.classList.add("game");
                s.container.appendChild(layer1);
                s.Layer2 = layer2;
            }
    
            // Store drawing context(s)
            s.L1C = s.Layer1.getContext('2d');
            s.L2C = s.Layer2.getContext('2d');
            
            // Draw background
            s.Layer1.width = ORGWIDTH * MAGNIFY;
            s.Layer1.height = ORGHEIGHT * MAGNIFY;
            s.Layer2.width = ORGWIDTH * MAGNIFY;
            s.Layer2.height = SCRHEIGHT * MAGNIFY;
            if (s.L1C) s.L1C.imageSmoothingEnabled = false;
            if (s.L2C) s.L2C.imageSmoothingEnabled = false;
    
            const bg = await i("image/mat.png");
            if (s.L1C) s.L1C.drawImage(bg, 0, 0, bg.width * MAGNIFY, bg.height * MAGNIFY);       
        }
    
        /** Loads spritesheets so they can be used for image slicing and resize operations */
        private async _loadSpritesheets() {
            const s = this._sequencer;
            const i = Utils.getImageElFromPath;
            const Chars = await i("image/character_sheet.png");
            const Bomb = await i("image/bomb.png");
            const End = await i("image/end_mark.png");
            const PlayBtn = await i("image/play_button.png");
            const Repeat = await i("image/repeat_head.png");
            const Semitone = await i("image/semitone.png");
            const Numbers = await i("image/numbers.png");
            const Stop = await i("image/stop_button.png");
            const Beat = await i("image/beat_button.png");
            const Song = await i("image/song_buttons.png");
            const ThumbSlider = await i("image/slider_thumb.png");
            const ClearBtn = await i("image/clear_button.png");
            const Mario = await i("image/Mario.png");
            const UndoDog = await i("image/undo_dog.png");
            s.ASSETS.SPRITESHEETS = {
                Chars,
                Bomb,
                End,
                PlayBtn,
                Repeat,
                Semitone,
                Numbers,
                Stop,
                Beat,
                Song,
                ThumbSlider,
                ClearBtn,
                Mario,
                UndoDog
            };
        }
    
        /** Loads and stores sprite frames as separate HTMLImageElements. Recalculates on change to Magnify ie. when app is reinitialised */
        private async _initImageAssets(skipLoading?: boolean) {
            const s = this._sequencer;
            if (!skipLoading) {
                await this._loadSpritesheets();
            }
            const { SPRITESHEETS: ss } = s.ASSETS;
            const i = Utils.getImageElFromPath;
            if (ss) {
                const repeatMarks = this._sliceImage(ss.Repeat, 13, 62);
                s.ASSETS.IMAGES = {
                    Tools: this._sliceImage(ss.Chars, 16, 16),
                    Bomb: this._sliceImage(ss.Bomb, 14, 18),
                    GClef: await i("image/G_Clef.png"),
                    Numbers: this._sliceImage(ss.Numbers, 5, 7),
                    Mario: this._sliceImage(ss.Mario, 16, 22),
                    Sweat: await i("image/mario_sweat.png"),
                    PlayBtn: this._sliceImage(ss.PlayBtn, 12, 15),
                    StopBtn: this._sliceImage(ss.Stop, 16, 15),
                    ClearBtn: this._sliceImage(ss.ClearBtn, 34, 16),
                    ThumbSlider: this._sliceImage(ss.ThumbSlider, 5, 8),
                    BeatBtn: this._sliceImage(ss.Beat, 14, 15),
                    SongBtns: this._sliceImage(ss.Song, 15, 17),
                    EndMarkBtn: this._sliceImage(ss.End, 14, 13), // Note: Different size from the button,
                    EndMark: repeatMarks[2],
                    Semitone: this._sliceImage(ss.Semitone, 5, 12),
                    Repeat: repeatMarks,
                    UndoDog: this._sliceImage(ss.UndoDog, 14, 15),
                };
            }
        }
    
        /** Initialises the bomb icon. In the original Mario Paint, this button was how you exited the game's different modes
         * like the music composer and stamp editor. It isn't functional in this app, but we animate it all the same...
         */
        private _initBomb() {
            const s = this._sequencer;
            const { MAGNIFY } = s.CONST;
            const { IMAGES } = s.ASSETS;
            if (IMAGES && s.L1C) {
                s.TIMERS.bomb = new EasyTimer(150, function() {
                    const x = 9 * MAGNIFY;
                    const y = 202 * MAGNIFY;
                    const img = IMAGES.Bomb[this.currentFrame];
                    if (s.L1C) s.L1C.drawImage(img, x, y);
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
                    if (s.appState.selectedSongBtn == undefined || s.appState.gameStatus != GameStatus.Playing) return;
                    s.appState.selectedSongBtn.style.backgroundImage =
                        "url(" + s.appState.selectedSongBtn.images[this.currentFrame + 1].src + ")";
                });
                s.TIMERS.bomb.switch = true; // always true for the bomb
                s.TIMERS.bomb.currentFrame = 0;
            }
        }
    
        /** Initialises the various instrument icon buttons that line the top of the screen */
        private _initInstrumentButtons() {
            const s = this._sequencer;
            const ui = this;
            const { BUTTONS, SOUNDS, IMAGES } = s.ASSETS;
            if (IMAGES) {
                // Make buttons for changing a kind of notes.
                //   1st mario:   x=24, y=8, width=13, height=14
                //   2nd Kinopio: X=38, y=8, width=13, height=14
                //   and so on...
                const bimgs = IMAGES.Tools;
                for (let i = 0; i < 15; i++) {
                    const b = this._getOrCreateButton((24 + 14 * i), 8, 13, 14, 'instr_' + i, [bimgs[i]], () => {
                        b.se.play(8); // Note F
                        s.setState({
                            currentTool: b.num
                        });
                        ui._clearEraserButton();
                        ui.changeCursor(b.num);
                        if (b.se.image) ui._drawCurChar(b.se.image);
                    }) as InstrumentButton;
                    b.num = i;
                    b.se = SOUNDS[i];
                    b.se.image = bimgs[i];
                    BUTTONS[i] = b;
                }
            }
        }
    
        private _initEndMarkButton() {
            const s = this._sequencer;
            const ui = this;
            const { MAGNIFY } = s.CONST;
            const { IMAGES } = s.ASSETS;
            if (IMAGES) {
                const b = this._getOrCreateButton(235, 8, 13, 14, 'endmark', IMAGES.EndMarkBtn, () => {
                    s.TIMERS.endMark.switch = true;
                    s.setState({
                        currentTool: 15
                    });
                    s.ASSETS.SOUNDS[15].play(8);
                    ui._clearEraserButton();
                    s.drawEndMarkIcon(b.images[0]);
                });
                b.images = IMAGES.EndMarkBtn;
                
                // Setup flashing end-bar cursor that displays when end mark button is selected
                s.TIMERS.endMark = new EasyTimer(150, function () {
                    // If current instrument/selected-button is not end mark, just return;
                    if (s.appState.currentTool != 15) {
                        this.switch = false;
                        return;
                    }
                    // alternate frames
                    this.currentFrame = (this.currentFrame == 0) ? 1 : 0;
                    if (s.Layer2) s.Layer2.style.cursor = 'url(' + this.images[this.currentFrame].src + ')' +
                    7 * MAGNIFY +' '+ 7 * MAGNIFY + ', auto';
                }, b.images);
    
                s.ASSETS.BUTTONS[15] = b;
            }
        }
    
        private _initPlayButton() {
            const s = this._sequencer;
            const { IMAGES } = s.ASSETS;
            if (IMAGES) {
                const b = this._getOrCreateButton(55, 168, 12, 15, 'play', IMAGES.PlayBtn, function (this: SequencerButton, e: MouseEvent) {
                    const play = new Event("playsong", { bubbles: true });
                    this.dispatchEvent(play);
                }, styles.playBtn);
                b.setCurrentFrame(0);
            }
        }
    
        private _initStopButton() {
            const s = this._sequencer;
            const { IMAGES } = s.ASSETS;
            if (IMAGES) {
                const imgs = IMAGES.StopBtn;
                const b = this._getOrCreateButton(21, 168, 16, 15, 'stop', [imgs[0], imgs[1]], function (this: SequencerButton, e: MouseEvent) {
                    const stop = new Event("stopsong", { bubbles: true });
                    this.dispatchEvent(stop);
                }, styles.stopBtn);
                b.disabled = false;
                b.setCurrentFrame(1);
            }
        }
    
        private _initLoopButton() {
            const s = this._sequencer;
            const { appState } = s;
            const { IMAGES } = s.ASSETS;
            const sequencer = this;
            if (IMAGES) {
                const imgs = IMAGES.StopBtn;
                const b = this._getOrCreateButton(85, 168, 16, 15, 'loop', [imgs[2], imgs[3]], function(e) {
                    let loop = true;
                    if (s.appState.curScore.loop) {
                        loop = false;
                    }
                    let num = loop ? 1 : 0;
                    s.setState({
                        ...appState,
                        curScore: {
                            ...appState.curScore,
                            loop
                        }
                    });
                    this.setCurrentFrame(num);
                    s.ASSETS.SOUNDS[17].play(8);
                }, styles.loopBtn) as ToggleButton;
                b.setCurrentFrame(0);
                s.appState.curScore.loop = false;
                b.reset = function () {
                    s.appState.curScore.loop = false;
                    this.setCurrentFrame(0);
                };
                b.set   = function () {
                    s.appState.curScore.loop = true;
                    this.setCurrentFrame(1);
                }
            }
        }
    
        private _initScrollRange() {
            const s = this._sequencer;
            const { MAGNIFY } = s.CONST;
            let r = document.getElementById('scroll') as SequencerSlider;
            if (r === null) {
                r = document.createElement('input') as SequencerSlider;
                r.id = 'scroll';
                r.classList.add(styles.scoreScroll);
                r.type = 'range';
                r.value = "0";
                r.max = (s.curMaxBars - 6).toString();
                r.min = "0";
                r.step = "0.2";
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
                s.moveDOM(r, r.originalX, r.originalY);
                s.resizeDOM(r, r.originalW, r.originalH);
                r.redraw = () => {
                    s.moveDOM(r, r.originalX, r.originalY);
                    s.resizeDOM(r, r.originalW, r.originalH);
                };
                r.addEventListener("input", function(this: SequencerSlider, e: Event) {
                    s.appState.curPos = parseInt(this.value);
                });
                if (s.Layer2) {
                    s.Layer2.addEventListener("wheel", (e) => {
                        if (e.deltaY < 0) {
                            r.valueAsNumber += 0.2;
                        } else {
                            r.valueAsNumber -= 0.2;
                        }
                        let event = new Event('input', {bubbles: true, cancelable: true});
                        r.dispatchEvent(event);
                        e.preventDefault();
                        e.stopPropagation();
                    });
                }
                s.container.appendChild(r);
            }
        }
    
        private _initBeatButtons() {
            const s = this._sequencer;
            const createChoiceGroup = this._createChoiceGroupFunction.bind(s);
            const { IMAGES } = s.ASSETS;
            if (IMAGES) {
                const imgs = IMAGES.BeatBtn;
                const b1 = this._getOrCreateButton(81, 203, 14, 15, '3beats', [imgs[0], imgs[1]]) as BeatButton;
                b1.beats = 3;
                b1.setCurrentFrame(0);
                b1.disabled = false;
                
                const b2 = this._getOrCreateButton(96, 203, 14, 15, '4beats', [imgs[2], imgs[3]]) as BeatButton;
                b2.beats = 4;
                b2.setCurrentFrame(1);
                b2.disabled = true;
                
                const func = function(self: SequencerButton) {
                    const { appState } = s;
                    s.setState({
                        ...appState,
                        curScore: {
                            ...appState.curScore,
                            beats: (self as BeatButton).beats
                        }
                    });
                };
                
                b2.addEventListener("click", this._createChoiceGroupFunction([b1, b2], 1, func));
                b1.addEventListener("click", this._createChoiceGroupFunction([b1, b2], 0, func));
            }
        }
    
        private _initSongButtons() {
            const s = this._sequencer;
            const ui = this;
            const { IMAGES } = s.ASSETS;
            if (IMAGES) {
                const imgs = IMAGES.SongBtns;
    
                // Create buttons
                const songButtons = ['frog','beak','1up'].map(function (id, idx) {
                    const b = ui._getOrCreateButton(136 + 24 * idx, 202, 15, 17, id, imgs.slice(idx * 3, idx * 3 + 3)) as ToggleButton;
                    b.id = id;
                    b.num = idx;
                    b.setCurrentFrame(0);
                    b.disabled = false;
                    return b;
                });
    
                // Callback function that loads an appropriate embedded song in to memory and reinitialises various properties
                const callbackFunc = function (self: SequencerButton) {
                    const { appState } = s;
                    const curScore: MarioSequencerSong = Utils.clone(EmbeddedSongs[self.num]);
                    const tempoEl = document.getElementById("tempo") as HTMLInputElement;
                    if (tempoEl) tempoEl.value = curScore.tempo.toString();
                    const b = document.getElementById("loop") as ToggleButton;
                    if (curScore.loop) b.set(); else b.reset();
                    const scr = document.getElementById("scroll") as HTMLInputElement;
                    scr.max = (curScore.end - 5).toString();
                    scr.value = "0";
                    
                    s.setState({
                        curScore,
                        curPos: 0,
                        selectedSongBtn: self as ToggleButton,
                    });
                    s.drawScore(s.appState.curPos, s.appState.curScore['notes'], 0);
                };
    
                // Attach choice group event handler to each song button
                songButtons.forEach((btn, idx) => {
                    songButtons[idx].addEventListener("click", this._createChoiceGroupFunction(songButtons, idx, callbackFunc));
                });
            }
        }
    
        private _initUndoDog() {
            const s = this._sequencer;
            const ui = this;
            const { IMAGES } = s.ASSETS;
            if (IMAGES) {
                const b = this._getOrCreateButton(216, 203, 14, 15, 'undoDog', IMAGES.UndoDog, async function () {
                    if (s.appState.gameStatus === GameStatus.Edit) {
                        s.ASSETS.SOUNDS[18].play(8);
                        const frame = Utils.showSpriteFrame(this, 150);
                        await frame(1);
                        await frame(0);
        
                        const previousState = s.appState.history.pop();
                        let changeCursor = previousState && s.appState.currentTool !== previousState.currentTool;
                        let changeSongBtn = previousState && previousState.selectedSongBtn !== s.appState.selectedSongBtn;
                        let changeBeat = previousState && previousState.curScore.beats !== s.appState.curScore.beats;
                        if (previousState) {
                            s.appState = previousState;
                        } 
                        if (changeCursor) {
                            ui.changeCursor(s.appState.currentTool);
                        }
                        if (changeSongBtn) {
                            ['frog','beak','1up'].forEach(function (id, idx) {
                                const b = document.getElementById(id) as ToggleButton;
                                b.setCurrentFrame(0);
                                b.disabled = false;
                            });
                            if (s.appState.selectedSongBtn) {
                                s.appState.selectedSongBtn.setCurrentFrame(1);
                                s.appState.selectedSongBtn.disabled = true;
                            }
                        }
                        if (changeBeat) {
                            ['3beats', '4beats'].forEach(function (id, idx) {
                                const b = document.getElementById(id) as BeatButton;
                                const isSelected = b.beats === s.appState.curScore.beats; 
                                b.setCurrentFrame(isSelected ? 1 : 0);
                                b.disabled = isSelected;
                            })
                        }
                        s.drawScore(s.appState.curPos, s.appState.curScore.notes, s.appState.curPos);
                    }
                });
                b.setCurrentFrame(0);
            }
        }
    
        private _initEraserButton() {
            const s = this._sequencer;
            const ui = this;
            const { IMAGES } = s.ASSETS;
            if (IMAGES) {
                const imgs = IMAGES.SongBtns;
                const b = this._getOrCreateButton(40, 202, 15, 17, 'eraser', [imgs[9], imgs[10], imgs[11]], function() {
                    const btn = this as SequencerButton;
                    s.TIMERS.eraser.switch = true;
                    s.setState({currentTool: 16});
                    s.ASSETS.SOUNDS[17].play(8);
                    s.drawEraserIcon();
                    ui._clearSongButtons();
                    btn.setCurrentFrame(1);
                    if (s.Layer2) s.Layer2.style.cursor = 'url(' + btn.images[2].src + ')' + ' 0 0, auto';
                }) as SequencerButton;
                b.setCurrentFrame(0);
                s.TIMERS.eraser = new EasyTimer(200, function () {
                    // If current is not end mark, just return;
                    if (s.appState.currentTool != 16) {
                    this.switch = false;
                    return;
                    }
                    this.currentFrame = (this.currentFrame == 0) ? 1 : 0;
                });
                s.TIMERS.eraser.currentFrame = 0;
            }
        }
    
        private _initTempoRange() {
            const s = this._sequencer;
            const { IMAGES } = s.ASSETS;
            if (IMAGES) {
                const setThumbImage = (range: SequencerSlider) => {
                    const t = IMAGES.ThumbSlider[0];
                    range.image = t;
                    const seqEl = document.querySelector(`.${styles.marioSequencer}`) as HTMLElement;
                    if (seqEl) {
                        seqEl.style.setProperty('--tempoThumbImg', `url('${t.src}')`);
                    }
                };
    
                let r = document.getElementById('tempo') as SequencerSlider;
                if (r === null) {
                    r = document.createElement('input') as SequencerSlider;
                    r.id = "tempo";
                    r.classList.add(styles.tempo);
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
                    s.moveDOM(r, r.originalX, r.originalY);
                    s.resizeDOM(r, r.originalW, r.originalH);
                    r.redraw = () => {
                        s.moveDOM(r, r.originalX, r.originalY);
                        s.resizeDOM(r, r.originalW, r.originalH);
                        setThumbImage(r);
                    };
                    r.addEventListener("input", function(e) {
                        s.appState.curScore.tempo = parseInt(this.value);
                    });
                    r.addEventListener("mouseup", function(e) {
                        const { appState } = s;
                        s.setState({
                            curScore: {
                                ...appState.curScore,
                                tempo: parseInt(this.value)
                            }
                        });
                    })
                    s.container.appendChild(r);
                    setThumbImage(r);
                }
        
                // Prepare range's side buttons for inc/decrements
                const bLeft = this._getOrCreateButton(184, 158, 7, 9, 'toLeft', [], function (e) {
                    const r = document.getElementById('scroll') as HTMLInputElement;
                    let val = parseInt(r.value, 10);
                    if (val > 0) {
                        s.appState.curPos = --val;
                    }
                });
        
                const bRight = this._getOrCreateButton(241, 158, 7, 9, 'toRight', [], function (e) {
                    const r = document.getElementById('scroll') as HTMLInputElement;
                    let val = parseInt(r.value, 10);
                    if (val < s.curMaxBars - 6) {
                        s.appState.curPos = ++val;
                    }
                });
            }
        }
    
        private _initClearButton() {
            const s = this._sequencer;
            const ui = this;
            const { IMAGES } = s.ASSETS;
            if (IMAGES) {
                const b = this._getOrCreateButton(200, 176, 34, 16, 'clear', IMAGES.ClearBtn, async function (this: SequencerButton, e: MouseEvent) {
                    this.style.backgroundImage = "url(" + this.images[1].src + ")";
                    s.ASSETS.SOUNDS[19].play(8);
                    const btn = this;
                    const frame = Utils.showSpriteFrame(btn, 150);
                    await frame(2);
                    await frame(1);
                    await frame(0);
                    s.initMusicScore();
                    s.appState.curPos = 0;
                    ui._clearSongButtons();
                }, styles.clearBtn);
                b.setCurrentFrame(0);
            }
        }

        private _reInitButtonsFromScore() {
            const s = this._sequencer;
            const b = document.getElementById(s.appState.curScore.beats == 3 ? '3beats' : '4beats') as SequencerButton;
            EmitClickEvent(b, true);

            const r = document.getElementById('scroll') as HTMLInputElement;
            s.curMaxBars = s.appState.curScore.end + 1;
            r.max = (s.curMaxBars - 6).toString();
            r.value = "0";
            s.appState.curPos = 0;

            const tempoRange = document.getElementById("tempo") as HTMLInputElement;
            let tempo = s.appState.curScore.notes[0][0];
            if (typeof tempo == "string" && tempo.substr(0, 5) == "TEMPO") {
                tempo = tempo.split("=")[1];
                s.appState.curScore.tempo = tempo;
                tempoRange.value = tempo;
            }
        }

        private _initScreen() {
            const s = this._sequencer;
            const { SOUNDS } = s.ASSETS;
            s.appState.curPos = 0;
            s.appState.currentTool = 0;
            const img = SOUNDS[s.appState.currentTool].image;
            if (img) {
                this._drawCurChar(img);
            }
            this.changeCursor(s.appState.currentTool);
            s.drawScore(s.appState.curPos, s.appState.curScore['notes'], 0);
            window.requestAnimFrame(s.doAnimation);
        }

        private _initMouseEvents() {
            const s = this._sequencer;
            if (s.Layer2) {
                s.Layer2.addEventListener("contextmenu", this._onMouse);
                s.Layer2.addEventListener("click", this._onMouse);
                s.Layer2.addEventListener("mousemove", this._onMouseMove);
                s.Layer2.addEventListener("dragover", (e) => {
                    e.preventDefault();
                    return false;
                });
                s.Layer2.addEventListener("drop", this._readDroppedFiles);
            }
        }

        public changeCursor(num: number) {
            const s = this._sequencer;
            const { HALFCHARSIZE } = s.CONST;
            const { SOUNDS } = s.ASSETS;
            const SCREEN = s.Layer2;
            const img = SOUNDS[num].image;
            if (SCREEN && img) {
                SCREEN.style.cursor = 'url(' + img.src + ')' + HALFCHARSIZE +' '+ HALFCHARSIZE + ', auto';
            }
        }
    
        private _drawCurChar(image: HTMLImageElement) {
            const s = this._sequencer;
            const { CHARSIZE, MAGNIFY } = s.CONST;
            const x = 4 * MAGNIFY;
            const y = 7 * MAGNIFY;
            if (s.L1C) {
                s.L1C.beginPath();
                s.L1C.imageSmoothingEnabled = false;
                s.L1C.clearRect(x, y, CHARSIZE, CHARSIZE);
                s.L1C.drawImage(image, x, y);
                s.L1C.fillRect(x, y, CHARSIZE, MAGNIFY);
                s.L1C.fillRect(x, y + CHARSIZE - MAGNIFY, CHARSIZE, MAGNIFY);
            }
        }

        //#region clear button functions

        private _clearEraserButton() {
            const s = this._sequencer;
            const b = document.getElementById('eraser') as SequencerButton;
            b.style.backgroundImage = "url(" + b.images[0].src + ")";
            s.TIMERS.eraser.switch = false;
        }

        private _clearSongButtons() {
            const s = this._sequencer;
            ['frog','beak','1up'].map(function (id, idx) {
                const b = document.getElementById(id) as SequencerButton;
                b.disabled = false;
                b.style.backgroundImage = "url(" + b.images[0].src + ")";
            });
            s.appState.selectedSongBtn = undefined;
        }

        //#endregion

        //#region mouse event listeners 

        private _onMouse(e: MouseEvent) {
            const s = this._sequencer;
            e.preventDefault();
            if (e.type === "contextmenu") {
                document.getElementById('undoDog')?.click();
                return;
            }

            const { OFFSETLEFT, OFFSETTOP } = s.CONST;
            const { SOUNDS } = s.ASSETS;
            if (s.appState.gameStatus != GameStatus.Edit) return;

            const realX = e.clientX - OFFSETLEFT;
            const realY = e.clientY - OFFSETTOP;

            const g = this.toGrid(realX, realY);
            if (g == false) return;
            const gridX = g[0];
            let gridY = g[1];

            // Map logical x to real bar number
            const b = s.appState.curPos + gridX - 2;

            // process End Mark
            if (s.appState.currentTool == 15) {
                s.updateHistory();
                s.appState.curScore.end = b;
                return;
            }

            if (b >= s.appState.curScore.end) return;

            const allNotes = [...s.appState.curScore['notes']];
            const notes = [...allNotes[b]];
            // Delete
            if (s.appState.currentTool == 16 || e.button == 2) {
                // Delete Top of the stack
                s.updateHistory();
                for (let i = notes.length - 1; i >= 0; i--) {
                if ((notes[i] as number & 0x3F) == gridY) {
                    notes.splice(i, 1);
                    s.appState.curScore.notes[b] = notes;
                    SOUNDS[17].play(8);
                    break;
                }
                }
                return;
            }

            // Ignore if note already added
            let note = (s.appState.currentTool << 8) | gridY;
            if (notes.indexOf(note) != -1) return;
            
            // Handle semitone
            if (e.shiftKey) gridY |= 0x80;
            if (e.ctrlKey ) gridY |= 0x40;
            SOUNDS[s.appState.currentTool].play(gridY);
            note = (s.appState.currentTool << 8) | gridY;
            notes.push(note);
            allNotes[b] = notes;
            s.setState({
                curScore: {
                    ...s.appState.curScore,
                    notes: allNotes
                }
            });
        }

        private _onMouseMove(e: MouseEvent) {
            const s = this._sequencer;
            s.appState.mouseX = e.clientX;
            s.appState.mouseY = e.clientY;
        }

        private _readDroppedFiles(e: DragEvent) {
            const s = this._sequencer;
            e.preventDefault();
            this._clearSongButtons();
            s.resetScore();
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
                                s.addMSQ(fileReader.result as string);
                            } else {
                                s.addJSON(fileReader.result as string);
                            }
                        }
                    }).catch(function(err) {
                        alert("Loading MSQ failed: " + err.message);
                        console.error(err);
                    });
                }, Promise.resolve())
                .then(this._reInitButtonsFromScore);
            }

            return false;
        }

        //#endregion

        //#region keyboard event listeners

        private _initKeyboardEventListeners() {
            const s = this._sequencer;
            document.addEventListener('keyup', function(e) {
                s.appState.keyPresses = s.appState.keyPresses.filter(k => k !== e.key);
                if (e.key == "r" && s.canvasRecorder) {
                    s.canvasRecorder.start();
                }
                if (e.key == "s" && s.canvasRecorder) {
                    s.canvasRecorder.stop();
                    s.canvasRecorder.save("composer-song.webm");
                }
            });
            document.addEventListener('keydown',function(e) {
                if (s.appState.keyPresses.indexOf(e.key) < 0) {
                    s.appState.keyPresses.push(e.key);
                }
                const playBtn = document.getElementById('play') as HTMLButtonElement;
                const stopBtn = document.getElementById('stop') as HTMLButtonElement;
                const r = document.getElementById('scroll') as HTMLInputElement;
                let val: number;
                let redraw = false;
                const isShifting = s.appState.keyPresses.indexOf('Shift') >= 0;
                switch (e.key) {
                case ' ': // space -> play/stop or restart with shift
                    if (playBtn.disabled == false || isShifting) {
                        if (s.appState.gameStatus === GameStatus.Edit) {
                            playBtn.click();
                        } else {
                            if (isShifting) {
                                s.appState.curPos = 0;
                                r.valueAsNumber = 0;
                                cancelAnimationFrame(s.appState.animeId);
                                s.appState.animeId = window.requestAnimFrame(s.doMarioEnter);
                            }
                        }
                    //   sequencer._onPlayListener.call(playBtn, sequencer);
                    } else {
                        stopBtn.click();
                    //   sequencer._onStopListener.call(stopBtn, sequencer);
                    }
                    e.preventDefault();
                    break; 
            
                case 'ArrowLeft': // left -> scroll left
                    r.valueAsNumber -= isShifting ? 1 : 0.2;
                    redraw = true;
                    e.preventDefault();
                    break;
            
                case 'ArrowRight': // right -> scroll right
                    r.valueAsNumber += isShifting ? 1 : 0.2;
                    redraw = true;
                    e.preventDefault();
                    break;
                }
                if (redraw) {
                    let event = new Event('input', {bubbles: true, cancelable: true});
                    r.dispatchEvent(event);
                }
            });
        }

        //#endregion
        
        private _getOrCreateButton(x: number, y: number, w: number, h: number, id: string, images: HTMLImageElement[], clickHandler?: (this: SequencerButton, ev: SequencerBtnEvent) => any, className?: string) {
            const s = this._sequencer;
            let b = document.getElementById(id) as SequencerButton;
            if (b === null) {
                b = this._createButton({x,y,w,h,id,images,clickHandler,className});
                s.container.appendChild(b as HTMLButtonElement);
            } else {
                b.images = images;
            }
            
            return b;
        }
        
        /**
         * Translates App Container relative X + Y coordinates to positions on a grid
         * Used for placement of notes, cursor placeholder and more
         * @param realX X coordinate relative to top left of container
         * @param realY Y coordinate relative to top left of container
         * @returns false if outside the grid or hovering the G-Clef area, or [gridX, gridY]
         */
        public toGrid(realX: number, realY: number) {
            const s = this._sequencer;
            const { CHARSIZE, HALFCHARSIZE, MAGNIFY } = s.CONST;
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
            if (s.appState.curPos == 0 && gridX < 2 || s.appState.curPos == 1 && gridX == 0)
                return false;
            else
                return [gridX, gridY];
        }
    }
}

export default UI;