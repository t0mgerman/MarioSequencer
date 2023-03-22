import { MarioSequencer } from "./app";
import { ISequencerBtnCreationArgs, SequencerButton, ToggleButton } from "./app.types";
import { IMarioSequencerProps } from "./app.types";

export namespace Utils {

    export function boundFn(sequencer: MarioSequencer, fn: Function) {
        return fn.bind(sequencer);
    }

    //#region App Constants & Recalculation

    export function getConstants(this: MarioSequencer, opts: any, container: HTMLElement): IMarioSequencerProps {
        const MAGNIFY = opts.mag || opts.magnify || Utils.getScaledMagnify();
        const CHARSIZE = 16 * MAGNIFY;
        const HALFCHARSIZE = Math.floor(CHARSIZE / 2);
        const ORGHEIGHT = 224;
        const ORGWIDTH = 256;
        container.style.width = ORGWIDTH * MAGNIFY + "px";
        container.style.height = ORGHEIGHT * MAGNIFY + "px";
        return {
            CHARSIZE,
            DEFAULTMAXBARS: 24 * 4 + 1,
            DEFAULTTEMPO: 100,
            HALFCHARSIZE,
            MAGNIFY,
            ORGHEIGHT,
            ORGWIDTH,
            SCRHEIGHT: 152,
            SEMITONERATIO: Math.pow(2, 1/12),
            OFFSETLEFT: container.offsetLeft,
            OFFSETTOP: container.offsetTop
        }
    }

    export function getScaledMagnify() {
        const width = Math.floor(window.innerWidth / 256);
        const height = Math.floor((window.innerHeight -84) / 224);
        return Math.min(width, height);
    }

    //#endregion

    //#region Button helpers 

    export function createButton(this: MarioSequencer, args: ISequencerBtnCreationArgs<SequencerButton>) {
        const { h, id, images, w, x, y, className, clickHandler } = args;
        const b = document.createElement("button") as SequencerButton;
        b.id = id;
        b.className = "game";
        b.style.position = 'absolute';
        this.moveDOM(b, x, y);
        this.resizeDOM(b, w, h);
        b.style.zIndex = "3";
        b.style.background = "rgba(0,0,0,0)";
    
        // Save position and size for later use
        b.originalX = x;
        b.originalY = y;
        b.originalW = w;
        b.originalH = h;
        b.setCurrentFrame = function (num: number) {
            this.currentFrame = this.images[num];
            this.style.backgroundImage = "url(" + this.currentFrame.src + ")";
        }
        b.redraw = () => {
            this.moveDOM(b, b.originalX, b.originalY);
            this.resizeDOM(b, b.originalW, b.originalH);
            if (b.currentFrame) b.style.backgroundImage = "url(" + b.currentFrame.src + ")";
        }
        if (images) {
            b.images = images;
        }
        if (clickHandler) {
            b.addEventListener("click", clickHandler);
        }
        if (className) {
            b.classList.add(className);
        }
    
        return b;
    }

    /**
     * Utility function used to ensure that a group of buttons can behave like a choice-group or radio-button selection. 
     * When one button is clicked, that button will be disabled and others in the group will be made active. This ensures
     * only one button can be 'selected'.
     * @param buttons An array of buttons that are to behave as a single choice-group
     * @param num The index of the button to which an event handler is being added
     * @param callbackFn The callback function that should execute once button states have been adjusted
     * @returns 
     */
    export function createChoiceGroupFunction<T extends SequencerButton>(this: MarioSequencer, buttons: T[], num: number, callbackFn: <CBT extends SequencerButton>(el: (CBT)) => void): (this: HTMLButtonElement, e: MouseEvent) => void {
        const sequencer = this;

        // Clone the button Array and store reference to the clicked button
        const clone = buttons.slice(0); 
        const self = clone[num];

        // Store a reference to other buttons in the choice group
        clone.splice(num, 1); 
        const otherButtons = clone;

        // When clicked
        return function(this: HTMLButtonElement, e: MouseEvent) {
            const btn = this as T;

            // Play click sound
            if (!(e as any).soundOff) sequencer.ASSETS.SOUNDS[17].play(8);
            
            // Choice / Option is now selected, so set image and disable button
            this.disabled = true;
            btn.setCurrentFrame(1);

            // Enable other buttons in group
            otherButtons.map(function (x) {
                x.disabled = false;
                x.setCurrentFrame(0);
            });

            // Execute callback function
            callbackFn(self);
        };
    }
    
    //#endregion

    //#region Animation helpers

    export function showSpriteFrame(btn: SequencerButton, frameLength: number) {
        return function (num: number) {
            return new Promise<void>(function (resolve, reject) {
                setTimeout(function() {
                    btn.style.backgroundImage = "url(" + btn.images[num].src + ")";
                    resolve()
                }, frameLength);
            });
        }
    }

    //#endregion

    export async function getImageElFromPath(path: string) {
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

    export function sliceImage(this: MarioSequencer, img: HTMLImageElement, width: number, height: number) {
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

    export function clone(obj: any) {
        return JSON.parse(JSON.stringify(obj));
    }
}

export default Utils;