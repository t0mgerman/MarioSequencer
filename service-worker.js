if(!self.define){let e,a={};const d=(d,i)=>(d=new URL(d+".js",i).href,a[d]||new Promise((a=>{if("document"in self){const e=document.createElement("script");e.src=d,e.onload=a,document.head.appendChild(e)}else e=d,importScripts(d),a()})).then((()=>{let e=a[d];if(!e)throw new Error(`Module ${d} didn’t register its module`);return e})));self.define=(i,n)=>{const r=e||("document"in self?document.currentScript.src:"")||location.href;if(a[r])return;let c={};const o=e=>d(e,r),f={module:{uri:r},exports:c,require:o};a[r]=Promise.all(i.map((e=>f[e]||o(e)))).then((e=>(n(...e),c)))}}define(["./workbox-460519b3"],(function(e){"use strict";self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"644.bundle.js",revision:"f529b760047dc37b29a2d3b9e6f4d26c"},{url:"favicon.ico",revision:"58667f50f44d459af809e5f767578fae"},{url:"image/G_Clef.png",revision:"8ea95dc4e604acd92c6e3d6352c4b4cf"},{url:"image/Mario.png",revision:"48aac78fe2b65a8ccd4d59d03d04a702"},{url:"image/about.png",revision:"61af799041c72bce943075d51b14e824"},{url:"image/beat_button.png",revision:"43797bf97b5ac7b45d2013e067e4d636"},{url:"image/bomb.png",revision:"8cc2d8645fb535a99f9cd01236e12f59"},{url:"image/character_sheet.png",revision:"b400e575e5408db37f6a633f0a51836e"},{url:"image/clear_button.png",revision:"ce48f10d52483408034e9e22911b923f"},{url:"image/end_mark.png",revision:"1f812ccc75005f99c6b398a5f7a1daa3"},{url:"image/mario_sweat.png",revision:"b58f0de72b1d2bedb309aa1fb769aab5"},{url:"image/mat.png",revision:"c59c6a048f4edf1cdaec0ac58543d456"},{url:"image/numbers.png",revision:"93cfe5e7a1283eff5f2a8cf651e501f1"},{url:"image/play_button.png",revision:"237c21f1f25c261efa33691660dc54d6"},{url:"image/repeat_head.png",revision:"c6de8fa9fee47751c130bb6395f4de3b"},{url:"image/semitone.png",revision:"065e5fa4d60148b8e7d5ded40d7b0cde"},{url:"image/share.png",revision:"d6275e09d0064a68c4755b01b4afa095"},{url:"image/slider_thumb.png",revision:"d3f69e7baf0d217e23d65690eab6f9c6"},{url:"image/song_buttons.png",revision:"534ce5a6154bc3c41f337971db2fdf53"},{url:"image/stop_button.png",revision:"0c807d4542834e4c0a128c9f4780c26d"},{url:"image/undo_dog.png",revision:"aa0547fce9770bd54f1a4f849d0b36e3"},{url:"index.html",revision:"73bfc30371b5d8240b5340a320e2e9b3"},{url:"main.bundle.js",revision:"c68b996d4544f19c5098dfcea4ed018d"},{url:"main.css",revision:"ca9aed4c93ccd60668500e4751563682"},{url:"wav/sound01.wav",revision:"6a7d910e81c4b2587ccb8eebf3ed0f26"},{url:"wav/sound02.wav",revision:"8a72d3f289d0e96a191eded152271f97"},{url:"wav/sound03.wav",revision:"eceff1052082d47c4a7105747c42fde2"},{url:"wav/sound04.wav",revision:"022bd0c53347dd301a5295306e47f043"},{url:"wav/sound05.wav",revision:"0bef142044c4970b3419862426c54ce1"},{url:"wav/sound06.wav",revision:"c3ae58dc2b1234c21a10914ef22ac028"},{url:"wav/sound07.wav",revision:"d739e19f1deec08a58753264cbf5436d"},{url:"wav/sound08.wav",revision:"7227b5c68c8583167b8afa14ac141a3d"},{url:"wav/sound09.wav",revision:"c5f3045a34f6fc92c94ed06adc0d62f5"},{url:"wav/sound10.wav",revision:"3e8e8c330e3079cc6b84fd50c7ced191"},{url:"wav/sound11.wav",revision:"87ad1161fa07c7dc1fe207faff6e31c6"},{url:"wav/sound12.wav",revision:"3bbbce4ce25918f1d529a3e391a4b87e"},{url:"wav/sound13.wav",revision:"a53bce289a098ea62faf78193c0bea0a"},{url:"wav/sound14.wav",revision:"f642ec59ea7c45e94217483338682e03"},{url:"wav/sound15.wav",revision:"fda933668926c8328d00ed341dd6744e"},{url:"wav/sound16.wav",revision:"6e38770f8a0b8a127497e93150e0e2f1"},{url:"wav/sound17.wav",revision:"449d65a531c1a9c936615934b7017666"},{url:"wav/sound18.wav",revision:"204c483ae25720a55437356095ee0f4e"},{url:"wav/sound19.wav",revision:"f5b3148fbda4e02dcd1750105b6bbbc3"},{url:"wav/sound20.wav",revision:"1ddb2bdcf3582ff577f2c21b7522a8f1"},{url:"wav/sound21.wav",revision:"1491f320f1a90d322822cc60eba94d55"},{url:"wav/sound22.wav",revision:"f30a63a8d016817905dc37315fcd37dc"},{url:"wav/sound23.wav",revision:"7863b922994d2e8cd428f6b05104a3f4"},{url:"wav/sound24.wav",revision:"3529da1b2b018c3469d7e66c8178b22e"},{url:"wav/sound25.wav",revision:"68a50086d1024aafcce88e1821cd0b1e"},{url:"wav/sound26.wav",revision:"c6fb1d327861b8e41959157e8d8e3551"},{url:"wav/sound27.wav",revision:"0fd4472da8757f7fc47796945b7b7dc4"},{url:"wav/sound28.wav",revision:"681ebde7aee800db4279555f969220f3"},{url:"wav/sound29.wav",revision:"3cc8d2bef9c68faf6ca9fd17b3b89361"}],{})}));
//# sourceMappingURL=service-worker.js.map
