import { MarioSequencer } from "app";

/** Canvas Recorder class based on CanvasRecorder.js by smusamashah */
export class CanvasRecorder {
    private _app: MarioSequencer;
    private _vbps?: number;
    private stream: MediaStream;
    private recordedBlobs: Blob[] = [];
    private supportedType?: string;
    private mediaRecorder: MediaRecorder | null = null;
    private video: HTMLVideoElement;
    constructor(app: MarioSequencer, canvas: HTMLCanvasElement, video_bits_per_sec?: number) {
        this.handleDataAvailable = this.handleDataAvailable.bind(this);
        this.handleStop = this.handleStop.bind(this);

        this._app = app;
        this._vbps = video_bits_per_sec;
        this.video = document.createElement('video');
        this.video.style.display = 'none';
        
        this.stream = canvas.captureStream();
        if (typeof this.stream == undefined || !this.stream) {
            return;
        }
    }
    public start() {
        if (!this._app.MSDestination) this._app.MSDestination = this._app.AC.createMediaStreamDestination();

        let types = [
            "video/webm",
            'video/webm,codecs=vp9',
            'video/vp8',
            "video/webm\;codecs=vp8",
            "video/webm\;codecs=daala",
            "video/webm\;codecs=h264",
            "video/mpeg"
        ];

        for (let i in types) {
            if (MediaRecorder.isTypeSupported(types[i])) {
                this.supportedType = types[i];
                break;
            }
        }
        if (this.supportedType == null) {
            console.log("No supported type found for MediaRecorder");
        }
        let options = { 
            mimeType: this.supportedType,
            videoBitsPerSecond: this._vbps || 2500000, // 2.5Mbps,
            audioBitsPerSecond: this._vbps || 2500000
        };

        this.recordedBlobs = [];
        try {
            const mediaStream = new MediaStream();
            mediaStream.addTrack(this.stream.getVideoTracks()[0]);
            mediaStream.addTrack(this._app.MSDestination.stream.getAudioTracks()[0]);
            this.mediaRecorder = new MediaRecorder(mediaStream, options);
        } catch (e) {
            alert('MediaRecorder is not supported by this browser.');
            console.error('Exception while creating MediaRecorder:', e);
            return;
        }

        console.log('Created MediaRecorder', this.mediaRecorder, 'with options', options);
        this.mediaRecorder.onstop = this.handleStop;
        this.mediaRecorder.ondataavailable = this.handleDataAvailable;
        this.mediaRecorder.start(100); // collect 100ms of data blobs
        console.log('MediaRecorder started', this.mediaRecorder);
    }
    public stop() {
        this.mediaRecorder?.stop();
        console.log('Recorded Blobs: ', this.recordedBlobs);
        this.video.controls = true;
    }
    public save(filename: string) {
        const name = filename || 'recording.webm';
        const blob = new Blob(this.recordedBlobs, { type: this.supportedType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    }
    private handleDataAvailable(event: BlobEvent) {
        if (event.data && event.data.size > 0) {
            this.recordedBlobs.push(event.data);
        }
    }
    private handleStop(event: Event) {
        console.log('Recorder stopped: ', event);
        const superBuffer = new Blob(this.recordedBlobs, { type: this.supportedType });
        this.video.src = window.URL.createObjectURL(superBuffer);
    }
    
}
