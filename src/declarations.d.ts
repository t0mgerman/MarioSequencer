export {}

declare global {
    interface Window {
        requestAnimFrame: (callback: FrameRequestCallback) => number;
        webkitAudioContext: typeof AudioContext;
    }

    interface HTMLButtonElement {
        num: number;
        se: SoundElement;
        soundImage: Image;
        beats?: number;
        originalX: number;
        originalY: number;
        originalW: number;
        originalH: number;
        images: HTMLImageElement[];
        soundOff?: boolean;
        redraw: () => void;
        set: () => void;
        reset: () => void;
    }

    interface HTMLInputElement {
        image?: HTMLImageElement; 
        originalX: number;
        originalY: number;
        originalW: number;
        originalH: number;
        redraw: () => void;
    }
}