import { SoundEntity } from "./sound";

type AppEventMap = DocumentEventMap & {
    "mp3update": Mp3UpdateEvent;
}

export interface App extends Omit<HTMLElement, "addEventListener"> {
    addEventListener: <K extends keyof AppEventMap>(type: K, listener: (ev: AppEventMap[K]) => any, useCapture?: boolean) => any;
}

export interface AppButton extends Omit<HTMLButtonElement, "addEventListener"> {
    currentFrame: HTMLImageElement;
    images: HTMLImageElement[];
    num: number;
    originalX: number;
    originalY: number;
    originalW: number;
    originalH: number;
    addEventListener: <K extends keyof DocumentEventMap>(type: K, listener: (ev: SequencerBtnEvent) => any, useCapture?: boolean) => any;
    setCurrentFrame: (num: number) => void;
    redraw: () => void;
}

export interface ToggleButton extends AppButton {
    reset: () => void;
    set: () => void;
}

export interface InstrumentButton extends AppButton {
    se: SoundEntity;
    soundImage: HTMLImageElement;
}

export interface BeatButton extends AppButton {
    beats: number;
}

export type SequencerButton = AppButton | ToggleButton | InstrumentButton | BeatButton;

export interface ISequencerBtnCreationArgs<T extends AppButton> {
    x: number, y: number, w: number, h: number, id: string, images: HTMLImageElement[], clickHandler?: (this: T, ev: SequencerBtnEvent) => any, className?: string
}

export interface SequencerBtnEvent extends MouseEvent {
    soundOff?: boolean;
}

export interface SequencerSlider extends HTMLInputElement {
    image?: HTMLImageElement; 
    originalX: number;
    originalY: number;
    originalW: number;
    originalH: number;
    redraw: () => void;
}

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

export interface IMarioSequencerAssets {
    BUTTONS: AppButton[];
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

export type MarioSequencerSong = {
    notes: (string|number)[][];
    beats: number;
    loop: boolean;
    end: number;
    tempo: string | number;
}

export type MarioSequencerSongCollection = {
    [index: number]: MarioSequencerSong;
}

export type MarioSequencerAppState = {
    mouseX: number;
    mouseY: number;
    keyPresses: string[];

    /** Last ID returned from requestAnimationFrame, can be used to cancel draw callbacks */
    animeId: number;

    /** Used to prevent animation during resize and redraw of canvas */
    resizing: boolean;

    /** Stores the Mario Paint composer tool currently selected (index / number) */
    currentTool: number;

    /** Stores the app's progress/position in relation to the musical score. Used in playback and in rendering the score to the screen. */
    curPos: number;

    /** When the user loads one of the embedded Mario Paint songs, this is a reference to the associated button in the UI */
    selectedSongBtn?: ToggleButton;

    /** Stores the current music score state */
    curScore: MarioSequencerSong;

    /** Stores the music score history - needed for undoDog */
    history: MarioSequencerAppState[];

    gameStatus: GameStatus;
}

export type InstrumentChordRecord = Record<number, number[]>;

interface IMp3WorkerUpdateMessage extends Event {
    data : {
        type: "chordGenUpdate" | "songProgressUpdate";
        value: number;
    }
}

interface IMp3WorkerSongMessage extends Event {
    data: {
        type: "song";
        value: string;
    }
}

export type Mp3UpdateEvent = IMp3WorkerUpdateMessage | IMp3WorkerSongMessage;