/* simulator snippets javascript functions    

Created  by Andres Vasquez for AMMRF'S www.myscope.training
info@andresvasquez.net  —— www.andresvasquez.net ——
copyright:This work is licensed under a Creative Commons Attribution 4.0 International License.

************************************************************************/
// ======================= START TOOGLE CLASS  ======================== //
function toogle_fn(element, className, bool) {
    if ($(element).hasClass(className) == bool) {
        $(element).toggleClass(className);
    }
}
// =======================  END TOOGLE CLASS ==================== //
// ======================= START RANDOM INT ======================== //
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}
// =======================  END RANDOM INT ==================== //
// ======================= jQuery touch devices ======================= //
(function ($) {
    // Detect touch support
    $.support.touch = 'ontouchend' in document;
    // Ignore browsers without touch support
    if (!$.support.touch) {
        return;
    }
    var mouseProto = $.ui.mouse.prototype,
        _mouseInit = mouseProto._mouseInit,
        touchHandled;

    function simulateMouseEvent(event, simulatedType) { //use this function to simulate mouse event
        // Ignore multi-touch events
        if (event.originalEvent.touches.length > 1) {
            return;
        }
        event.preventDefault(); //use this to prevent scrolling during ui use
        var touch = event.originalEvent.changedTouches[0],
            simulatedEvent = document.createEvent('MouseEvents');
        // Initialize the simulated mouse event using the touch event's coordinates
        simulatedEvent.initMouseEvent(simulatedType, // type
            true, // bubbles                    
            true, // cancelable                 
            window, // view                       
            1, // detail                     
            touch.screenX, // screenX                    
            touch.screenY, // screenY                    
            touch.clientX, // clientX                    
            touch.clientY, // clientY                    
            false, // ctrlKey                    
            false, // altKey                     
            false, // shiftKey                   
            false, // metaKey                    
            0, // button                     
            null // relatedTarget              
        );
        // Dispatch the simulated event to the target element
        event.target.dispatchEvent(simulatedEvent);
    }
    mouseProto._touchStart = function (event) {
        var self = this;
        // Ignore the event if another widget is already being handled
        if (touchHandled || !self._mouseCapture(event.originalEvent.changedTouches[0])) {
            return;
        }
        // Set the flag to prevent other widgets from inheriting the touch event
        touchHandled = true;
        // Track movement to determine if interaction was a click
        self._touchMoved = false;
        // Simulate the mouseover event
        simulateMouseEvent(event, 'mouseover');
        // Simulate the mousemove event
        simulateMouseEvent(event, 'mousemove');
        // Simulate the mousedown event
        simulateMouseEvent(event, 'mousedown');
    };
    mouseProto._touchMove = function (event) {
        // Ignore event if not handled
        if (!touchHandled) {
            return;
        }
        // Interaction was not a click
        this._touchMoved = true;
        // Simulate the mousemove event
        simulateMouseEvent(event, 'mousemove');
    };
    mouseProto._touchEnd = function (event) {
        // Ignore event if not handled
        if (!touchHandled) {
            return;
        }
        // Simulate the mouseup event
        simulateMouseEvent(event, 'mouseup');
        // Simulate the mouseout event
        simulateMouseEvent(event, 'mouseout');
        // If the touch interaction did not move, it should trigger a click
        if (!this._touchMoved) {
            // Simulate the click event
            simulateMouseEvent(event, 'click');
        }
        // Unset the flag to allow other widgets to inherit the touch event
        touchHandled = false;
    };
    mouseProto._mouseInit = function () {
        var self = this;
        // Delegate the touch handlers to the widget's element
        self.element.on('touchstart', $.proxy(self, '_touchStart')).on('touchmove', $.proxy(self, '_touchMove')).on('touchend', $.proxy(self, '_touchEnd'));
        // Call the original $.ui.mouse init method
        _mouseInit.call(self);
    };
})(jQuery);
// ======================= END jQuery touchdevices =============================== //
// =======================START TOUCHDEVICE CONDITIONALS =================== //
var simulatorBase = document.getElementById("simulator-base");

function isTouchDevice(w, h) {
    if (('ontouchstart' in window || navigator.maxTouchPoints > 0) || window.DocumentTouch && document instanceof DocumentTouch) {
        simulatorBase.style.width = w;
        simulatorBase.style.height = h;
    } else {
        //        return "nah, this isn't a touch screen device";
    }
}
// ======================= END TOUCHDEVICE CONDITIONALS END  =================== //
// ======================= START LOAD IMAGES ======================== //
const loadChamberImages = (min, max, path, arr, id_code) => {
    var IMGchamber;
    //    if (window.screen.width < 769) {
    //        if (isiPad) {
    //            IMGchamber = '@2xsmall.';
    //        } else {
    //            IMGchamber = '@small.';
    //        }
    //    } else if (window.devicePixelRatio > 1) {
    //        IMGchamber = '@2x.';
    //    } else {
    IMGchamber = '.';
    //    }
    for (var i = min; i < max; i++) {
        var theImage = document.createElement("img");
        theImage.setAttribute("id", id_code + i);
        theImage.setAttribute("src", path + i + IMGchamber + "jpg");
        theImage.setAttribute("style", "display:none");
        document.body.appendChild(theImage);
        // get images into array
        arr[i - 1] = document.getElementById(id_code + i);
    }
}
// ======================= END LOAD IMAGES ======================== //
// ======================= START CHAMBER ANIMATION ======================== //
let looptoStop = false;
let callNext = true;
const videoChamberAnimation = (exitLoop, initIMG, topIMG, canvasData, sprite_arr, nextFun) => {
    looptoStop = true;
    vidChamberTimeout = setTimeout(() => {
        vidChamber = requestAnimationFrame(function () {
            videoChamberAnimation(exitLoop, initIMG, topIMG, canvasData, sprite_arr, nextFun);
        });
        counter++;
        if (counter == topIMG) {
            if (exitLoop) {
                counter = topIMG - 1;
                if (callNext) {
                    nextFun();
                    callNext = false;
                }
                //                stopLoop();
            } else {
                counter = initIMG;
            }
        } else if (counter == (topIMG - 2)) {
            callNext = true;
        }
    }, 3000 / 15);
    for (let val of canvasData) {
        val.bufferCtx.clearRect(0, 0, val.c.width, val.c.height);
        val.bufferCtx.imageSmoothingEnabled = false;
        val.bufferCtx.drawImage(sprite_arr[counter], val.sx, val.sy, val.swidth, val.sheight, val.x, val.y, val.width, val.height);
        //        val.ctx.clearRect(0, 0, val.c.width, val.c.height);
        val.ctx.imageSmoothingEnabled = false;
        val.ctx.drawImage(val.bufferC, 0, 0, val.bufferC.width, val.bufferC.height, 0, 0, val.c.width, val.c.height);
    }
};
const stopLoop = resetCounter => {
    counter = 0;
    clearTimeout(vidChamberTimeout);
    cancelAnimationFrame(vidChamber);
}
// ======================= END CHAMBER ANIMATION ======================== //
// ======================= START JSON LOADER ======================== //
let checkJSON;
let loadedJson;
const loadJSON = (file, callback) => {
    let xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', file, true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}
const load = myJson => {
    loadJSON(myJson, function (response) {
        let actual_JSON = JSON.parse(response);
        loadedJson = actual_JSON;
    });
}
let myTimer = () => {
    if (loadedJson) {
        clearInterval(checkJSON);
    } else {
        load(jsonPath);
    }
}
// =======================  END END JSON LOADER ==================== //
// ======================= START CLASS LOADER ======================== //
/**
 * Loader Class
 forked from from https://codepen.io/aternus/pen/GdeGqL - a pen by Kiril Reznik
 */
class Loader {
    static js(url) {
        return new Promise((resolve, reject) => {
            this._load("script", url, resolve, reject);
        });
    }
    static jpg(url, id_att) {
        return new Promise((resolve, reject) => {
            this._load("img", url, resolve, reject, id_att);
        });
    }
    static svg(url, id_att) {
        return new Promise((resolve, reject) => {
            this._load("img", url, resolve, reject, id_att);
        });
    }
    static mp4(url, id_att) {
        return new Promise((resolve, reject) => {
            this._load("video", url, resolve, reject, id_att);
        });
    }
    static _load(tag, url, resolve, reject, id_att) {
        let element = document.createElement(tag);
        let attr;
        let id_attr;
        let parent;
        // resolve and reject for the promise
        element.addEventListener("load", () => {
            resolve(url);
        });
        element.addEventListener("error", () => {
            reject(url);
        });
        // set different attributes depending on tag type
        switch (tag) {
            case "script":
                parent = "body";
                attr = "src";
                element.async = false;
                break;
            case "link":
                parent = "head";
                attr = "href";
                element.type = "text/css";
                element.rel = "stylesheet";
                break;
            case "img":
            case "video":
                parent = "body";
                attr = "src";
                id_attr = "id";
                // set the id for the element
                element[id_attr] = id_att;
                element["style"] = "display:none";
                break;
            default:
                throw new Error("Unsupported tag.");
        }
        // set the url for the element
        element[attr] = url;
        // initiate the loading of the element
        document[parent].appendChild(element);
    }
}
// =======================  END END CLASS LOADER ==================== //
// ======================= START ADDARRAYS ======================== //
const addArrays = (arr1, arr2) => {
    let sum = arr1.map((num, idx) => {
        if (arr2[idx] >= 0) {
            return num + arr2[idx]
        } else {
            return 0
        };
    });
    return sum
}
// =======================  END END ADDARRAYS ==================== //
// ======================= START INSTRUCTIONS ======================== //
const showInstruction = (instruct_text) => {
    toogle_fn("#top-instructions", "top-instructions-on", true);
    $("#top-instructions-txt").html(instruct_text);
    setTimeout(() => toogle_fn("#top-instructions", "top-instructions-on", false), 0);
};
// ======================= END INSTRUCTIONS ======================== //
// =========== START BLUR MODAL  ================== //
function blurWhenModal() {
    toogle_fn("#top-bar", "modal-is-open", false);
    toogle_fn("#simulator-base", "modal-is-open", false);
}

function unblurWhenModal() {
    toogle_fn("#top-bar", "modal-is-open", true);
    toogle_fn("#simulator-base", "modal-is-open", true);
}
// ======================= END BLUR MODAL END  ================== //
// ======================= START SAVE MICROGRAPH ======================== //
//snippet from:  http://stackoverflow.com/questions/18480474/how-to-save-an-image-from-canvas
function savePNG(canvastoPrint, filename) {
    /// create an "off-screen" anchor tag
    var lnk = document.createElement('a'),
        e;
    /// the key here is to set the download attribute of the a tag
    lnk.download = filename;
    /// convert canvastoPrint content to data-uri for link. When download
    /// attribute is set the content pointed to by link will be
    /// pushed as "download" in HTML5 capable browsers
    lnk.href = canvastoPrint.toDataURL();
    /// create a "fake" click-event to trigger the download
    if (document.createEvent) {
        e = document.createEvent("MouseEvents");
        e.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        lnk.dispatchEvent(e);
    } else if (lnk.fireEvent) {
        lnk.fireEvent("onclick");
    }
}
// =======================  END END SAVE MICROGRAPH ==================== //
// ======================= START ======================== //
const checking_bools = (...bools_arr) => {
    for (let val of bools_arr) {
        if (!val)
            return false;
    }
    return true;
}
// ======================= END ======================== //
// ======================= START ======================== //
const scroll_equation = (a, b, c, d, e) => {
    //    linear scaling equation
    //    a = current dial y position
    //    b = min dial y position
    //    c = max dial y position
    //    d = min content position
    //    e = max content position
    let correspondent_position = (((e - d) / (c - b)) * (a - b)) + d;
    return correspondent_position;
}
// ======================= END ======================== //
// ======================= START imgSeqAnimation ======================== //
const imgSeqAnimation = (exitLoop, initIMG, topIMG, canvasData, nextFun = empty_fn, updateFun) => {
    imgSeqTimeout = setTimeout(() => {
        imgSeq = requestAnimationFrame(function () {
            imgSeqAnimation(exitLoop, initIMG, topIMG, canvasData, nextFun, updateFun);
        });
        currentImg++;
        if (currentImg == topIMG) {
            if (exitLoop) {
                currentImg = topIMG - 1;
                nextFun();
            } else {
                currentImg = initIMG;
            }
        }
    }, 3000 / 15);
    for (let val of canvasData) {
        val.bufferCtx.clearRect(0, 0, val.c.width, val.c.height);
        val.bufferCtx.drawImage(val.sprite_arr[currentImg], 0, 0, val.swidth, val.sheight, 0, 0, val.c.width, val.c.height);
        val.ctx.drawImage(val.bufferC, 0, 0, val.bufferC.width, val.bufferC.height, 0, 0, val.c.width, val.c.height);
        if (updateFun) updateFun();
    }
};
const stop_imgSeqAnimation = presetCurrentImg => {
    currentImg = presetCurrentImg;
    clearTimeout(imgSeqTimeout);
    cancelAnimationFrame(imgSeq);
}
// ======================= END imgSeqAnimation ======================== //

//// ======================= START Channel_scan ======================== //
class Channel_scan {

    constructor(img, ctx, bufferCtx, sx = 0, sy = 0, after_snapshot_fn = empty_fn) {
        this.img = img;
        this.ctx = ctx;
        this.bufferCtx = bufferCtx;
        this.sx = sx;
        this.sy = sy;
        this.imgData;
        this.idata;
        this.buffer32;
        this.len;
        this.i = 0;

        this.tvCounter = 2;
        this.fRate = 10;
        this.scanEffect;
        this.constant_scanning = true;

        this.after_snapshot_fn = after_snapshot_fn;
    }


    drawBuffer() {
        this.bufferCtx.drawImage(this.img, 0, 0, canvas_w, canvas_h, 0, 0, canvas_w, canvas_h);
        this.imgData = this.bufferCtx.getImageData(0, 0, canvas_w, canvas_h);
        this.noise_fn();
    };

    noise_fn() {
        this.idata = this.imgData;
        this.buffer32 = new Uint32Array(this.idata.data.buffer);
        this.len = this.buffer32.length;
        for (; this.i < this.len;) this.buffer32[this.i++] = ((255 * Math.random()) | 0) << 24;
        this.draw_it();
    }

    draw_it() {
        this.scanEffect = requestAnimationFrame(() => this.draw_it());
        if (this.tvCounter < canvas_h) {
            this.ctx.putImageData(this.idata, 0, 0, 0, this.tvCounter, canvas_w, 2);
            this.ctx.drawImage(this.img, this.sx, this.sy, canvas_w, this.tvCounter, 0, 0, canvas_w, this.tvCounter);
            this.tvCounter += this.fRate;
        } else {
            if (!this.constant_scanning) {
                cancelAnimationFrame(this.scanEffect);
                console.log("PLOP");
                this.after_snapshot_fn();
                return
            }
            this.tvCounter = 2;
        };
    };

}
//// ======================= END Channel_scan ======================== //
//// ======================= START Channel_scan ======================== //
class SPM_scan {

    constructor(img, ctx, bufferCtx1, bufferCanvas2, glitchctx, bufferCanvas3, ctx_profile, ctx_invisible) {
        this.img = img;
        this.ctx = ctx;
        this.bufferCtx1 = bufferCtx1;
        this.bufferCanvas2 = bufferCanvas2;
        this.bufferCtx2 = bufferCanvas2.getContext("2d");
        this.bff2Data;
        this.glitchctx = glitchctx;
        this.bufferCanvas3 = bufferCanvas3;
        this.sx = 0;
        this.sy = 0;
        this.imgData;
        this.idata;
        this.buffer32;
        this.len;
        this.i = 0;

        this.tvCounter = 2;
        this.fRate = 10;
        this.scanEffect;
        this.constant_scanning = true;
        this.noiseY = 0;
        this.after_snapshot_fn = empty_fn;
        this.profile_straight_bool = false;
        this.profile_bool = false;
        this.ctx_profile = ctx_profile;
        this.ctx_invisible = ctx_invisible;
        this.ctx_scanline;
        this.doubleIt = empty_fn;
        
    }

    drawBuffer() {
        this.bufferCtx1.drawImage(this.img, 0, 0, this.img.width, this.img.height, 0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.imgData = this.bufferCtx1.getImageData(0, 0, this.bufferCtx1.canvas.width, this.bufferCtx1.canvas.height);
        this.noise_fn();
    };

    noise_fn() {
        this.idata = this.imgData;
        this.buffer32 = new Uint32Array(this.idata.data.buffer);
        this.len = this.buffer32.length;
        for (; this.i < this.len;) this.buffer32[this.i++] = ((255 * Math.random()) | 0) << 24;
        this.draw_it();
    }

    draw_it() {
        let sheight = this.tvCounter - this.noiseY;
        if (sheight < 1) sheight = 1;
        this.scanEffect = requestAnimationFrame(() => this.draw_it());
        if (this.profile_fun_bool) {
            this.ctx_invisible.drawImage(this.bufferCanvas2, 0, 0, this.bufferCanvas2.width, this.bufferCanvas2.height, 0, 0, this.ctx_invisible.canvas.width, this.ctx_invisible.canvas.height);
            this.bff2Data = this.ctx_invisible.getImageData(0, 0, this.ctx_invisible.canvas.width, this.ctx_invisible.canvas.height);
            profile_fn();
            this.profile_fun_bool = false;
        }
        if (this.profile_bool) this.draw_profile();
        if (this.tvCounter < this.ctx.canvas.height + this.fRate) {
            
            this.ctx_scanline.clearRect(0, 0, this.bufferCanvas3.width, this.bufferCanvas3.height);
            this.ctx_scanline.putImageData(this.idata, 0, 0, 0, this.tvCounter, this.ctx.canvas.width, 5);
            this.ctx.drawImage(this.bufferCanvas2, this.sx, this.noiseY, this.bufferCanvas2.width, sheight, 0, this.noiseY, this.ctx.canvas.width, (this.tvCounter - this.noiseY));
            this.glitchctx.clearRect(0, this.tvCounter, this.bufferCanvas3.width, 5);
            this.glitchctx.drawImage(this.bufferCanvas3, this.sx, getRandomInt((this.tvCounter - this.noiseY) - 20, (this.tvCounter - this.noiseY) + 10), this.bufferCanvas3.width, 10, 0, (this.tvCounter - this.noiseY) - 10, this.ctx.canvas.width, 10);
            this.tvCounter += this.fRate;
        } else {
            if (!this.constant_scanning) {
                cancelAnimationFrame(this.scanEffect);
                this.after_snapshot_fn();
                return
            }
            this.noiseY = 2;
            this.tvCounter = 2;
            this.doubleIt();
        };
    };

    draw_profile() {
        let i = Math.floor(this.tvCounter / 12.55);
        let ii = _y_array[i];
        let ii_index = 0;
        this.ctx_profile.lineWidth = 3;
        this.ctx_profile.strokeStyle = "#2196f3";
        if (this.profile_straight_bool) {
            this.ctx_profile.clearRect(0, 0, this.ctx_profile.canvas.width, this.ctx_profile.canvas.height);
            this.ctx_profile.beginPath();
            this.ctx_profile.moveTo(0, this.ctx_profile.canvas.height / 2);
            this.ctx_profile.lineTo(wh, this.ctx_profile.canvas.height / 2);
            this.ctx_profile.stroke();
        } else {
            if (ii) {
                if (ii_index == 0) this.ctx_profile.clearRect(0, 0, this.ctx_profile.canvas.width, this.ctx_profile.canvas.height);
                for (const element of ii) {
                    this.x = ii_index;
                    this._y = element;
                    if (ii_index == 0) {
                        this.ctx_profile.beginPath();
                        this.ctx_profile.moveTo(this.x, this._y);
                    }
                    this.ctx_profile.lineTo(this.x * 12.6, this._y);
                    this.ctx_profile.stroke();
                    ii_index++
                }
            }
        }
    };


}
//// ======================= END SPM_scan ======================== //
// ======================= START Countdown ======================== //
class Countdown {

    constructor(num_secs, hour_id, min_id, secs_id, millisecs_id, progressbar_id, next_fn = empty_fn) {
        this.segundos = num_secs;
        this.hr_id = hour_id;
        this.mt_id = min_id;
        this.sc_id = secs_id;
        this.ms_id = millisecs_id;
        this.pgssbar_id = progressbar_id;
        this.nextFun = next_fn;
        this.date_1;
        this.init_time;
        this.time_1;
    }

    startTimer() {
        this.date_1 = new Date();
        this.init_time = this.date_1.getTime();
        this.time_1 = this.init_time += (this.segundos * 1000);
        this.loopTimer();
    }

    loopTimer() {
        let time_diff;
        let mil_seconds = 0;
        let secs = 0;
        let mins = 0;
        let hours = 0;


        let date_2 = new Date();
        let current_time = date_2.getTime();

        time_diff = this.time_1 - current_time;
        if (time_diff <= 0) {
            // full stop
            this.nextFun();
            clearTimeout(this.countdown);
            return true;
        }
        mil_seconds = time_diff % 1000;
        if (mil_seconds < 1) {
            mil_seconds = 0;
        } else {
            secs = (time_diff - mil_seconds) / 1000;
            if (secs < 1) {
                secs = 0;
            } else {
                mins = (secs - (secs % 60)) / 60;
                if (mins < 1) {
                    mins = 0;
                } else {
                    hours = (mins - (mins % 60)) / 60;
                    if (hours < 1) {
                        hours = 0;
                    }
                }
            }
        }

        mil_seconds = Math.round(mil_seconds / 100);
        secs = secs - (mins * 60);
        mins = mins - (hours * 60);

        if (this.ms_id != null && this.ms_id != undefined) $('#' + this.ms_id).html(this.formatTimer(mil_seconds));
        if (this.sc_id != null && this.sc_id != undefined) $('#' + this.sc_id).html(this.formatTimer(secs));
        if (this.mt_id != null && this.mt_id != undefined) $('#' + this.mt_id).html(this.formatTimer(mins));
        if (this.hr_id != null && this.hr_id != undefined) $('#' + this.hr_id).html(this.formatTimer(hours));

        let progress_cd = scroll_equation(time_diff, 0, (this.segundos * 1000), 100, 0);

        if (this.pgssbar_id != null && this.pgssbar_id != undefined) $('#' + this.pgssbar_id).progressbar("value", progress_cd);

        this.countdown = setTimeout(() => this.loopTimer(), 1);
    }

    formatTimer(a) {
        if (a < 10) {
            a = '0' + a;
        }
        return a;
    }
}

// =======================  END Countdown END  ==================== //
// ======================= START ======================== //
const empty_fn = () => {
    console.log("EMPTY FUNCTION");
    return
}
// ======================= END ======================== //
