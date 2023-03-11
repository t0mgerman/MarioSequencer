import { MarioSequencer } from "./app";
import EasyTimer from "./timer";

export class Mario {
    private offset = -16;
    public scroll = 0;
    public x: number = -16;
    private sweatImage: HTMLImageElement | null = null;
    private spriteImages: HTMLImageElement[] | null = null;
    public pos = 0;
    private start = 0;
    private state = 0;
    private timer?: EasyTimer;
    private mario?: Mario;
    private switch = true; // forever true
    private isJumping = false;
    private lastTime: number = 0;
    private sequencer: MarioSequencer;

    constructor(sequencerInstance: MarioSequencer) {
        this.sequencer = sequencerInstance;
        if (sequencerInstance.ASSETS.IMAGES) {
            this.spriteImages = sequencerInstance.ASSETS.IMAGES.Mario;
            this.sweatImage = sequencerInstance.ASSETS.IMAGES.Sweat;
        }
        this.init();
    }

    public init() {
        this.x = -16;
        this.pos = 0;
        this.start = 0;
        this.state = 0;
        this.scroll = 0;
        this.offset = -16;
        const mario = this.mario = this;
        this.timer = new EasyTimer(100, function() {
            mario.state = (mario.state == 1) ? 0 : 1;
        });
        this.timer.switch = true; // forever true;
        this.isJumping = false;
    }

    public enter(timeStamp: number) {
        if (this.start == 0) this.start = timeStamp;

        const diff = timeStamp - this.start;
        this.x = Math.floor(diff / 5) + this.offset;
        if (this.x >= 40) this.x = 40; // 16 + 32 - 8
        if (Math.floor(diff / 100) % 2 == 0) {
            this.state = 1;
        } else {
            this.state = 0;
        }
        this.draw();
    }

    public init4leaving() {
        this.offset = this.x;
        this.start = 0;
        this.isJumping = false;
    }

    public init4playing(timeStamp: number) {
        this.lastTime = timeStamp;
        this.offset = this.x;
        this.scroll = 0;
        this.pos = 1;
        this.state == 1;
        this._checkMarioShouldJump();
    }

    private _checkMarioShouldJump() {
        const notes = this.sequencer.appState.curScore.notes[this.pos - 1];
        if (notes == undefined || notes.length == 0) {
            this.isJumping = false;
        } else if (notes.length == 1) {
            this.isJumping = (typeof notes[0] != 'string');
        } else
            this.isJumping = true;
    }

    public play(timeStamp: number) {
        const { sequencer } = this;
        const tempo = sequencer.appState.curScore.tempo
        if (this.mario) {
            let diff = timeStamp - this.lastTime; // both are [ms]
            if (diff > 32) diff = 16; // When user hide the tag, force it
            this.lastTime = timeStamp;
            const step = 32 * diff * (tempo as number) / 60000; // (60[sec] * 1000)[msec]
    
            this.timer?.checkAndFire(timeStamp);
            const scroll = document.getElementById('scroll') as HTMLInputElement;
    
            var nextBar = (16 + 32 * (this.pos - sequencer.appState.curPos + 1) - 8);
            if (this.mario.x < 120) { // Mario still has to run
                this.x += step;
                // If this step crosses the bar
                if (this.x >= nextBar) {
                    this.pos++;
                    sequencer.scheduleAndPlay(sequencer.appState.curScore.notes[this.pos - 2], 0); // Ignore diff
                    this._checkMarioShouldJump();
                } else {
                    // 32 dots in t[sec/1beat]
                    if (this.x >= 120) {
                        this.scroll = this.x - 120;
                        this.x = 120;
                    }
                }
            } else if (sequencer.appState.curPos <= sequencer.appState.curScore.end - 6) { // Scroll
                this.x = 120;
                if (this.scroll < 16 && (this.scroll + step) > 16) {
                    this.pos++;
                    this.scroll += step;
                    sequencer.scheduleAndPlay(sequencer.appState.curScore.notes[this.pos - 2], 0); // Ignore error
                    this._checkMarioShouldJump();
                } else {
                    this.scroll += step;
                    if (this.scroll > 32) {
                        this.scroll -= 32;
                        sequencer.appState.curPos++;
                        if (scroll) scroll.value = sequencer.appState.curPos.toString();
                        if (sequencer.appState.curPos > (sequencer.appState.curScore.end - 6)) {
                        this.x += this.scroll;
                        this.scroll = 0
                        }
                    }
                }
            } else {
                this.x += step;
                // If this step crosses the bar
                if (this.x >= nextBar) {
                this.pos++;
                sequencer.scheduleAndPlay(sequencer.appState.curScore.notes[this.pos - 2], 0); // Ignore diff
                this._checkMarioShouldJump();
                }
            }
            sequencer.drawScore(sequencer.appState.curPos, sequencer.appState.curScore.notes, this.scroll);
            this.draw();
        }
    }

    private _jump(x: number) {
        var h = [0, 2, 4, 6, 8, 10, 12, 13, 14, 15, 16, 17, 18, 18, 19, 19, 19,
            19, 19, 18, 18, 17, 16, 15, 14, 13, 12, 10, 8, 6, 4, 2, 0];
        return h[Math.round(x) % 32];
    }

    public draw() {
        if (this.spriteImages) {
            let y = (41 - 22);
            let state = this.state
            if (this.isJumping) {
                state = 2;
                if (this.x == 120) { // In scroll mode
                // (scroll == 16) is just on the bar, 0 and 32 is on the center of between bars
                if (this.scroll != 16) {
                    y -= this._jump(this.scroll > 16 ? this.scroll - 16 : this.scroll + 16);
                } /* if scroll == 16 then Mario should be on the ground */
                } else { // Running to the center, or leaving to the goal
                y -= this._jump(Math.round((this.x - 8) % 32));
                }
            }
    
            this.sequencer.drawMario(this.spriteImages[state], this.x, y);
        }
    }

    public leave(timeStamp: number) {
        if (this.sweatImage) {
            if (this.start == 0) this.start = timeStamp;
    
            const diff = timeStamp - this.start;
            if (this.scroll > 0 && this.scroll < 32) {
                this.scroll += Math.floor(diff / 4);
                if (this.scroll > 32) {
                    this.x += this.scroll - 32;
                    this.scroll = 0;
                    this.sequencer.appState.curPos++;
                }
            } else
                this.x = Math.floor(diff / 4) + this.offset;
            if (Math.floor(diff / 100) % 2 == 0) {
                this.state =  8;
                this.draw();
                const w = this.sweatImage.width;
                const h = this.sweatImage.height;
    
                this.sequencer.drawMarioSweat(
                    this.sweatImage,
                    0, 0, w, h,
                    (this.x - (w + 1)), 
                    (41 - 22),
                    w, h
                );
                
            } else {
                this.state = 9;
                this.draw();
            }
        }
    }
}