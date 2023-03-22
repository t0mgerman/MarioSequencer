import { SoundEntity } from "sound";

export {};

declare global {
    interface Window {
        requestAnimFrame: (callback: FrameRequestCallback) => number;
        webkitAudioContext: typeof AudioContext;
    }
}