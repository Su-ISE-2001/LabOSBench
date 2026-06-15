/* SEM_simulator javascript functions    

Created  by Andres Vasquez for AMMRF'S www.myscope.training
info@andresvasquez.net  —— www.andresvasquez.net ——
copyright:This work is licensed under a Creative Commons Attribution 4.0 International License.

************************************************************************/
var canvas = document.querySelector("#micrograph");
var ctx = canvas.getContext("2d");
var bufferCanvas = document.createElement("canvas");
bufferCanvas.setAttribute("id", "buffer");
var bufferCanvasCtx = bufferCanvas.getContext("2d");
var bufferC = document.createElement("canvas");
var bufferCctx = bufferC.getContext("2d");
var stage = new createjs.Stage(bufferCanvas);
var image = new Image();
/** 供 sem_mosaic_roi 等脚本可靠引用（勿依赖隐式 window.image） */
window.SEM_SOURCE_IMAGE = image;
var simulatorBase = document.getElementById("simulator-base");
var example_img = document.getElementById("example-img");
var knob = document.getElementsByClassName("knob");
var startChamber;
var vidChamber;
var vidChamberTimeout;
var SAMPLE_CONFIG = (window.SEM_SAMPLE_CONFIG || []).slice();
if (!SAMPLE_CONFIG.length) {
    console.warn("[SEM] SEM_SAMPLE_CONFIG missing, fallback to single default sample.");
    SAMPLE_CONFIG = [
        {
            id: "sample1",
            label: "sample1",
            seImage: "/static/simulator/sem_simulator/images/simulator/SEM/wood_SE.jpg",
            bseImage: "/static/simulator/sem_simulator/images/simulator/SEM/wood_BSE.jpg",
            chamberTopFrame: 76,
            scaleBarSize: 5.4,
            scaleBarUnit: 20
        }
    ];
}
var SAMPLE_BY_ID = {};
SAMPLE_CONFIG.forEach(function (sample) {
    SAMPLE_BY_ID[sample.id] = sample;
});
function sampleAt(index) {
    return SAMPLE_CONFIG[index] || SAMPLE_CONFIG[0];
}
// 兼容单步测试 API 对全局变量名的依赖
var SE_sample1 = sampleAt(0).seImage;
var SE_sample2 = sampleAt(1).seImage;
var SE_sample3 = sampleAt(2).seImage;
var SE_sample4 = sampleAt(3).seImage;
var SE_sample5 = sampleAt(4).seImage;
var SE_sample6 = sampleAt(5).seImage;
var BSE_sample1 = sampleAt(0).bseImage;
var BSE_sample2 = sampleAt(1).bseImage;
var BSE_sample3 = sampleAt(2).bseImage;
var BSE_sample4 = sampleAt(3).bseImage;
var BSE_sample5 = sampleAt(4).bseImage;
var BSE_sample6 = sampleAt(5).bseImage;
var currentSEsample = SE_sample1;
var currentBSEsample = BSE_sample1;
var alpha = 0;
var delta = 0.005;
var topImage = 57;
var initImage = 0;
var counter = 0;
var chamberOpen = false;
var samplePlaced = false;
var stageRotation = false;
var bse_switch = false;
var sprite = new Array();
var toggle = true;
var doTheNoise;
var dotvNoise;
var simInstruction;
var randomNegative = Math.random() < 0.5 ? -1 : 1;
var randomBrightness = getRandomInt(160, 190);
var brightnessIncrement = 0;
var volt_bool = false;
var volt_values = [0, 0.1, 0.3, 1.5, 1.9];
var kVs = volt_values[0];
var spot_valuesBright = [0.1, 0.15, 0.2, 0.25, 0.3];
var spot_bright = spot_valuesBright[0];
var brightNms = 0;
var brightnessValue = 0;
var randomContrast = getRandomInt(100, 190);
var contrastAmount = getRandomInt(5, 15) / 10;
var contrastIncrement = 0;
var spot_valuesBlur = [0.5, 1, 1.5, 2, 2.5];
var spotSlider_blur = spot_valuesBlur[0];
var z_values = [5, 3.25, 2.5, 1.75, 1, 0];
var zBlur = z_values[0];
var coarseKnob = 0;
var fineKnob = 0;
var astigm_blur = (getRandomInt(20, 50) / 10) * randomNegative;
var astig_X = 0;
var astig_Y = 0;
var trim_values = [1, 1.12, 1.14, 1.16, 1.18, 1.20];
var trim = 1;
var noise = "tv_rate";
var lastScanUsed = "";
var p1 = 0.3;
var p2 = 0.59;
var p3 = 0.11;
var er = 0; // extra red
var eg = 0; // extra green
var eb = 0; // extra blue
var img_loaded;
var htOn = false;
var stretch = 1;
/** 放大后相对「居中」位置的像素平移；旋钮调倍率时不再强制回到中心 */
var imgPanX = 0;
var imgPanY = 0;
var scaleBar_size;
var scaleBar_unit;
var imgData;
var imgData_forScan;
var x_factor = 10;
var y_factor = 10;
var x = 0;
var y = 0;
var fromScanModes = false;
// ======================= jQuery Drag and Drop on touch devices =============================== //
(function ($) {
    // Detect touch support
    $.support.touch = 'ontouchend' in document;
    // Ignore browsers without touch support
    if (!$.support.touch) {
        return;
    }
    var mouseProto = $.ui.mouse.prototype
        , _mouseInit = mouseProto._mouseInit
        , touchHandled;

    function simulateMouseEvent(event, simulatedType) { //use this function to simulate mouse event
        // Ignore multi-touch events
        if (event.originalEvent.touches.length > 1) {
            return;
        }
        event.preventDefault(); //use this to prevent scrolling during ui use
        var touch = event.originalEvent.changedTouches[0]
            , simulatedEvent = document.createEvent('MouseEvents');
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
// ======================= END jQuery Drag and Drop on touch devices END =============================== //
// ========= ================START TOUCHDEVICE CONDITIONALS=========== =================== //
function isTouchDevice() {
    if (('ontouchstart' in window || navigator.maxTouchPoints > 0) || window.DocumentTouch && document instanceof DocumentTouch) {
        simulatorBase.style.width = "100%";
        simulatorBase.style.height = "64vw";
    }
    else {
        //        return "nah, this isn't a touch screen device";
    }
}
isTouchDevice();
function resetSampleSelectToPlaceholder() {
    var sel = document.getElementById("sem-sample-select");
    if (!sel || !sel.options.length) return;
    sel.selectedIndex = 0;
    syncSampleDropdownFromSelect();
    closeSampleDropdown();
}
function getSampleDropdownElements() {
    return {
        select: document.getElementById("sem-sample-select"),
        trigger: document.getElementById("sem-sample-trigger"),
        triggerText: document.getElementById("sem-sample-trigger-text"),
        menu: document.getElementById("sem-sample-menu")
    };
}
function closeSampleDropdown() {
    var els = getSampleDropdownElements();
    if (!els.menu || !els.trigger) return;
    els.menu.classList.add("totally-hidden");
    els.trigger.setAttribute("aria-expanded", "false");
}
function openSampleDropdown() {
    var els = getSampleDropdownElements();
    if (!els.menu || !els.trigger) return;
    els.menu.classList.remove("totally-hidden");
    els.trigger.setAttribute("aria-expanded", "true");
}
function toggleSampleDropdown(forceOpen) {
    var els = getSampleDropdownElements();
    if (!els.menu || !els.trigger) return;
    var shouldOpen = typeof forceOpen === "boolean" ? forceOpen : els.menu.classList.contains("totally-hidden");
    if (shouldOpen) {
        openSampleDropdown();
    } else {
        closeSampleDropdown();
    }
}
function syncSampleDropdownFromSelect() {
    var els = getSampleDropdownElements();
    var sel = els.select;
    if (!sel || !els.triggerText) return;
    var opt = sel.options && sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex] : null;
    var label = opt ? (opt.textContent || opt.innerText || "").trim() : "";
    if (!sel.value) {
        label = "\u2014 Select sample \u2014";
    }
    els.triggerText.textContent = label || "\u2014 Select sample \u2014";

    if (els.menu) {
        var items = els.menu.querySelectorAll(".sem-sample-option");
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var isSelected = !!sel.value && item.getAttribute("data-value") === sel.value;
            item.classList.toggle("sem-sample-option-selected", isSelected);
            item.setAttribute("aria-selected", isSelected ? "true" : "false");
        }
    }
}
function chooseSampleOption(sampleId) {
    var els = getSampleDropdownElements();
    var sel = els.select;
    if (!sel) return;
    sel.value = sampleId;
    syncSampleDropdownFromSelect();
    closeSampleDropdown();
    var ev;
    if (typeof Event === "function") {
        ev = new Event("change", { bubbles: true });
    } else {
        ev = document.createEvent("Event");
        ev.initEvent("change", true, true);
    }
    sel.dispatchEvent(ev);
}
function renderSampleSelector() {
    var container = document.querySelector(".choose-sample");
    if (!container) return;
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    var lab = document.createElement("label");
    lab.className = "sem-sample-label";
    lab.setAttribute("for", "sem-sample-select");
    lab.textContent = "Sample";
    var dropdown = document.createElement("div");
    dropdown.className = "sem-sample-dropdown";

    var trigger = document.createElement("button");
    trigger.type = "button";
    trigger.id = "sem-sample-trigger";
    trigger.className = "sem-sample-trigger btn";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", "sem-sample-menu");

    var triggerText = document.createElement("span");
    triggerText.id = "sem-sample-trigger-text";
    triggerText.className = "sem-sample-trigger-text";
    triggerText.textContent = "\u2014 Select sample \u2014";
    var triggerArrow = document.createElement("span");
    triggerArrow.className = "sem-sample-trigger-arrow";
    triggerArrow.setAttribute("aria-hidden", "true");
    triggerArrow.textContent = "\u25be";
    trigger.appendChild(triggerText);
    trigger.appendChild(triggerArrow);

    var menu = document.createElement("div");
    menu.id = "sem-sample-menu";
    menu.className = "sem-sample-menu totally-hidden";
    menu.setAttribute("role", "listbox");
    menu.setAttribute("aria-label", "Choose sample");

    var sel = document.createElement("select");
    sel.id = "sem-sample-select";
    sel.className = "sem-sample-select sem-sample-select-native";
    sel.setAttribute("aria-label", "Choose sample");
    var ph = document.createElement("option");
    ph.value = "";
    ph.disabled = true;
    ph.selected = true;
    ph.textContent = "\u2014 Select sample \u2014";
    sel.appendChild(ph);
    SAMPLE_CONFIG.forEach(function (sample) {
        var opt = document.createElement("option");
        opt.value = sample.id;
        opt.textContent = sample.label || sample.id;
        sel.appendChild(opt);

        var item = document.createElement("button");
        item.type = "button";
        item.className = "sem-sample-option";
        item.setAttribute("role", "option");
        item.setAttribute("data-value", sample.id);
        item.setAttribute("aria-selected", "false");
        item.textContent = sample.label || sample.id;
        item.addEventListener("click", function () {
            chooseSampleOption(sample.id);
        });
        menu.appendChild(item);
    });
    container.appendChild(lab);
    dropdown.appendChild(trigger);
    dropdown.appendChild(menu);
    dropdown.appendChild(sel);
    container.appendChild(dropdown);

    trigger.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleSampleDropdown();
    });
    trigger.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleSampleDropdown();
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            openSampleDropdown();
        } else if (e.key === "Escape") {
            closeSampleDropdown();
        }
    });
    menu.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            e.preventDefault();
            closeSampleDropdown();
            trigger.focus();
        }
    });
    sel.addEventListener("change", function () {
        syncSampleDropdownFromSelect();
    });
    syncSampleDropdownFromSelect();
}
renderSampleSelector();
/** FNV-1a 风格哈希：同 id 始终得到相同派生参数 */
function hashSemSampleKey(key) {
    var h = 2166136261 >>> 0;
    var s = String(key || "");
    for (var i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = ((h * 16777619) >>> 0);
    }
    return h >>> 0;
}
/**
 * 按样品设置「退化/调参目标」：randomBrightness、randomContrast、contrastAmount、astigm_blur、noise。
 * 无 tuning 时由 sample.id 确定性派生，保证不同样品目标不同。
 */
function applyTuningForSample(sample) {
    if (!sample || !sample.id) sample = SAMPLE_CONFIG[0];
    var t = sample.tuning || {};
    var h = hashSemSampleKey(sample.id);
    function clamp(v, lo, hi) {
        return Math.max(lo, Math.min(hi, v));
    }
    if (typeof t.randomBrightness === "number") {
        randomBrightness = clamp(t.randomBrightness, 0, 270);
    } else {
        randomBrightness = clamp(152 + (h % 58), 152, 230);
    }
    if (typeof t.randomContrast === "number") {
        randomContrast = clamp(t.randomContrast, 30, 265);
    } else {
        randomContrast = clamp(95 + ((h >>> 8) % 95), 95, 220);
    }
    if (typeof t.contrastAmount === "number") {
        contrastAmount = clamp(t.contrastAmount, 0.4, 2.2);
    } else {
        contrastAmount = clamp((5 + (h % 13)) / 10, 0.5, 1.8);
    }
    if (typeof t.astigmBlur === "number") {
        astigm_blur = t.astigmBlur;
        randomNegative = astigm_blur >= 0 ? 1 : -1;
    } else {
        randomNegative = (h & 1) ? 1 : -1;
        astigm_blur = (2 + ((h >>> 4) % 28) / 5) * randomNegative;
    }
    if (t.noise === "tv_rate" || t.noise === "scan1") {
        noise = t.noise;
    } else if (sample.noise === "tv_rate" || sample.noise === "scan1") {
        noise = sample.noise;
    } else {
        noise = (h % 2 === 0) ? "tv_rate" : "scan1";
    }
    window.currentSemSampleRecord = sample;
}
function resolveSemSampleByImageUrl(url) {
    if (!url) return SAMPLE_CONFIG[0];
    for (var i = 0; i < SAMPLE_CONFIG.length; i++) {
        if (SAMPLE_CONFIG[i].seImage === url) return SAMPLE_CONFIG[i];
    }
    return SAMPLE_CONFIG[0];
}
window.SEM_applyTuningForSample = applyTuningForSample;
window.SEM_resolveSemSampleByImageUrl = resolveSemSampleByImageUrl;
function applySampleSelection(sampleId) {
    var sample = SAMPLE_BY_ID[sampleId] || SAMPLE_CONFIG[0];
    if (!sample) return;
    stopLoop();
    stageRotation = true;
    applyTuningForSample(sample);
    resetKnobUiToNeutral();
    videoChamberAnimation(true, counter, sample.chamberTopFrame);
    currentSEsample = sample.seImage;
    currentBSEsample = sample.bseImage;
    scaleBar_size = sample.scaleBarSize;
    scaleBar_unit = sample.scaleBarUnit;
    toogle_fn(".top-btns", "totally-hidden", true);
    toogle_fn(".choose-sample", "totally-hidden", false);
    initSimulator();
}
window.SEM_applySampleSelection = applySampleSelection;
// ========= =============== END TOUCHDEVICE CONDITIONALS END ========= =================== //
// ======================= ================START SIMULATOR (INIT)================= ======================== //
function initSimulator() {
    img_loaded = false;
    imgPanX = 0;
    imgPanY = 0;
    image.src = currentSEsample;
    example_img.src = image.src;
    image.onload = function () {
        img_loaded = true;
        if (typeof drawIt === "function") drawIt();
    }
    htOn = false;
}
//initSimulator();
// ======================= ================ END END SIMULATOR (INIT)================= ==================== //
// ======================= ============== START SLIDERS ============= ======================== //
$(document).ready(function () {
    $("#acc-volt").slider({
        range: "min"
        , value: 0
        , min: 0
        , max: 4
        , step: 1
        , animate: true
        , slide: function (event, ui) {
            kVs = volt_values[ui.value];
            if (kVs == 0) {
                brightNms = 0;
            }
            else {
                brightNms = kVs + spot_bright;
                if (!volt_bool) {
                    askHTon();
                    volt_bool = true;
                }
            }
        }
        , disabled: true
        , stop: function (event, ui) {
            if (htOn) {
                drawIt();
            }
        }
    });
    $("#spot-size").slider({
        range: "min"
        , value: 0
        , min: 0
        , max: 4
        , step: 1
        , animate: true
        , slide: function (event, ui) {
            spot_bright = spot_valuesBright[ui.value];
            if (kVs == 0) {
                brightNms = 0;
            }
            else {
                brightNms = kVs + spot_bright;
            }
            //
            spotSlider_blur = (spot_valuesBlur[ui.value]);
        }
        , disabled: true
        , stop: function (event, ui) {
            drawIt();
        }
    });
    $("#z-pos").slider({
        range: "min"
        , value: 0
        , min: 0
        , max: 5
        , step: 1
        , animate: true
        , slide: function (event, ui) {
            zBlur = z_values[ui.value];
            trim = (trim_values[ui.value]);
        }
        , disabled: true
        , stop: function (event, ui) {
            // HERE GOES THE - Z-HEIGHT BROKEN STAGE??      
            if (zBlur == 0) {
                toogle_fn("#micrograph", "totally-hidden", false);
                toogle_fn(".broken", "totally-hidden", true);
            }
            else {
                drawIt();
            }
        }
    });
    $(".example-content").draggable();
    $(".example-content").resizable({
        handles: "n, e, s, w, sw, se, nw, ne"
        , resize: function (event, ui) {
            drawIt();
        }
    });
});
// ===================== ============== END SLIDERS END ============= ======================== //
// ======================= ================START KNOB =============== ======================== //
TweenLite.set(["#brightness", "#contrast", "#focus-c", "#focus-f", "#astigmatism-x", "#astigmatism-y"], {
    rotation: 140
});
var focusOn = false;

function keyRotationEnds() {
    focusOn = false;
}

function keyRotation(me) {
    focusOn = true;
    thisKnob = Draggable.get("#" + me.id);
    document.onkeyup = checkKey;

    function checkKey(e) {
        if (focusOn) {
            e = e || window.event;
            if (e.keyCode == '37') {
                // left arrow
                if (thisKnob.rotation > 2) {
                    TweenLite.to(("#" + me.id), 0, {
                        rotation: "-=2"
                    });
                    thisKnob.rotation -= 2;
                    onRotateKnob(me.id);
                }
            }
            else if (e.keyCode == '39') {
                // right arrow
                if (thisKnob.rotation < 268) {
                    TweenLite.to(("#" + me.id), 0, {
                        rotation: "+=2"
                    });
                    thisKnob.rotation += 2;
                    onRotateKnob(me.id);
                }
            }
        }
    }
}

function focusKnob(me) {
    document.getElementById(me).focus();
}

function onRotateKnob(me) {
    document.getElementById(me).focus();
    var dragKnob = Draggable.get("#" + me);
    var activeTicks = (Math.round(dragKnob.rotation / 15));
    var knobAngle = $(".led-" + me).removeClass('activeled');
    $(".led-" + me).slice(0, activeTicks).addClass('activeled');
    knobPos = dragKnob.rotation;
    switch (me) {
    case "brightness":
        if (knobPos >= randomBrightness) {
            brightnessIncrement = Math.floor(((knobPos - randomBrightness) / 10) + 1);
            if (brightnessIncrement < 0) brightnessIncrement *= (-1);
        }
        else {
            brightnessIncrement = Math.round(knobPos - 140);
            if (knobPos <= 140) {
                brightnessIncrement = brightnessIncrement / 50;
            }
            else {
                brightnessIncrement = (brightnessIncrement / (randomBrightness - 140)) * (.99);
                brightnessIncrement = Math.round(brightnessIncrement * 100) / 100;
            }
        }
        break;
    case "contrast":
        if (knobPos > randomContrast) {
            contrastIncrement = ((knobPos - randomContrast) / (270 - randomContrast)) / 1.5;
            contrastIncrement = Math.round(contrastIncrement * 100) / 100;
            contrastIncrement *= (-1);
        }
        else {
            contrastIncrement = (((knobPos / randomContrast) * -1) + 1) / 1.5;
            contrastIncrement = Math.round(contrastIncrement * 100) / 100;
        }
        break;
    case "magnification":
        stretch = ((knobPos / 270) * 2.4) + 1.1;
        break;
    case "focus-c":
        if (knobPos > 140) {
            coarseKnob = ((knobPos - 140) / 130) * 10;
            coarseKnob = Math.round(coarseKnob * 100) / 100;
        }
        else {
            coarseKnob = ((knobPos / 140) * -10) + 10;
            coarseKnob = Math.round(coarseKnob * 100) / 100;
        }
        break;
    case "focus-f":
        if (knobPos >= 140) {
            fineKnob = Math.round(knobPos - 140) / 50;
        }
        else {
            fineKnob = Math.round((knobPos - 140) * (-1)) / 50;
        }
        break;
    case "astigmatism-x":
        if (knobPos >= 140) {
            astig_X = Math.round(knobPos - 140) / 25;
        }
        else {
            astig_X = Math.round((knobPos - 140) * (-1)) / 25;
        }
        break;
    case "astigmatism-y":
        if (knobPos >= 140) {
            astig_Y = Math.round(knobPos - 140) / 25;
        }
        else {
            astig_Y = Math.round((knobPos - 140) * (-1)) / 25;
        }
        break;
    }
    updateKnobSliderUi(me, knobPos);
    drawIt();
}
window._semSyncingKnobSlider = false;
var SEM_KNOB_TO_SLIDER = {
    brightness: "slider-brightness",
    contrast: "slider-contrast",
    magnification: "slider-magnification",
    "focus-c": "slider-focus-c",
    "focus-f": "slider-focus-f",
    "astigmatism-x": "slider-astigmatism-x",
    "astigmatism-y": "slider-astigmatism-y"
};
function updateKnobSliderUi(knobId, rotation) {
    var sid = SEM_KNOB_TO_SLIDER[knobId];
    if (!sid || typeof $ === "undefined" || !$("#" + sid).length) return;
    if (!$("#" + sid).hasClass("ui-slider")) return;
    window._semSyncingKnobSlider = true;
    try {
        $("#" + sid).slider("value", Math.round(rotation));
    } catch (e1) { }
    finally {
        window._semSyncingKnobSlider = false;
    }
}
function syncDraggableRotationFromSlider(knobId, rotation) {
    var el = document.getElementById(knobId);
    if (!el) return;
    var r = Math.max(0, Math.min(270, rotation));
    TweenLite.set(el, { rotation: r });
    var d = Draggable.get(el);
    if (d) d.update(true);
    onRotateKnob(knobId);
}
function setKnobOrSliderInteractive(knobId, interactive) {
    var $k = $("#" + knobId);
    var isKnob = $k.hasClass("knob");
    var sid = SEM_KNOB_TO_SLIDER[knobId];
    if (isKnob) {
        if (interactive) {
            $k.css("display", "block");
            $k.parent().css("opacity", "1");
            $k.parent().css("cursor", "pointer");
        }
        else {
            $k.css("display", "none");
            $k.parent().css("opacity", "0.6");
            $k.parent().css("cursor", "not-allowed");
        }
    }
    if (sid && typeof $ !== "undefined" && $("#" + sid).length && $("#" + sid).data("ui-slider")) {
        try {
            if (interactive) $("#" + sid).slider("enable");
            else $("#" + sid).slider("disable");
        } catch (e2) { }
    }
}
/** 旋钮/滑块回到中性位，清零增量；不触发 onRotateKnob（避免 7 次 drawIt） */
function resetKnobUiToNeutral() {
    brightnessIncrement = 0;
    contrastIncrement = 0;
    coarseKnob = 0;
    fineKnob = 0;
    astig_X = 0;
    astig_Y = 0;
    TweenLite.set(["#brightness", "#contrast", "#focus-c", "#focus-f", "#astigmatism-x", "#astigmatism-y"], {
        rotation: 140
    });
    TweenLite.set(["#magnification"], {
        rotation: 0
    });
    ["brightness", "contrast", "magnification", "focus-c", "focus-f", "astigmatism-x", "astigmatism-y"].forEach(function (kid) {
        var d = Draggable.get("#" + kid);
        if (d) d.update(true);
    });
    if (typeof $ === "undefined") return;
    window._semSyncingKnobSlider = true;
    try {
        if ($("#slider-brightness").length && $("#slider-brightness").data("ui-slider")) {
            $("#slider-brightness").slider("value", 140);
            $("#slider-contrast").slider("value", 140);
            $("#slider-magnification").slider("value", 0);
            $("#slider-focus-c").slider("value", 140);
            $("#slider-focus-f").slider("value", 140);
            $("#slider-astigmatism-x").slider("value", 140);
            $("#slider-astigmatism-y").slider("value", 140);
        }
    } catch (eR) { }
    finally {
        window._semSyncingKnobSlider = false;
    }
}
function initKnobSliders() {
    if (typeof $ === "undefined") return;
    var cfgs = [
        { id: "brightness", init: 140 },
        { id: "contrast", init: 140 },
        { id: "magnification", init: 0 },
        { id: "focus-c", init: 140 },
        { id: "focus-f", init: 140 },
        { id: "astigmatism-x", init: 140 },
        { id: "astigmatism-y", init: 140 }
    ];
    cfgs.forEach(function (k) {
        var sid = SEM_KNOB_TO_SLIDER[k.id];
        if (!sid || !$("#" + sid).length) return;
        $("#" + sid).slider({
            range: "min",
            min: 0,
            max: 270,
            value: k.init,
            step: 1,
            animate: true,
            slide: function (event, ui) {
                if (window._semSyncingKnobSlider) return;
                syncDraggableRotationFromSlider(k.id, ui.value);
            },
            stop: function (event, ui) {
                if (window._semSyncingKnobSlider) return;
                syncDraggableRotationFromSlider(k.id, ui.value);
            }
        });
    });
}
$(function () {
    initKnobSliders();
    if (typeof SAMPLE_CONFIG !== "undefined" && SAMPLE_CONFIG[0]) {
        applyTuningForSample(SAMPLE_CONFIG[0]);
    }
});
var myDraggable = Draggable.create(knob, {
    type: "rotation"
    , throwProps: true
    , edgeResistance: 0.99
    , bounds: {
        minRotation: 0
        , maxRotation: 270
    }
    , onDrag: function (e) {
        onRotateKnob(this.target.id)
    }
    , onThrowUpdate: function (e) {
        onRotateKnob(this.target.id)
    }
    , onClick: function (e) {
        focusKnob(this.target.id)
    }
    , overshootTolerance: 0
});
//var myDraggable = Draggable.create(knob, {
//    type: "rotation"
//    , throwProps: true
//    , edgeResistance: 0.99
//    , bounds: {
//        minRotation: 0
//        , maxRotation: 270
//    }
//    , onDrag: function (e) {
//        this.target.focus()
//    }
//    , onDragEnd: function (e) {
//        onRotateKnob(this.target.id)
//    }
//    , overshootTolerance: 0
//});
// ======================= ================ END END KNOB ================ ==================== //
// ======================= =========== START WHITE NOISE ============ ======================== //
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    bufferCanvas.width = window.innerWidth;
    bufferCanvas.height = window.innerHeight;
    drawIt();
}
resize();
window.onresize = resize;

function noise_fn() {
    var w = ctx.canvas.width
        , h = ctx.canvas.height
        , idata = bufferCanvasCtx.createImageData(w, h)
        , buffer32 = new Uint32Array(idata.data.buffer)
        , len = buffer32.length
        , i = 0;
    for (; i < len;) buffer32[i++] = ((255 * Math.random()) | 0) << 24;
    bufferCanvasCtx.putImageData(idata, 0, 0);
    var imageData = bufferCanvasCtx.getImageData(0, 0, bufferCanvas.width, bufferCanvas.height);
    ctx.putImageData(imageData, 0, 0);
}

function whiteNoise() {
    toggle = !toggle;
    if (toggle) {
        doTheNoise = requestAnimationFrame(whiteNoise);
        return;
    }
    noise_fn();
    doTheNoise = requestAnimationFrame(whiteNoise);
};
whiteNoise();
var tvCounter = 2;

function tvDraw() {
    fromScanModes = false;
    ctx.putImageData(imgData_forScan, 0, 0, 0, 0, canvas.width * trim, (tvCounter - 1));
}
var fRate;

function tvNoise() {
    if (tvCounter < ctx.canvas.height) {
        tvDraw();
        dotvNoise = requestAnimationFrame(tvNoise);
        tvCounter += fRate;
    }
    else {
        cancelAnimationFrame(tvNoise);
        tvCounter = 2;
    };
};
// ======================= ======== END  WHITE NOISE END ============== ==================== //
// ======================= ================START TOOLTIPS ================= ======================== //
window.SEM_FREE_MODE = true;  // 自由操作模式：不显示引导，所有控件可用
function myInstructionA(idTooltiped, txt) {
    if (window.SEM_FREE_MODE) return;
    var controls = ["btn-vent", "btn-chamber", "btn-evacuate", "btn-tvrate", "btn-scan1", "btn-scan2", "btn-save", "btn-print", "btn-se", "ht-btn", "acc-volt", "spot-size", "z-pos", "brightness", "contrast", "magnification", "focus-c", "focus-f", "astigmatism-x", "astigmatism-y"];
    $.each(controls, function (index, val) {
        $('#' + val).removeClass(val + "-disabled");
        $('#' + val).removeClass("btn-active"); //remove the active
        if (val !== idTooltiped) {
            $("#" + val).attr('disabled', true);
            $("#" + val).toggleClass(val + "-disabled");
            if ($("#" + val).hasClass("knob") || SEM_KNOB_TO_SLIDER[val]) {
                setKnobOrSliderInteractive(val, false);
            }
        }
    });
    $("#" + idTooltiped).removeClass(idTooltiped + "-disabled");
    $("#" + idTooltiped).removeAttr('disabled');
    if ($("#" + idTooltiped).hasClass("knob") || SEM_KNOB_TO_SLIDER[idTooltiped]) {
        setKnobOrSliderInteractive(idTooltiped, true);
    }
    $("#top-instructions-txt").html(txt);
    toogle_fn("#top-instructions", "top-instructions-on", false);
}

function myInstructionB(id1, txt) {
    if (window.SEM_FREE_MODE) return;
    $("#" + id1).removeClass(id1 + "-disabled");
    $("#" + id1).removeAttr('disabled');
    $("#top-instructions-txt").html(txt);
    toogle_fn("#top-instructions", "top-instructions-on", false);
}

function myInstructionVolt(txt) {
    if (window.SEM_FREE_MODE) return;
    $("#acc-volt").slider("enable");
    $("#acc-volt").removeClass("acc-volt-disabled");
    $("#acc-volt").removeAttr('disabled');
    $("#top-instructions-txt").html(txt);
    toogle_fn("#top-instructions", "top-instructions-on", false);
}

function myInstructionC(txt) {
    if (window.SEM_FREE_MODE) return;
    var controls = ["btn-tvrate", "btn-scan1", "btn-scan2", "btn-save", "btn-print", "btn-se", "brightness", "contrast", "magnification", "focus-c", "focus-f", "astigmatism-x", "astigmatism-y"];
    $.each(controls, function (index, val) {
        $('#' + val).removeClass(val + "-disabled");
        $("#" + val).removeAttr('disabled');
        if ($("#" + val).hasClass("knob") || SEM_KNOB_TO_SLIDER[val]) {
            setKnobOrSliderInteractive(val, true);
        }
    });
    enableSliders();
    $("#top-instructions-txt").html(txt);
    toogle_fn("#top-instructions", "top-instructions-on", false);
}

/** 自由操作模式：启用所有控件，移除引导 */
function enableAllControlsFreeMode() {
    var controls = ["btn-vent", "btn-chamber", "btn-evacuate", "btn-tvrate", "btn-scan1", "btn-scan2", "btn-save", "btn-print", "btn-se", "ht-btn", "acc-volt", "spot-size", "z-pos", "brightness", "contrast", "magnification", "focus-c", "focus-f", "astigmatism-x", "astigmatism-y"];
    $.each(controls, function (index, val) {
        $('#' + val).removeClass(val + "-disabled");
        $("#" + val).removeAttr('disabled');
        if ($("#" + val).hasClass("knob") || SEM_KNOB_TO_SLIDER[val]) {
            setKnobOrSliderInteractive(val, true);
        }
    });
    enableSliders();
    $("#top-instructions-txt").html("");
    toogle_fn("#top-instructions", "top-instructions-on", true);
    $(".instructionsPanel").addClass("totally-hidden");
}

// 自由模式下由 loadChamberImages 回调启用控件，确保 chamber 图片加载完成后再可操作
// ======================= ================ END END TOOLTIP ================= ==================== //
// ======================= ================START CONTROLLING IT================= ======================== //
//FIRST STEP
$('#btn-vent').click(function () {
    cancelAnimationFrame(doTheNoise);
    function doChamberStart() {
        if (sprite[0] && sprite[0].complete && sprite[0].naturalWidth > 0) {
            bufferCanvasCtx.drawImage(sprite[0], 0, 0, canvas.width, canvas.height);
        }
        startChamber = requestAnimationFrame(chamberStarts);
    }
    if (sprite[0] && sprite[0].complete && sprite[0].naturalWidth > 0) {
        doChamberStart();
    } else if (sprite[0]) {
        sprite[0].onload = doChamberStart;
    } else {
        doChamberStart();
    }
    toogle_fn("#top-instructions", "top-instructions-on", true);
});
$('#btn-chamber').click(function () {
    if ($(this).attr('disabled')) return;
    alpha = 1;
    stopLoop();
    if (!chamberOpen) {
        videoChamberAnimation(true, 0, 43);
    }
    else {
        videoChamberAnimation(true, 43, 66);
        $("#btn-chamber").attr('disabled', true).addClass("btn-chamber-disabled");
    }
    toogle_fn("#top-instructions", "top-instructions-on", true);
    chamberOpen = !chamberOpen;
});
$('#btn-evacuate').click(function () {
    toogle_fn("#top-instructions", "top-instructions-on", true);
    evacuating();
});
$('#btn-se').click(function () {
    toogle_fn("#top-instructions", "top-instructions-on", true);
    simInstruction = "Set the accelerating voltage of the electron beam, its spot size, and the Z height distance from the sample."
    if (!bse_switch) {
        toogle_fn("#btn-se", "switch-btn", true);
        toogle_fn("#btn-se", "switch-btn-active", false);
        image.src = currentBSEsample;
        example_img.src = image.src;
    }
    else {
        toogle_fn("#btn-se", "switch-btn", false);
        toogle_fn("#btn-se", "switch-btn-active", true);
        image.src = currentSEsample;
        example_img.src = image.src;
    }
    image.onload = function () {
        drawIt();
    }
    bse_switch = !bse_switch;
});
$('#ht-btn').click(function () {
    toogle_fn(".ht-btn", "ht-btn-active", false);
    if (!htOn) {
        toogle_fn("#top-instructions", "top-instructions-on", true);
        stopLoop();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        drawIt();
        setTimeout(function () {
            if (window.SEM_FREE_MODE) {
                $(".instructionsPanel").addClass("totally-hidden");
                return;
            }
            simInstruction = "Now you can freely manipulate all the other controls to adjust the image.";
            toogle_fn(".instructionsPanel", "totally-hidden", true);
            myInstructionC(simInstruction);
        }, 500);
    }
    else {
        otherSample();
    }
    htOn = true;
});

function enableSliders() {
    $("#acc-volt").slider("enable");
    $("#acc-volt").removeClass("acc-volt-disabled");
    $("#acc-volt").removeAttr('disabled');
    $("#spot-size").slider("enable");
    $("#spot-size").removeClass("spot-size-disabled");
    $("#spot-size").removeAttr('disabled');
    $("#z-pos").slider("enable");
    $("#z-pos").removeClass("z-pos-disabled");
    $("#z-pos").removeAttr('disabled');
}
$('#btn-tvrate').click(function () {
//    toogle_fn("#top-instructions", "top-instructions-on", true);
    fRate = 20;
    noise = "tv_rate";
    fromScanModes = true;
    lastScanUsed = "tv_rate";
    drawIt();
    tvNoise();
//    setTimeout(function () {
//        simInstruction = "Scan the electron beam across the sample at medium speed, Select Slow Scan 1"
//    }, 500);
});
$('#btn-scan1').click(function () {
//    toogle_fn("#top-instructions", "top-instructions-on", true);
    fRate = 6;
    noise = "scan1";
    fromScanModes = true;
    lastScanUsed = "scan1";
    drawIt();
    tvNoise();
//    setTimeout(function () {
//        simInstruction = "Scan the electron beam across the sample at medium speed, Select Slow Scan 1"
//    }, 500);
});
$('#btn-scan2').click(function () {
//    toogle_fn("#top-instructions", "top-instructions-on", true);
    fRate = 2;
    noise = "scan2";
    fromScanModes = true;
    drawIt();
    tvNoise();
//    setTimeout(function () {
//        simInstruction = "Scan the electron beam across the sample at medium speed, Select Slow Scan 1"
//    }, 500);
});

function chamberStarts() {
    alpha += delta;
    if (alpha >= 0.25) {
        cancelAnimationFrame(startChamber);
        alpha = 1;
        videoChamberAnimation(false, 0, 10);
        simInstruction = "Open the chamber and insert the samples."
        myInstructionA("btn-chamber", simInstruction);
    }
    else {
        startChamber = requestAnimationFrame(chamberStarts);
    }
    ctx.globalAlpha = alpha;
    ctx.drawImage(bufferCanvas, 0, 0, bufferCanvas.width, bufferCanvas.height);
}

function evacuating() {
    stopLoop();
    videoChamberAnimation(false, 66, 72);
    alpha -= delta;
    if (alpha <= 0.7) {
        cancelAnimationFrame(evacuating);
        simInstruction = "Select a sample to image."
        myInstructionA("acc-volt", simInstruction);
        chooseSample();
    }
    else {
        evac = requestAnimationFrame(evacuating);
    }
}

function videoChamberAnimation(exit, initIMG, topIMG) {
    vidChamberTimeout = setTimeout(function () {
        vidChamber = requestAnimationFrame(function () {
            videoChamberAnimation(exit, initIMG, topIMG);
        });
        counter++;
        if (counter == topIMG) {
            if (exit) {
                stopLoop();
                if (!samplePlaced) {
                    closeChamber();
                }
                else {
                    if (stageRotation) {
                        //                        askHTon();
                        selectVolt();
                    }
                    else {
                        counter = 66;
                        vidChamber = requestAnimationFrame(function () {
                            videoChamberAnimation(exit, 66, 72);
                        });
                        simInstruction = "Pump the air out from the chamber."
                        myInstructionA("btn-evacuate", simInstruction);
                    }
                }
            }
            else {
                counter = initIMG;
            }
        }
        else if (counter == 105) {
            counter = 72;
        }
    }, 1000 / 15);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite[counter], 0, 0, canvas.width, canvas.height);
};

function chooseSample() {
    toogle_fn(".top-btns", "totally-hidden", false);
    toogle_fn(".choose-sample", "totally-hidden", true);
    resetSampleSelectToPlaceholder();
}

function closeChamber() {
    $("#btn-chamber").html("CLOSE").removeClass("btn-active");
    simInstruction = "Close the chamber."
    myInstructionA("btn-chamber", simInstruction);
    samplePlaced = true;
}

function sampleChosen() {
    simInstruction = "Great so far."
        //    myInstructionA("btn-chamber", simInstruction);
}

function stopLoop() {
    clearTimeout(vidChamberTimeout);
    cancelAnimationFrame(vidChamber);
}

function loadChamberImages(onReady) {
    var IMGchamber;
    IMGchamber = '.';
    var loadedCount = 0;
    var needCount = 11;
    for (var i = 0; i < 106; i++) {
        var theImage = document.createElement("img");
        theImage.setAttribute("id", "b" + i);
        theImage.setAttribute("src", "images/simulator/SEM/chamber/chamber_00" + i + IMGchamber + "jpg");
        theImage.setAttribute("style", "display:none");
        if (i >= 1 && i <= needCount && onReady) {
            theImage.onload = function () {
                loadedCount++;
                if (loadedCount >= needCount) onReady();
            };
        }
        document.body.appendChild(theImage);
        sprite[i - 1] = document.getElementById("b" + i);
    }
    if (onReady && loadedCount >= needCount) onReady();
}
loadChamberImages(function () {
    if (window.SEM_FREE_MODE) enableAllControlsFreeMode();
});
if (window.SEM_FREE_MODE) {
    setTimeout(function () { enableAllControlsFreeMode(); }, 5000);
}

function askHTon() {
    toogle_fn("#top-instructions", "top-instructions-on", true);
    setTimeout(function () {
        simInstruction = "Turn on the electron beam by selecting 'HT'"
        myInstructionB("ht-btn", simInstruction);
    }, 100);
}

function selectVolt() {
    toogle_fn("#top-instructions", "top-instructions-on", true);
    setTimeout(function () {
        simInstruction = "Set the accelerating voltage for the electron beam"
        myInstructionVolt(simInstruction);
    }, 100);
}

function otherSample() {
    $("#top-instructions-txt").html("Select a sample to image");
    toogle_fn("#top-instructions", "top-instructions-on", false);
    resetKnobUiToNeutral();
    applyTuningForSample({ id: "__other_sample__" });
    toogle_fn(".top-btns", "totally-hidden", false);
    toogle_fn(".choose-sample", "totally-hidden", true);
    resetSampleSelectToPlaceholder();
    var controls = ["btn-tvrate", "btn-scan1", "btn-scan2", "btn-save", "btn-print", "btn-se", "ht-btn", "brightness", "contrast", "magnification", "focus-c", "focus-f", "astigmatism-x", "astigmatism-y"];
    $.each(controls, function (index, val) {
        $('#' + val).removeClass("btn-active"); //remove the active
        $("#" + val).attr('disabled', true);
        $("#" + val).toggleClass(val + "-disabled");
        if ($("#" + val).hasClass("knob") || SEM_KNOB_TO_SLIDER[val]) {
            setKnobOrSliderInteractive(val, false);
        }
    });
    $("#acc-volt").slider("disable");
    $("#acc-volt").slider('value', '0');
    $("#acc-volt").addClass("acc-volt-disabled");
    $("#acc-volt").attr('disabled');
    $("#spot-size").slider("disable");
    $("#spot-size").slider('value', '0');
    $("#spot-size").addClass("spot-size-disabled");
    $("#spot-size").attr('disabled');
    $("#z-pos").slider("disable");
    $("#z-pos").slider('value', '0');
    $("#z-pos").addClass("z-pos-disabled");
    $("#z-pos").attr('disabled');
    toogle_fn(".ht-btn", "ht-btn-active", true);
    toogle_fn(".activeled", "activeled", true);
    volt_bool = false;
    brightnessIncrement = 0;
    brightNms = 0;
    brightnessValue = 0;
    contrastIncrement = 0;
    spotSlider_blur = spot_valuesBlur[0];
    zBlur = z_values[0];
    astig_X = 0;
    astig_Y = 0;
    fineKnob = 0;
    coarseKnob = 0;
    trim = 1.1;
    stretch = 1;
    imgPanX = 0;
    imgPanY = 0;
    fRate = 20;
    fromScanModes = false;
    lastScanUsed = typeof noise !== "undefined" ? noise : "tv_rate";
    bse_switch = false;
    document.getElementById("btn-se").checked = false;
    document.getElementById("focus-blur").setStdDeviation(0, 0);
    canvas.style.filter = "url('#myblurfilter') contrast(1) brightness(1)";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sprite[counter], 0, 0, canvas.width, canvas.height);
    toogle_fn("#scalebar-div", "totally-hidden", false);
}
// ======================= ================START activate btns================= ======================== //
$('.btn-stay-pressed').click(function () {
    toogle_fn("#" + $(this).attr('id'), "btn-active", false);
});
$('#btn-reload').click(function () {
    location.reload();
    location.reload(true);
});
$(document).on("change", "#sem-sample-select", function (e) {
    var id = e.target && e.target.value;
    if (!id) return;
    applySampleSelection(id);
});
// ======================= ================ END END activate btns================= ==================== //
// ======================= ================ END END CONTROLLING IT ================= ==================== //
// ======================= ================================= =============================== //
// ======================= =============START DRAWING IT================= ======================== //
function semClampPanForSize(cw, ch) {
    var baseX = (cw - (cw * stretch)) / 2;
    var baseY = (ch - (ch * stretch)) / 2;
    var W = cw * stretch;
    var H = ch * stretch;
    var minPanX = cw - W - baseX;
    var maxPanX = -baseX;
    var minPanY = ch - H - baseY;
    var maxPanY = -baseY;
    if (minPanX > maxPanX) {
        imgPanX = 0;
    } else {
        imgPanX = Math.min(maxPanX, Math.max(minPanX, imgPanX));
    }
    if (minPanY > maxPanY) {
        imgPanY = 0;
    } else {
        imgPanY = Math.min(maxPanY, Math.max(minPanY, imgPanY));
    }
}
function semGetImageStretchDestRect(cw, ch) {
    semClampPanForSize(cw, ch);
    var baseX = (cw - (cw * stretch)) / 2;
    var baseY = (ch - (ch * stretch)) / 2;
    return {
        dx: baseX + imgPanX,
        dy: baseY + imgPanY,
        dw: cw * stretch,
        dh: ch * stretch
    };
}
function semCanvasCssToBitmapCoords(clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    var sx = canvas.width / Math.max(r.width, 1);
    var sy = canvas.height / Math.max(r.height, 1);
    return {
        x: (clientX - r.left) * sx,
        y: (clientY - r.top) * sy
    };
}
function semResetViewPan() {
    imgPanX = 0;
    imgPanY = 0;
    if (typeof drawIt === "function") drawIt();
}
function semNudgePanStepPx() {
    var cw = canvas.width;
    var ch = canvas.height;
    return Math.max(8, Math.min(cw, ch) * 0.04);
}
function semNudgePan(dir) {
    if (!img_loaded) return;
    var s = semNudgePanStepPx();
    if (dir === "left") imgPanX += s;
    else if (dir === "right") imgPanX -= s;
    else if (dir === "up") imgPanY += s;
    else if (dir === "down") imgPanY -= s;
    drawIt();
}
/** 双击将点击处的图像点对齐到视口中心（高倍下平移视场） */
function semPanFocusCanvasPoint(cx, cy) {
    if (!img_loaded || !canvas) return;
    var cw = canvas.width;
    var ch = canvas.height;
    var r = semGetImageStretchDestRect(cw, ch);
    var u = (cx - r.dx) / r.dw;
    var v = (cy - r.dy) / r.dh;
    if (u < 0 || u > 1 || v < 0 || v > 1 || !isFinite(u) || !isFinite(v)) return;
    imgPanX = cw / 2 - u * r.dw - (cw - (cw * stretch)) / 2;
    imgPanY = ch / 2 - v * r.dh - (ch - (ch * stretch)) / 2;
    drawIt();
}
window.SEM_resetViewPan = semResetViewPan;
function drawIt() {
    document.getElementById("scale-unit").innerHTML = scaleBar_unit + "&micro;m";
    document.getElementById("scalebar").style.width = (scaleBar_size * stretch) + "%";
    if (img_loaded) {
        // =================== this might go in initSimulator() =================== //
        bufferCanvas.width = canvas.width;
        bufferCanvas.height = canvas.height;
        var dest = semGetImageStretchDestRect(canvas.width, canvas.height);
        bufferCanvasCtx.drawImage(image, dest.dx, dest.dy, dest.dw, dest.dh);
        // ======================= =================================//
        brightnessValue = brightNms + brightnessIncrement; // 亮度值
        contrastValue = contrastAmount - contrastIncrement;  // 对比度值
        var slidersBlur = spotSlider_blur + zBlur; // 模糊值
        var blurIncrement = coarseKnob + fineKnob; // 模糊增量
        if (astigm_blur > 0) {
            blurX = slidersBlur - (blurIncrement + astig_X); // 模糊X值
            blurY = (slidersBlur + astigm_blur) - (blurIncrement + astig_Y); // 模糊Y值
        }
        else {
            blurX = (slidersBlur + (astigm_blur * (-1))) - (blurIncrement + astig_X); // 模糊X值
            blurY = slidersBlur - (blurIncrement + astig_Y); //     模糊Y值
        }
        if (blurX < 0) blurX *= (-1); // 如果模糊X值小于0，则取绝对值
        if (blurY < 0) blurY *= (-1); // 如果模糊Y值小于0，则取绝对值
        document.getElementById("focus-blur").setStdDeviation(blurX, blurY);
        canvas.style.filter = "url('#myblurfilter') contrast(" + contrastValue + ") brightness(" + brightnessValue + ")";
        // ======================= =================================//
        if (!fromScanModes) {
            ctx.drawImage(bufferCanvas, (canvas.width - (canvas.width * trim)) / 2, (canvas.height - (canvas.height * trim)) / 2, canvas.width * trim, canvas.height * trim);
            imgData_forScan = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        else {
            bufferCanvasCtx.drawImage(bufferCanvas, (canvas.width - (canvas.width * trim)) / 2, (canvas.height - (canvas.height * trim)) / 2, canvas.width * trim, canvas.height * trim);
            imgData_forScan = bufferCanvasCtx.getImageData(0, 0, canvas.width, canvas.height);
        }
        // ======================= =================================//   
        switch (noise) {
        case "tv_rate":
            scanNoise(0.8, 1.5);
            scanNoise(0.4, 0.7);
            break;
        case "scan1":
            scanNoise(0.6, 1);
            break;
        }
    }
}

function scanNoise(factor1, factor2) {
    if (!fromScanModes) {
        imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    else {
        imgData = imgData_forScan;
    }
    for (var i = 0; i < imgData.data.length; i += 4) {
        var randColor1 = factor1 + Math.random() * factor2;
        var randColor2 = factor1 + Math.random() * factor2;
        var randColor3 = factor1 + Math.random() * factor2;
        imgData.data[i] = imgData.data[i] * 1 * randColor1; // green
        imgData.data[i + 1] = imgData.data[i + 1] * 1 * randColor2; // green
        imgData.data[i + 2] = imgData.data[i + 2] * 1 * randColor3; // blue
        var grayscale = imgData.data[i] * p1 + imgData.data[i + 1] * p2 + imgData.data[i + 2] * p3;
        imgData.data[i] = grayscale + er; // red
        imgData.data[i + 1] = grayscale + eg; // green
        imgData.data[i + 2] = grayscale + eb; // blue
    }
    if (!fromScanModes) {
        ctx.putImageData(imgData, 0, 0);
    }
    else {
        imgData_forScan = imgData;
    }
};
// ==================== ================ END DRAWING IT END ================= ==================== 
// ======================= ================START FILTERS ================= ======================== //
//function setFilter(a, b, c) {}
// ======================= ================ END FILTERS END ================= ==================== //
// ======================= ================PRINT THE IMAGE================= =============================== //
var printTitle = "";

function printCanvas(el) {
    var exportCanvas = createExportCanvasWithDisplayEffects(canvas, SEM_EXPORT_WIDTH(), SEM_EXPORT_HEIGHT());
    var dataUrl = exportCanvas ? exportCanvas.toDataURL("image/png") : canvas.toDataURL();
    var windowContent = '<!DOCTYPE html>';
    windowContent += '<html>'
    windowContent += '<head><title>' + printTitle + 'Image from the Virtual Instrument</title></head>';
    windowContent += '<body>'
    windowContent += '<img  style="width: 1024px;height: 726px;" src="' + dataUrl + '">';
    windowContent += '</body>';
    windowContent += '</html>';
    var printWin = window.open('', '', 'width=100,height=100,left=400');
    printWin.document.open();
    printWin.document.write(windowContent);
    printWin.document.close();
    printWin.focus();
    setTimeout(printMicrograph, 500);

    function printMicrograph() {
        printWin.print();
        printWin.close();
    }
}
function clamp01(v) {
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
}
function buildReferenceImageData(targetWidth, targetHeight) {
    if (!image || !image.complete || image.naturalWidth <= 0) return null;
    var refCanvas = document.createElement("canvas");
    var refCtx = refCanvas.getContext("2d");
    var tmpCanvas = document.createElement("canvas");
    var tmpCtx = tmpCanvas.getContext("2d");
    refCanvas.width = targetWidth;
    refCanvas.height = targetHeight;
    tmpCanvas.width = targetWidth;
    tmpCanvas.height = targetHeight;
    var tw = targetWidth;
    var th = targetHeight;
    var baseX = (tw - (tw * stretch)) / 2;
    var baseY = (th - (th * stretch)) / 2;
    var W = tw * stretch;
    var H = th * stretch;
    var sx = tw / Math.max(canvas.width, 1);
    var sy = th / Math.max(canvas.height, 1);
    var panX = imgPanX * sx;
    var panY = imgPanY * sy;
    var minPanX = tw - W - baseX;
    var maxPanX = -baseX;
    var minPanY = th - H - baseY;
    var maxPanY = -baseY;
    if (minPanX <= maxPanX) panX = Math.min(maxPanX, Math.max(minPanX, panX));
    else panX = 0;
    if (minPanY <= maxPanY) panY = Math.min(maxPanY, Math.max(minPanY, panY));
    else panY = 0;
    tmpCtx.drawImage(image, baseX + panX, baseY + panY, W, H);
    refCtx.drawImage(
        tmpCanvas,
        (targetWidth - (targetWidth * trim)) / 2,
        (targetHeight - (targetHeight * trim)) / 2,
        targetWidth * trim,
        targetHeight * trim
    );
    return refCtx.getImageData(0, 0, targetWidth, targetHeight);
}
/** 与 #micrograph 上 canvas.style.filter 中的 contrast / brightness 一致（用于读回退） */
function parseSemFilterFromCanvasStyle() {
    var s = (canvas && canvas.style && canvas.style.filter) ? canvas.style.filter : "";
    var contrast = 1;
    var brightness = 1;
    var m = s.match(/contrast\(\s*([0-9.+-eE]+)\s*\)/);
    if (m) contrast = parseFloat(m[1]);
    m = s.match(/brightness\(\s*([0-9.+-eE]+)\s*\)/);
    if (m) brightness = parseFloat(m[1]);
    return { contrast: contrast, brightness: brightness };
}
/**
 * 当前「屏幕上」的调参效果：SVG feGaussianBlur 的 stdDeviation + contrast/brightness。
 * Canvas getImageData 读的是位图，不含 CSS filter；这里用 2d.filter 近似烘焙后再与参考图比对。
 */
function getSemDisplayFilterParams() {
    var parsed = parseSemFilterFromCanvasStyle();
    var contrast = (typeof contrastValue !== "undefined" && !isNaN(contrastValue)) ? contrastValue : parsed.contrast;
    var brightness = (typeof brightnessValue !== "undefined" && !isNaN(brightnessValue)) ? brightnessValue : parsed.brightness;
    var blurPx = 0;
    var fe = document.getElementById("focus-blur");
    try {
        if (fe && fe.stdDeviationX && fe.stdDeviationX.baseVal !== undefined) {
            blurPx = Math.max(0, fe.stdDeviationX.baseVal, fe.stdDeviationY.baseVal);
        }
    } catch (e1) { }
    if (!blurPx && typeof blurX !== "undefined" && typeof blurY !== "undefined") {
        blurPx = Math.max(0, blurX, blurY);
    }
    return { blurPx: blurPx, contrast: contrast, brightness: brightness };
}
/**
 * 按 #micrograph-wrapper 的 CSS 布局尺寸输出像素（与肉眼所见区域一致），
 * 并先在位图分辨率上套用与界面等价的 blur/contrast/brightness，再缩放到显示区域。
 * @param optOutW optOutH 若均为正数，则缩放到该尺寸（用于 SAVE/PRINT 固定导出）；否则用 wrapper 的 client 尺寸。
 * @returns {{ imageData: ImageData, width: number, height: number, filter_baked: boolean }}
 */
function rasterizeLikeDisplayedMicrographRegion(sourceCanvas, optOutW, optOutH) {
    var iw = sourceCanvas.width;
    var ih = sourceCanvas.height;
    if (!iw || !ih) return null;
    var tw = iw;
    var th = ih;
    var fixed = (typeof optOutW === "number" && optOutW > 0 && typeof optOutH === "number" && optOutH > 0);
    if (fixed) {
        tw = Math.floor(optOutW);
        th = Math.floor(optOutH);
    } else {
        var wrap = document.getElementById("micrograph-wrapper");
        if (wrap && wrap.clientWidth >= 2 && wrap.clientHeight >= 2) {
            tw = Math.floor(wrap.clientWidth);
            th = Math.floor(wrap.clientHeight);
        }
    }
    var params = getSemDisplayFilterParams();
    var tmp = document.createElement("canvas");
    tmp.width = iw;
    tmp.height = ih;
    var tctx = tmp.getContext("2d");
    var filterStr = "blur(" + params.blurPx + "px) contrast(" + params.contrast + ") brightness(" + params.brightness + ")";
    var filterSupported = (typeof tctx.filter === "string");
    if (filterSupported) {
        tctx.filter = filterStr;
    }
    tctx.drawImage(sourceCanvas, 0, 0);
    if (filterSupported) {
        tctx.filter = "none";
    }
    var out = document.createElement("canvas");
    out.width = tw;
    out.height = th;
    var octx = out.getContext("2d");
    octx.imageSmoothingEnabled = true;
    octx.drawImage(tmp, 0, 0, iw, ih, 0, 0, tw, th);
    return {
        imageData: octx.getImageData(0, 0, tw, th),
        width: tw,
        height: th,
        filter_baked: filterSupported,
        intrinsic: { w: iw, h: ih }
    };
}
/** SAVE / PRINT：与屏幕一致的滤镜叠加后，再缩放到指定像素（默认 1024×726） */
function SEM_EXPORT_WIDTH() { return 1024; }
function SEM_EXPORT_HEIGHT() { return 726; }
function createExportCanvasWithDisplayEffects(sourceCanvas, outW, outH) {
    var ow = (typeof outW === "number" && outW > 0) ? outW : SEM_EXPORT_WIDTH();
    var oh = (typeof outH === "number" && outH > 0) ? outH : SEM_EXPORT_HEIGHT();
    var pack = rasterizeLikeDisplayedMicrographRegion(sourceCanvas, ow, oh);
    if (!pack) return null;
    var c = document.createElement("canvas");
    c.width = pack.width;
    c.height = pack.height;
    c.getContext("2d").putImageData(pack.imageData, 0, 0);
    return c;
}
function toGrayArray(imageData) {
    var data = imageData.data;
    var gray = new Float32Array(imageData.width * imageData.height);
    var j = 0;
    for (var i = 0; i < data.length; i += 4) {
        gray[j++] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
    return gray;
}
function laplacianVariance(gray, w, h) {
    if (w < 3 || h < 3) return 0;
    var sum = 0;
    var sumSq = 0;
    var n = 0;
    for (var y = 1; y < h - 1; y++) {
        for (var x = 1; x < w - 1; x++) {
            var idx = y * w + x;
            var lap = gray[idx - w] + gray[idx - 1] - 4 * gray[idx] + gray[idx + 1] + gray[idx + w];
            sum += lap;
            sumSq += lap * lap;
            n++;
        }
    }
    if (!n) return 0;
    var mean = sum / n;
    return (sumSq / n) - (mean * mean);
}
function semComputeQualityMetrics(current, reference, cw, ch) {
    var a = current.data;
    var b = reference.data;
    var n = cw * ch;
    var mse = 0;
    var sumA = 0;
    var sumB = 0;
    for (var i = 0; i < a.length; i += 4) {
        var ya = a[i] * 0.299 + a[i + 1] * 0.587 + a[i + 2] * 0.114;
        var yb = b[i] * 0.299 + b[i + 1] * 0.587 + b[i + 2] * 0.114;
        var d = ya - yb;
        mse += d * d;
        sumA += ya;
        sumB += yb;
    }
    mse = mse / Math.max(n, 1);
    var psnr = mse <= 1e-12 ? 99 : (10 * Math.log10((255 * 255) / mse));

    var muA = sumA / Math.max(n, 1);
    var muB = sumB / Math.max(n, 1);
    var varA = 0;
    var varB = 0;
    var cov = 0;
    for (var j = 0; j < a.length; j += 4) {
        var y1 = a[j] * 0.299 + a[j + 1] * 0.587 + a[j + 2] * 0.114;
        var y2 = b[j] * 0.299 + b[j + 1] * 0.587 + b[j + 2] * 0.114;
        var da = y1 - muA;
        var db = y2 - muB;
        varA += da * da;
        varB += db * db;
        cov += da * db;
    }
    varA /= Math.max(n - 1, 1);
    varB /= Math.max(n - 1, 1);
    cov /= Math.max(n - 1, 1);
    var C1 = Math.pow(0.01 * 255, 2);
    var C2 = Math.pow(0.03 * 255, 2);
    var ssim = ((2 * muA * muB + C1) * (2 * cov + C2)) / ((muA * muA + muB * muB + C1) * (varA + varB + C2));
    if (!isFinite(ssim)) ssim = 0;

    var grayA = toGrayArray(current);
    var grayB = toGrayArray(reference);
    var sharpA = laplacianVariance(grayA, cw, ch);
    var sharpB = laplacianVariance(grayB, cw, ch);
    var sharpRatio = sharpB > 1e-9 ? (sharpA / sharpB) : 0;
    var psnrNorm = clamp01(psnr / 40);
    var ssimNorm = clamp01((ssim + 1) / 2);
    var sharpNorm = clamp01(sharpRatio > 1 ? 1 : sharpRatio);
    var score = 100 * (0.45 * ssimNorm + 0.35 * psnrNorm + 0.20 * sharpNorm);

    return {
        score: Math.round(score * 10) / 10,
        mse: Math.round(mse * 100) / 100,
        psnr: Math.round(psnr * 100) / 100,
        ssim_approx: Math.round(ssim * 10000) / 10000,
        sharpness_ratio: Math.round(sharpRatio * 1000) / 1000
    };
}
/**
 * 默认与「显示区域」对齐：参考图与当前图均经同一套 stretch/trim 源图 + 同一 display filter + 缩放到 #micrograph-wrapper。
 * 设 window.SEM_QUALITY_COMPARE_DISPLAY_REGION = false 可恢复仅比对 canvas 原始像素（不含 CSS filter）。
 */
function evaluateCurrentFrameQuality() {
    if (!canvas || !ctx) return null;
    var w = canvas.width;
    var h = canvas.height;
    if (!w || !h) return null;
    var refData = buildReferenceImageData(w, h);
    if (!refData) return null;

    var useDisplay = window.SEM_QUALITY_COMPARE_DISPLAY_REGION !== false;
    var result;
    if (useDisplay) {
        var refCanvas = document.createElement("canvas");
        refCanvas.width = w;
        refCanvas.height = h;
        refCanvas.getContext("2d").putImageData(refData, 0, 0);
        var packA = rasterizeLikeDisplayedMicrographRegion(canvas);
        var packB = rasterizeLikeDisplayedMicrographRegion(refCanvas);
        if (!packA || !packB || packA.width !== packB.width || packA.height !== packB.height) {
            return null;
        }
        result = semComputeQualityMetrics(packA.imageData, packB.imageData, packA.width, packA.height);
        result.capture_mode = "display_region";
        result.compare_width = packA.width;
        result.compare_height = packA.height;
        result.intrinsic_width = w;
        result.intrinsic_height = h;
        result.filter_baked = !!(packA.filter_baked && packB.filter_baked);
    } else {
        var current = ctx.getImageData(0, 0, w, h);
        result = semComputeQualityMetrics(current, refData, w, h);
        result.capture_mode = "raw_canvas";
        result.compare_width = w;
        result.compare_height = h;
        result.filter_baked = false;
    }
    window.SEM_LAST_QUALITY_RESULT = result;
    return result;
}
window.semComputeQualityMetrics = semComputeQualityMetrics;
window.SEM_IMAGE_QUALITY_API = {
    evaluateCurrentFrame: evaluateCurrentFrameQuality,
    getLastResult: function () {
        return window.SEM_LAST_QUALITY_RESULT || null;
    }
};
// ======================= ================SAVE THE IMAGE================= =============================== //// snippet from:  http://stackoverflow.com/questions/18480474/how-to-save-an-image-from-canvas
function savePNG(canvastoPrint, filename) {
    /// create an "off-screen" anchor tag
    var lnk = document.createElement('a')
        , e;
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
    }
    else if (lnk.fireEvent) {
        lnk.fireEvent("onclick");
    }
}
var dwn = document.getElementById('btn-save');
// Event handler for download
dwn.onclick = function () {
        var quality = evaluateCurrentFrameQuality();
        if (quality) {
            console.log("[SEM quality]", quality);
        }
        var exportCanvas = createExportCanvasWithDisplayEffects(canvas, SEM_EXPORT_WIDTH(), SEM_EXPORT_HEIGHT());
        if (!exportCanvas) {
            exportCanvas = document.createElement("canvas");
            exportCanvas.width = SEM_EXPORT_WIDTH();
            exportCanvas.height = SEM_EXPORT_HEIGHT();
            exportCanvas.getContext("2d").drawImage(canvas, 0, 0, SEM_EXPORT_WIDTH(), SEM_EXPORT_HEIGHT());
        }
        savePNG(exportCanvas, 'image_from training.png');
    }
    // ======================= ================END SAVE THE IMAGE END================= =============================== //
$("#close-example").click(function (e) {
    e.preventDefault();
    toogle_fn(".example-content", "totally-hidden", false);
});
$("#ok-keepWorking").click(function (e) {
    e.preventDefault();
    $("#top-instructions-txt").html("Click <a id='show-example' onclick='openExample()'>HERE</a> to see an example of an optimal micrograph.");
    toogle_fn("#top-instructions", "top-instructions-on", false);
    toogle_fn(".instructionsPanel", "totally-hidden", false);
    //    toogle_fn("#top-instructions", "top-instructions-on", true);
    toogle_fn("#scalebar-div", "totally-hidden", true);
});

function openExample() {
    toogle_fn(".example-content", "totally-hidden", true);
};
// ======================= ================START TOOGLE ================= ======================== //
function toogle_fn(element, className, bool) {
    if ($(element).hasClass(className) == bool) {
        $(element).toggleClass(className);
    }
}
// ======================= ================ END END TOOGLE================= ==================== //
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}
$(function () {
    var $mg = $("#micrograph");
    if ($mg.length) {
        $mg.on("dblclick", function (e) {
            if (!img_loaded) return;
            var p = semCanvasCssToBitmapCoords(e.clientX, e.clientY);
            semPanFocusCanvasPoint(p.x, p.y);
            e.preventDefault();
        });
    }
    $("#sem-pan-up").on("click", function () { semNudgePan("up"); });
    $("#sem-pan-down").on("click", function () { semNudgePan("down"); });
    $("#sem-pan-left").on("click", function () { semNudgePan("left"); });
    $("#sem-pan-right").on("click", function () { semNudgePan("right"); });
    $("#sem-pan-center").on("click", function () { semResetViewPan(); });
});
window.onclick = function (event) {}
    //
    // ======================= ================START================= ======================== //
    // ======================= ================ END END ================= ==================== //
