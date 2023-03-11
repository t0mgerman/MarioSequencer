export function showSpriteFrame(btn: HTMLButtonElement, frameLength: number) {
    return function (num: number) {
        return new Promise<void>(function (resolve, reject) {
            setTimeout(function() {
                btn.style.backgroundImage = "url(" + btn.images[num].src + ")";
                resolve()
            }, frameLength);
        });
    }
}