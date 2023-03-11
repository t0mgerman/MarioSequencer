import { SoundEntity } from "./sound";

export interface IMarioSequencerProps {
    SEMITONERATIO: number;
    MAGNIFY: number;
    CHARSIZE: number;
    HALFCHARSIZE: number;
    ORGWIDTH: number;
    ORGHEIGHT: number;
    SCRHEIGHT: number;
    DEFAULTMAXBARS: number;
    DEFAULTTEMPO: number;
    OFFSETLEFT: number;
    OFFSETTOP: number;
}

type MarioSequencerImageAsset = 
    "CharSheet" |
    "Bomb" |
    "GClef" |
    "Numbers" |
    "Mario" |
    "Sweat" |
    "PlayBtn" |
    "StopBtn" |
    "ClearBtn" |
    "ThumbSlider" |
    "BeatBtn" |
    "SongBtns" |
    "EndMark" |
    "Semitone" |
    "Repeat";

export interface IMarioSequencerAssets {
    BUTTONS: HTMLButtonElement[];
    SOUNDS: SoundEntity[];
    /** Stores loaded spritesheets (unscaled) */
    SPRITESHEETS?: {
        Chars: HTMLImageElement;
        Bomb: HTMLImageElement;
        End: HTMLImageElement;
        PlayBtn: HTMLImageElement;
        Repeat: HTMLImageElement;
        Semitone: HTMLImageElement;
        Numbers: HTMLImageElement;
        Stop: HTMLImageElement;
        Beat: HTMLImageElement;
        Song: HTMLImageElement;
        ThumbSlider: HTMLImageElement;
        ClearBtn: HTMLImageElement;
        Mario: HTMLImageElement;
        UndoDog: HTMLImageElement;
    },
    /** Stores scaled sprite frames */
    IMAGES?: {
        Tools: HTMLImageElement[];
        Bomb: HTMLImageElement[];
        GClef: HTMLImageElement;
        Numbers: HTMLImageElement[];
        Mario: HTMLImageElement[];
        Sweat: HTMLImageElement;
        PlayBtn: HTMLImageElement[];
        StopBtn: HTMLImageElement[];
        ClearBtn: HTMLImageElement[];
        ThumbSlider: HTMLImageElement[];
        BeatBtn: HTMLImageElement[];
        SongBtns: HTMLImageElement[];
        EndMarkBtn: HTMLImageElement[];
        EndMark: HTMLImageElement;
        Semitone: HTMLImageElement[];
        Repeat: HTMLImageElement[];
        UndoDog: HTMLImageElement[];
    },
}

export enum GameStatus {
    Edit = 0,
    MarioEntering = 1,
    Playing = 2,
    MarioLeaving = 3
}

export function getConstants(opts: any, container: HTMLElement): IMarioSequencerProps {
    const MAGNIFY = opts.mag || opts.magnify || getScaledMagnify();
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
    const height = Math.floor(window.innerHeight / 224);
    return Math.min(width, height);
}