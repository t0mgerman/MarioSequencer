export type EasyTimerFn = (this: EasyTimer) => void;

/** Timer class that can be used to trigger animations and other effects at a set frequency during 
 * an animation loop (such as those using requestAnimationFrame) 
 */
export class EasyTimer {
    private _frequency: number;
    private _func: EasyTimerFn;
    private _lastTime = 0;
    
    /** Determines whether the timer should execute it's function during animation loop.
     * When set to false, the timer will not execute. 
     */
    public switch = false;
    
    /** A reference to the current frame of animation */
    public currentFrame: number = 0;

    /** A reference to sprite sheet images to be used for this timer */
    public images: HTMLImageElement[] = [];

    /**
     * Timer class that can be used to trigger animations and other effects at a set frequency during 
     * an animation loop (such as those using requestAnimationFrame)
     * @param frequency The frequency at which to fire the timer function (ms)
     * @param func The function that should be fired on a set frequency
     * @param images Spritesheet image array that can be accessed in the timer function
     */
    constructor(frequency: number, func: EasyTimerFn, images?: HTMLImageElement[]) {
        this._frequency = frequency;
        this._func = func;
        if (images) {
            this.images = images;
        }
    }

    /** Utility function that can be used by animation loops to cause the timer function to fire.
     * When passed a delta time, if enough time has passed (as set by the frequency param in constructor)
     * the function will fire.
     */
    public checkAndFire(time: number) {
        if (this.switch && time - this._lastTime > this._frequency) {
            this._func();
            this._lastTime = time;
        }
    }
}

export default EasyTimer;