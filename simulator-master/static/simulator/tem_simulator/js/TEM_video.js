var fft_video = document.getElementById('fftvideo');
var canvasInterval = null;
var fps = 60;


// ======================= START ======================== //
const drawImage = () => {
    ctx.drawImage(fft_video, 0, 0, w_h, w_h);
}


fft_video.onended = function () {
    clearInterval(canvasInterval);
    next_step();
};
fft_video.onplay = function () {
    clearInterval(canvasInterval);
    canvasInterval = window.setInterval(() => {
        drawImage();
    }, 1000 / fps);
};

function playFFT() {
    canvasInterval = window.setInterval(() => {
        drawImage();
    }, 1000 / fps);
    fft_video.play();
}
// ======================= END ======================== //
