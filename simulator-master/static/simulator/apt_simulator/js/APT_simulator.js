/* APT simulator javascript functions    

Created  by Andres Vasquez for AMMRF'S https://www.myscope.training
info@andresvasquez.net  —— https://www.andresvasquez.net ——
copyright:This work is licensed under a Creative Commons Attribution 4.0 International License.

************************************************************************/
let top_canvas = document.querySelector("#top-canvas");
let top_ctx = top_canvas.getContext("2d");
let bottom_canvas = document.querySelector("#bottom-canvas");
let bottom_ctx = bottom_canvas.getContext("2d");
let detection_canvas = document.querySelector("#detection-rate-canvas");
let detection_ctx = detection_canvas.getContext("2d");
let voltage_canvas = document.querySelector("#voltage-history-canvas");
let voltage_ctx = voltage_canvas.getContext("2d");
let reconstruction_canvas = document.querySelector("#reconstruction-canvas");
let reconstruction_ctx = reconstruction_canvas.getContext("2d");
let bufferC_01 = document.createElement("canvas");
let bufferCtx_01 = bufferC_01.getContext("2d");
let bufferC_02 = document.createElement("canvas");
let bufferCtx_02 = bufferC_02.getContext("2d");
let bufferC_03 = document.createElement("canvas");
let bufferCtx_03 = bufferC_03.getContext("2d");
let bufferC_04_b = document.createElement("canvas");
let bufferCtx_04_b = bufferC_04_b.getContext("2d");
let bufferC_04 = document.createElement("canvas");
let bufferCtx_04 = bufferC_04.getContext("2d");
let bufferC_05 = document.createElement("canvas");
let bufferCtx_05 = bufferC_05.getContext("2d");
bufferC_05.id = "canvas-five";
let detection_rate_val = 1;
let sprite01 = [];
let sprite02 = [];
let sprite03 = [];
let sprite04 = [];
let spriteTemp = [];
let counter = 0;
let alpha = 1;
let sampletoAlign = false;
let lasertoAlign = false;
let load_alignSample_bool = true;
let load_alignLaser_bool = true;
let total_ions_val;
let x_pulse_val;
//isTouchDevice("100vw", "57.1111111111vw");
isTouchDevice("90vw", "51.4vw");
let pulse1;
let pulse2;
let select_instruction;
let sampleChosen;
let temperatureChosen;
let detectionRateChosen;
let dataChosen = 0;
let data_01_promised = false;
let data_02_promised = false;
let data_03_promised = false;
let data_04_promised = false;
let data_05_promised = false;
let data_06_promised = false;
let data_07_promised = false;
let data_08_promised = false;
let promise_fulfilled = false;
let experiment_running = false;
let resize_bool = true;

let field_evp_filenum = 31;
let field_evp_max; //IMPORTANT! UPDATE THIS VALUE IN THE CANVAS STYLE => MAX/MIN DATA VALUE
let i_promise_path;
let i_promise_dataID;
let w_h_top_ctx;

let field_evp_imgData;
let xy_data;
let data_promises;
let pallete = [`0,0,0`, `99,0,255`, `0,44,255`, `0,68,255`, `0,92,255`, `0,235,255`, `0,255,252`, `0,255,240`, `0,255,228`, `0,255,204`, `0,255,133`, `0,255,14`, `10,255,0`, `34,255,0`, `46,255,0`, `58,255,0`, `82,255,0`, `246,255,0`, `247,255,0`, `248,255,0`, `248,254,0`, `249,251,0`, `255,190,0`, `255,167,0`, `255,143,0`, `255,119,0`, `255,95,0`, `255,24,0`, `255,22,0`, `255,21,0`, `255,18,0`, `255,15,0`, `255,14,0`, `255,12,0`, `255,9,0`, `255,6,0`, `255,5,0`, `255,4,0`, `255,2,0`, `255,3,0`, `255,0,0`];
let next_rgb;
let dataCounts = [];
let detectionW = 2170;
let detectionH;
let detect_rate_data = [];
let volt_hist_data = [];
let icf = "0";
let k_factor = "0";
let reconstruction_images_arr = ["R18_57034-1.4-3.0-0.57.jpg", "R18_57034-1.4-3.6-0.57.jpg", "R18_57034-1.9-3.0-0.57.jpg", "R18_57034-1.9-3.6-0.57.jpg"];
let reconstruction_img_0;
let reconstruction_img_1;
let reconstruction_img_2;
let reconstruction_img_3;
let w_h = 512;
reconstruction_canvas.width = 1342;
reconstruction_canvas.height = 1400;
// ======================= START ======================== //
loadChamberImages(0, 38, "images/simulator/APT/chamber/apt_insert_sample_", sprite01, "set1_");
loadChamberImages(0, 1, "images/simulator/APT/reconstruct_temp_", spriteTemp, "setTemp_");
// ======================= END ======================== //
// ======================= START ======================== //
const bufferSizes = () => {
    bufferC_01.width = top_canvas.width;
    bufferC_01.height = top_canvas.height;
    bufferC_02.width = bottom_canvas.width;
    bufferC_02.height = bottom_canvas.height;
    if (detection_canvas.width > 0 && detection_canvas.height > 0) {
        bufferC_03.width = detection_canvas.width;
        bufferC_03.height = detection_canvas.height;
    }
    if (voltage_canvas.width > 0 && voltage_canvas.height > 0) {
        bufferC_04.width = voltage_canvas.width;
        bufferC_04.height = voltage_canvas.height;
    }
}
bufferSizes();
// =======================  END END  ==================== //
// ======================= START ======================== //
const data_concat = (str_id) => {
    for (let i = 0; i < field_evp_filenum; i++) {
        let data_arr = eval(`xy_data_${str_id}_${i}`);
        xy_data = xy_data.concat(data_arr);
    }
        i_promise_datajs(i_promise_dataID);
}

const i_promise_datajs = (id) => {
        let temp_promises = [`js/apt/${id}/${id}_spectrum_data.js`, `js/apt/${id}/${id}_detect_rate.js`, `js/apt/${id}/${id}_volt_hist.js`];
        let js_promises = [];
        for (let val of temp_promises) {
            let promise = Loader.js(val);
            js_promises.push(promise);
        }
        Promise.all(js_promises).then(messages => {
            dataCounts = eval(`dataCounts_${id}`);
            detect_rate_data = eval(`detect_rate_arr_${id}`);
            volt_hist_data = eval(`volt_hist_arr_${id}`);
            startExperiment();
        }).catch(error => {
            console.error("Rejected!", error);
        });
}

const i_promise_fun = (path_str, arr_str, fulfilled) => {
    if (fulfilled) {
        startExperiment();
    } else {
        toogle_fn("#modal-loading", "totally-hidden", true);
        toogle_fn("#top-bar", "modal-is-open", false);
        toogle_fn("#simulator-base", "modal-is-open", false);
        xy_data = [];
        data_promises = [];
        for (let i = 0; i < field_evp_filenum; i++) {
            let promise = Loader.js(`${path_str}${i}.js`);
            data_promises.push(promise);
        }
        Promise.all(data_promises).then(messages => {
            data_concat(arr_str);
        }).catch(error => {
            console.error("Rejected!", error);
        });
    }
}
// =======================  END END  ==================== //
// ======================= START ======================== //
const getMyColor = (pix) => {
    let y = parseInt(pix / w_h_top_ctx, 10);
    let x = pix - y * w_h_top_ctx;
    let pixel = top_ctx.getImageData(x, y, 1, 1);
    let data = pixel.data;
    let rgb = `${data[0]},${data[1]},${data[2]}`;
    return rgb;
}
// =======================  END END  ==================== //
// ======================= START ======================== //
const deactivateOptions = (bool, id, ...args) => {
    for (var val of args) {
        $(`${id}>option:eq(${val})`).attr("disabled", bool);
        $(id).selectmenu("refresh");
    }
}
// =======================  END END  ==================== //
// ======================= START ======================== //
const resetMenus = (...args) => {
    for (var val of args) {
        $(val).val("0");
        $(val).selectmenu("refresh");
    }
    toogle_fn("#start-div", "half-visible", false);
    $("#start-stop-btn").prop("disabled", true);
    toogle_fn("#align-laser-div", "half-visible", false);
    $("#align-laser-btn").prop("disabled", true);
}
// =======================  END END  ==================== //
// ======================= START ======================== //
const disableMenus = (...args) => {
    for (var val of args) {
        $(val).selectmenu("disable");
    }
}
// =======================  END END  ==================== //
// ======================= START ======================== //
$(function () {
    $("#sample").selectmenu({
        close: function (event, ui) {
            select_instruction = "";
        },
        change: function (event, data) {
            sampleChosen = data.item.value;
            switch (data.item.value) {
                case "voltage":
                    deactivateOptions(false, '#specimen-temp', 6, 7);
                    $('#pulse-energy').children('option:not(:first)').remove();
                    $("#pulse-fq-label").html("VOLTAGE PULSE FREQUENCY");
                    $("#pulse-e-label").html("VOLTAGE PULSE FRACTION");
                    pulse1 = "Choose Voltage pulse frequency";
                    pulse2 = "Choose Voltage pulse fraction";
                    $('#pulse-energy').append('<option value="10%">10%</option>');
                    $('#pulse-energy').append('<option value="15%" disabled>15%</option>');
                    $('#pulse-energy').append('<option value="20%" disabled>20%</option>');
                    $('#pulse-energy').append('<option value="25%" disabled>25%</option>');
                    $('#pulse-energy').append('<option value="30%">30%</option>');
                    $('#pulse-energy').selectmenu("refresh");
                    break;
                case "laser":
                    deactivateOptions(true, '#specimen-temp', 6, 7);
                    $('#pulse-energy').children('option:not(:first)').remove();
                    $("#pulse-fq-label").html("LASER PULSE FREQUENCY");
                    $("#pulse-e-label").html("LASER PULSE ENERGY");
                    pulse1 = "Choose Laser pulse frequency";
                    pulse2 = "Choose Laser pulse energy";
                    $('#pulse-energy').append('<option value="50pj">50pj</option>');
                    $('#pulse-energy').append('<option value="100pj">100pj</option>');
                    $('#pulse-energy').append('<option value="150pj" disabled>150pj</option>');
                    $('#pulse-energy').append('<option value="200pj" disabled>200pj</option>');
                    $('#pulse-energy').append('<option value="250pj" disabled>250pj</option>');
                    $('#pulse-energy').selectmenu("refresh");
                    break;
            }
            resetMenus('#specimen-temp', '#detection-rate', '#pulse-freq', '#pulse-energy');
            disableMenus('#specimen-temp', '#detection-rate', '#pulse-freq', '#pulse-energy');
            insertSample();
        }
    });
    $("#specimen-temp").selectmenu({
        open: function (event, ui) {
            $("#top-instructions-txt").html(select_instruction);
            toogle_fn("#top-instructions", "top-instructions-on", true);
            select_instruction = "Choose detection rate";
        },
        close: function (event, ui) {
            select_instruction = "";
        },
        select: function (event, ui) {
            temperatureChosen = ui.item.value;
            if (sampleChosen == "voltage") {
                switch (ui.item.value) {
                    case "25k":
                    case "75k":
                        deactivateOptions(false, '#detection-rate', 1);
                        deactivateOptions(true, '#detection-rate', 2);
                        break;
                    case "135k":
                        deactivateOptions(true, '#detection-rate', 1);
                        deactivateOptions(false, '#detection-rate', 2);
                        break;
                }
            } else if (sampleChosen == "laser") {
                deactivateOptions(false, '#detection-rate', 1, 2);
            }
            $("#detection-rate").selectmenu("enable");
            toogle_fn("#detection-label", "half-visible", true);
            $("#top-instructions-txt").html(select_instruction);
            toogle_fn("#top-instructions", "top-instructions-on", false);
            $("#align-sample-btn").prop("disabled", true);
            toogle_fn("#align-sample-btn", "controls-btn-active", true);
            toogle_fn("#align-sample-div", "half-visible", false);
            resetMenus('#detection-rate', '#pulse-freq', '#pulse-energy');
            disableMenus('#pulse-freq', '#pulse-energy');
        },
        disabled: true
    });
    $("#detection-rate").selectmenu({
        open: function (event, ui) {
            $("#top-instructions-txt").html(select_instruction);
            toogle_fn("#top-instructions", "top-instructions-on", true);
            select_instruction = pulse1;
        },
        close: function (event, ui) {
            select_instruction = "";
        },
        select: function (event, ui) {
            detectionRateChosen = ui.item.value;
            detRate_y_labels(detectionRateChosen);
            switch (ui.item.value) {
                case "0.5%":
                    if (sampleChosen == "voltage" && (temperatureChosen == "25k" || temperatureChosen == "75k")) {
                        deactivateOptions(false, '#pulse-energy', 1, 5);
                        deactivateOptions(true, '#pulse-energy', 2);
                    }
                    if (sampleChosen == "laser" && temperatureChosen == "25k") {
                        deactivateOptions(false, '#pulse-energy', 1, 2);
                        deactivateOptions(true, '#pulse-energy', 5);
                    }
                    break;
                case "1%":
                    if (sampleChosen == "voltage") {
                        deactivateOptions(false, '#pulse-energy', 1);
                        deactivateOptions(true, '#pulse-energy', 2, 5);
                    }
                    if (sampleChosen == "laser") {
                        deactivateOptions(false, '#pulse-energy', 2);
                        deactivateOptions(true, '#pulse-energy', 1, 5);
                    }
                    break;
            }
            toogle_fn("#pulse-fq-label", "half-visible", true);
            $("#pulse-freq").selectmenu("enable");
            toogle_fn("#pulse-e-label", "half-visible", true);
            $("#pulse-energy").selectmenu("enable");
            $("#top-instructions-txt").html(select_instruction);
            toogle_fn("#top-instructions", "top-instructions-on", false);
            resetMenus('#pulse-freq', '#pulse-energy');
            disableMenus('#pulse-energy');
        },
        disabled: true
    });
    $("#pulse-freq").selectmenu({
        open: function (event, ui) {
            $("#top-instructions-txt").html(select_instruction);
            toogle_fn("#top-instructions", "top-instructions-on", false);
            select_instruction = pulse2;
        },
        close: function (event, ui) {
            select_instruction = "";
        },
        select: function (event, ui) {
            $("#top-instructions-txt").html(select_instruction);
            toogle_fn("#top-instructions", "top-instructions-on", false);
            resetMenus('#pulse-energy');
            $("#pulse-energy").selectmenu("enable");
        },
        disabled: true
    });
    $("#pulse-energy").selectmenu({
        open: function (event, ui) {
            $("#top-instructions-txt").html(select_instruction);
            toogle_fn("#top-instructions", "top-instructions-on", false);
        },
        close: function (event, ui) {
            select_instruction = "";
        },
        select: function (event, ui) {
            switch (ui.item.value) {
                case "50pj":
                    promise_fulfilled = data_01_promised;
                    i_promise_dataID = '01';
                    field_evp_max = 329;
                    detectionH = 500;
                    data_01_promised = true;
                    press_alignLaser();
                    break;
                case "100pj":
                    if (detectionRateChosen == "0.5%") {
                        promise_fulfilled = data_02_promised;
                        i_promise_dataID = '02';
                        field_evp_max = 200;
                        detectionH = 500;
                        data_02_promised = true;
                    }
                    if (detectionRateChosen == "1%") {
                        promise_fulfilled = data_03_promised;
                        i_promise_dataID = '03';
                        field_evp_max = 200;
                        detectionH = 1000;
                        data_03_promised = true;
                    }
                    $("#flight_val").html("382 mm");
                    press_alignLaser();
                    break;
                case "10%":
                    if (temperatureChosen == "25k") {
                        promise_fulfilled = data_04_promised;
                        i_promise_dataID = '04';
                        field_evp_max = 363;
                        detectionH = 500;
                        data_04_promised = true;
                    }
                    if (temperatureChosen == "75k") {
                        promise_fulfilled = data_06_promised;
                        i_promise_dataID = '06';
                        field_evp_max = 366;
                        detectionH = 500;
                        data_06_promised = true;
                    }
                    if (temperatureChosen == "135k") {
                        promise_fulfilled = data_08_promised;
                        i_promise_dataID = '08';
                        field_evp_max = 355;
                        detectionH = 1000;
                        data_08_promised = true;
                    }
                    laserAligned();
                    break;
                case "30%":
                    if (temperatureChosen == "25k") {
                        promise_fulfilled = data_05_promised;
                        i_promise_dataID = '05';
                        field_evp_max = 350;
                        detectionH = 500;
                        data_05_promised = true;
                    }
                    if (temperatureChosen == "75k") {
                        promise_fulfilled = data_07_promised;
                        i_promise_dataID = '07';
                        field_evp_max = 366;
                        detectionH = 500;
                        data_07_promised = true;
                    }
                    laserAligned();
                    break;
                    default:
                        $("#flight_val").html("100 mm");
            }
            w_h_top_ctx = field_evp_max * 2;
            i_promise_path = `js/apt/${i_promise_dataID}/${i_promise_dataID}_xydetector_`;
        },
        disabled: true
    });
    $("#icf").selectmenu({
        open: function (event, ui) {
            $("#top-instructions-txt").html("Image compression factor (ICF) defines how much the image is compressed in the x-y plane from the detector image.");
            toogle_fn("#top-instructions", "top-instructions-on", false);
        },
        close: function (event, ui) {
            select_instruction = "";
            toogle_fn("#top-instructions", "top-instructions-on", true);
        },
        change: function (event, data) {
            icf = data.item.value;
            switch (data.item.value) {
                case "0":
                    break;
                case "1.4":
                    if (k_factor == "3.0") {
                        reconstructIt(reconstruction_img_0);
                    } else if (k_factor == "3.6") {
                        reconstructIt(reconstruction_img_1);
                    }
                    break;
                case "1.9":
                    if (k_factor == "3.0") {
                        reconstructIt(reconstruction_img_2);
                    } else if (k_factor == "3.6") {
                        reconstructIt(reconstruction_img_3);
                    }
                    break;
            }
        }
    });
    $("#k-factor").selectmenu({
        open: function (event, ui) {
            $("#top-instructions-txt").html("Geometric field factor (kf) is an indication of the shank angle, and is related to the depth increment of the tomographic reconstruction.");
            toogle_fn("#top-instructions", "top-instructions-on", false);
        },
        close: function (event, ui) {
            select_instruction = "";
            toogle_fn("#top-instructions", "top-instructions-on", true);
        },
        change: function (event, data) {
            k_factor = data.item.value;
            switch (data.item.value) {
                case "0":
                    break;
                case "3.0":
                    if (icf == "1.4") {
                        reconstructIt(reconstruction_img_0);
                    } else if (icf == "1.9") {
                        reconstructIt(reconstruction_img_2);
                    }
                    break;
                case "3.6":
                    if (icf == "1.4") {
                        reconstructIt(reconstruction_img_1);
                    } else if (icf == "1.9") {
                        reconstructIt(reconstruction_img_3);
                    }
                    break;
            }
        }
    });
});
$('.controls-btn').click(function (e) {
    toogle_fn("#" + e.target.id, "controls-btn-active", false);
});
$("#icf-label").mouseover(function () {
    $("#top-instructions-txt").html("Image compression factor (ICF) defines how much the image is compressed in the x-y plane from the detector image.");
    toogle_fn("#top-instructions", "top-instructions-on", false);
});
$("#icf-label").mouseout(function () {
    $("#top-instructions-txt").html("");
    toogle_fn("#top-instructions", "top-instructions-on", true);
});
$("#k-factor-label").mouseover(function () {
    $("#top-instructions-txt").html("Geometric field factor (kf) is an indication of the shank angle, and is related to the depth increment of the tomographic reconstruction.");
    toogle_fn("#top-instructions", "top-instructions-on", false);
});
$("#k-factor-label").mouseout(function () {
    $("#top-instructions-txt").html("");
    toogle_fn("#top-instructions", "top-instructions-on", true);
});
$("#detect-eff-stats").mouseover(function () {
    $("#top-instructions-txt").html("Detector efficiency is a measure of the open area of the detector, allowing the detection of single ions. This is related to the depth increment of the tomographic reconstruction.");
    toogle_fn("#top-instructions", "top-instructions-on", false);
});
$("#detect-eff-stats").mouseout(function () {
    $("#top-instructions-txt").html("");
    toogle_fn("#top-instructions", "top-instructions-on", true);
});
// =======================  END END  ==================== //
// ======================= START ======================== //
const insertSample = () => {
    top_ctx.clearRect(0, 0, top_canvas.width, top_canvas.height);
    bottom_ctx.clearRect(0, 0, bottom_canvas.width, bottom_canvas.height);
    bufferCtx_05.clearRect(0, 0, bottom_canvas.width, bottom_canvas.height);
    resize_bool = true;
    sampletoAlign = false;
    lasertoAlign = false;
    stopwatch.stop();
    stopwatch.reset();
    toogle_fn(".statistics", "not-visible", false);
    toogle_fn(".ui-state-disabled", "full-opacity", true);
    toogle_fn("#specimen-label", "half-visible", false);
    toogle_fn("#detection-label", "half-visible", false);
    toogle_fn("#pulse-fq-label", "not-visible", true);
    toogle_fn("#pulse-fq-label", "half-visible", false);
    toogle_fn("#pulse-e-label", "not-visible", true);
    toogle_fn("#pulse-e-label", "half-visible", false);
    toogle_fn("#simulator-base", "screen-1", true);
    toogle_fn("#simulator-base", "screen-2", false);
    toogle_fn("#row-up", "ru-screen-1", true);
    toogle_fn("#row-up", "ru-screen-2", false);
    toogle_fn("#row-up-left", "rul-screen-1", true);
    toogle_fn("#row-up-left", "rul-screen-2", false);
    toogle_fn(".row-up-right", "totally-hidden", false);
    toogle_fn("#top-canvas", "top-camera", false);
    toogle_fn("#top-canvas", "field-evaporation", true);
    toogle_fn("#row-middle", "rm-screen-1", true);
    toogle_fn("#row-middle", "rm-screen-2", false);
    toogle_fn("#bottom-canvas", "side-camera", false);
    toogle_fn("#bottom-canvas", "spectrum", true);
    toogle_fn("#align-sample-div", "half-visible", false);
    toogle_fn("#align-laser-div", "half-visible", false);
    toogle_fn("#start-div", "half-visible", false);
    toogle_fn("#pv-legend", "totally-hidden", false);
    toogle_fn("#v-legend", "totally-hidden", false);
    toogle_fn(".x-pulse", "totally-hidden", false);
    toogle_fn(".detect-rate-y", "not-visible", false);
    $("#align-sample-btn").prop("disabled", true);
    toogle_fn("#align-sample-btn", "controls-btn-active", true);
    $("#align-laser-btn").prop("disabled", true);
    toogle_fn("#align-laser-btn", "controls-btn-active", true);
    $("#start-stop-btn").prop("disabled", true);
    toogle_fn("#start-stop-btn", "controls-btn-active", true);
    $("#start-stop-label").html("START");
    toogle_fn("#reconstruct-div", "half-visible", false);
    $("#reconstruct-btn").prop("disabled", true);
    experiment_running = false;
    $("#top-canvas-title").html("Top Camera");
    $("#bottom-canvas-title").html("Side Camera");
    clearTimeout(myTimeout);
    cancelAnimationFrame(hitBack);
    $("#total-ions").html("0");
    resize();
    bufferSizes();
    let canvas = [{
            c: top_canvas,
            ctx: top_ctx,
            sx: 0,
            sy: 0,
            swidth: 710,
            sheight: 355,
            x: (top_canvas.width - (top_canvas.height * 2)) / 2,
            y: 0,
            width: top_canvas.height * 2,
            height: top_canvas.height,
            bufferC: bufferC_01,
            bufferCtx: bufferCtx_01
        }
        , {
            c: bottom_canvas,
            ctx: bottom_ctx,
            sx: 0,
            sy: 424,
            swidth: 710,
            sheight: 480,
            x: (bottom_canvas.width - (1.4791 * bottom_canvas.height)) / 2,
            y: 0,
            width: 1.4791 * bottom_canvas.height,
            height: bottom_canvas.height,
            bufferC: bufferC_02,
            bufferCtx: bufferCtx_02
        }];
    if (looptoStop) stopLoop();
    videoChamberAnimation(true, 0, 37, canvas, sprite01, sampleIn);
    if (load_alignSample_bool) {
        loadChamberImages(0, 9, "images/simulator/APT/chamber/sample_align_", sprite02, "set2_");
        loadChamberImages(0, 65, "images/simulator/APT/chamber/sample_align2_", sprite03, "set3_");
        load_alignSample_bool = false;
    }
    if (sampleChosen == "laser") {
        if (load_alignLaser_bool) {
            loadChamberImages(0, 35, "images/simulator/APT/chamber/laser_align_", sprite04, "set4_");
            load_alignLaser_bool = false;
        }
    }
    toogle_fn("#top-instructions", "top-instructions-on", true);
};
// ======================= END ======================== //
// ======================= START ======================== //
const sampleIn = () => {
    //        toogle_fn("#simulator-base", "no-cursor", true);
    //        toogle_fn("#align-laser-btn", "no-cursor", true);
    toogle_fn("#align-sample-div", "half-visible", true);
    // insertSample 会给按钮加上 controls-btn-active（CSS 含 cursor:not-allowed）；要恢复可点外观需去掉该类（toogle_fn 第三参为 true 时在「已有类」上会 toggle 掉）
    toogle_fn("#align-sample-btn", "controls-btn-active", true);
    $("#align-sample-btn").prop("disabled", false);
    $("#top-instructions-txt").html("Select 'Align Sample' to see a video example of the alignment of the specimen to the local electrode");
    toogle_fn("#top-instructions", "top-instructions-on", false);
}
// ======================= END ======================== //
// ======================= START ======================== //
$('#align-sample-btn').click(() => {
    if (!sampletoAlign) {
        stopLoop();
        //        toogle_fn("#simulator-base", "no-cursor", false);
        //        toogle_fn("#align-sample-btn", "no-cursor", false);
        toogle_fn("#top-instructions", "top-instructions-on", true);
        resize();
        bufferSizes();
        let canvas = [{
                c: top_canvas,
                ctx: top_ctx,
                sx: 10,
                sy: 25,
                swidth: 144,
                sheight: 180,
                x: 0,
                y: 0,
                width: Math.floor(top_canvas.height * 0.8),
                height: Math.floor(top_canvas.height),
                bufferC: bufferC_01,
                bufferCtx: bufferCtx_01
        }
        , {
                c: top_canvas,
                ctx: top_ctx,
                sx: 318,
                sy: 0,
                swidth: 1416,
                sheight: 354,
                x: Math.floor(top_canvas.height * 0.8),
                y: 0,
                width: Math.floor(top_canvas.height * 4),
                height: top_canvas.height,
                bufferC: bufferC_01,
                bufferCtx: bufferCtx_01
        }
        , {
                c: bottom_canvas,
                ctx: bottom_ctx,
                sx: 10,
                sy: 402,
                swidth: 144,
                sheight: 245,
                x: 0,
                y: 0,
                width: Math.floor(top_canvas.height * 0.8),
                height: Math.floor(top_canvas.height * 1.36),
                bufferC: bufferC_02,
                bufferCtx: bufferCtx_02
        }
        , {
                c: bottom_canvas,
                ctx: bottom_ctx,
                sx: 318,
                sy: 378,
                swidth: 1422,
                sheight: 572,
                x: Math.floor(top_canvas.height * 0.8) + 10,
                y: 0,
                width: Math.floor(bottom_canvas.height * 2.486),
                height: bottom_canvas.height,
                bufferC: bufferC_02,
                bufferCtx: bufferCtx_02
        }];
        videoChamberAnimation(true, 0, 8, canvas, sprite02, keepAlignSample);
    }
    sampletoAlign = true;
});
const keepAlignSample = () => {
    stopLoop();
    resize();
    bufferSizes();
    let canvas = [{
            c: top_canvas,
            ctx: top_ctx,
            sx: 13,
            sy: 25,
            swidth: 144,
            sheight: 180,
            x: 0,
            y: 0,
            width: Math.floor(top_canvas.height * 0.8),
            height: Math.floor(top_canvas.height),
            bufferC: bufferC_01,
            bufferCtx: bufferCtx_01
        }
        , {
            c: top_canvas,
            ctx: top_ctx,
            sx: 352,
            sy: 0,
            swidth: 1162,
            sheight: 335,
            x: Math.floor(top_canvas.height * 0.8),
            y: 0,
            width: Math.floor(top_canvas.height * 3.5),
            height: top_canvas.height,
            bufferC: bufferC_01,
            bufferCtx: bufferCtx_01
        }
        , {
            c: bottom_canvas,
            ctx: bottom_ctx,
            sx: 13,
            sy: 384,
            swidth: 144,
            sheight: 245,
            x: 0,
            y: 0,
            width: Math.floor(top_canvas.height * 0.8),
            height: Math.floor(top_canvas.height * 1.36),
            bufferC: bufferC_02,
            bufferCtx: bufferCtx_02
        }
        , {
            c: bottom_canvas,
            ctx: bottom_ctx,
            sx: 184,
            sy: 360,
            swidth: 1482,
            sheight: 494,
            x: Math.floor(top_canvas.height * 0.8),
            y: 0,
            width: Math.floor(bottom_canvas.height * 3),
            height: bottom_canvas.height,
            bufferC: bufferC_02,
            bufferCtx: bufferCtx_02
        }];
    videoChamberAnimation(true, 0, 64, canvas, sprite03, sampleAligned);
};
// ======================= END ======================== //
// ======================= START ======================== //
const detRate_y_labels = (rate) => {
    switch (rate) {
        case "1%":
            $("#detect-rate-y-label-6").html("10");
            $("#detect-rate-y-label-5").html("8");
            $("#detect-rate-y-label-4").html("6");
            $("#detect-rate-y-label-3").html("4");
            $("#detect-rate-y-label-2").html("2");
            $("#detect-rate-y-label-1").html("0");
            break;
        case "0.5%":
            $("#detect-rate-y-label-6").html("5");
            $("#detect-rate-y-label-5").html("4");
            $("#detect-rate-y-label-4").html("3");
            $("#detect-rate-y-label-3").html("2");
            $("#detect-rate-y-label-2").html("1");
            $("#detect-rate-y-label-1").html("0");
            break;
    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const sampleAligned = () => {
    $("#specimen-temp").selectmenu("enable");
    toogle_fn("#specimen-label", "half-visible", true);
    $("#top-instructions-txt").html("Choose sample base temperature");
    toogle_fn("#top-instructions", "top-instructions-on", false);
}
// ======================= END ======================== //
// ======================= START ======================== //
const press_alignLaser = () => {
    toogle_fn("#align-laser-div", "half-visible", true);
    $("#align-laser-btn").prop("disabled", false);
    $("#top-instructions-txt").html("Align Laser");
    toogle_fn("#top-instructions", "top-instructions-on", false);
}
// ======================= END ======================== //
// ======================= START ======================== //
$('#align-laser-btn').click(() => {
    if (!lasertoAlign) {
        stopLoop();
        $("#specimen-temp").selectmenu("disable");
        $("#detection-rate").selectmenu("disable");
        $("#pulse-freq").selectmenu("disable");
        $("#pulse-energy").selectmenu("disable");
        toogle_fn(".ui-state-disabled", "full-opacity", false);
        toogle_fn("#top-instructions", "top-instructions-on", true);
        resize();
        bufferSizes();
        let canvas = [{
                c: top_canvas,
                ctx: top_ctx,
                sx: 9,
                sy: 26,
                swidth: 144,
                sheight: 180,
                x: 0,
                y: 0,
                width: Math.floor(top_canvas.height * 0.8),
                height: Math.floor(top_canvas.height),
                bufferC: bufferC_01,
                bufferCtx: bufferCtx_01
        }
        , {
                c: top_canvas,
                ctx: top_ctx,
                sx: 171,
                sy: 0,
                swidth: 504,
                sheight: 321,
                x: ((top_canvas.width - ((top_canvas.height * 0.8) + (top_canvas.height * 1.57))) / 2) + (top_canvas.height * 0.8),
                y: 0,
                width: Math.floor(top_canvas.height * 1.57),
                height: top_canvas.height,
                bufferC: bufferC_01,
                bufferCtx: bufferCtx_01
        }
        , {
                c: bottom_canvas,
                ctx: bottom_ctx,
                sx: 9,
                sy: 371,
                swidth: 144,
                sheight: 245,
                x: 0,
                y: 0,
                width: Math.floor(top_canvas.height * 0.8),
                height: Math.floor(top_canvas.height * 1.36),
                bufferC: bufferC_02,
                bufferCtx: bufferCtx_02
        }
        , {
                c: bottom_canvas,
                ctx: bottom_ctx,
                sx: 171,
                sy: 347,
                swidth: 629,
                sheight: 301,
                x: ((bottom_canvas.width - ((top_canvas.height * 0.8) + (bottom_canvas.height * 2.09))) / 2) + (top_canvas.height * 0.8),
                y: 0,
                width: Math.floor(bottom_canvas.height * 2.09),
                height: bottom_canvas.height,
                bufferC: bufferC_02,
                bufferCtx: bufferCtx_02
        }];
        top_ctx.clearRect(0, 0, top_canvas.width, top_canvas.height);
        bottom_ctx.clearRect(0, 0, bottom_canvas.width, bottom_canvas.height);
        videoChamberAnimation(true, 0, 34, canvas, sprite04, laserAligned);
    }
    lasertoAlign = true;
});
// ======================= END ======================== //
// ======================= START ======================== //
let myTimeout;
let hitBack;
const laserAligned = () => {
    toogle_fn("#align-laser-div", "half-visible", false);
    $("#align-laser-btn").prop("disabled", true);
    toogle_fn("#align-laser-btn", "controls-btn-active", true);
    toogle_fn("#start-div", "half-visible", true);
    $("#start-stop-btn").prop("disabled", false);
    select_instruction = "Start the experiment";
    $("#top-instructions-txt").html(select_instruction);
    toogle_fn("#top-instructions", "top-instructions-on", false);
}
// ======================= END ======================== //
// ======================= START ======================== //
$("#start-stop-btn").click(() => {
    $("#specimen-temp").selectmenu("disable");
    $("#detection-rate").selectmenu("disable");
    $("#pulse-freq").selectmenu("disable");
    $("#pulse-energy").selectmenu("disable");
    experiment_running ? stopExperiment() : i_promise_fun(i_promise_path, i_promise_dataID, promise_fulfilled);
    experiment_running = !experiment_running;
});
let experimentOn = false;
const startExperiment = () => {
    experimentOn = true;
    toogle_fn("#modal-loading", "totally-hidden", false);
    toogle_fn("#top-bar", "modal-is-open", true);
    toogle_fn("#simulator-base", "modal-is-open", true);
    resize_bool = false;
    toogle_fn("#top-instructions", "top-instructions-on", true);
    $("#start-stop-label").html("STOP");
    $("#start-stop-btn").prop("disabled", false);
    toogle_fn("#start-stop-btn", "controls-btn-active", true);
    stopLoop();
    top_ctx.clearRect(0, 0, top_canvas.width, top_canvas.height);
    bottom_ctx.clearRect(0, 0, bottom_canvas.width, bottom_canvas.height);
    toogle_fn("#row-up-left", "rul-screen-1", false);
    toogle_fn("#row-up-left", "rul-screen-2", true);
    toogle_fn(".row-up-right", "totally-hidden", true);
    toogle_fn("#row-middle", "rm-screen-1", false);
    toogle_fn("#row-middle", "rm-screen-2", true);
    toogle_fn("#simulator-base", "screen-1", false);
    toogle_fn("#simulator-base", "screen-2", true);
    toogle_fn("#row-up", "ru-screen-1", false);
    toogle_fn("#row-up", "ru-screen-2", true);
    toogle_fn("#top-canvas", "top-camera", true);
    toogle_fn("#top-canvas", "field-evaporation", false);
    toogle_fn("#bottom-canvas", "side-camera", true);
    toogle_fn("#bottom-canvas", "spectrum", false);
    $("#top-canvas-title").html("Field Evaporation Image");
    $("#bottom-canvas-title").html("Mass Spectrum");
    toogle_fn(".statistics", "not-visible", true);
    toogle_fn(".x-pulse", "totally-hidden", true);
    toogle_fn(".detect-rate-y", "not-visible", true);
    resize();
    //
    let ion_counter = 0;
    top_canvas.width = w_h_top_ctx;
    top_canvas.height = w_h_top_ctx;
    field_evp_imgData = top_ctx.createImageData(w_h_top_ctx, w_h_top_ctx);
    //
    let bottom_canvas_w = 2100; //NOTE => SET UP W/H WHEN ALL DATA IS known - next to w_h_top_ctx var which is already done
    let bottom_canvas_h = 315;
    bottom_canvas.width = bottom_canvas_w;
    bottom_canvas.height = bottom_canvas_h;
    bufferC_05.width = bottom_canvas.width;
    bufferC_05.height = bottom_canvas.height;
    let row_middle = document.getElementById("row-middle");
    row_middle.appendChild(bufferC_05);
    let da_counts_y = Array(2800).fill(0);
    let prevY = 0;
    detection_canvas.width = detectionW;
    detection_canvas.height = detectionH;
    bufferC_03.width = xy_data.length;
    bufferC_03.height = detectionH;
    let detect_rate_y;
    let buffer_clipH = 500;
    let buffer_clipH_detection_rate = 2170;
    let x_coordinate = buffer_clipH_detection_rate;
    let start_clippingX = 0;
    bufferCtx_03.strokeStyle = "indigo";
    bufferCtx_03.beginPath();
    bufferCtx_03.moveTo(0, bufferC_03.height);
    //
    let pv = 0;
    let dcVolt;
    let voltageW = 350;
    let voltageH = 530;
    voltage_canvas.width = 2170;
    voltage_canvas.height = 850;
    let volt_val_arr = document.getElementsByClassName("x-pulse");
    bufferC_04.width = xy_data.length;
    bufferC_04.height = voltageH;
    bufferCtx_04.strokeStyle = "indigo";
    bufferCtx_04.lineWidth = 5;
    bufferCtx_04.beginPath();
    bufferCtx_04.moveTo(0, bufferC_04.height);
    if (sampleChosen == "voltage") {
        bufferC_04_b.width = xy_data.length;
        bufferC_04_b.height = voltageH;
        bufferCtx_04_b.strokeStyle = "blue";
        bufferCtx_04_b.lineWidth = 5;
        bufferCtx_04_b.beginPath();
        bufferCtx_04_b.moveTo(0, bufferC_04_b.height);
    }
    const ionHit = () => {
        hitBack = requestAnimationFrame(() => {
            if (experimentOn === true) {
                ionHit();
            } else {
                clearTimeout(myTimeout);
                cancelAnimationFrame(hitBack);
            }
        });
        myTimeout = setTimeout(() => {
            if (experimentOn === true) {
                //FIELD EVAPORATION
                for (let i = 0; i < xy_data[ion_counter].length; i++) {
                    let myPixelColor = getMyColor(xy_data[ion_counter][i]);
                    for (let j = 0; j < pallete.length - 1; j++) {
                        if (myPixelColor == pallete[j]) next_rgb = pallete[j + 1].split(`,`);
                    }
                    field_evp_imgData.data[(xy_data[ion_counter][i] * 4) + 0] = next_rgb[0];
                    field_evp_imgData.data[(xy_data[ion_counter][i] * 4) + 1] = next_rgb[1];
                    field_evp_imgData.data[(xy_data[ion_counter][i] * 4) + 2] = next_rgb[2];
                    field_evp_imgData.data[(xy_data[ion_counter][i] * 4) + 3] = 255;
                }
                top_ctx.putImageData(field_evp_imgData, 0, 0);
                //MASS SPECTRUM 
                let maxCount;
                let vals_arr = [];
                if (ion_counter < dataCounts.length) {
                    let currentArray = dataCounts[ion_counter];
                    for (let index in currentArray) {
                        vals_arr.push(currentArray[index][0]);
                    };
                    maxCount = Math.max.apply(null, vals_arr);
                    //                    console.log(ion_counter+' - maxCount ='+maxCount);
                    let temp_arr = Array(maxCount).fill(0);
                    for (let index in currentArray) {
                        temp_arr[currentArray[index][0]] = currentArray[index][1];
                    }
                    da_counts_y = addArrays(da_counts_y, temp_arr);
                    for (let i = 0; i < da_counts_y.length; i++) {
                        let y = da_counts_y[i];
                        if (y > 0) {
                            let logY = Math.ceil((Math.log10(y) + 1) * 50);
                            if (logY > prevY) {
                                prevY = logY;
                            }
                            let ypos = bottom_canvas_h - (logY + 2);
                            bottom_ctx.fillStyle = "black";
                            bottom_ctx.lineWidth = 2;
                            bottom_ctx.strokeRect(i, ypos, 3, logY - 6);
                            bufferCtx_05.fillStyle = "#f0f0ef";
                            bufferCtx_05.fillRect(i + 1, ypos, 1, logY - 7);
                        }
                    }
                }
                // DETECTION RATE
                detect_rate_y = detect_rate_data[ion_counter];
//                if (detect_rate_y >= (detectionH / 2)) detect_rate_y = (detectionH / 2);
                bufferCtx_03.lineTo(ion_counter, bufferC_03.height - (detect_rate_y * 100));
                bufferCtx_03.stroke();
                detection_ctx.clearRect(0, 0, detection_canvas.width, detection_canvas.height);
//                detection_ctx.drawImage(bufferC_03, 0,0);
                detection_ctx.drawImage(bufferC_03, start_clippingX, 0, 500, detectionH, x_coordinate, 0, detection_canvas.width, detection_canvas.height);
                //VOLTAGE HISTORY   
                pv = volt_hist_data[ion_counter];
                pv -= 2900;
                pv /= 15;
                dcVolt = pv / 5;
                //                dcVolt = volt_hist_data[ion_counter][1];
                //                dcVolt /= 10;
                bufferCtx_04.lineTo(ion_counter, bufferC_04.height - (pv));
                bufferCtx_04.stroke();
                if (sampleChosen == "voltage") {
                    bufferCtx_04_b.lineTo(ion_counter, bufferC_04_b.height - (dcVolt));
                    bufferCtx_04_b.stroke();
                    toogle_fn("#pv-legend", "totally-hidden", true);
                    toogle_fn("#v-legend", "totally-hidden", true);
                } else {
                    toogle_fn("#pv-legend", "totally-hidden", true);
                    toogle_fn("#v-legend", "totally-hidden", false);
                }
                voltage_ctx.clearRect(0, 0, voltage_canvas.width, voltage_canvas.height);
                voltage_ctx.drawImage(bufferC_04, 0, 0, buffer_clipH, bufferC_04.height, 0, 0, voltage_canvas.width, voltage_canvas.height);
                if (sampleChosen == "voltage") {
                    voltage_ctx.drawImage(bufferC_04_b, 0, 0, buffer_clipH, bufferC_04_b.height, 0, 0, voltage_canvas.width, voltage_canvas.height);
                }
                //
                //



                let gap = (ion_counter - 500) / 238;
                volt_x_pulse_val = gap;
                gap = Math.round((1.8 + (4.2 - (gap % 4.2))) * 100) / 100;

                for (let i = 0; i < volt_val_arr.length; i++) {
                    if (ion_counter >= 500) {
                        volt_val_arr[i].style.marginRight = gap + "vw";
                    } else {
                        volt_val_arr[i].style.marginRight = "6.0vw";
                    }
                    if (gap > 4.7) {
                        volt_val_arr[3].style.visibility = "hidden";
                    } else {
                        volt_val_arr[3].style.visibility = "visible";
                    }
                    if (gap > 2.9) {
                        volt_val_arr[4].style.visibility = "hidden";
                    } else {
                        volt_val_arr[4].style.visibility = "visible";
                    }
                    if (gap > 1.85) {
                        volt_val_arr[5].style.visibility = "hidden";
                    } else {
                        volt_val_arr[5].style.visibility = "visible";
                    }
                    let val_x;
                    if (volt_x_pulse_val < 4.2) {
                        val_x = i * 200000
                    } else {
                        volt_x_pulse_val < 8.4 ? val_x = i * 400000 : val_x = i * 800000
                    }
                    if (i > 0) $("#x-pulse-bottom-" + i).html(val_x.toExponential(1));
                }

                total_ions_val = ion_counter * 1000;
                $("#total-ions").html(total_ions_val.toExponential());
                ion_counter++;
                if (buffer_clipH < ion_counter) buffer_clipH = ion_counter;
                if (buffer_clipH_detection_rate < ion_counter) start_clippingX++;
                if (x_coordinate > 0) x_coordinate--;
            }
        }, 0);
        if (ion_counter > 3000) {
            //        if (ion_counter >= (xy_data.length) - 1) {
            experimentOn = false;
            clearTimeout(myTimeout);
            cancelAnimationFrame(hitBack);
            stopwatch.stop();
            stopExperiment();
            //            alert("DONE");
        }
    }
    stopwatch.reset();
    stopwatch.start();
    ionHit();
}
const stopExperiment = () => {
    stopwatch.stop();
    try {
        if (window.APT_BENCHMARK_API && typeof window.APT_BENCHMARK_API.markSubtaskSuccess === "function") {
            window.APT_BENCHMARK_API.markSubtaskSuccess("S8");
        }
    } catch (e) {}
    $("#start-stop-label").html("START");
    toogle_fn("#start-div", "half-visible", false);
    $("#start-stop-btn").prop("disabled", true);
    toogle_fn("#start-stop-btn", "controls-btn-active", true);
    clearTimeout(myTimeout);
    cancelAnimationFrame(hitBack);
    toogle_fn("#reconstruct-div", "half-visible", true);
    $("#reconstruct-btn").prop("disabled", false);
    $("#top-instructions-txt").html("Click 'Reconstruct' to view an example of an APT dataset reconstruction");
    toogle_fn("#top-instructions", "top-instructions-on", false);
}
// ======================= END ======================== //
// ======================= START ======================== //

$("#start-again").click(() => {
    location.reload();
    location.reload(true);
});
$("#go-home").click(() => {
    location.href = "http://localhost";
});
$("#close-data-modal").click(() => {
    toogle_fn("#top-bar", "modal-is-open", true);
    toogle_fn("#simulator-base", "modal-is-open", true);
    toogle_fn("#modal-reconstruct-info", "totally-hidden", false);
});
$("#close-finish-modal").click(() => {
    toogle_fn("#top-bar", "modal-is-open", true);
    toogle_fn("#simulator-base", "modal-is-open", true);
    toogle_fn("#modal-finish", "totally-hidden", false);
    toogle_fn("#finish-btn", "controls-btn-active", true);
});
// ======================= END ======================== //
// ======================= START ======================== //
$("#reconstruct-btn").click(() => {
    toogle_fn("#div-legend", "totally-hidden", false);
    toogle_fn("#controls-right-top", "totally-hidden", false);
    toogle_fn("#controls-reconstruction", "totally-hidden", true);
    toogle_fn(".statistics", "not-visible", false);
    toogle_fn("#controls-right-top", "not-visible", false);
    toogle_fn(".win-title", "not-visible", false);
    toogle_fn("#reconstruct-div", "totally-hidden", false);
    $("#finish-btn").prop("disabled", false);
    toogle_fn("#finish-div", "totally-hidden", true);
    toogle_fn("#simulator-base", "screen-1", true);
    toogle_fn("#simulator-base", "screen-2", true);
    toogle_fn("#simulator-base", "screen-3", false);
    top_ctx.clearRect(0, 0, top_canvas.width, top_canvas.height);
    bottom_ctx.clearRect(0, 0, bottom_canvas.width, bottom_canvas.height);
    detection_ctx.clearRect(0, 0, detection_canvas.width, detection_canvas.height);
    voltage_ctx.clearRect(0, 0, voltage_canvas.width, voltage_canvas.height);
    toogle_fn("#row-up", "totally-hidden", false);
    toogle_fn("#row-middle", "totally-hidden", false);
    toogle_fn(".statistics", "totally-hidden", false);
    toogle_fn("#reconstruction-panel", "totally-hidden", true);
    toogle_fn("#modal-loading", "totally-hidden", true);
    toogle_fn("#top-bar", "modal-is-open", false);
    toogle_fn("#simulator-base", "modal-is-open", false);
    i_promise_jpg(`images/simulator/APT/reconstruction/`, `reconstruction`);
});
// ======================= START ======================== //
const reconstruction_screen = (str_id) => {
    toogle_fn("#modal-loading", "totally-hidden", false);
    toogle_fn("#modal-reconstruct-info", "totally-hidden", true);
    toogle_fn("#top-instructions", "top-instructions-on", true);
    switch (str_id) {
        case "reconstruction":
            reconstruction_img_0 = document.getElementById("reconstruction_0");
            reconstruction_img_1 = document.getElementById("reconstruction_1");
            reconstruction_img_2 = document.getElementById("reconstruction_2");
            reconstruction_img_3 = document.getElementById("reconstruction_3");
            break;
        default:
    }
}
const i_promise_jpg = (path_str, id_str) => {
    data_promises = [];
    for (let index in reconstruction_images_arr) {
        let promise = Loader.jpg(`${path_str}${reconstruction_images_arr[index]}`, `${id_str}_${index}`);
        data_promises.push(promise);
    }
    Promise.all(data_promises).then(messages => {
        reconstruction_screen(id_str);
    }).catch(error => {
        console.error("Rejected!", error);
    });
}
// =======================  END END  ==================== //
// ======================= START ======================== //
const reconstructIt = (reconst_img) => {
    reconstruction_ctx.clearRect(0, 0, 1342, 1400);
    reconstruction_ctx.drawImage(reconst_img, 0, 0);
    //    reconstruction_ctx.drawImage(reconst_img, 0, 0, reconst_img.width, reconst_img.height, 0, 0, reconstruction_canvas.width, reconstruction_canvas.height);
};
// ======================= END ======================== //

$('#finish-btn').click(() => {
    // 不再弹出「Congratulations」完成弹窗；顶栏/底座状态与原先点 FINISH 后一致，并标记 FINISH 已完成（供测试检测）
    $("#modal-finish").addClass("totally-hidden");
    toogle_fn("#top-bar", "modal-is-open", false);
    toogle_fn("#simulator-base", "modal-is-open", false);
    toogle_fn("#finish-btn", "controls-btn-active", true);
});
// ======================= END ======================== //
// ======================= START ======================== //
// =======================  END END  ==================== //
// ======================= START ======================== //
// APT benchmark helper: programmatic step execution & fast-forward
// Expose small helpers on window so Playwright 测试脚本可以直接“快进”到某一步之前的界面状态，
// 与 XRD 的 XRD_fast_forward_to_subtask 作用类似。
(function () {
    if (typeof window === "undefined" || typeof jQuery === "undefined") return;
    const $ = jQuery;

    function setSelectValue(selector, value) {
        const $sel = $(selector);
        if (!$sel.length) return;
        try {
            if (typeof $sel.selectmenu === "function") {
                // 设置值并刷新 UI
                $sel.val(value);
                $sel.selectmenu("refresh");
                // 通过触发 change/ selectmenuselect，强制执行原有回调逻辑（如 insertSample / detRate_y_labels 等）
                $sel.trigger("change");
                $sel.trigger("selectmenuselect", [{ item: { value: value, label: value } }]);
            } else {
                $sel.val(value).trigger("change");
            }
        } catch (e) {
            $sel.val(value).trigger("change");
        }
    }

    // 对应 Python APT_STEP_INSTRUCTIONS 中的 1～12 步
    // 1. 选择 sample = steel (volt)
    // 注意：仅 setSelectValue + trigger 往往不会带上 selectmenu change 所需的 data.item，
    // 导致 insertSample() 未执行，腔体动画不跑，ALIGN SAMPLE 会一直保持 disabled。
    // 这里显式复刻 change 回调里 voltage 分支 + insertSample，与真实 UI 一致。
    window.APT_DO_STEP_1 = function () {
        const $sel = $("#sample");
        if (!$sel.length) return;
        const value = "voltage";
        $sel.val(value);
        if (typeof $sel.selectmenu === "function") {
            try {
                $sel.selectmenu("refresh");
            } catch (e) { /* ignore */ }
        }
        sampleChosen = value;
        deactivateOptions(false, '#specimen-temp', 6, 7);
        $('#pulse-energy').children('option:not(:first)').remove();
        $("#pulse-fq-label").html("VOLTAGE PULSE FREQUENCY");
        $("#pulse-e-label").html("VOLTAGE PULSE FRACTION");
        pulse1 = "Choose Voltage pulse frequency";
        pulse2 = "Choose Voltage pulse fraction";
        $('#pulse-energy').append('<option value="10%">10%</option>');
        $('#pulse-energy').append('<option value="15%" disabled>15%</option>');
        $('#pulse-energy').append('<option value="20%" disabled>20%</option>');
        $('#pulse-energy').append('<option value="25%" disabled>25%</option>');
        $('#pulse-energy').append('<option value="30%">30%</option>');
        if (typeof $('#pulse-energy').selectmenu === "function") {
            try {
                $('#pulse-energy').selectmenu("refresh");
            } catch (e) { /* ignore */ }
        }
        resetMenus('#specimen-temp', '#detection-rate', '#pulse-freq', '#pulse-energy');
        disableMenus('#specimen-temp', '#detection-rate', '#pulse-freq', '#pulse-energy');
        insertSample();
    };

    // 2. ALIGN SAMPLE（播放对齐动画并进入对齐完成状态）
    window.APT_DO_STEP_2 = function () {
        const btn = document.querySelector("#align-sample-btn");
        if (btn && !btn.disabled) {
            btn.click();
        }
    };

    // 3. SPECIMEN TEMPERATURE = 75k
    window.APT_DO_STEP_3 = function () {
        setSelectValue("#specimen-temp", "75k");
    };

    // 4. DETECTION RATE = 0.5%
    window.APT_DO_STEP_4 = function () {
        setSelectValue("#detection-rate", "0.5%");
    };

    // 5. VOLTAGE PULSE FREQUENCY = 200 kHz
    window.APT_DO_STEP_5 = function () {
        setSelectValue("#pulse-freq", "200 kHz");
    };

    // 6. VOLTAGE PULSE FRACTION = 10%
    window.APT_DO_STEP_6 = function () {
        setSelectValue("#pulse-energy", "10%");
    };

    // 7. 点击 START，开始实验
    window.APT_DO_STEP_7 = function () {
        const btn = document.querySelector("#start-stop-btn");
        if (btn && !btn.disabled) {
            btn.click();
        }
    };

    // 8. 再次点击 START（STOP），停止实验
    window.APT_DO_STEP_8 = function () {
        const btn = document.querySelector("#start-stop-btn");
        if (btn && !btn.disabled) {
            btn.click();
        }
    };

    // 9. 点击 RECONSTRUCT 进入重建视图
    window.APT_DO_STEP_9 = function () {
        const btn = document.querySelector("#reconstruct-btn");
        if (btn && !btn.disabled) {
            btn.click();
        }
    };

    // 10. 选择 ICF = 1.4
    window.APT_DO_STEP_10 = function () {
        setSelectValue("#icf", "1.4");
    };

    // 11. 选择 K Factor = 3.0
    window.APT_DO_STEP_11 = function () {
        setSelectValue("#k-factor", "3.0");
    };

    // 12. 点击 FINISH 完成流程（祝贺弹窗已关闭，无需再点 ×）
    window.APT_DO_STEP_12 = function () {
        const finishBtn = document.querySelector("#finish-btn");
        if (finishBtn && !finishBtn.disabled) {
            finishBtn.click();
        }
    };

    // 兼容备用接口：APT_JUMP_TO_STATE(n)
    // 语义：快进到“第 n+1 步之前”的状态，即依次执行前 n+1 个 DO_STEP。
    window.APT_JUMP_TO_STATE = function (stateIndex) {
        const n = parseInt(stateIndex, 10);
        if (isNaN(n) || n < 0) return;
        const maxStep = Math.min(n + 1, 12);
        for (let k = 1; k <= maxStep; k++) {
            const fn = window["APT_DO_STEP_" + k];
            if (typeof fn === "function") {
                try {
                    fn();
                } catch (e) {
                    // 若某步执行失败，提前终止，避免进入非法状态
                    break;
                }
            }
        }
    };
})();

//const resizeCanvasVideo = () => {}
const resizeCanvasGraphs = () => {
    let c = document.getElementsByClassName("screen-1-canvas");
    //    let f_e = document.getElementsByClassName("field-evaporation");
    let t = document.getElementsByClassName("win-title");
    for (let i = 0; i < c.length; i++) {
        c[i].width = c[i].parentElement.clientWidth * 0.98;
        c[i].height = c[i].parentElement.clientHeight - (t[i].clientHeight + 3);
    }
}
const resize = () => {
    //    //CONDITIONAL MISSING HERE
    if (resize_bool) resizeCanvasGraphs();
}
resize();
window.onresize = resize;
// ======================= END ======================== //
