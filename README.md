Mario Sequencer
====

This is a fork of [@Minghai](https://github.com/minghai)'s awesome [MarioSequencer](https://github.com/minghai/MarioSequencer)

<br>

> ## 🎵 View a Demo / Play: 🎵<br>[https://t0mgerman.github.io/MarioSequencer/](https://t0mgerman.github.io/MarioSequencer)

<br>

## Work In Progress 👷‍♂️

I wanted to better understand [@Minghai](https://github.com/minghai)'s original code, and I particularly liked how it was framework-free and contained within a single JavaScript file. The compatability with Mario Composer (PC/MAC) MSQ files was seriously impressive to me too! If JS is more your thing than TS, definitely check out [the original repo](https://github.com/minghai/MarioSequencer).

I have attempted to break up the original code and begin porting it to TypeScript. The original code was oriented around constants added to `Window` (or `globalThis`) and a series of functions used to render the UI, draw the musical score and perform the game/animation loop. 

My version of the code is not as clean as I would like - yet!!

I started off with the ambition of making it more modular and class-based, with a view to refactoring things later and potentially adding enhancements - and quickly found there were some interdependencies between the different methods that might need unpicking or moving around as I iterate. Long term I think it should be possible to clean up a lot of the logic (and any mess caused by my rushed port-job) and maybe move to a UI framework that can handle both state management and reactive rendering to the canvas. 

## Features Added ✨

- Original code allowed the Canvas to scale by 1x, 2x and 3x;<br>
I have added an auto-scale option and made it default. This better fits the Canvas to the window.
- The music score can be scrolled with a touch-pad or mouse scroll-wheel
- The original code used JS to inject recalculated images to pseudo elements on the page. I have refactored this to use CSS variables and SASS.
- The original version left the Undo Dog icon unused. The app will now record up to ten levels of state history, allowing users to undo mistakes.
- [NES.css Styling](https://nostalgic-css.github.io/NES.css/)
  - check out this wonderful CSS framework [here](https://nostalgic-css.github.io/NES.css/)
- MP3 Export: 
  - add notes to the score or load a demo song, then press the MP3 button
- Share function:
  - the share button in the top right of the page allows you to share creations. Check the box to include song data.
- PWA Manifest and Offline Cache Service Worker 
  - the app *should* still reload even when offline.
  - use `Add to Home Screen` on IOS Safari or the `Install` equivalent on Android to download it to your device
- Experimental (not quite working) video rendering:
  - Press 'R' to start recording, play a song, then press 'S' to stop and download your recording as a `.webm` file.
  - I am using the `MediaRecorder API` along with `canvas.captureStream()` and a `MediaStreamAudioDestinationNode` to generate the video. Canvas recording heavily based on [CanvasRecorder.js](https://github.com/SMUsamaShah/CanvasRecorder) by [@SMUsamaShah](https://github.com/SMUsamaShah)
  - At present the video starts with delay and the audio is out of sync. It may be necessary to create the video and audio streams separately and combine them together afterward.

## Development + Building 🛠


This version can be built using webpack `npm run build` or developed using `webpack-dev-server`. A `launch.json` config for VSCode is provided, so you can just press F5 to debug once you've got the code cloned.

## Changelog ⌛

|Date | Changes|
|---|---|
| 23 Mar 2023 | Added PWA Manifest + Offline Cache Service Worker, NES.CSS styling, MP3 Export, Share link generation and experimental / incomplete video rendering | 
| 11 Mar 2023 | Added scale-to-page, Undo Dog, Scroll Wheel listener, changed keyboard listener, moved Pseudo Selector JS to SASS modules + use CSS variables
| 03 Mar 2023 | Working Tyepscript + Webpack Build

## Potential ToDo List 📋

- Eliminate UI generation code by using reactive UI framework (Svelte?)
- Explore offscreen rendering for video frames and fixing sync issues in current video implementation
- Explore possibility of online song storage (DB/API?) 
- Alternate Canvas UI for mobile devices, encourage landscape mode etc.

<br><br>

## **Original version info/acknowledgements/credits  included below:**

___

### Original Readme.md
___

This is good old Mario Sequencer Web Edition.
Works only on Chrome (at least for now).

Original software for Windows 95 by Anonymous in 2ch:
http://www.geocities.jp/it85904/mariopaint_mariosequencer.html

(News!)
New version released.
This time this supports one-chip HW Vocaloid Hatsune Miku and sings!
If you have GAKKEN NSX-39, please try this version.
http://github.com/minghai/MikuMikuSequencer

How to use
------
Try this link:
http://minghai.github.io/MarioSequencer/

Also, here's GREAT music "NikoNiko suite" by Phenix.
http://minghai.github.io/MarioSequencer/?url=NikoNiko_suite.json&auto=true

Basically, What you see is what you get.

Select instruments with the buttons on the top of the screen.
Most right button is not a instrument, but it is a end mark.
If you select it, you can put the end mark on the score and
play will stop there.

After selecting the instrument, put notes on the score as you like
by left click.
If you need to scroll the score to left or right, use the scroll
range object.

If you want to delete the notes, select the eraser on the bottom of
the screen, or just use right click on the target note.

The "Download" button will save your music as JSON file.
Drag and drop your file and you can play it again.

You can use # and b(flat) for semitones. Just push Shift and Ctrl key while you left click.

This version lacks Undo implementation.
Watch out, no Undo. So save many times.

This web app supports both JSON score files and MSQ files for Mario Sequencer for Windows.
Just drag and drop MSQ files, they will be concatinated, and you can save it as one JSON file.
Please number files such as file1.msq, file2.msq .... fileN.msq.
If you want to change the tempo in the middle of the music, separate files,
drag and drop all, then player will change the tempo automatically.

You can use this app without internet after download them all.
I recommend you making local clone of this repository.

(Do you know Mario Composer file format? Or can you contribute that for me? :-)


WEB API
-------

There's some WEB API.

- ?url="json or msq file URI"

You can download the score file by this.

- ?auto="true or false"

You can play the music automatically by this.

- ?mag="integer N > 0"

If you believe "The bigger, the better", Go for it!

- ?SCORE="MSQ's sore data"

You can pass the score data by this.

Try these links for example.

  Kerby's OP theme. http://bit.ly/1iuFZs1 
  Aunt Spoon (or Mrs.Pepper Pot) http://bit.ly/1kpLFsd

License
------
This comes from good old SNES game, Mario Paint.
Images and sounds belong to Nintendo.

All code is my original. Written in HTML + JavaScript.
I declare the code in this web app as Public Domain.
Only code, not images and sounds.
Do what you want with my code.
But I'm not responsible for anything, in any means.

Acknowledgement
-----

- Anonymous Mario Sequencer developer in 2ch.

- Phenix who made great music with Mario Sequencer.

  http://phenix2525.blog79.fc2.com/blog-entry-6.html

- Mario Composer Developer

  Similar Mario Paint simulator for Win and Mac

  Developed with Adobe Director

  I owed the idea of Shift and Ctrl click for semitones

- it859 who made MSQ file archive

  http://it859.fc2web.com/mariopaint/mariopaint_music.html#m-2

- Internet Archive

  You really help me a lot for downloading old and disappeared files.

- Simon Whiataker

  "Fork me on GitHub" ribbon in pure CSS. Great work!

  https://github.com/simonwhitaker/github-fork-ribbon-css

Thank you all!
