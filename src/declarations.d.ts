export {};

declare global {
    interface Window {
        requestAnimFrame: (callback: FrameRequestCallback) => number;
        webkitAudioContext: typeof AudioContext;
    }

    interface HTMLButtonElement {
        num: number;
        se: SoundElement;
        soundImage: Image;
        originalX: number;
        originalY: number;
        originalW: number;
        originalH: number;
        images: HTMLImageElement[];
        currentFrame: HTMLImageElement;
        soundOff?: boolean;
        setCurrentFrame: (num: number) => void;
        redraw: () => void;
        set: () => void;
        reset: () => void;
    }

    interface BeatButtonElement extends HTMLButtonElement {
        beats: number;
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