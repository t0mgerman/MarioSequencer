import { MarioSequencer } from "./app";
import { GameStatus, SequencerBtnEvent, SequencerButton } from "./app.types";

export function AddEvents (sequencer: MarioSequencer) {
    sequencer.container.addEventListener("playsong", (e) => {
        const playBtn = document.getElementById("play") as SequencerButton;
        playBtn.style.backgroundImage = "url(" + playBtn.images[1].src + ")";
        playBtn.disabled = true; // Would be unlocked by stop button
        
        const stopBtn = document.getElementById("stop") as SequencerButton;
        stopBtn.style.backgroundImage = "url(" + stopBtn.images[0].src + ")";
        stopBtn.disabled = false;
        
        sequencer.ASSETS.SOUNDS[17].play(8);

        ["toLeft", "toRight", "scroll", "clear", "frog", "beak", "1up"].
            map(function (id) {
                (document.getElementById(id) as HTMLButtonElement).disabled = true;
            });

        sequencer.appState.gameStatus = GameStatus.MarioEntering; // Mario Entering the stage
        sequencer.appState.curPos = 0;     // doAnimation will draw POS 0 and stop
        sequencer.mario?.init();
        window.requestAnimFrame(sequencer.doMarioEnter);
    });

    sequencer.container.addEventListener("stopsong", (e) => {
        const stopBtn = document.getElementById("stop") as SequencerButton;
        stopBtn.style.backgroundImage = "url(" + stopBtn.images[1].src + ")";
        stopBtn.disabled = true; // Would be unlocked by play button

        // Sound ON: click , OFF: called by doMarioPlay
        if (e != undefined) sequencer.ASSETS.SOUNDS[17].play(8);
        const playBtn = document.getElementById("play") as SequencerButton;
        playBtn.style.backgroundImage = "url(" + playBtn.images[0].src + ")";

        sequencer.appState.gameStatus = GameStatus.MarioLeaving; // Mario leaves from the stage
        sequencer.mario?.init4leaving();
        if (sequencer.appState.animeId != 0) cancelAnimationFrame(sequencer.appState.animeId);
        window.requestAnimFrame(sequencer.doMarioLeave);
    });
}

export function EmitClickEvent(b: SequencerButton, soundOff: boolean = false) {
    const e = new Event("click") as SequencerBtnEvent;
    e.soundOff = true;
    b.dispatchEvent(e);
} 