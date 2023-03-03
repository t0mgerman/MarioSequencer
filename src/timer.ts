export type EasyTimerFn = (this: EasyTimer) => void;

export class EasyTimer {
    private _time: number;
    private _func: EasyTimerFn;
    private _lastTime = 0;
    public switch = false;
    public currentFrame: number = 0;
    public images: HTMLImageElement[] = [];

    constructor(time: number, func: EasyTimerFn, images?: HTMLImageElement[]) {
        this._time = time;
        this._func = func;
        if (images) {
            this.images = images;
        }
    }

    public checkAndFire(time: number) {
        if (this.switch && time - this._lastTime > this._time) {
            this._func();
            this._lastTime = time;
        }
    }
}

export default EasyTimer;