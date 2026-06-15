/* LM simulator javascript functions    

Created  by Andres Vasquez for AMMRF'S https://www.myscope.training
info@andresvasquez.net  —— https://www.andresvasquez.net ——
copyright:This work is licensed under a Creative Commons Attribution 4.0 International License.

************************************************************************/
var canvas_l = document.querySelector("#canvas-left");
var ctx_l = canvas_l.getContext("2d");
var canvas_r = document.querySelector("#canvas-right");
var ctx_r = canvas_r.getContext("2d");
var canvas_f = document.querySelector("#canvas-float");
var ctx_f = canvas_f.getContext("2d");
var bufferC_LM_01 = document.createElement("canvas");
var bufferCtx_LM_01 = bufferC_LM_01.getContext("2d");
var bufferC_LM_02 = document.createElement("canvas");
var bufferCtx_LM_02 = bufferC_LM_02.getContext("2d");
var lightPath = document.getElementById("svg-dd-sample");
var conf_lightPath = document.getElementById("conf-svg");
var diaphragm = document.getElementById("diaphragm");
var diaphragm_penta = document.getElementById("diaphragm-penta");
var diaphg_fx = document.getElementById("diaphg-blur");
var z_vid = document.getElementById("zstacks-video");
// ======================= preload sets vars ======================== //
var promise_fullfilled_num = 0;
var promises_total = 100;
var sprites = [];
// =======================  END END  ==================== //
var diaphg_scale = 0;
var diaphg_blur = 0;
var diaphg_x = 100;
var diaphg_y = -100;
var uncentered_diaphg_x = -5;
var uncentered_diaphg_y = -5;
var _w;
var LUT_bool = false;
var rgb_filter = "RFP";
var rgb_sprite10x = 6;
var rgb_sprite40x = 21;
var rgb_sprite10x_lut = 7;
var rgb_sprite40x_lut = 25;

var w_h = 512;
var displayed_img;
var displayed_img_r;
var displayed_img_f;
var idata = ctx_l.createImageData(w_h, w_h);
var tvCounter = 2;
var fRate = 6;
var rasterEffect;
var rasterEffect_r;
var rasterEffect_f;
var rasterZoomEffect;
var parrays_bool = false;
var save_w_h = 1024;

canvas_l.width = w_h;
canvas_l.height = w_h;
canvas_r.width = w_h;
canvas_r.height = w_h;
canvas_f.width = w_h;
canvas_f.height = w_h;
ctx_l.imageSmoothingEnabled = false;
ctx_r.imageSmoothingEnabled = false;
ctx_f.imageSmoothingEnabled = false;
// =======================  END END  ==================== //
// ======================= START ======================== //
// =======================  END END  ==================== //

// ======================= START ======================== //
for (let i = 0; i <= promises_total; i++) {
    sprites[i] = new Array();
}

const do_when_done = (max, str_id, images_arr) => {
    promise_fullfilled_num++;
    for (let i = 1; i <= max; i++) {
        images_arr[i - 1] = document.getElementById(`${str_id}_${i}`);
    }
    switch (promise_fullfilled_num) {
        case 1:
            Loader.js("js/light_paths.js");
            i_promise_file(8, `images/simulator/LM/micrographs/10x_kidney_exposure_`, `bf_set02`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 2:
            i_promise_file(4, `images/simulator/LM/micrographs/10x_kidney_LUT_`, `bf_set03`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 3:
            i_promise_file(9, `images/simulator/LM/micrographs/40x_kidney_`, `bf_40xset01`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 4:
            i_promise_file(12, `images/simulator/LM/micrographs/40x_kidney_exposure_`, `bf_40xset02`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 5:
            i_promise_file(5, `images/simulator/LM/micrographs/40x_kidney_LUT_`, `bf_40xset03`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 6:
            i_promise_file(13, `images/simulator/LM/micrographs/10x_rfp_`, `RFP_10x`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 7:
            i_promise_file(13, `images/simulator/LM/micrographs/10x_rfp_LUT_`, `RFP_10x_lut`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 8:
            i_promise_file(11, `images/simulator/LM/micrographs/40x_rfp_`, `RFP_40x`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 9:
            i_promise_file(11, `images/simulator/LM/micrographs/40x_rfp_LUT_`, `RFP_40x_lut`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 10:
            i_promise_file(22, `images/simulator/LM/micrographs/confocal_`, `visualising`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 11:
            i_promise_file(40, `images/simulator/LM/micrographs/objective_`, `objective_img`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 12:
            i_promise_file(5, `images/simulator/LM/micrographs/pinhole_`, `pinhole_img`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 13:
            i_promise_file(3, `images/simulator/LM/micrographs/pixeldwell_`, `pixeldwell_img`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 14:
            i_promise_file(5, `images/simulator/LM/micrographs/pixelarrays_`, `pixelarrays_img`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 15:
            i_promise_file(8, `images/simulator/LM/micrographs/multichannel_`, `multichannel_img`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 16:
            i_promise_file(20, `images/simulator/LM/micrographs/zstacks_`, `zstacks_img`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 17:
            i_promise_file(20, `images/simulator/LM/micrographs/zstacks_LUT_`, `zstacks_LUT_img`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 18:
            i_promise_file(13, `images/simulator/LM/micrographs/10x_gfp_`, `GFP_10x`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 19:
            i_promise_file(13, `images/simulator/LM/micrographs/10x_dapi_`, `DAPI_10x`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 20:
            i_promise_file(11, `images/simulator/LM/micrographs/40x_gfp_`, `GFP_40x`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 21:
            i_promise_file(11, `images/simulator/LM/micrographs/40x_dapi_`, `DAPI_40x`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 22:
            i_promise_file(13, `images/simulator/LM/micrographs/10x_gfp_LUT_`, `GFP_10x_lut`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 23:
            i_promise_file(13, `images/simulator/LM/micrographs/10x_dapi_LUT_`, `DAPI_10x_lut`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 24:
            i_promise_file(11, `images/simulator/LM/micrographs/40x_gfp_LUT_`, `GFP_40x_lut`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 25:
            i_promise_file(11, `images/simulator/LM/micrographs/40x_dapi_LUT_`, `DAPI_40x_lut`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 26:
            i_promise_file(6, `images/simulator/LM/micrographs/confocal/conf_common_`, `conf_common`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 27:
            i_promise_file(7, `images/simulator/LM/micrographs/confocal/visualising_1_`, `visualising_1`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 28:
            i_promise_file(9, `images/simulator/LM/micrographs/confocal/visualising_2_`, `visualising_2`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 29:
            i_promise_file(7, `images/simulator/LM/micrographs/confocal/visualising_3_`, `visualising_3`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 30:
            i_promise_file(20, `images/simulator/LM/micrographs/confocal/objective_1_`, `objective_1`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 31:
            i_promise_file(9, `images/simulator/LM/micrographs/confocal/objective_2_`, `objective_2`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 32:
            i_promise_file(12, `images/simulator/LM/micrographs/confocal/objective_3_`, `objective_3`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 33:
            i_promise_file(13, `images/simulator/LM/micrographs/confocal/objective_4_`, `objective_4`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 34:
            i_promise_file(6, `images/simulator/LM/micrographs/confocal/pinhole_1_`, `pinhole_1`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 35:
            i_promise_file(6, `images/simulator/LM/micrographs/confocal/dwell_1_`, `dwell_1`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 36:
            i_promise_file(7, `/static/simulator/lm_simulator/images/simulator/LM/micrographs/confocal/parrays_1_`, `parrays_1`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 37:
            i_promise_file(8, `/static/simulator/lm_simulator/images/simulator/LM/micrographs/confocal/mchannel_1_`, `mchannel_1`, sprites[promise_fullfilled_num], "jpg");
            Loader.mp4("/static/simulator/lm_simulator/images/simulator/LM/micrographs/confocal/zstack_1.mp4", "zstack_video_1");
            Loader.mp4("/static/simulator/lm_simulator/images/simulator/LM/micrographs/confocal/zstack_2.mp4", "zstack_video_2");
            Loader.mp4("/static/simulator/lm_simulator/images/simulator/LM/micrographs/confocal/zstack_3.mp4", "zstack_video_3");
            break;
        case 38:
            i_promise_file(210, `images/simulator/LM/micrographs/confocal/zstack_1/zstack_1_`, `zstack_1`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 39:
            i_promise_file(31, `images/simulator/LM/micrographs/confocal/zstack_2/zstack_2_`, `zstack_2`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 40:
            i_promise_file(31, `images/simulator/LM/micrographs/confocal/zstack_3/zstack_3_`, `zstack_3`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 41:
            i_promise_file(31, `images/simulator/LM/micrographs/confocal/zstack_4/zstack_4_`, `zstack_4`, sprites[promise_fullfilled_num], "jpg");
            break;
        case 42:
            lightPath.innerHTML = bf_lightpath;
            dragPattern("sample", "649 745", next_step);
            conf_lightPath.innerHTML = confocal_lightpath;
            $("#modal-loading").toggleClass("totally-hidden", true);
            $("#top-bar").toggleClass("modal-is-open", false);
            $("#simulator-base").toggleClass("modal-is-open", false);
            console.log("sigue prometiendo");
            break;

        default:
    }
}

// ======================= START ======================== //
const i_promise_file = (max, path_str, id_str, arr, extension) => {
    let data_promises = [];
    for (let i = 1; i <= max; i++) {
        var promise = Loader.jpg(`${path_str}${i}.${extension}`, `${id_str}_${i}`);
        data_promises.push(promise);
    }
    Promise.all(data_promises).then(messages => {
        do_when_done(max, id_str, arr);
    }).catch(error => {
        console.error("Rejected!", error);
    });
}
// =======================  END END  ==================== //

i_promise_file(12, `images/simulator/LM/micrographs/10x_kidney_`, `bf_set01`, sprites[promise_fullfilled_num], "jpg");
// =======================  END END  ==================== //

// ======================= START ======================== //
const bufferSizes = () => {
    bufferC_LM_01.width = canvas_l.width;
    bufferC_LM_01.height = canvas_l.height;
    bufferC_LM_02.width = canvas_r.width;
    bufferC_LM_02.height = canvas_r.height;
}
bufferSizes();
// =======================  END END  ==================== //
// ======================= START LIGHT PATH DIAGRAM ======================== //
//lightPath.innerHTML = bf_lightpath;
//lightPath.innerHTML = fluorescence_lightpath;

// =======================  END END  ==================== //

// ======================= START INSTRUCTIONS ======================== //
const display_instruction = () => {
    instruct_text = LFM_step_num + '. ' + eval('instruction_step_' + LFM_step_num);
    //    instruct_text = eval('instruction_step_' + LFM_step_num);
    if (LFM_step_num < 38) {
        $("#bf-instructions-txt").fadeTo(100, 0, function () {
            $("#bf-instructions-txt").html(instruct_text);
            $("#instructions-modal").toggleClass("totally-hidden", true);
            $("#bf-instructions-txt").fadeTo(1000, 1);
        });
    } else {
        $("#confocal-instructions-txt").fadeTo(100, 0, function () {
            $("#confocal-instructions-txt").html(instruct_text);
            $("#instructions-modal").toggleClass("totally-hidden", false);
            $("#confocal-instructions-txt").fadeTo(1000, 1);
        });
    }
};
// =======================  END END  ==================== //

// ======================= START ======================== //
next_step();
// =======================  END END  ==================== //

// ======================= START ======================== //
const console_log = () => {
    console.log("CONSOLE_LOG FUN");
}
// ======================= END ======================== //
// ======================= START CHANGE MODE ======================== //
const modeCheck = (thisCheckbox) => {
    $('#bf-mid-img').removeAttr('src');
    let goNext;
    thisCheckbox.checked ? goNext = true : goNext = false;
    if (goNext) {
        $(".mode-available").prop("checked", false);
        $(".mode-available").css('cursor', 'pointer');
        switch (thisCheckbox.id) {
            case "bf-checkbox-up":
            case "bf-checkbox-dw":
                if (LFM_step_num === 2 && window.LFM_BENCHMARK_API && typeof window.LFM_BENCHMARK_API.markSubtaskSuccess === "function") {
                    window.LFM_BENCHMARK_API.markSubtaskSuccess("L2");
                }
                set_microimgs_fun(0, 7, "#bf_set01_1");
                $("#bf-focus1").slider("option", "max", 60);
                diaphg_fx.setAttribute("stdDeviation", 1.5);
                LFM_step_num = 3;
                diapragm_pos_fn(90, -110, 10);
                $("#fluograph-modal").toggleClass("totally-hidden", true);
                $("#conf-svg-modal").toggleClass("totally-hidden", true);
                $(".bf-checkbox").prop("checked", true);
                $(".bf-checkbox").css("cursor", "not-allowed");
                $("#exposure-to").html("8ms");
                break;
            case "fluo-checkbox-up":
            case "fluo-checkbox-dw":
                LFM_step_num = 25;
                diapragm_pos_fn(-5, -5, 13.0);
                $(".fluo-checkbox").prop("checked", true);
                $(".fluo-checkbox").css("cursor", "not-allowed");
                $("#conf-svg-modal").toggleClass("totally-hidden", true);
                $("#exposure-to").html("3500ms");
                break;
            case "conf-checkbox-up":
            case "conf-checkbox-dw":
            case "conf-checkbox-01":
                reset_confocal();
                LFM_step_num = 38;
                $(".conf-checkbox").prop("checked", true);
                $(".conf-checkbox").css("cursor", "not-allowed");
                $("#conf-checkbox-01").prop("checked", true);
                $("#conf-checkbox-01").css("cursor", "not-allowed");
                break;
            case "conf-checkbox-02":
                if (LFM_step_num != 52) {
                    reset_confocal();
                    jumpto_objective();
                };
                LFM_step_num = 52;
                jumpto_objective();
                $(".conf-checkbox").prop("checked", true);
                $(".conf-checkbox").css("cursor", "not-allowed");
                break;
            case "conf-checkbox-03":
                if (LFM_step_num != 65) {
                    reset_confocal();
                    jumpto_pinhole();
                };
                LFM_step_num = 65;
                jumpto_pinhole();
                $(".conf-checkbox").prop("checked", true);
                $(".conf-checkbox").css("cursor", "not-allowed");
                break;
            case "conf-checkbox-04":
                if (LFM_step_num != 75) {
                    reset_confocal();
                    jumpto_dwell();
                };
                LFM_step_num = 75;
                jumpto_dwell();
                $(".conf-checkbox").prop("checked", true);
                $(".conf-checkbox").css("cursor", "not-allowed");
                break;
            case "conf-checkbox-05":
                if (LFM_step_num != 87) {
                    reset_confocal();
                    jumpto_parrays();
                };
                LFM_step_num = 87;
                jumpto_parrays();
                $(".conf-checkbox").prop("checked", true);
                $(".conf-checkbox").css("cursor", "not-allowed");
                break;
            case "conf-checkbox-06":
                if (LFM_step_num != 92) {
                    reset_confocal();
                    jumpto_multichannel();
                };
                LFM_step_num = 92;
                jumpto_multichannel();
                $(".conf-checkbox").prop("checked", true);
                $(".conf-checkbox").css("cursor", "not-allowed");
                break;
            case "conf-checkbox-07":
                if (LFM_step_num != 107) {
                    reset_confocal();
                    jumpto_zstack();
                };
                LFM_step_num = 107;
                jumpto_zstack();
                $(".conf-checkbox").prop("checked", true);
                $(".conf-checkbox").css("cursor", "not-allowed");
                break;
        }
    }
    $("#" + thisCheckbox.id).prop("checked", true);
    $("#" + thisCheckbox.id).css('cursor', 'not-allowed');
    if (goNext) next_step();
};
// =======================  END END  ==================== //
// ======================= START INITIALISE JQUERYUI CONTROLLERS ======================== //

const obj_gain_fun = (ui_value, min, max, sprite_parent, sprite, label, label_id) => {
    if (ui_value >= min && ui_value <= max) {
        displayed_img = sprites[sprite_parent][sprite];
        $(`#${label_id} .ui-slider-handle`).text(label)
    } else {
        return
    }
}

$(function () {
    // ======================= START SLIDERS CHANNEL 1 ======================== //
    $("#bf-focus1").slider({
        range: "min",
        min: 0,
        max: 60,
        value: 0,
        animate: true,
        slide: function (event, ui) {
            let current_focus = Math.floor(ui.value / 10);
            $imgsrc = $("#bf-microimgs img").eq(current_focus).attr('src');
            $('#bf-mid-img').attr('src', $imgsrc);
            $("#bf-microimgs img").removeClass("bf-visible");
            $("#bf-microimgs img").eq(current_focus).addClass("bf-visible");
        },
        stop: function (event, ui) {
            if ((ui.value >= 40 && ui.value <= 45) && (LFM_step_num == 6 || LFM_step_num == 21)) {
                if (LFM_step_num == 6 && window.LFM_BENCHMARK_API && typeof window.LFM_BENCHMARK_API.markSubtaskSuccess === "function") {
                    window.LFM_BENCHMARK_API.markSubtaskSuccess("L4");
                }
                deactivate_slider("#bf-focus1");
                next_step();
            } else {
                $("#bf-instructions-txt").html(instruct_text + "<br><br><br><b>You can do better. Try again.</b>");
            }
        },
        disabled: true
    });
    $("#bf-fdiaphragm").slider({
        range: "min",
        min: 0,
        max: 100,
        value: 30,
        animate: true,
        slide: function (event, ui) {
            switch (LFM_step_num) {
                case 7:
                    diaphg_scale = scroll_equation(ui.value, 0, 100, 14.0, 2.0);
                    diaphg_blur = scroll_equation(ui.value, 0, 100, 1.5, 2.5);
                    diaphg_fx.setAttribute("stdDeviation", diaphg_blur);
                    diapragm_pos_fn(diaphg_x, diaphg_y, diaphg_scale);
                    break;
                case 10:
                    diaphg_scale = scroll_equation(ui.value, 0, 100, 14.0, 2.0);
                    diaphg_x = scroll_equation(ui.value, 0, 100, -5, uncentered_diaphg_x);
                    diaphg_y = scroll_equation(ui.value, 0, 100, -5, uncentered_diaphg_y);
                    diapragm_pos_fn(diaphg_x, diaphg_y, diaphg_scale);
                    break;
            }
        },
        stop: function (event, ui) {
            if (LFM_step_num == 7 && ui.value == 100) {
                if (window.LFM_BENCHMARK_API && typeof window.LFM_BENCHMARK_API.markSubtaskSuccess === "function") {
                    window.LFM_BENCHMARK_API.markSubtaskSuccess("L5");
                }
                deactivate_slider("#bf-fdiaphragm");
                next_step();
            } else if (LFM_step_num == 10 && diaphg_scale > 12.8) {
                if (window.LFM_BENCHMARK_API && typeof window.LFM_BENCHMARK_API.markSubtaskSuccess === "function") {
                    window.LFM_BENCHMARK_API.markSubtaskSuccess("L8");
                }
                deactivate_slider("#bf-fdiaphragm");
                next_step();
            }
        },
        disabled: true
    });
    $("#bf-moveslide").slider({
        range: "min",
        min: 0,
        max: 100,
        value: 100,
        animate: true,
        slide: function (event, ui) {
            let move_slide_X = scroll_equation(ui.value, 0, 100, _w * -1, 0);
            $("#bf-wh-balance").css({
                transform: 'translateX(' + move_slide_X + 'px)'
            });
        },
        start: function (event, ui) {
            _w = $("#bf-microimgs").width();
        },
        stop: function (event, ui) {
            if ((ui.value <= 4 && LFM_step_num == 14) || (ui.value >= 99 && LFM_step_num == 17)) {
                if (LFM_step_num == 17 && window.LFM_BENCHMARK_API && typeof window.LFM_BENCHMARK_API.markSubtaskSuccess === "function") {
                    window.LFM_BENCHMARK_API.markSubtaskSuccess("L10");
                }
                deactivate_slider("#bf-moveslide");
                next_step();
            }
        },
        disabled: true
    });
    $("#bf-lintensity").slider({
        range: "min",
        min: 0,
        max: 100,
        value: 0,
        animate: true,
        slide: function (event, ui) {},
        stop: function (event, ui) {},
        disabled: true
    });
    $("#bf-cfocus").slider({
        range: "min",
        min: 0,
        max: 100,
        value: 0,
        animate: true,
        slide: function (event, ui) {
            if (ui.value <= 82) {
                diaphg_blur = scroll_equation(ui.value, 0, 82, 2.5, 1.0);
            } else if (ui.value >= 87) {
                diaphg_blur = scroll_equation(ui.value, 87, 100, 0.9, 2.0);
            } else {
                diaphg_blur = 0;
            }
            diaphg_fx.setAttribute("stdDeviation", diaphg_blur);
        },
        stop: function (event, ui) {
            if (ui.value > 82 && ui.value < 86) {
                if (window.LFM_BENCHMARK_API && typeof window.LFM_BENCHMARK_API.markSubtaskSuccess === "function") {
                    window.LFM_BENCHMARK_API.markSubtaskSuccess("L6");
                }
                deactivate_slider("#bf-cfocus");
                next_step();
            }
        },
        disabled: true
    });
    $("#bf-caperture").slider({
        range: "min",
        min: 0,
        max: 100,
        value: 77,
        animate: true,
        slide: function (event, ui) {
            diaphg_scale = scroll_equation(ui.value, 0, 100, 14.0, 2.0);
            diapragm_pos_fn(diaphg_x, diaphg_y, diaphg_scale);
        },
        stop: function (event, ui) {
            if (diaphg_scale < 10 && diaphg_scale > 9.4) { //optimal is 2.10
                if (window.LFM_BENCHMARK_API && typeof window.LFM_BENCHMARK_API.markSubtaskSuccess === "function") {
                    window.LFM_BENCHMARK_API.markSubtaskSuccess("L9");
                }
                deactivate_slider("#bf-caperture");
                next_step();
            }
        },
        disabled: true
    });
    $("#bf-cond-lintensity").slider({
        range: "min",
        min: 0,
        max: 100,
        value: 0,
        animate: true,
        slide: function (event, ui) {},
        stop: function (event, ui) {},
        disabled: true
    });
    $("#exposure").slider({
        range: "min",
        min: 0,
        max: 7,
        value: 2,
        animate: true,
        slide: function (event, ui) {
            $imgsrc = $("#bf-microimgs img").eq(ui.value).attr('src');
            $('#bf-mid-img').attr('src', $imgsrc);
            $("#bf-microimgs img").removeClass("bf-visible");
            $("#bf-microimgs img").eq(ui.value).addClass("bf-visible");


            if (LFM_step_num > 26) {
                $imgsrc_lut = $("#lut-imgs img").eq(ui.value).attr('src');
                $('#lut-bck-img').attr('src', $imgsrc_lut);
                $("#lut-imgs img").removeClass("bf-visible");
                $("#lut-imgs img").eq(ui.value).addClass("bf-visible");
            }
            if ((LFM_step_num == 18) || (LFM_step_num == 19) || (LFM_step_num == 20)) bf_exposure_10x_fun(ui.value);
            if ((LFM_step_num == 23) || (LFM_step_num == 24) || (LFM_step_num == 25)) bf_exposure_40x_fun(ui.value);
        },
        start: function (event, ui) {
            if (LFM_step_num == 18 || LFM_step_num == 23 || LFM_step_num == 29 || LFM_step_num == 34) {
                if (LFM_step_num == 18 && window.LFM_BENCHMARK_API && typeof window.LFM_BENCHMARK_API.markSubtaskSuccess === "function") {
                    window.LFM_BENCHMARK_API.markSubtaskSuccess("L11");
                }
                activate_sqr_btn("#lut-btn");
                next_step();
            } else if ((LFM_step_num == 19 || LFM_step_num == 24 || LFM_step_num == 30 || LFM_step_num == 36) && LUT_bool) {
                activate_sqr_btn("#bf-capture-btn");
            }
        },
        disabled: true
    });
    // ======================= START SLIDERS CHANNEL 2 ======================== //
    $("#laser2").slider({
        orientation: "vertical",
        range: "max",
        min: 0,
        max: 100,
        step: 5,
        value: 0,
        animate: true,
        create: function (event, ui) {},
        slide: function (event, ui) {
            let handle = $("#laser2 .ui-slider-handle");
            handle.text(`${ui.value}%`);
        },
        stop: function (event, ui) {},
        disabled: true
    });
    $("#gain2").slider({
        orientation: "vertical",
        range: "max",
        min: 0,
        max: 69,
        step: 5,
        value: 0,
        animate: true,
        create: function (event, ui) {},
        slide: function (event, ui) {
            let handle = $("#gain2 .ui-slider-handle");
            handle.text(`${ui.value}%`);
        },
        stop: function (event, ui) {},
        disabled: true
    });
    $("#offset2").slider({
        orientation: "vertical",
        range: "max",
        min: -40,
        max: 40,
        value: 0,
        animate: true,
        create: function (event, ui) {},
        slide: function (event, ui) {
            let handle = $("#offset2 .ui-slider-handle");
            handle.text(ui.value);
        },
        stop: function (event, ui) {},
        disabled: true
    });
    // =======================  END SLIDERS CHANNEL 2 END  ==================== //
    // ======================= START SLIDERS CHANNEL 3 ======================== //
    $("#laser3").slider({
        orientation: "vertical",
        range: "max",
        min: 0,
        max: 100,
        step: 1,
        value: 0,
        animate: true,
        slide: function (event, ui) {
            if (ui.value > 80 && ui.value <= 100) {
                return false;
            }
            let handle = $("#laser3 .ui-slider-handle");
            if (LFM_step_num == 42 || LFM_step_num == 48) {
                switch (ui.value) {
                    case 2:
                    case 5:
                    case 7:
                    case 10:
                    case 20:
                    case 40:
                    case 60:
                    case 80:
                        handle.text(`${ui.value}%`);
                        break;
                    default:
                        handle.text("");
                }
            }
            if (LFM_step_num == 48) {
                switch (ui.value) {
                    case 0:
                        displayed_img = sprites[28][0];
                        break;
                    case 2:
                        displayed_img = sprites[28][1];
                        break;
                    case 5:
                        displayed_img = sprites[28][2];
                        break;
                    case 7:
                        displayed_img = sprites[28][3];
                        break;
                    case 10:
                        displayed_img = sprites[28][4];
                        break;
                    case 20:
                        displayed_img = sprites[28][5];
                        break;
                    case 40:
                        displayed_img = sprites[28][6];
                        break;
                    case 60:
                        displayed_img = sprites[28][7];
                        break;
                    case 80:
                        displayed_img = sprites[28][8];
                        break;
                }
            }
            if (LFM_step_num == 61) {
                obj_gain_fun(ui.value, 0, 0, 32, 0, "", "laser3");
                obj_gain_fun(ui.value, 1, 4, 32, 1, "1%", "laser3");
                obj_gain_fun(ui.value, 5, 9, 32, 2, "5%", "laser3");
                obj_gain_fun(ui.value, 10, 14, 32, 3, "10%", "laser3");
                obj_gain_fun(ui.value, 15, 19, 32, 4, "15%", "laser3");
                obj_gain_fun(ui.value, 20, 29, 32, 5, "20%", "laser3");
                obj_gain_fun(ui.value, 30, 39, 32, 6, "30%", "laser3");
                obj_gain_fun(ui.value, 40, 49, 32, 7, "40%", "laser3");
                obj_gain_fun(ui.value, 50, 59, 32, 8, "50%", "laser3");
                obj_gain_fun(ui.value, 60, 69, 32, 9, "60%", "laser3");
                obj_gain_fun(ui.value, 70, 79, 32, 10, "70%", "laser3");
                obj_gain_fun(ui.value, 80, 100, 32, 11, "80%", "laser3");
            }
        },
        stop: function (event, ui) {
            if (LFM_step_num == 42 || LFM_step_num == 48) {
                if (ui.value == 5) next_step();
            }
            if (LFM_step_num == 61 && (ui.value >= 20 && ui.value <= 29)) next_step();

        }
    });

    $("#laser3").slider("pips", {
        rest: "label",
        suffix: "%",
        step: 20
    });
    $("#laser3").slider("disable");


    $("#gain3").slider({
        orientation: "vertical",
        range: "max",
        min: 0,
        max: 69,
        step: 1,
        value: 0,
        animate: true,
        slide: function (event, ui) {
            let handle = $("#gain3 .ui-slider-handle");
            let sprite_vis_gain = Math.floor(ui.value / 10);
            let val_vis_gain = (sprite_vis_gain * 10) + 20;
            if (LFM_step_num == 41) handle.text(`${val_vis_gain}V`);
            if (LFM_step_num == 47) {
                displayed_img = sprites[27][sprite_vis_gain];
                handle.text(`${val_vis_gain}V`);
            }
            if (LFM_step_num == 60) {
                obj_gain_fun(ui.value, 0, 10, 31, 0, "20V", "gain3");
                obj_gain_fun(ui.value, 11, 20, 31, 1, "30V", "gain3");
                obj_gain_fun(ui.value, 21, 28, 31, 2, "40V", "gain3");
                obj_gain_fun(ui.value, 29, 35, 31, 3, "48V", "gain3");
                obj_gain_fun(ui.value, 36, 40, 31, 4, "55V", "gain3");
                obj_gain_fun(ui.value, 41, 48, 31, 5, "60V", "gain3");
                obj_gain_fun(ui.value, 49, 54, 31, 6, "68V", "gain3");
                obj_gain_fun(ui.value, 55, 60, 31, 7, "74V", "gain3");
                obj_gain_fun(ui.value, 61, 69, 31, 8, "80V", "gain3");
            }
        },
        stop: function (event, ui) {
            let val_vis_gain = (Math.floor(ui.value / 10) * 10) + 20;
            if (LFM_step_num == 41 && val_vis_gain == 40) next_step();
            if (LFM_step_num == 47 && val_vis_gain == 50) next_step();
            if (LFM_step_num == 60 && (ui.value >= 41 && ui.value <= 48)) next_step();
        },
        disabled: true
    });
    $("#offset3").slider({
        orientation: "vertical",
        range: "max",
        min: -60,
        max: 60,
        value: 0,
        animate: true,
        slide: function (event, ui) {
            let handle = $("#offset3 .ui-slider-handle");
            if (LFM_step_num == 49) {
                if ((ui.value > 40 && ui.value <= 60) || (ui.value < -40 && ui.value >= -60)) {
                    return false;
                }
                switch (ui.value) {
                    case 40:
                        handle.text(ui.value);
                        displayed_img = sprites[29][0];
                        break;
                    case 10:
                        handle.text(ui.value);
                        displayed_img = sprites[29][1];
                        break;
                    case 5:
                        handle.text(ui.value);
                        displayed_img = sprites[29][2];
                        break;
                    case 0:
                        handle.text(ui.value);
                        displayed_img = sprites[29][3];
                        break;
                    case -5:
                        handle.text(ui.value);
                        displayed_img = sprites[29][4];
                        break;
                    case -10:
                        handle.text(ui.value);
                        displayed_img = sprites[29][5];
                        break;
                    case -40:
                        handle.text(ui.value);
                        displayed_img = sprites[29][6];
                        break;
                    default:
                        handle.text("");
                }
            }

            if (LFM_step_num == 62) {
                obj_gain_fun(ui.value, -65, -56, 33, 12, "-60", "offset3");
                obj_gain_fun(ui.value, -55, -46, 33, 11, "-50", "offset3");
                obj_gain_fun(ui.value, -45, -36, 33, 10, "-40", "offset3");
                obj_gain_fun(ui.value, -35, -26, 33, 9, "-30", "offset3");
                obj_gain_fun(ui.value, -25, -16, 33, 8, "-20", "offset3");
                obj_gain_fun(ui.value, -15, -6, 33, 7, "-10", "offset3");
                obj_gain_fun(ui.value, -5, 5, 33, 6, "0", "offset3");
                obj_gain_fun(ui.value, 6, 15, 33, 5, "10", "offset3");
                obj_gain_fun(ui.value, 16, 25, 33, 4, "20", "offset3");
                obj_gain_fun(ui.value, 26, 35, 33, 3, "30", "offset3");
                obj_gain_fun(ui.value, 36, 45, 33, 2, "40", "offset3");
                obj_gain_fun(ui.value, 46, 55, 33, 1, "50", "offset3");
                obj_gain_fun(ui.value, 56, 65, 33, 0, "60", "offset3");
            }
        },
        stop: function (event, ui) {
            if ((LFM_step_num == 49) && (ui.value > (-5) && ui.value < 5)) next_step();
            if ((LFM_step_num == 62) && (ui.value >= 6 && ui.value <= 15)) next_step();
        },
        disabled: true
    });
    // =======================  END SLIDERS CHANNEL 3 END  ==================== //
    // ======================= START SLIDERS CHANNEL 4 ======================== //
    $("#laser4").slider({
        orientation: "vertical",
        range: "max",
        min: 0,
        max: 100,
        step: 5,
        value: 0,
        animate: true,
        slide: function (event, ui) {
            let handle = $("#laser1 .ui-slider-handle");
            handle.text(`${ui.value}%`);
        },
        stop: function (event, ui) {},
        disabled: true
    });
    $("#gain4").slider({
        orientation: "vertical",
        range: "max",
        min: 0,
        max: 69,
        step: 5,
        value: 0,
        animate: true,
        slide: function (event, ui) {
            let handle = $("#gain1 .ui-slider-handle");
            handle.text(`${ui.value}%`);
        },
        stop: function (event, ui) {},
        disabled: true
    });
    $("#offset4").slider({
        orientation: "vertical",
        range: "max",
        min: -40,
        max: 40,
        value: 0,
        animate: true,
        slide: function (event, ui) {
            let handle = $("#offset1 .ui-slider-handle");
            handle.text(ui.value);
        },
        stop: function (event, ui) {},
        disabled: true
    });
    // =======================  END SLIDERS CHANNEL 4 END  ==================== //
    $("#zpos").slider({
        orientation: "vertical",
        range: "max",
        min: 0,
        max: 99,
        value: 50,
        step: 1,
        animate: true,
        slide: function (event, ui) {
            let max_zpos = $("#zpos").slider("option", "max");
            let spt = scroll_equation(ui.value, 0, max_zpos, max_zpos, 0);
            if (LFM_step_num == 58) {
                let sprite_zpos = Math.floor(spt / 5);
                displayed_img = sprites[30][sprite_zpos];
            }
            if (LFM_step_num == 110) {
                displayed_img = sprites[38][spt];
                if (spt < 1 || spt > 7) {
                    deactivate_sqr_btn("#topz-btn");
                    $("#topz-label").toggleClass("label-disabled", true);
                } else {
                    activate_sqr_btn("#topz-btn");
                    $("#topz-label").toggleClass("label-disabled", false);
                }
            }
            if (LFM_step_num == 109) {
                displayed_img = sprites[38][spt];
                if (spt < 130 || spt > 185) {
                    deactivate_sqr_btn("#bottomz-btn");
                    $("#bottomz-label").toggleClass("label-disabled", true);
                } else {
                    activate_sqr_btn("#bottomz-btn");
                    $("#bottomz-label").toggleClass("label-disabled", false);
                }
            }
            $("#range .stats-value .stat-title").text("126µm");
            $("#range .stats-value .stat-title").css('opacity', '0');
        },
        stop: function (event, ui) {
            let max_zpos = $("#zpos").slider("option", "max");
            let spt = scroll_equation(ui.value, 0, max_zpos, max_zpos, 0);
            let sprite_zpos = Math.floor(spt / 5);
            if (LFM_step_num == 58 && sprite_zpos == 8) next_step();
            if (LFM_step_num == 109 && (spt >= 130 && spt <= 185)) {
                activate_sqr_btn("#bottomz-btn");
                $("#bottomz-label").toggleClass("label-disabled", false);
            }
            if (LFM_step_num == 110 && (spt >= 1 && spt <= 7)) {
                activate_sqr_btn("#topz-btn");
                $("#topz-label").toggleClass("label-disabled", false);
            }
        },
        disabled: true
    });
    $("#videozstacks").slider({
        range: "min",
        min: 0,
        max: 1,
        value: 0,
        step: 0.1,
        animate: true,
        slide: function (event, ui) {
            //            if (LFM_step_num == 58) {
            z_vid.currentTime = ui.value;
            //            }
        },
        stop: function (event, ui) {
            z_vid.currentTime = ui.value;
        }
    });
    $("#zoom").slider({
        range: "min",
        min: 0,
        max: 4,
        value: 0,
        step: 1,
        animate: true,
        slide: function (event, ui) {
            if (LFM_step_num == 92) {
                if (parrays_bool) {
                    if (rasterZoomEffect != undefined) {
                        cancelAnimationFrame(rasterZoomEffect);
                        tvCounter = 2;
                        raster_zoom();
                    }
                } else {
                    if ($("#capture-btn").prop('disabled')) {
                        deactivate_round_btn("#live-btn");
                        activate_round_btn("#live-btn");
                    } else {
                        deactivate_round_btn("#capture-btn");
                    }
                }
            }
        },
        stop: function (event, ui) {},
        disabled: true
    });
    // =======================  END SLIDERS CHANNEL 4 END  ==================== //
    // ======================= START SELECTMENUS ======================== //
    $("#step-size").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "1":
                    step_size_optimal_fn();
                    break;
                case "7":
                    step_size_5_fn();
                    break;
            }
        },
        disabled: true
    });
    $("#slices").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "a":
                    break;
                case "b":
                    break;
            }
        },
        disabled: true
    });
    $("#look-up").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "2":
                    LUT_underover_fn();
                    break;
                case "3":
                    LUT_default_fn();
                    break;
            }
        },
        disabled: true
    });
    $("#objective").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "4":
                    objective_40x075_fn();
                    break;
            }
        },
        disabled: true
    });
    $("#scan-mode").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "1":
                    scan_mode_sim_fn();
                    break;
                case "2":
                    scan_mode_seq_fn();
                    break;
            }
        },
        disabled: true
    });
    $("#image-size").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "1":
                    image_2048_fn();
                    break;
                case "2":
                    image_1024_fn();
                    break;
                case "3":
                    image_512_fn();
                    break;
                case "4":
                    image_256_fn();
                    break;
                case "5":
                    image_128_fn();
                    break;
            }
        },
        disabled: true
    });
    $("#pixel-dwell").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "1":
                    pixel_dwell_2sec_fn();
                    break;
                case "2":
                    pixel_dwell_4sec_fn();
                    break;
                case "4":
                    pixel_dwell_12sec_fn();
                    break;
            }
            $("#fps-txt").html((fRate / 12).toFixed(3));
        },
        disabled: true
    });
    $("#pinhole-size").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "1":
                    pinhole_closed_fn();
                    break;
                case "4":
                    pinhole_1AU_fn();
                    break;
                case "8":
                    pinhole_open_fn();
                    break;
            }
        },
        disabled: true
    });

});
// =======================  END END  ==================== //

// ======================= START ENABLE/DISABLE ======================== //

function reset_all_bf() {
    deactivate_round_btn(".lfm-btn");
    deactivate_sqr_btn(".btn");
    $(".sqr-label").toggleClass("label-disabled", true);
    deactivate_slider(".slider");
    deactivate_condenserPos();
    deactivate_sqr_btn("#bf-back-btn");
    deactivate_sqr_btn("#confocal-back-btn");
    reset_bf_focus();
    $("#bf-cfocus").slider("value", 0);
    $("#bf-caperture").slider("value", 77);
    $("#bf-moveslide").slider("value", 100);
    $("#exposure").slider("option", "max", 7);
    $(".mid-element").toggleClass("totally-hidden", true);
    $("#histogram-modal").toggleClass("totally-hidden", true);
    $("#lut-modal").toggleClass("totally-hidden", true);
    $("#imaging-modal").toggleClass("totally-hidden", true);
    $("#condenser-btn").click();
    LUT_bool = false;
    $("#conf-scenarios-modal").toggleClass("totally-hidden", true);
    rgb_filter = "RFP";
    rgb_sprite10x = 6;
    rgb_sprite40x = 21;
    rgb_sprite10x_lut = 7;
    rgb_sprite40x_lut = 25;
    return
}

var reset_bf_focus = () => {
    deactivate_slider("#bf-focus1");
    $("#bf-focus1").slider("value", 0);
    $("#bf-microimgs img").removeClass("bf-visible");
    $("#bf-microimgs img").eq(0).addClass("bf-visible");
}

var activate_condenserPos = () => {
    $(".cond-pos-div").toggleClass("div-disabled", false);
    $("#cond-pos-label").toggleClass("label-disabled", false);
    $("#condenserleft-div button").prop('disabled', false);
}

var deactivate_condenserPos = () => {
    $(".cond-pos-div").toggleClass("div-disabled", true);
    $("#cond-pos-label").toggleClass("label-disabled", true);
    $("#condenserleft-div button").prop('disabled', true);
}

var activate_round_btn = (dom_name) => {
    $($(dom_name).parent("div")).toggleClass("div-disabled", false);
    $(dom_name).toggleClass("btn-disabled", false);
    if ($(dom_name).hasClass("controls-btn-active") == false) $(dom_name).prop('disabled', false);
}

var deactivate_round_btn = (dom_name) => {
    $($(dom_name).parent("div")).toggleClass("div-disabled", true);
    $(dom_name).toggleClass("btn-disabled", true);
    $(dom_name).toggleClass("controls-btn-active", false);
    $(dom_name).toggleClass("btn-clickable", false);
    $(dom_name).prop('disabled', true);
    $(dom_name).prop('value', "off");
}

var activate_sqr_btn = (dom_name, label_name) => {
    $(dom_name).toggleClass("btn-disabled", false);
    $(dom_name).prop('disabled', false);
    $(label_name).toggleClass("label-disabled", false);
}

var deactivate_sqr_btn = (dom_name, label_name) => {
    $(dom_name).toggleClass("btn-disabled", true);
    $(dom_name).prop('disabled', true);
    $(label_name).toggleClass("label-disabled", true);
    $(dom_name).toggleClass("btn-active", false);
    $(dom_name).prop('disabled', true);
    $(dom_name).prop('value', "off");
}

var activate_slider = (dom_name) => {
    $(dom_name).slider("enable");
    $(dom_name + "-label").toggleClass("label-disabled", false);
}

var deactivate_slider = (dom_name) => {
    $(dom_name).slider("disable");
    $(dom_name + "-label").toggleClass("label-disabled", true);
}

var reset_slider = (dom_name, val = 0) => {
    $(dom_name).slider("value", val);
    let handle = $(`${dom_name} .ui-slider-handle`);
    handle.text("");
}

const deactivate_channel = (id) => {
    let container = document.getElementById(id).querySelectorAll(".slider");
    for (let _id of container) {
        console.log(_id.id);
        $("#" + _id.id).slider("disable");
        $("#" + id).toggleClass("disabled-channel", true);
    }
};

const activate_channel = (id) => {
    let container = document.getElementById(id).querySelectorAll(".slider");
    for (let _id of container) {
        $("#" + _id.id).slider("enable");
        $("#" + id).toggleClass("disabled-channel", false);
    }
};


const totally_deactivate_channel = (id) => {
    let container = document.getElementById(id).querySelectorAll(".slider");
    for (let _id of container) {
        $("#" + _id.id).slider("disable");
        $("#" + id + " .channel-slider").css('opacity', '0.35');
        $("#" + id).toggleClass("disabled-channel", true);
    }
};
const totally_activate_channel = (id) => {
    let container = document.getElementById(id).querySelectorAll(".slider");
    for (let _id of container) {
        $("#" + _id.id).slider("enable");
        $("#" + id + " .channel-slider").css('opacity', '1');
        $("#" + id).toggleClass("disabled-channel", false);
    }
};

var activate_dd = (dom_name) => {
    $(dom_name).selectmenu("enable");
    $(dom_name + "-label").toggleClass("label-disabled", false);
    $(dom_name + "-button").toggleClass("current-control", true);
}

var deactivate_dd = (dom_name) => {
    $(dom_name).selectmenu("disable");
    $(dom_name + "-label").toggleClass("label-disabled", true);
    $(dom_name + "-button").toggleClass("current-control", false);
}

var reset_dd = (dom_name, enabled_option, selected_option = 0) => {
    $(`${dom_name} option`).removeAttr("selected");
    $(`${dom_name} option`).attr("disabled", true);
    $(`${dom_name}>option:eq(${enabled_option})`).attr("disabled", false);
    $(`${dom_name}>option:eq(${selected_option})`).attr("selected", "selected");
    $(`${dom_name}`).val(`${selected_option}`);
    $(`${dom_name}`).selectmenu("refresh");
}
//// =======================  END END  ==================== //

// ======================= START ======================== //
const channelCheck = (thisCheckbox, thisChannel) => {
    let cursor = $("#" + thisCheckbox.id).css('cursor');
    if (cursor == "pointer") {
        if (thisCheckbox.checked) {
            $("#" + thisChannel).toggleClass("disabled-channel", false);
            next_step();
        } else {
            totally_deactivate_channel(thisChannel);
            $("#" + thisCheckbox.id).prop("checked", false);
            $("#" + thisCheckbox.id).prop('disabled', true);
        }
    } else {
        $("#" + thisCheckbox.id).prop("checked", true);
    }
    thisCheckbox.style.cursor = "not-allowed";
};
// =======================  END END  ==================== //
// ======================= START DRAG AND DROP SAMPLE ======================== //
const dragPattern = (id, origin, next_fun) => {
    let bound = "#svg-dd-" + id;
    let drag = "#drag" + id;
    let drop = "#drop" + id;
    let pattern = "#pattern" + id;
    $(bound).toggleClass("totally-hidden", false);
    Draggable.create(drag, {
        bounds: bound,
        onDrag: function () {
            if (this.hitTest(drop)) {
                document.getElementById("dragsample").style.filter = "url(#dragfilter)";
            } else {
                document.getElementById("dragsample").style.filter = "none";
            }
        },
        onDragEnd: function () {
            if (this.hitTest(drop)) {
                document.getElementById("dropsample").style.fill = "cyan";
                $("#dropsample").toggleClass("sample-highlight", true);
                $("#sample-frame").toggleClass("totally-hidden", true);
                gsap.to(drop, {
                    opacity: 0.5
                });
                gsap.to(this.target, {
                    duration: 0.6,
                    opacity: 0,
                    scale: 0.3,
                    svgOrigin: origin,
                    onComplete: next_fun()
                }) //.then(toogle_fn(bound, "totally-hidden", false));
            }
        }
    });
}
//dragPattern("sample", "649 745", next_step);
// ======================= END ======================== //
// ======================= START SQRD BTNS ======================== //
$('.btn').click(function (e) {
    if (e.target.value == "off") {
        e.target.value = "on";
        $("#" + e.target.id).toggleClass("btn-active", true);
    } else {
        e.target.value = "off";
        $("#" + e.target.id).toggleClass("btn-active", false);
    }
    e.target.disabled = true;
    switch (e.target.id) {
        case "10x-btn":
            next_step();
            break;
        case "40x-btn":
            $('#bf-mid-img').removeAttr('src');
            if (LFM_step_num == 20) {
                deactivate_sqr_btn("#10x-btn");
                set_microimgs_fun(3, 8, "#bf_40xset01_9");
                $("#bf-focus1").slider("option", "max", 80);
                $("#bf-focus1").slider("value", 80);
                activate_slider("#bf-focus1");
                $("#histogram-modal").toggleClass("totally-hidden", true);
                $("#imaging-modal").toggleClass("totally-hidden", true);
                $("#exposure").slider("option", "max", 11);
                $("#exposure").slider("value", 9);
                deactivate_sqr_btn("#white-btn");
                deactivate_sqr_btn("#lut-btn");
                deactivate_sqr_btn("#bf-capture-btn");
                deactivate_sqr_btn("#imgsoft-btn");
            }
            if (LFM_step_num == 32) {
                $("#overlay10-modal").toggleClass("totally-hidden", true);
                rgb_sprite40x = 21;
                rgb_sprite40x_lut = 25;
                rgb_filter = "DAPI"
                set_microimgs_fun(rgb_sprite40x, 10, "#" + rgb_filter + "_40x_2");
                set_histogram_fun(rgb_sprite40x_lut, 10, "#" + rgb_filter + "_40x_lut_2");
                $("#exposure").slider("option", "max", 10);
                $("#exposure").slider("value", 1);
                deactivate_sqr_btn("#lut-btn");
                deactivate_sqr_btn("#bf-capture-btn");
            }
            next_step();
            break;
        case "eyepiece-btn":
            $("#eyepiece-btn").toggleClass("btn-active", false);
            if (e.target.value == "off") {
                $("#eyepiece-btn").html("REMOVE");
                replace_eyepiece();
            } else {
                $("#eyepiece-btn").html("REPLACE");
                remove_eyepiece();
            }
            break;
        case "bf-back-btn":
            e.target.disabled = false;
            $("#bf-back-btn").toggleClass("btn-active", false);
            LFM_step_num -= 2;
            go_back();
            next_step();
            break;
        case "imgsoft-btn":
            $("#imaging-modal").toggleClass("totally-hidden", false);
            if (LFM_step_num == 15) {
                $("#exposure").slider("option", "max", 7);
                $("#exposure").slider("value", 2);
            }
            if (LFM_step_num == 22) {
                $("#exposure-to").html("60ms");
                set_microimgs_fun(4, 11, "#bf_40xset02_10");
                $("#exposure").slider("value", 9);
            }
            if (LFM_step_num == 28) {
                activate_slider("#exposure");
                $("#exposure-vals p").toggleClass("label-disabled", false);
            }
            next_step();

            break;
        case "white-btn":
            $('#bf-wh-balance').attr('src', bf_set01_12.src);
            next_step();
            break;
        case "lut-btn":
            activate_slider("#exposure");
            (LFM_step_num < 25) ? $("#histogram-modal").toggleClass("totally-hidden", false): $("#lut-modal").toggleClass("totally-hidden", false);
            if (LFM_step_num == 19) {
                $("#histogram-svg").attr("viewBox", "0 0 2005 1185");

                $("#spectrum-bar-1").toggleClass("totally-hidden", false);
                $("#spectrum-bar-2").toggleClass("totally-hidden", true);
                $("#spectrum-bar-3").toggleClass("totally-hidden", true);

                $("#histogram-bf-10x-frame").toggleClass("totally-hidden", false);
                $("#histogram-bf-40x-frame").toggleClass("totally-hidden", true);
                $("#histogram-fluo-frame").toggleClass("totally-hidden", true);
                $("#bf-microimgs #bf_set02_1").replaceWith(sprites[2][0]);
                $("#bf-microimgs #bf_set02_6").replaceWith(sprites[2][1]);
                $("#bf-microimgs #bf_set02_7").replaceWith(sprites[2][2]);
                $("#bf-microimgs #bf_set02_8").replaceWith(sprites[2][3]);
                $("#bf-microimgs img").removeAttr("style");
                $("#bf-microimgs img").removeClass("bf-visible");
                let visible_child = $("#exposure").slider("option", "value");
                $("#bf-microimgs img:eq(" + visible_child + ")").addClass("bf-visible");
            }
            if (LFM_step_num == 24) {
                $("#histogram-svg").attr("viewBox", "0 0 2005 573");

                $("#spectrum-bar-2").toggleClass("totally-hidden", false);
                $("#spectrum-bar-1").toggleClass("totally-hidden", true);
                $("#spectrum-bar-3").toggleClass("totally-hidden", true);

                $("#histogram-bf-40x-frame").toggleClass("totally-hidden", false);
                $("#histogram-bf-10x-frame").toggleClass("totally-hidden", true);
                $("#histogram-fluo-frame").toggleClass("totally-hidden", true);
                $("#bf-microimgs #bf_40xset02_1").replaceWith(sprites[5][0]);
                $("#bf-microimgs #bf_40xset02_9").replaceWith(sprites[5][1]);
                $("#bf-microimgs #bf_40xset02_10").replaceWith(sprites[5][2]);
                $("#bf-microimgs #bf_40xset02_11").replaceWith(sprites[5][3]);
                $("#bf-microimgs #bf_40xset02_12").replaceWith(sprites[5][4]);
                $("#bf-microimgs img").removeAttr("style");
                $("#bf-microimgs img").removeClass("bf-visible");
                let visible_child = $("#exposure").slider("option", "value");
                $("#bf-microimgs img:eq(" + visible_child + ")").addClass("bf-visible");
            }
            if (LFM_step_num == 30) {
                $("#histogram-svg").attr("viewBox", "-50 -50 2105 620");

                $("#spectrum-bar-3").toggleClass("totally-hidden", false);
                $("#spectrum-bar-1").toggleClass("totally-hidden", true);
                $("#spectrum-bar-2").toggleClass("totally-hidden", true);

                $("#histogram-fluo-frame").toggleClass("totally-hidden", false);
                $("#histogram-bf-40x-frame").toggleClass("totally-hidden", true);
                $("#histogram-bf-10x-frame").toggleClass("totally-hidden", true);
            }
            if ((LFM_step_num == 35) || (LFM_step_num == 36) || (LFM_step_num == 37)) {
                let fluo_40exposure = $("#exposure").slider("value");
                fluo_40exposure += 1;
                set_microimgs_fun(rgb_sprite40x, 10, "#" + rgb_filter + "_40x_" + fluo_40exposure);
                set_histogram_fun(rgb_sprite40x_lut, 10, "#" + rgb_filter + "_40x_lut_" + fluo_40exposure);
            }
            if (LFM_step_num == 35) next_step();
            activate_sqr_btn("#bf-capture-btn");
            LUT_bool = true;
            break;
        case "bf-capture-btn":
            saveIMG('image from the LFM simulator.jpg');
            deactivate_sqr_btn("#bf-capture-btn");
            activate_sqr_btn("#bf-capture-btn");
            if (LFM_step_num == 19 || LFM_step_num == 24 || LFM_step_num == 30 || LFM_step_num == 36) {
                if (LFM_step_num == 19 && window.LFM_BENCHMARK_API && typeof window.LFM_BENCHMARK_API.markSubtaskSuccess === "function") {
                    window.LFM_BENCHMARK_API.markSubtaskSuccess("L12");
                }
                next_step();
            }
            break;
        case "fluograph-btn":
            $("#fluograph-modal").toggleClass("totally-hidden", true);
            deactivate_sqr_btn("#fluograph-btn");
            activate_sqr_btn("#fluograph-btn");
            next_step();
            break;
        case "bottomz-btn":
            $("#bottomz-label").css('opacity', '0');
            next_step();
            break;
        case "topz-btn":
            $("#topz-label").css('opacity', '0');
            $("#range .stats-value .stat-title").css('opacity', '1');
            $("#range").toggleClass("stats-disabled", false);
            next_step();
            break;
        case "activities-btn":
            $("#conf-scenarios-modal").toggleClass("totally-hidden", false);
            break;
        case "lp-btn":
            $("#conf-svg-modal").toggleClass("totally-hidden", false);
            break;
        case "10rfp-btn":
            $("#overlay10-top-l").toggleClass("not-visible", false);
            break;
        case "10gfp-btn":
            $("#overlay10-top-r").toggleClass("not-visible", false);
            break;
        case "10dapi-btn":
            $("#overlay10-bottom-l").toggleClass("not-visible", false);
            break;
        case "10overlay-btn":
            $("#overlay10-bottom-r").toggleClass("not-visible", false);
            break;
        case "40rfp-btn":
            $("#overlay40-top-l").toggleClass("not-visible", false);
            break;
        case "40gfp-btn":
            $("#overlay40-top-r").toggleClass("not-visible", false);
            break;
        case "40dapi-btn":
            $("#overlay40-bottom-l").toggleClass("not-visible", false);
            break;
        case "40overlay-btn":
            $("#overlay40-bottom-r").toggleClass("not-visible", false);
            break;
        case "confocal-back-btn":
            e.target.disabled = false;
            $("#confocal-back-btn").toggleClass("btn-active", false);
            LFM_step_num -= 2;
            go_back();
            next_step();
            break;
        default:
            //        code block
    }
});
// ======================= END ======================== //
// ======================= START ROUND BTNS ======================== //
$('.lfm-btn').click(function (e) {
    e.preventDefault();
    switch (e.target.id) {
        case "halogen-btn":
            if (window.LFM_BENCHMARK_API && typeof window.LFM_BENCHMARK_API.markSubtaskSuccess === "function") {
                window.LFM_BENCHMARK_API.markSubtaskSuccess("L3");
            }
            LFM_step_num = 4;
            next_step();
            break;
        case "mercury-btn":
            $("#exposure").slider("option", "max", 12);
            $("#exposure").slider("value", 5);
            LFM_step_num = 26;
            next_step();
            break;
        case "live-btn":
            tvCounter = 2;
            switch (LFM_step_num) {
                case 45:
                    displayed_img = sprites[26][0];
                    tvCounter = 2;
                    fRate = 6;
                    raster_it();
                    ch3_lightpath_fn();
                    next_step();
                    break;
                case 51:
                case 64:
                case 68:
                case 81:
                case 85:
                case 91:
                case 97:
                    $("#single-light-path .light-path").css('opacity', '0');
                    fRate = 6;
                    cancelAnimationFrame(rasterEffect);
                    draw_single();
                    next_step();
                    break;
                case 57:
                    displayed_img = sprites[30][9];
                    tvCounter = 2;
                    fRate = 6;
                    ch3_lightpath_fn();
                    raster_it();
                    next_step();
                    break;
                case 66:
                    tvCounter = 2;
                    fRate = 6;
                    ch3_lightpath_fn();
                    raster_it();
                    next_step();
                    break;
                case 80:
                    tvCounter = 2;
                    fRate = 12;
                    ch3_lightpath_fn();
                    raster_it();
                    next_step();
                    break;
                case 84:
                    tvCounter = 2;
                    fRate = 2;
                    ch3_lightpath_fn();
                    raster_it();
                    next_step();
                    break;
                case 89:
                    displayed_img = sprites[36][0];
                    tvCounter = 2;
                    //                    fRate = 6;
                    ch3_lightpath_fn();
                    raster_it();
                    next_step();
                    break;
                case 92:
                    parrays_bool = !parrays_bool;
                    if (parrays_bool) {
                        ch3_lightpath_fn();
                        raster_zoom();
                        $("#live-btn").toggleClass("btn-clickable", true);
                        $("#live-btn").prop('disabled', false);
                        $("#live-btn").css("cursor", "");
                    } else {
                        $("#single-light-path .light-path").css('opacity', '0');
                        cancelAnimationFrame(rasterZoomEffect);
                        deactivate_round_btn("#live-btn");
                        $("#live-btn").prop('value', "on");
                        $("#live-btn").toggleClass("btn-disabled", false);
                        activate_round_btn("#capture-btn");
                    }
                    break;
                case 96:
                    displayed_img = sprites[37][0];
                    $("#single-light-path .light-path").css('opacity', '1');
                    tvCounter = 2;
                    fRate = 6;
                    ch3_lightpath_fn();
                    raster_it();
                    next_step();
                    break;
                case 99:
                    displayed_img_r = sprites[37][1];
                    tvCounter = 2;
                    fRate = 3;
                    $("#simultaneous-light-path .light-path").css('opacity', '1');
                    $("#single-light-path .light-path").css('opacity', '0');
                    raster_it();
                    raster_it_r();
                    next_step();
                    break;
                case 100:
                    tvCounter = 2;
                    //                    fRate = 6;
                    $("#simultaneous-light-path .light-path").css('opacity', '0');
                    cancelAnimationFrame(rasterEffect);
                    cancelAnimationFrame(rasterEffect_r);
                    draw_single();
                    draw_single(ctx_r, sprites[37][1]);
                    next_step();
                    break;
                case 105:
                    ctx_l.clearRect(0, 0, w_h, w_h);
                    ctx_r.clearRect(0, 0, w_h, w_h);
                    ctx_f.clearRect(0, 0, w_h, w_h);
                    displayed_img = sprites[37][6];
                    displayed_img_r = sprites[37][3];
                    displayed_img_f = sprites[37][4];
                    $("#canvasf-modal").toggleClass("totally-hidden", false);
                    tvCounter = 2;
                    fRate = 6;
                    ch2_lightpath_fn();
                    raster_it(true, true);
                    next_step();
                    break;
                case 106:
                    $("#single-light-path .light-path").css('opacity', '0');
                    tvCounter = 2;
                    fRate = 6;
                    if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
                    if (rasterEffect_r != undefined) cancelAnimationFrame(rasterEffect_r);
                    if (rasterEffect_f != undefined) cancelAnimationFrame(rasterEffect_f);
                    draw_single();
                    draw_single(ctx_r, sprites[37][3]);
                    draw_single(ctx_f, sprites[37][4]);
                    next_step();
                    break;
                case 108:
                    ctx_l.clearRect(0, 0, w_h, w_h);
                    ctx_r.clearRect(0, 0, w_h, w_h);
                    displayed_img = sprites[38][96];
                    tvCounter = 2;
                    fRate = 6;
                    ch3_lightpath_fn();
                    raster_it();
                    next_step();
                    break;
                case 112:
                    fRate = 6;
                    $("#single-light-path .light-path").css('opacity', '0');
                    cancelAnimationFrame(rasterEffect);
                    draw_single(ctx_l, displayed_img);
                    next_step();
                    break;
            }
            break;
        case "capture-btn":
            tvCounter = 2;
            $("#confocal-txt").html("Please wait while the image scans");
            $("#conf-txt-modal").toggleClass("totally-hidden", false);
            $("#capture-btn").prop('disabled', true);
            if (LFM_step_num === 82) {
                fRate = 12;
                ch3_lightpath_fn();
                raster_it(true, true);
            } else if (LFM_step_num === 86) {
                fRate = 2;
                ch3_lightpath_fn();
                raster_it(true, true);
            } else if (LFM_step_num === 92) {
                $("#zoom").slider("disable");
                ch3_lightpath_fn();
                raster_zoom(true);
            } else if (LFM_step_num === 101) {
                $("#simultaneous-light-path .light-path").css('opacity', '1');
                raster_it(true, true);
                raster_it_r(true, true);
            } else if (LFM_step_num === 103) {
                ch3_lightpath_fn();
                raster_it(true, true);
            } else if (LFM_step_num === 107) {
                ch2_lightpath_fn();
                raster_it(true, true);
            } else {
                ch3_lightpath_fn();
                raster_it(true, true);
            }
            console.log({
                fRate
            });
            break;
        case "capturez-btn":
            fRate = 20;
            tvCounter = 2;
            $("#confocal-txt").html("Please wait while the image scans");
            $("#conf-txt-modal").toggleClass("totally-hidden", false);
            $("#capturez-btn").prop('disabled', true);

            switch (LFM_step_num) {
                case 113:
                    raster_z_l();
                    ch3_lightpath_fn();
                    break;
                case 116:
                    raster_z_l(39, 0, 25);
                    ch3_lightpath_fn();
                    break;
                case 120:
                    displayed_img = sprites[40][0];
                    displayed_img_f = sprites[41][0];
                    raster_z_l(40, 0, 25);
                    ch2_lightpath_fn();
                    break;
            }
            console.log({
                fRate
            });
            break;
        default:
    }
    if (e.target.value == "off") {
        e.target.value = "on";
        $("#" + e.target.id).toggleClass("controls-btn-active", true);
    } else {
        e.target.value = "off";
        $("#" + e.target.id).toggleClass("controls-btn-active", false);
    }
    $("#fps-txt").html((fRate / 12).toFixed(3));
});
// ======================= END ======================== //
// ======================= START ======================== //
$("#channel-2-checkbox").change(function () {
    if (!this.checked) {
        $("#label-l").html("");
        if (!$("#channel-4-checkbox").is(":checked")) activate_round_btn("#live-btn");
    }
});
// ======================= END ======================== //
// ======================= START ======================== //
$("#channel-4-checkbox").change(function () {
    if (!this.checked) {
        $("#canvasf-modal").toggleClass("totally-hidden", true);
        if (!$("#channel-2-checkbox").is(":checked")) {
            $("#ost-txt").html("1.45&#181;m");
            activate_round_btn("#live-btn");
        }
    }
});
// ======================= END ======================== //
// ======================= START BUTTONS======================== //
$("#condenser-btn").click(() => {
    $("#imaging-tab").toggleClass("totally-hidden", true);
    $("#condenser-tab").toggleClass("totally-hidden", false);
});
$("#imaging-btn").click(() => {
    $("#condenser-tab").toggleClass("totally-hidden", true);
    $("#imaging-tab").toggleClass("totally-hidden", false);
});

$("#close-resize").click(() => {
    $("#modal-resize").toggleClass("totally-hidden", true);
});

$("#close-instructions").click(function (e) {
    e.preventDefault();
    $("#instructions-modal").toggleClass("totally-hidden", true);
});

$("#close-conf-txt").click(function (e) {
    e.preventDefault();
    $("#conf-txt-modal").toggleClass("totally-hidden", true);
});

$("#close-imaging").click(function (e) {
    e.preventDefault();
    $("#imaging-modal").toggleClass("totally-hidden", true);
});

$("#close-histogram").click(function (e) {
    e.preventDefault();
    $("#histogram-modal").toggleClass("totally-hidden", true);
});

$("#close-lut").click(function (e) {
    e.preventDefault();
    deactivate_sqr_btn("#lut-btn");
    $("#lut-modal").toggleClass("totally-hidden", true);
    activate_sqr_btn("#lut-btn");
});

$("#close-conf-scenarios").click(function (e) {
    e.preventDefault();
    $("#conf-scenarios-modal").toggleClass("totally-hidden", true);
    deactivate_sqr_btn("#activities-btn");
    activate_sqr_btn("#activities-btn");
});

$("#close-conf-svg").click(function (e) {
    e.preventDefault();
    $("#conf-svg-modal").toggleClass("totally-hidden", true);
    deactivate_sqr_btn("#lp-btn");
    activate_sqr_btn("#lp-btn");
});

$("#close-overlay10").click(function (e) {
    e.preventDefault();
    $("#overlay10-modal").toggleClass("totally-hidden", true);
});

$("#close-overlay40").click(function (e) {
    e.preventDefault();
    $("#overlay40-modal").toggleClass("totally-hidden", true);
});

$("#close-pinhole01").click(function (e) {
    e.preventDefault();
    $("#pinhole01-modal").toggleClass("totally-hidden", true);
});

$("#close-pinhole02").click(function (e) {
    e.preventDefault();
    $("#pinhole02-modal").toggleClass("totally-hidden", true);
});

$("#close-dwell").click(function (e) {
    e.preventDefault();
    $("#dwell-modal").toggleClass("totally-hidden", true);
});

$("#close-multich").click(function (e) {
    e.preventDefault();
    $("#multich-modal").toggleClass("totally-hidden", true);
    next_step();
});

$("#close-multich02").click(function (e) {
    e.preventDefault();
    $("#multich02-modal").toggleClass("totally-hidden", true);
    next_step();
});

$("#close-multich03").click(function (e) {
    e.preventDefault();
    $("#multich03-modal").toggleClass("totally-hidden", true);
    next_step();
});

$("#close-multich04").click(function (e) {
    e.preventDefault();
    $("#multich04-modal").toggleClass("totally-hidden", true);
});

$("#close-zstacks").click(function (e) {
    e.preventDefault();
    $("#zstacks-modal").toggleClass("totally-hidden", true);
});

$("#close-videoz").click(function (e) {
    e.preventDefault();
    $("#videoz-modal").toggleClass("totally-hidden", true);
    if (LFM_step_num < 120) next_step();
});

$("#close-planes").click(() => {
    $("#planes-modal").toggleClass("totally-hidden", true);
    $("#important-points-modal").toggleClass("totally-hidden", false);
});
$("#close-important-points").click(() => {
    $("#important-points-modal").toggleClass("totally-hidden", true);
    $("#instructions-modal").toggleClass("totally-hidden", false);
});
// =======================  END END  ==================== //


$("#save-multich-btn").click(() => {
    $("#multich-modal").toggleClass("totally-hidden", true);
    saveIMG('image from the LFM simulator.jpg', `#${mchannel_1_3.id}`);
    deactivate_sqr_btn("#save-multich-btn");
    activate_sqr_btn("#save-multich-btn");
    next_step();
});

// ======================= START DRGGABLE MODALS ======================== //
$("#instructions-modal").draggable();
$("#imaging-modal").draggable();
$("#histogram-modal").draggable();
$("#lut-modal").draggable();
$("#fluograph-modal").draggable();
$("#overlay10-modal").draggable();
$("#overlay40-modal").draggable();
$("#conf-scenarios-modal").draggable();
$("#conf-svg-modal").draggable();
$("#conf-txt-modal").draggable();
$("#pinhole01-modal").draggable();
$("#pinhole02-modal").draggable();
$("#dwell-modal").draggable();
$("#multich-modal").draggable();
$("#multich02-modal").draggable();
$("#multich03-modal").draggable();
$("#multich04-modal").draggable();
$("#canvasf-modal").draggable();
$("#zstacks-modal").draggable();
$("#videoz-modal").draggable();
// ======================= END  ======================== //
// ======================= START ======================== //
const diapragm_pos_fn = (_x = diaphg_x, _y = diaphg_y, _scale = diaphg_scale) => {

    diaphragm.style.transform = `translate(${_x}px,${_y}px) scale(${_scale},${_scale})`;
    if (LFM_step_num <= 10) diaphragm_penta.style.transform = `translate(${_x}px,${_y}px) scale(${_scale},${_scale})`;

    diaphg_x = _x;
    diaphg_y = _y;
    diaphg_scale = _scale;
}
// ======================= END ======================== //
// ======================= START ======================== //
var incrementTimeout;
var speed = 500;
$('.spinn-btn').on('mousedown click mouseup mouseleave', e => {
    switch (e.type) {
        case "mousedown":
            spinnIt_fn(e.target.id, speed);
            break;
        case "mouseup":
            stopSpinning();
            if ((diaphg_x == 0) && (diaphg_y == 0)) {
                if (window.LFM_BENCHMARK_API && typeof window.LFM_BENCHMARK_API.markSubtaskSuccess === "function") {
                    window.LFM_BENCHMARK_API.markSubtaskSuccess("L7");
                }
                LFM_step_num = 9;
                deactivate_condenserPos();
                next_step();
            }
            break;
        default:
            stopSpinning();
    }

});
// Increment function
function spinnIt_fn(spin_id, speed) {
    switch (spin_id) {
        case "cond-pos-x-down":
            if (diaphg_x > (-145)) diaphg_x -= 5;
            if (diaphg_y > (-145)) diaphg_y -= 5;
            break;
        case "cond-pos-x-up":
            if (diaphg_x < 145) diaphg_x += 5;
            if (diaphg_y < 145) diaphg_y += 5;
            break;
        case "cond-pos-y-down":
            if (diaphg_x > (-145)) diaphg_x -= 5;
            if (diaphg_y < 145) diaphg_y += 5;
            break;
        case "cond-pos-y-up":
            if (diaphg_x < 145) diaphg_x += 5;
            if (diaphg_y > (-145)) diaphg_y -= 5;
            break;
    }
    diapragm_pos_fn();
    incrementTimeout = setTimeout(() => {
        spinnIt_fn(spin_id, speed * 0.8);
    }, speed);
}

function stopSpinning() {
    clearTimeout(incrementTimeout);
}

// =======================  END END  ==================== //
// ======================= START REMOVE EYEPIECE ======================== //
const remove_eyepiece = () => {
    deactivate_sqr_btn("#eyepiece-btn");
    $("#eyepiece-btn").prop('value', "on");
    gsap.to("#eyepiece-on", {
        duration: 0.5,
        ease: "power2.in",
        scale: 1.1,
        opacity: 0,
        onComplete: eyepieceRemoved
    });
}

function eyepieceRemoved() {
    $("#bf_set01_5").removeClass("bf-visible");
    $("#bf-noeyepiece").removeClass("bf-invisible");
    $("#bf-noeyepiece").addClass("bf-visible");
    next_step();
}
// =======
const replace_eyepiece = () => {
    $("#eyepiece-btn").css("cursor", "not-allowed");
    diapragm_pos_fn(-5, -5, 13.0);
    $("#bf-noeyepiece").addClass("bf-invisible");
    $("#bf-noeyepiece").removeClass("bf-visible");
    $("#bf-wh-balance").removeClass("bf-invisible");
    $("#bf-wh-balance").addClass("bf-visible");
    gsap.to("#eyepiece-on", {
        duration: 1,
        ease: "power2.out",
        scale: 1,
        opacity: 1,
        onComplete: next_step
    });
    deactivate_sqr_btn("#eyepiece-btn", "#eyepiece-label");
}

// ======================= END ======================== //
// ======================= START ======================== //

function set_microimgs_fun(arr_pos, prepend_lenght, visible_id) {
    $("#bf-microimgs img").not("#bf-microimgs img:nth-last-child(1) ,#bf-microimgs img:nth-last-child(2)").detach();
    for (let i = prepend_lenght; i >= 0; i--) {
        $(sprites[arr_pos][i]).prependTo("#bf-microimgs");
        $(sprites[arr_pos][i]).toggleClass("bf-visible", false);
    }
    $("#bf-microimgs img").removeAttr("style");
    $(visible_id).addClass("bf-visible");
}

function set_histogram_fun(arr_pos, prepend_lenght, visible_id) {
    $("#lut-imgs img").not("#lut-imgs img:nth-last-child(1)").detach();
    for (let i = prepend_lenght; i >= 0; i--) {
        $(sprites[arr_pos][i]).prependTo("#lut-imgs");
        $(sprites[arr_pos][i]).toggleClass("bf-visible", false);
    }
    $("#lut-imgs img").removeAttr("style");
    $(visible_id).addClass("bf-visible");
    let str_src = $(visible_id).attr('src');
    $("#lut-imgs img:nth-last-child(1)").attr("src", str_src);
}
// ======================= END ======================== //
// ======================= START ======================== //
const color_lighpaths_fn = () => {
    switch (rgb_filter) {
        case "RFP":
            $("#main-lens").css("fill", "#4BFF00");
            $("#light-path-filtered").css("stroke", "#33AF00");
            $(".light-path-emerge").css("stroke", "#FC0603");
            break;
        case "GFP":
            $("#main-lens").css("fill", "#0687D2");
            $("#light-path-filtered").css("stroke", "#0687D2");
            $(".light-path-emerge").css("stroke", "#04D20B");
            break;
        case "DAPI":
            $("#main-lens").css("fill", "#C04AFF");
            $("#light-path-filtered").css("stroke", "#C04AFF");
            $(".light-path-emerge").css("stroke", "#0100FE");
            break;
        default:
            // code block
    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const end_rgb_filters_fn = () => {
    color_lighpaths_fn();
    $("#imaging-modal").toggleClass("totally-hidden", true);
    $("#lut-modal").toggleClass("totally-hidden", true);
    deactivate_sqr_btn("#imgsoft-btn");
}

// ======================= END ======================== //
// ======================= START ======================== //
const green_filter10x_fn = () => {
    rgb_filter = "GFP";
    end_rgb_filters_fn();
    rgb_sprite10x = 18;
    rgb_sprite10x_lut = 22;
    set_microimgs_fun(rgb_sprite10x, 12, "#" + rgb_filter + "_10x_6");
    set_histogram_fun(rgb_sprite10x_lut, 12, "#" + rgb_filter + "_10x_lut_6");
    $("#exposure").slider("value", 5);
    LFM_step_num = 28;
    deactivate_sqr_btn("#lut-btn");
    deactivate_sqr_btn("#bf-capture-btn");
    activate_sqr_btn("#imgsoft-btn");
    $("#imgsoft-btn").click();
    //    next_step();
}
// ======================= END ======================== //
// ======================= START ======================== //
const blue_filter10x_fn = () => {
    rgb_filter = "DAPI";
    end_rgb_filters_fn();
    rgb_sprite10x = 19;
    rgb_sprite10x_lut = 23;
    set_microimgs_fun(rgb_sprite10x, 12, "#" + rgb_filter + "_10x_6");
    set_histogram_fun(rgb_sprite10x_lut, 12, "#" + rgb_filter + "_10x_lut_6");
    $("#exposure").slider("value", 5);
    LFM_step_num = 28;
    deactivate_sqr_btn("#lut-btn");
    deactivate_sqr_btn("#bf-capture-btn");
    activate_sqr_btn("#imgsoft-btn");
    $("#imgsoft-btn").click();
    //    next_step();
}
// ======================= END ======================== //
// ======================= START ======================== //
const overlay10x_fn = () => {
    end_rgb_filters_fn();
    $("#overlay10-modal").toggleClass("totally-hidden", false);
    deactivate_sqr_btn("#overlay10-btns-div .btn");
    activate_sqr_btn("#overlay10-btns-div .btn");
    $("#overlay10-blind div div").toggleClass("not-visible", true);
    activate_sqr_btn("#40x-btn");
    next_step();
}

// ======================= END ======================== //
// ======================= START ======================== //
const green_filter40x_fn = () => {
    rgb_filter = "GFP";
    end_rgb_filters_fn();
    rgb_sprite40x = 20;
    rgb_sprite40x_lut = 24;
    set_microimgs_fun(rgb_sprite40x, 10, "#" + rgb_filter + "_40x_2");
    set_histogram_fun(rgb_sprite40x_lut, 10, "#" + rgb_filter + "_40x_lut_2");
    $("#exposure").slider("value", 1);
    LFM_step_num = 33;
    deactivate_sqr_btn("#lut-btn");
    deactivate_sqr_btn("#bf-capture-btn");
    activate_sqr_btn("#imgsoft-btn");
    $("#imgsoft-btn").click();
    //    next_step();
}
// ======================= END ======================== //
// ======================= START ======================== //
const red_filter40x_fn = () => {
    rgb_filter = "RFP";
    end_rgb_filters_fn();
    rgb_sprite40x = 8;
    rgb_sprite40x_lut = 9;
    set_microimgs_fun(rgb_sprite40x, 10, "#" + rgb_filter + "_40x_2");
    set_histogram_fun(rgb_sprite40x_lut, 10, "#" + rgb_filter + "_40x_lut_2");
    $("#exposure").slider("value", 1);
    LFM_step_num = 33;
    deactivate_sqr_btn("#lut-btn");
    deactivate_sqr_btn("#bf-capture-btn");
    activate_sqr_btn("#imgsoft-btn");
    $("#imgsoft-btn").click();
    //    next_step();
}
// ======================= END ======================== //
// ======================= START ======================== //
const overlay40x_fn = () => {
    end_rgb_filters_fn();
    $("#overlay40-modal").toggleClass("totally-hidden", false);
    deactivate_sqr_btn("#overlay40-btns-div .btn");
    activate_sqr_btn("#overlay40-btns-div .btn");
    $("#overlay40-blind div div").toggleClass("not-visible", true);
    next_step();
}

// ======================= END ======================== //
// ======================= START ======================== //
const draw_single = (context = ctx_l, micrograph = displayed_img) => {
    context.drawImage(micrograph, 0, 0, micrograph.width, micrograph.height, 0, 0, w_h, w_h);
}
// ======================= END ======================== //
// ======================= START ======================== //

const raster_it = (single_scan = false, raster_scan = true) => {
    let _sheight = scroll_equation(tvCounter, 0, w_h, 0, displayed_img.height);
    rasterEffect = requestAnimationFrame(() => raster_it(single_scan, raster_scan));
    if (tvCounter < w_h + (fRate * 2)) {
        if (raster_scan) {
            ctx_l.drawImage(displayed_img, 0, 0, displayed_img.width, _sheight, 0, 0, w_h, tvCounter);
        } else {
            ctx_l.drawImage(displayed_img, 0, 0, displayed_img.width, displayed_img.height, 0, 0, w_h, w_h);
        }
        ctx_l.putImageData(idata, 0, 0, 0, tvCounter, w_h, 5);
        tvCounter += fRate;
    } else {
        if (single_scan) {
            cancelAnimationFrame(rasterEffect);
            if (LFM_step_num !== 103 || LFM_step_num !== 107) deactivate_round_btn("#capture-btn");
            $("#capture-btn").toggleClass("btn-disabled", false);
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            $("#single-light-path .light-path").css('opacity', '0');
            switch (LFM_step_num) {
                case 52:
                    saveIMG('image from the LFM simulator.jpg', `#${displayed_img.id}`);
                    $("#activities-btn").trigger("click");
                    $("#confocal-instructions-txt").html("Well done! <br>You have captured a confocal image. <br>When ready, continue to the Objective Lens activity where you will switch to a 40x objective.");
                    break;
                case 65:
                    saveIMG('image from the LFM simulator.jpg', `#${displayed_img.id}`);
                    $("#activities-btn").trigger("click");
                    $("#confocal-instructions-txt").html("Well done! <br>You have taken a confocal image. <br>When ready, continue to the Confocal Pinhole activity.");
                    break;
                case 69:
                    draw_single(ctx_r, sprites[34][0]);
                    $("#label-r").html("PINHOLE = 1.0 AU");
                    saveIMG('image from the LFM simulator.jpg', `#${displayed_img.id}`);
                    next_step();
                    break;
                case 71:
                    draw_single(ctx_r, sprites[34][1]);
                    $("#label-r").html("PINHOLE = OPEN");
                    saveIMG('image from the LFM simulator.jpg', `#${displayed_img.id}`);
                    $("#pinhole01-modal").toggleClass("totally-hidden", false);
                    next_step();
                    break;
                case 74:
                    draw_single(ctx_r, sprites[34][2]);
                    $("#label-r").html("PINHOLE = 0.5 AU");
                    saveIMG('image from the LFM simulator.jpg', `#${displayed_img.id}`);
                    next_step();
                    break;
                case 77:
                case 82:
                case 86:
                    saveIMG('image from the LFM simulator.jpg', `#${displayed_img.id}`);
                    next_step();
                    break;
                case 92:
                    saveIMG('image from the LFM simulator.jpg', `#${displayed_img.id}`);
                    break;
                case 101:
                    $("#simultaneous-light-path .light-path").css('opacity', '0');
                    $('#multich-div img').attr('src', mchannel_1_3.src);
                    $("#multich-modal").toggleClass("totally-hidden", false);
                    saveIMG('image from the LFM simulator ch3.jpg', `#${displayed_img.id}`);
                    saveIMG('image from the LFM simulator ch4.jpg', `#${displayed_img_r.id}`);
                    if (rasterEffect_r != undefined) cancelAnimationFrame(rasterEffect_r);
                    $("#confocal-instructions-txt").html("Note that the image does not have a distinctive separation of the blue and red channel. This effect looks purple due to blue and red pixels in the same position. What do you think is causing this?");
                    break;
                case 103:
                    saveIMG('image from the LFM simulator ch3.jpg', `#${displayed_img.id}`);
                    tvCounter = 2;
                    ch4_lightpath_fn();
                    raster_it_r(true, true);
                    $("#conf-txt-modal").toggleClass("totally-hidden", false);
                    break;
                case 106:
                    tvCounter = 2;
                    ch3_lightpath_fn();
                    raster_it_r(true, true);
                    break;
                case 107:
                    saveIMG('image from the LFM simulator ch2.jpg', `#${displayed_img.id}`);
                    tvCounter = 2;
                    ch3_lightpath_fn();
                    raster_it_r(true, true);
                    $("#conf-txt-modal").toggleClass("totally-hidden", false);
                    break;
            }
            tvCounter = 2;
            return
        }
        tvCounter = 2;
    }

}
// ======================= END ======================== //
// ======================= START ======================== //

const raster_it_r = (single_scan = false, raster_scan = true) => {
    let _sheight = scroll_equation(tvCounter, 0, w_h, 0, displayed_img_r.height);
    rasterEffect_r = requestAnimationFrame(() => raster_it_r(single_scan, raster_scan));
    if (tvCounter < w_h + (fRate * 2)) {
        if (raster_scan) {
            ctx_r.drawImage(displayed_img_r, 0, 0, displayed_img_r.width, _sheight, 0, 0, w_h, tvCounter);
        } else {
            ctx_r.drawImage(displayed_img_r, 0, 0, displayed_img_r.width, displayed_img_r.height, 0, 0, w_h, w_h);
        }
        ctx_r.putImageData(idata, 0, 0, 0, tvCounter, w_h, 5);
        tvCounter += fRate;
    } else {
        if (single_scan) {
            cancelAnimationFrame(rasterEffect_r);
            if (LFM_step_num !== 107) deactivate_round_btn("#capture-btn");
            $("#capture-btn").toggleClass("btn-disabled", false);
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            $("#single-light-path .light-path").css('opacity', '0');
            switch (LFM_step_num) {
                case 103:
                    $("#capture-btn").toggleClass("btn-disabled", false);
                    saveIMG('image from the LFM simulator ch4.jpg', `#${displayed_img_r.id}`);
                    $("#confocal-instructions-txt").html("Click <a class='show-overlay' onclick='multch_overlay_fn()' style='color: #4990e2; cursor: pointer; font-weight: 700;'>HERE</a> to see the overlay.");
                    $('#multich02-div img').attr('src', mchannel_1_6.src);
                    break;
                case 106:
                    tvCounter = 2;
                    ch4_lightpath_fn();
                    raster_it_f(true, true);
                    break;
                case 107:
                    saveIMG('image from the LFM simulator ch3.jpg', `#${displayed_img_r.id}`);
                    tvCounter = 2;
                    ch4_lightpath_fn();
                    raster_it_f(true, true);
                    $("#conf-txt-modal").toggleClass("totally-hidden", false);
                    break;
            }
            tvCounter = 2;
            return
        }
        tvCounter = 2;
    }

}
// ======================= END ======================== //
// ======================= START ======================== //

const raster_it_f = (single_scan = false, raster_scan = true) => {
    let _sheight = scroll_equation(tvCounter, 0, w_h, 0, displayed_img_f.height);
    rasterEffect_f = requestAnimationFrame(() => raster_it_f(single_scan, raster_scan));
    if (tvCounter < w_h + (fRate * 2)) {
        if (raster_scan) {
            ctx_f.drawImage(displayed_img_f, 0, 0, displayed_img_f.width, _sheight, 0, 0, w_h, tvCounter);
        } else {
            ctx_f.drawImage(displayed_img_f, 0, 0, displayed_img_f.width, displayed_img_f.height, 0, 0, w_h, w_h);
        }
        ctx_f.putImageData(idata, 0, 0, 0, tvCounter, w_h, 5);
        tvCounter += fRate;
    } else {
        if (single_scan) {
            cancelAnimationFrame(rasterEffect_f);
            deactivate_round_btn("#capture-btn");
            $("#capture-btn").toggleClass("btn-disabled", false);
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            $("#single-light-path .light-path").css('opacity', '0');
            switch (LFM_step_num) {
                case 106:
                    tvCounter = 2;
                    ch2_lightpath_fn();
                    raster_it(true, true);
                    break;
                case 107:
                    $("#capture-btn").toggleClass("btn-disabled", false);
                    saveIMG('image from the LFM simulator ch4.jpg', `#${displayed_img_f.id}`);
                    $("#confocal-instructions-txt").html("Click <a class='show-overlay' onclick='multch_lastoverlay_fn()' style='color: #4990e2; cursor: pointer; font-weight: 700;'>HERE</a> to see the overlay.");
                    $('#multich04-div img').attr('src', mchannel_1_8.src);
                    break;
            }
            tvCounter = 2;
            return
        }
        tvCounter = 2;
    }

}
// ======================= END ======================== //
// ======================= START ======================== //

const raster_zoom = (single_scan = false) => {
    if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
    let zoom_val = $("#zoom").slider("value");
    let zoom_w_h = scroll_equation(zoom_val, 0, 4, displayed_img.width, displayed_img.width / 3);
    let zoom_sxy = scroll_equation(zoom_val, 0, 4, 0, displayed_img.width / 3);
    let h_cropped = scroll_equation(tvCounter, 0, w_h, 0, zoom_w_h);
    rasterZoomEffect = requestAnimationFrame(() => raster_zoom(single_scan));
    if (tvCounter < w_h + fRate) {
        ctx_l.drawImage(displayed_img, zoom_sxy, zoom_sxy, zoom_w_h, h_cropped, 0, 0, w_h, tvCounter);
        ctx_l.putImageData(idata, 0, 0, 0, tvCounter, w_h, 5);
        tvCounter += fRate;
    } else {
        if (single_scan) {
            cancelAnimationFrame(rasterZoomEffect);
            switch (LFM_step_num) {
                case 92:
                    deactivate_round_btn("#capture-btn");
                    $("#capture-btn").toggleClass("btn-disabled", false);
                    saveCANVAS(canvas_l, 'image from the LFM simulator.jpg');
                    $("#conf-txt-modal").toggleClass("totally-hidden", true);
                    $("#single-light-path .light-path").css('opacity', '0');
                    break;
            }
            tvCounter = 2;
            return
        }
        tvCounter = 2;
    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const draw_single_zoom = (context = ctx_l, micrograph = displayed_img) => {
    let zoom_w_h = scroll_equation(zoom_val, 0, 4, micrograph.width, micrograph.width / 3);
    let zoom_sxy = scroll_equation(zoom_val, 0, 4, 0, micrograph.width / 3);
    context.drawImage(micrograph, zoom_sxy, zoom_sxy, zoom_w_h, zoom_w_h, 0, 0, w_h, w_h);
}
// ======================= END ======================== //
// ======================= START ======================== //
const raster_z_l = (current_arr = 38, current_spr = 0, top_spr = 200) => {
    let _sheight = scroll_equation(tvCounter, 0, w_h, 0, displayed_img.height);
    _displayed_img_l = sprites[current_arr][current_spr];
    rasterEffect = requestAnimationFrame(() => raster_z_l(current_arr, current_spr, top_spr));
    if (tvCounter < w_h + (fRate * 2)) {
        ctx_l.drawImage(_displayed_img_l, 0, 0, displayed_img.width, _sheight, 0, 0, w_h, tvCounter);
        ctx_l.putImageData(idata, 0, 0, 0, tvCounter, w_h, 5);
        tvCounter += fRate;
    } else {
        cancelAnimationFrame(rasterEffect);
        deactivate_round_btn("#capture-btn");
        $("#capture-btn").toggleClass("btn-disabled", false);
        current_spr++;
        tvCounter = 2;
        if (current_spr <= top_spr) {
            switch (LFM_step_num) {
                case 113:
                    raster_z_l(38, current_spr);
                    break;
                case 116:
                    raster_z_l(39, current_spr, 25);
                    break;
                case 120:
                    raster_z_l(40, current_spr, 25);
                    break;
            }
        } else {
            switch (LFM_step_num) {
                case 113:
                case 116:
                    $("#single-light-path .light-path").css('opacity', '0');
                    $("#conf-txt-modal").toggleClass("totally-hidden", true);
                    cancelAnimationFrame(rasterEffect);
                    next_step();
                    break;
                case 120:
                    raster_z_r(39, 0, 25);
                    ch3_lightpath_fn();
                    cancelAnimationFrame(rasterEffect);
                    break;
            }
            return
        }
    }
}
// ======================= END ======================== //
// ======================= START ======================== //

const raster_z_r = (current_arr = 39, current_spr = 0, top_spr = 30) => {
    _displayed_img_r = sprites[current_arr][current_spr];
    let _sheight = scroll_equation(tvCounter, 0, w_h, 0, _displayed_img_r.height);
    rasterEffect_r = requestAnimationFrame(() => raster_z_r(current_arr, current_spr, top_spr));
    if (tvCounter < w_h + (fRate * 2)) {
        ctx_r.drawImage(_displayed_img_r, 0, 0, _displayed_img_r.width, _sheight, 0, 0, w_h, tvCounter);
        ctx_r.putImageData(idata, 0, 0, 0, tvCounter, w_h, 5);
        tvCounter += fRate;
    } else {
        cancelAnimationFrame(rasterEffect_r);
        deactivate_round_btn("#capture-btn");
        $("#capture-btn").toggleClass("btn-disabled", false);
        current_spr++;
        tvCounter = 2;
        if (current_spr <= top_spr) {
            switch (LFM_step_num) {
                case 120:
                    raster_z_r(39, current_spr, 25);
                    break;
            }

        } else {
            switch (LFM_step_num) {
                case 120:
                    cancelAnimationFrame(rasterEffect_r);
                    raster_z_f(41, 0);
                    ch4_lightpath_fn();
                    break;
            }
            return
        }
    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const raster_z_f = (current_arr = 41, current_spr = 0, top_spr = 25) => {
    let _sheight = scroll_equation(tvCounter, 0, w_h, 0, displayed_img_f.height);
    _displayed_img_f = sprites[current_arr][current_spr];
    rasterEffect_f = requestAnimationFrame(() => raster_z_f(current_arr, current_spr));
    if (tvCounter < w_h + (fRate * 2)) {
        ctx_f.drawImage(_displayed_img_f, 0, 0, displayed_img_f.width, _sheight, 0, 0, w_h, tvCounter);
        ctx_f.putImageData(idata, 0, 0, 0, tvCounter, w_h, 5);
        tvCounter += fRate;
    } else {
        cancelAnimationFrame(rasterEffect_f);
        deactivate_round_btn("#capture-btn");
        $("#capture-btn").toggleClass("btn-disabled", false);
        current_spr++;
        tvCounter = 2;
        if (current_spr <= top_spr) {
            raster_z_f(41, current_spr);

        } else {
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            cancelAnimationFrame(rasterEffect_f);
            next_step();
            return
        }
    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const pinhole_1AU_fn = () => {
    switch (LFM_step_num) {
        case 43:
            $("#ost-txt").html("6.87&#181;m");
            next_step();
            break;
        case 76:
            $("#ost-txt").html("1.45&#181;m");
            displayed_img = sprites[35][0];
            next_step();
            break;
    }
}

// ======================= END ======================== //
// ======================= START ======================== //
const pinhole_open_fn = () => {
    if (LFM_step_num == 70) {
        $("#ost-txt").html("8.43&#181;m");
        displayed_img = sprites[34][1];
        tvCounter = 2;
        next_step();
    }
}
// ======================= START ======================== //
const pinhole_closed_fn = () => {
    if (LFM_step_num == 73) {
        $("#ost-txt").html("1.12&#181;m");
        displayed_img = sprites[34][2];
        tvCounter = 2;
        next_step();
    }
}

// ======================= END ======================== //
// ======================= START ======================== //
const pixel_dwell_2sec_fn = () => {
    switch (LFM_step_num) {
        case 78:
            next_step();
            break;
    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const pixel_dwell_12sec_fn = () => {
    switch (LFM_step_num) {
        case 83:
            next_step();
            break;
    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const pixel_dwell_4sec_fn = () => {
    switch (LFM_step_num) {
        case 88:
            next_step();
            break;
    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const image_128_fn = () => {
    fRate = 96;
    switch (LFM_step_num) {
        case 92:
            displayed_img = sprites[36][2];
            parrays_fn(fRate);
            save_w_h = 128;
            break;
    }
}

// ======================= END ======================== //
// ======================= START ======================== //
const image_256_fn = () => {
    fRate = 24;
    switch (LFM_step_num) {
        case 92:
            displayed_img = sprites[36][3];
            parrays_fn(fRate);
            save_w_h = 256;
            break;
    }
}

// ======================= END ======================== //
// ======================= START ======================== //
const image_512_fn = () => {
    fRate = 6;
    $("#fps-txt").html((fRate / 12).toFixed(3));
    switch (LFM_step_num) {
        case 44:
        case 56:
        case 93:
            next_step();
            break;
        case 66:
            displayed_img = sprites[26][3];
            deactivate_dd("#image-size");
            activate_round_btn("#live-btn");
            break;
        case 92:
            displayed_img = sprites[36][4];
            parrays_fn(fRate);
            save_w_h = 512;
            break;
    }
}

// ======================= END ======================== //
// ======================= START ======================== //
const image_1024_fn = () => {
    fRate = 1.5;
    $("#fps-txt").html((fRate / 12).toFixed(3));
    switch (LFM_step_num) {
        case 52:
            displayed_img = sprites[26][2];
            activate_round_btn("#capture-btn");
            deactivate_dd("#image-size");
            break;
        case 65:
            displayed_img = sprites[26][4];
            deactivate_dd("#image-size");
            activate_round_btn("#capture-btn");
            break;
        case 90:
            displayed_img = sprites[36][1];
            deactivate_dd("#image-size");
            next_step();
            break;
        case 92:
            displayed_img = sprites[36][5];
            parrays_fn(fRate);
            save_w_h = 1024;
            break;
    }
}

// ======================= END ======================== //
// ======================= START ======================== //
const image_2048_fn = () => {
    fRate = 0.375;
    switch (LFM_step_num) {
        case 92:
            displayed_img = sprites[36][6];
            parrays_fn(fRate);
            save_w_h = 2048;
            break;
    }
}

// ======================= END ======================== //
// ======================= START ======================== //
const parrays_fn = (_fRate) => {
    $("#single-light-path .light-path").css('opacity', '0');
    $("#conf-txt-modal").toggleClass("totally-hidden", true);
    parrays_bool = false;
    if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
    if (rasterZoomEffect != undefined) cancelAnimationFrame(rasterZoomEffect);
    deactivate_round_btn("#live-btn");
    fRate = _fRate;
    $("#fps-txt").html((fRate / 12).toFixed(3));
    deactivate_round_btn("#capture-btn");
    $("#capture-btn").toggleClass("btn-disabled", false);
    activate_round_btn("#live-btn");
    $("#zoom").slider("enable");
}

// ======================= END ======================== //
// ======================= START ======================== //
const LUT_underover_fn = () => {
    switch (LFM_step_num) {
        case 46:
            if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
            displayed_img = sprites[27][2];
            tvCounter = 2;
            raster_it();
            next_step();
            break;
        case 59:
            displayed_img = sprites[31][5];
            next_step();
            break;
        case 67:
            tvCounter = 2;
            displayed_img = sprites[34][0];
            next_step();
            break;
        case 79:
            tvCounter = 2;
            draw_single(ctx_l, sprites[35][1]);
            displayed_img = sprites[35][2];
            next_step();
            break;
        case 87:
            draw_single(ctx_l, dwell_1_5);
            $('#dwell-l img').attr('src', dwell_1_5.src);
            $('#dwell-m img').attr('src', dwell_1_3.src);
            $('#dwell-r img').attr('src', dwell_1_2.src);
            $("#dwell-modal").toggleClass("totally-hidden", false);
            break;
    }
}

// ======================= END ======================== //
// ======================= START ======================== //
const LUT_default_fn = () => {
    if (LFM_step_num == 50) {}
    switch (LFM_step_num) {
        case 50:
            displayed_img = sprites[26][1];
            next_step();
            break;
        case 63:
            displayed_img = sprites[26][3];
            next_step();
            break;
        case 75:
            deactivate_dd("#look-up");
            $('#pinhole02-l img').attr('src', pinhole_1_4.src);
            $('#pinhole02-m img').attr('src', pinhole_1_5.src);
            $('#pinhole02-r img').attr('src', pinhole_1_6.src);
            $("#pinhole02-modal").toggleClass("totally-hidden", false);
            $("#label-r").html("");
            $("#confocal-instructions-txt").html("Congratulations! <br>You have completed the Pinhole exercise. <br>When ready, proceed to the Pixel Dwell exercise to see the effect of different scan speeds.");
            ctx_r.clearRect(0, 0, w_h, w_h);
            $("#activities-btn").trigger("click");
            break;
        case 87:
            draw_single(ctx_l, dwell_1_6);
            $('#dwell-l img').attr('src', dwell_1_6.src);
            $('#dwell-m img').attr('src', dwell_1_4.src);
            $('#dwell-r img').attr('src', dwell_1_1.src);
            $("#dwell-modal").toggleClass("totally-hidden", false);
            $("#activities-btn").trigger("click");
            break;
    }
}

// ======================= END ======================== //
// ======================= START ======================== //
const objective_40x075_fn = () => {
    if (LFM_step_num == 55) {
        $("#ost-txt").html("1.45&#181;m");
        next_step();
    }
}

// ======================= END ======================== //
// ======================= START ======================== //
const step_size_optimal_fn = () => {
    if (LFM_step_num == 111) {
        $("#zstacks-modal").toggleClass("totally-hidden", false);
        next_step();
    }
}
const step_size_5_fn = () => {
    if (LFM_step_num == 115) {
        next_step();
    }
}

// ======================= END ======================== //
// ======================= START ======================== //
const scan_mode_sim_fn = () => {
    switch (LFM_step_num) {
        case 94:
            LFM_step_num = 95;
            next_step();
            break;
    }
}

const scan_mode_seq_fn = () => {
    switch (LFM_step_num) {
        case 102:
            displayed_img = sprites[37][3];
            displayed_img_r = sprites[37][4];
            ctx_l.clearRect(0, 0, w_h, w_h);
            ctx_r.clearRect(0, 0, w_h, w_h);
            next_step();
            break;
    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const multch_overlay_fn = () => {
    $("#multich02-modal").toggleClass("totally-hidden", false);
}

const multch_lastoverlay_fn = () => {
    $("#activities-btn").trigger("click");
    $("#multich04-modal").toggleClass("totally-hidden", false);
    $("#confocal-instructions-txt").html("Congratulations! <br>You have completed this activity. Continue to the 3D &Z-stacks activity");
}
// ======================= END ======================== //
// ======================= START ======================== //
const multch_compare_fn = () => {
    $("#multich03-modal").toggleClass("totally-hidden", false);
}
// ======================= END ======================== //
// ======================= START ======================== //
const instruction91a_fn = () => {
    $("#confocal-instructions-txt").html(instruction_step_91a);
    $("#activities-btn").trigger("click");
}
// ======================= END ======================== //
// ======================= START ======================== //
const ch2_lightpath_fn = () => {
    $("#single-light-path .light-path").css('opacity', '1');
    $("#single-light-path-in").css('stroke', '#3366FF'); //blue
    $("#single-light-path-out").css('stroke', '#13AE00'); //green
}
// ======================= END ======================== //
// ======================= START ======================== //
const ch3_lightpath_fn = () => {
    $("#single-light-path .light-path").css('opacity', '1');
    $("#single-light-path-in").css('stroke', '#13AE00'); //green
    $("#single-light-path-out").css('stroke', '#FF0404'); //red
}
// ======================= END ======================== //
// ======================= START ======================== //
const ch4_lightpath_fn = () => {
    $("#single-light-path .light-path").css('opacity', '1');
    $("#single-light-path-in").css('stroke', '#FF0404'); //red
    $("#single-light-path-out").css('stroke', '#BD3131'); //dark red
}
// ======================= END ======================== //
// ======================= START ======================== //
var reset_confocal = () => {
    tvCounter = 2;
    fRate = 6;
    save_w_h = 1024;
    $("#simultaneous-light-path .light-path").css('opacity', '0');
    $("#single-light-path .light-path").css('opacity', '0');
    $("#fps-txt").html((fRate / 12).toFixed(3));
    $(".monitor-label").html("");
    $("#zoom-val").text("");
    $("#zoom-val").toggleClass("label-disabled", true);
    deactivate_slider("#zoom");
    parrays_bool = false;
    displayed_img = undefined;
    $("#live-btn").css("cursor", "");
    if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
    if (rasterEffect_r != undefined) cancelAnimationFrame(rasterEffect_r);
    if (rasterEffect_f != undefined) cancelAnimationFrame(rasterEffect_f);
    if (rasterZoomEffect != undefined) cancelAnimationFrame(rasterZoomEffect);
    ctx_l.clearRect(0, 0, w_h, w_h);
    ctx_r.clearRect(0, 0, w_h, w_h);
    ctx_f.clearRect(0, 0, w_h, w_h);
    reset_slider("#confocal .slider");
    $("#zpos-div p").toggleClass("label-disabled", true);
    $("#zpinhole-title").toggleClass("pinhole-title-disabled", true);
    $("#zoom").slider("value", 0);
    $("#zpos").slider("disable");
    $("#zpos").slider("option", "max", 99);
    reset_slider("#zpos", 50);
    totally_deactivate_channel("channel-2");
    totally_deactivate_channel("channel-3");
    totally_deactivate_channel("channel-4");
    $("#channel-3-checkbox").css("cursor", "not-allowed");
    deactivate_round_btn("#confocal .lfm-btn");
    reset_dd("#confocal select");
    deactivate_dd("#confocal select");
    reset_dd("#scan-mode");
    reset_dd("#objective", 2, 2);
    deactivate_dd("#scan-mode");
    $("#controls-right label").toggleClass("label-disabled", true);
    $("#channel-2-checkbox").prop('checked', false);
    $("#channel-2-checkbox").prop('disabled', true);
    $("#channel-3-checkbox").prop('checked', false);
    $("#channel-3-checkbox").prop('disabled', true);
    $("#channel-4-checkbox").prop('checked', false);
    $("#channel-4-checkbox").prop('disabled', true);
    $('#channel-2-checkbox').css('cursor', '');
    $('#channel-3-checkbox').css('cursor', '');
    $('#channel-4-checkbox').css('cursor', '');
    $("#dwell-modal").toggleClass("totally-hidden", true);
    $("#multich-modal").toggleClass("totally-hidden", true);
    $("#multich02-modal").toggleClass("totally-hidden", true);
    $("#multich03-modal").toggleClass("totally-hidden", true);
    $("#multich04-modal").toggleClass("totally-hidden", true);
    $("#canvasf-modal").toggleClass("totally-hidden", true);
    $("#pinhole01-modal").toggleClass("totally-hidden", true);
    $("#pinhole02-modal").toggleClass("totally-hidden", true);
    $("#fluograph-modal").toggleClass("totally-hidden", true);
    $("#imaging-modal").toggleClass("totally-hidden", true);
    $("#lut-modal").toggleClass("totally-hidden", true);
    $("#histogram-modal").toggleClass("totally-hidden", true);
    $("#instructions-modal").toggleClass("totally-hidden", true);
    $("#overlay10-modal").toggleClass("totally-hidden", true);
    $("#overlay40-modal").toggleClass("totally-hidden", true);
    $("#close-conf-svg").trigger("click");
    $("#planes-modal").toggleClass("totally-hidden", true);
    $("#important-points-modal").toggleClass("totally-hidden", true);
    deactivate_sqr_btn("#bottomz-btn");
    $("#bottomz-label").css('opacity', '1');
    $("#bottomz-label").toggleClass("label-disabled", true);
    deactivate_sqr_btn("#topz-btn");
    $("#topz-label").css('opacity', '1');
    $("#topz-label").toggleClass("label-disabled", true);
    reset_dd("#step-size");
    deactivate_dd("#step-size");
    $("#zstacks-modal").toggleClass("totally-hidden", true);
    $("#videoz-modal").toggleClass("totally-hidden", true);
    $("#conf-txt-modal").toggleClass("totally-hidden", true);
    $("#videoz-modal").toggleClass("totally-hidden", true);
    $("#range .stats-value .stat-title").css('opacity', '0');
    $("#range").toggleClass("stats-disabled", true);
    $("#ost").toggleClass("label-disabled", true);
}

// ======================= END ======================== //
// ======================= START ======================== //
const jumpto_objective = () => {
    $("#ost-txt").html("6.87&#181;m");
    displayed_img = sprites[26][2];
    draw_single();
    reset_slider("#laser3", 20);
    reset_slider("#gain3", 45);
    reset_slider("#offset3", 0);
    reset_dd("#look-up", 3, 3);
    reset_dd("#image-size", 2, 2);
    reset_dd("#pinhole-size", 4, 4);
    $("#channel-3-checkbox").prop('checked', true);
    $("#channel-3-checkbox").prop('disabled', false);
    $('#channel-3-checkbox').css('cursor', 'not-allowed');
    activate_channel("channel-3");
    $("#channel-3 .ui-slider-vertical").slider("disable");
    if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
    if (rasterEffect_r != undefined) cancelAnimationFrame(rasterEffect_r);
    if (rasterEffect_f != undefined) cancelAnimationFrame(rasterEffect_f);
    if (rasterZoomEffect != undefined) cancelAnimationFrame(rasterZoomEffect);
    deactivate_round_btn("#confocal .lfm-btn");
    $("#fps-txt").html("0.125");
}

// ======================= END ======================== //
// ======================= START ======================== //
const jumpto_pinhole = () => {
    $("#ost-txt").html("1.45&#181;m");
    displayed_img = sprites[26][4];
    draw_single();
    reset_slider("#laser3", 20);
    reset_slider("#gain3", 45);
    reset_slider("#offset3", 0);
    reset_slider("#zpos", 57);
    reset_dd("#look-up", 3, 3);
    reset_dd("#image-size", 2, 2);
    reset_dd("#pinhole-size", 4, 4);
    reset_dd("#objective", 4, 4);
    $("#channel-3-checkbox").prop('checked', true);
    $("#channel-3-checkbox").prop('disabled', false);
    $('#channel-3-checkbox').css('cursor', 'not-allowed');
    activate_channel("channel-3");
    $("#channel-3 .ui-slider-vertical").slider("disable");
    $("#planes-modal").toggleClass("totally-hidden", false);
    deactivate_round_btn("#confocal .lfm-btn");
    if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
    if (rasterEffect_r != undefined) cancelAnimationFrame(rasterEffect_r);
    if (rasterEffect_f != undefined) cancelAnimationFrame(rasterEffect_f);
    if (rasterZoomEffect != undefined) cancelAnimationFrame(rasterZoomEffect);
    $("#fps-txt").html("0.125");
    $("#ost").toggleClass("label-disabled", false);
}

// ======================= END ======================== //
// ======================= START ======================== //
const jumpto_dwell = () => {
    deactivate_sqr_btn("#confocal-back-btn");
    $("#ost-txt").html("1.12&#181;m");
    displayed_img = sprites[34][3];
    draw_single();
    reset_dd("#look-up", 2, 3);
    reset_dd("#objective", 4, 4);
    reset_slider("#laser3", 20);
    reset_slider("#gain3", 45);
    reset_slider("#offset3", 0);
    reset_slider("#zpos", 57);
    reset_dd("#image-size", 3, 3);
    $("#channel-3-checkbox").prop('checked', true);
    $("#channel-3-checkbox").prop('disabled', false);
    $('#channel-3-checkbox').css('cursor', 'not-allowed');
    activate_channel("channel-3");
    $("#channel-3 .ui-slider-vertical").slider("disable");
    deactivate_round_btn("#confocal .lfm-btn");
    if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
    if (rasterEffect_r != undefined) cancelAnimationFrame(rasterEffect_r);
    if (rasterEffect_f != undefined) cancelAnimationFrame(rasterEffect_f);
    if (rasterZoomEffect != undefined) cancelAnimationFrame(rasterZoomEffect);
    deactivate_dd("#image-size");
    reset_dd("#pinhole-size", 4, 1);
}

// ======================= END ======================== //
// ======================= START ======================== //
const jumpto_parrays = () => {
    $("#ost-txt").html("1.45&#181;m");
    deactivate_sqr_btn("#confocal-back-btn");
    displayed_img = sprites[35][5];
    draw_single();
    reset_dd("#look-up", 3, 3);
    deactivate_dd("#look-up");
    $("#dwell-modal").toggleClass("totally-hidden", true);
    reset_dd("#objective", 4, 4);
    reset_slider("#laser3", 20);
    reset_slider("#gain3", 45);
    reset_slider("#offset3", 0);
    reset_slider("#zpos", 57);
    reset_dd("#image-size", 3, 3);
    reset_dd("#pinhole-size", 4, 4);
    $("#channel-3-checkbox").prop('checked', true);
    $("#channel-3-checkbox").prop('disabled', false);
    $('#channel-3-checkbox').css('cursor', 'not-allowed');
    activate_channel("channel-3");
    $("#channel-3 .ui-slider-vertical").slider("disable");
    deactivate_round_btn("#confocal .lfm-btn");
    deactivate_dd("#image-size");
    if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
    if (rasterEffect_r != undefined) cancelAnimationFrame(rasterEffect_r);
    if (rasterEffect_f != undefined) cancelAnimationFrame(rasterEffect_f);
    if (rasterZoomEffect != undefined) cancelAnimationFrame(rasterZoomEffect);
    fRate = 6;
}

// ======================= END ======================== //
// ======================= START ======================== //
const jumpto_multichannel = () => {
    $("#ost-txt").html("1.45&#181;m");
    deactivate_sqr_btn("#confocal-back-btn");
    displayed_img = sprites[36][5];
    draw_single();
    reset_dd("#look-up", 3, 3);
    reset_dd("#objective", 4, 4);
    reset_slider("#laser3", 20);
    reset_slider("#gain3", 45);
    reset_slider("#offset3", 0);
    reset_slider("#zpos", 57);
    reset_dd("#image-size", 2, 2);
    reset_dd("#pinhole-size", 4, 4);
    reset_dd("#pixel-dwell", 2, 2);
    $("#channel-3-checkbox").prop('checked', true);
    $("#channel-3-checkbox").prop('disabled', false);
    $('#channel-3-checkbox').css('cursor', 'not-allowed');
    activate_channel("channel-3");
    $("#channel-3 .ui-slider-vertical").slider("disable");
    save_w_h = 1024;
    $("#zoom").slider("value", 0);
    deactivate_slider("#zoom");
    if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
    if (rasterEffect_r != undefined) cancelAnimationFrame(rasterEffect_r);
    if (rasterEffect_f != undefined) cancelAnimationFrame(rasterEffect_f);
    if (rasterZoomEffect != undefined) cancelAnimationFrame(rasterZoomEffect);
    deactivate_round_btn("#confocal .lfm-btn");
}

// ======================= END ======================== //
// ======================= START ======================== //
const jumpto_zstack = () => {
    $("#ost-txt").html("1.63&#181;m");
    deactivate_sqr_btn("#confocal-back-btn");
    deactivate_round_btn("#confocal .lfm-btn");
    reset_dd("#look-up", 3, 3);
    reset_dd("#objective", 4, 4);
    reset_dd("#scan-mode", 2, 2);
    reset_dd("#image-size", 3, 3);
    reset_dd("#pinhole-size", 4, 4);
    reset_dd("#pixel-dwell", 2, 2);
    reset_slider("#laser2", 20);
    reset_slider("#gain2", 45);
    reset_slider("#offset2", 0);
    reset_slider("#laser3", 20);
    reset_slider("#gain3", 45);
    reset_slider("#offset3", 0);
    reset_slider("#laser4", 20);
    reset_slider("#gain4", 45);
    reset_slider("#offset4", 0);
    $("#channel-2-checkbox").prop('checked', true);
    $("#channel-2-checkbox").prop('disabled', false);
    $('#channel-2-checkbox').css('cursor', '');
    activate_channel("channel-2");
    $("#channel-2 .ui-slider-vertical").slider("disable");
    $("#channel-3-checkbox").prop('checked', true);
    $("#channel-3-checkbox").prop('disabled', false);
    $('#channel-3-checkbox').css('cursor', 'not-allowed');
    activate_channel("channel-3");
    $("#channel-3 .ui-slider-vertical").slider("disable");
    $("#channel-4-checkbox").prop('checked', true);
    $("#channel-4-checkbox").prop('disabled', false);
    $('#channel-4-checkbox').css('cursor', '');
    activate_channel("channel-4");
    $("#channel-4 .ui-slider-vertical").slider("disable");
    $("#zpos").slider("option", "max", 209);
    reset_slider("#zpos", 114);
    $("#zoom").slider("value", 0);
    deactivate_slider("#zoom");
    if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
    if (rasterEffect_r != undefined) cancelAnimationFrame(rasterEffect_r);
    if (rasterEffect_f != undefined) cancelAnimationFrame(rasterEffect_f);
    if (rasterZoomEffect != undefined) cancelAnimationFrame(rasterZoomEffect);
    $("#multich04-modal").toggleClass("totally-hidden", true);
    deactivate_round_btn("#confocal .lfm-btn");
    deactivate_dd("#scan-mode");
    deactivate_dd("#image-size");
    $("#ost").toggleClass("label-disabled", false);
}

// ======================= END ======================== //
// ======================= START ======================== //

function saveIMG(filename, href_id = "#bf-microimgs img.bf-visible") {
    /// create an "off-screen" anchor tag
    var lnk = document.createElement('a'),
        e;
    /// the key here is to set the download attribute of the a tag
    lnk.download = filename;
    /// convert canvastoPrint content to data-uri for link. When download
    /// attribute is set the content pointed to by link will be
    /// pushed as "download" in HTML5 capable browsers
    lnk.href = $(href_id).attr('src');;
    /// create a "fake" click-event to trigger the download
    if (document.createEvent) {
        e = document.createEvent("MouseEvents");
        e.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        lnk.dispatchEvent(e);
    } else if (lnk.fireEvent) {
        lnk.fireEvent("onclick");
    }
}
// ======================= END ======================== //
// ======================= START ======================== //                
function saveCANVAS(canvastoPrint, filename) {
    let resizedCanvas = document.createElement("canvas");
    let resizedContext = resizedCanvas.getContext("2d");
    resizedCanvas.height = save_w_h;
    resizedCanvas.width = save_w_h;
    resizedContext.drawImage(canvastoPrint, 0, 0, save_w_h, save_w_h);

    /// create an "off-screen" anchor tag
    var lnk = document.createElement('a'),
        e;
    lnk.download = filename;
    lnk.href = resizedCanvas.toDataURL();
    /// create a "fake" click-event to trigger the download
    if (document.createEvent) {
        e = document.createEvent("MouseEvents");
        e.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        lnk.dispatchEvent(e);
    } else if (lnk.fireEvent) {
        lnk.fireEvent("onclick");
    }
}
// ======================= END ======================== //

// ======================= FAST FORWARD FOR BENCHMARK ======================== //
// 将模拟器快进到某个子任务开始前的状态，便于单独测试。任务范围：到 BF capture 为止（L1-L12）。
window.LFM_fast_forward_to_subtask = function (subtaskId) {
    const markSuccess = function (id) {
        if (window.LFM_BENCHMARK_API && typeof window.LFM_BENCHMARK_API.markSubtaskSuccess === "function") {
            window.LFM_BENCHMARK_API.markSubtaskSuccess(id);
        }
    };
    const markPrefix = function (ids) {
        ids.forEach(function (id) { markSuccess(id); });
    };
    var runSteps = function (n) {
        try {
            for (var i = 1; i <= n; i++) {
                if (typeof window["LFM_step_" + i] === "function") window["LFM_step_" + i]();
            }
        } catch (e) { console.warn("LFM_fast_forward:", e); }
    };

    switch (subtaskId) {
        case "L1": break;
        case "L2":
            markSuccess("L1");
            runSteps(1);
            // 模拟 L1 完成后的 UI 状态：样品已放到载物台上
            try {
                var ds = document.getElementById("dropsample");
                if (ds) { ds.style.fill = "cyan"; $(ds).addClass("sample-highlight"); ds.style.opacity = "0.5"; }
                $("#sample-frame").addClass("totally-hidden");
                $("#dragsample").addClass("totally-hidden");
            } catch (e) { console.warn("LFM_fast_forward L2 UI:", e); }
            break;
        case "L3":
            markPrefix(["L1", "L2"]);
            runSteps(3);  // 需执行到 LFM_step_3 才能显示卤素灯按钮
            try {
                // 勾选 SETUP & BRIGHTFIELD，与手动完成 L2 后的状态一致
                $(".bf-checkbox").prop("checked", true);
                // 确保 INSERT 区域可交互：移除可能阻挡点击的 disabledd-channel，并再次激活卤素灯按钮
                $("#bf-insert").removeClass("disabledd-channel");
                $("#bf-mode").removeClass("disabledd-channel");
                $("#insert-title").removeClass("label-disabled");
                if (typeof activate_round_btn === "function") activate_round_btn("#halogen-btn");
                $("#halogen-btn").prop("disabled", false).removeClass("btn-disabled");
                $("#tungst-div").removeClass("div-disabled");
            } catch (e) { console.warn("LFM_fast_forward L3:", e); }
            break;
        case "L4":
            markPrefix(["L1", "L2", "L3"]);
            runSteps(4);  // 执行到 step 4 显示显微镜画面、10x 和 Focus
            try {
                // 设置显微画面为 10x 肾脏细胞图像，否则 bf-mid-img 无 src 会显示全白
                var imgsrc = null;
                if (typeof set_microimgs_fun === "function" && sprites[0] && sprites[0].length > 4) {
                    set_microimgs_fun(0, 7, "#bf_set01_5");
                    imgsrc = $("#bf-microimgs img.bf-visible").attr("src") || ($("#bf-microimgs img").length > 4 ? $("#bf-microimgs img").eq(4).attr("src") : null);
                }
                if (!imgsrc) {
                    imgsrc = "images/simulator/LM/micrographs/10x_kidney_5.jpg";
                }
                $("#bf-mid-img").attr("src", imgsrc);
            } catch (e) { console.warn("LFM_fast_forward L4:", e); }
            break;
        case "L5":
            markPrefix(["L1", "L2", "L3", "L4"]);
            runSteps(6);  // 执行到 step 6 才能激活 FIELD DIAPHRAGM 滑块
            try {
                var imgsrc = null;
                if (typeof set_microimgs_fun === "function" && sprites[0] && sprites[0].length > 4) {
                    set_microimgs_fun(0, 7, "#bf_set01_5");
                    imgsrc = $("#bf-microimgs img.bf-visible").attr("src") || ($("#bf-microimgs img").length > 4 ? $("#bf-microimgs img").eq(4).attr("src") : null);
                }
                if (!imgsrc) imgsrc = "images/simulator/LM/micrographs/10x_kidney_5.jpg";
                $("#bf-mid-img").attr("src", imgsrc);
                $("#bf-microimgs img").removeClass("bf-visible");
                $("#bf-microimgs img").eq(4).addClass("bf-visible");
                // 模拟 L4 完成：对焦滑块调到 40-45 范围（已对焦），然后停用
                $("#bf-focus1").slider("value", 42);
                if (typeof deactivate_slider === "function") deactivate_slider("#bf-focus1");
                // FIELD DIAPHRAGM 保持默认 30（打开），用户需向右推到底关闭
                $("#bf-fdiaphragm").slider("value", 30);
            } catch (e) { console.warn("LFM_fast_forward L5:", e); }
            break;
        case "L6":
            markPrefix(["L1", "L2", "L3", "L4", "L5"]);
            try {
                $("#imaging-tab").addClass("totally-hidden");
                $("#condenser-tab").removeClass("totally-hidden").removeClass("totally-hiddenn");
            } catch (e) {}
            runSteps(7);  // 执行到 step 7 才能激活 CONDENSER FOCUS 滑块
            try {
                // 模拟 L5 完成：视场光阑已关闭（value=100），并停用
                $("#bf-fdiaphragm").slider("value", 100);
                if (typeof scroll_equation === "function") {
                    diaphg_scale = scroll_equation(100, 0, 100, 14.0, 2.0);
                    diaphg_blur = scroll_equation(100, 0, 100, 1.5, 2.5);
                }
                if (typeof diapragm_pos_fn === "function") diapragm_pos_fn(diaphg_x, diaphg_y, diaphg_scale);
                if (typeof diaphg_fx !== "undefined" && diaphg_fx) diaphg_fx.setAttribute("stdDeviation", String(diaphg_blur || 2.5));
                if (typeof deactivate_slider === "function") deactivate_slider("#bf-fdiaphragm");
                if (typeof activate_slider === "function") activate_slider("#bf-cfocus");
                $("#bf-cfocus").slider("enable");
                $("#bf-cfocus-label").removeClass("label-disabled");
                var imgsrc = (sprites[0] && sprites[0].length > 4) ? ($("#bf-microimgs img.bf-visible").attr("src") || $("#bf-microimgs img").eq(4).attr("src")) : null;
                if (!imgsrc) imgsrc = "images/simulator/LM/micrographs/10x_kidney_5.jpg";
                $("#bf-mid-img").attr("src", imgsrc);
            } catch (e) { console.warn("LFM_fast_forward L6:", e); }
            break;
        case "L7":
            markPrefix(["L1", "L2", "L3", "L4", "L5", "L6"]);
            try {
                $("#imaging-tab").addClass("totally-hidden");
                $("#condenser-tab").removeClass("totally-hidden").removeClass("totally-hiddenn");
            } catch (e) {}
            runSteps(8);  // 执行到 step 8 才能激活 CONDENSER POSITIONING
            try {
                $("#bf-fdiaphragm").slider("value", 100);
                if (typeof diapragm_pos_fn === "function") {
                    diaphg_scale = (typeof scroll_equation === "function") ? scroll_equation(100, 0, 100, 14.0, 2.0) : 2.0;
                    diapragm_pos_fn(diaphg_x, diaphg_y, diaphg_scale);
                }
                $("#bf-cfocus").slider("value", 84);
                diaphg_blur = 0;
                if (typeof diaphg_fx !== "undefined" && diaphg_fx) diaphg_fx.setAttribute("stdDeviation", "0");
                if (typeof activate_condenserPos === "function") activate_condenserPos();
                var imgsrc = null;
                if (typeof set_microimgs_fun === "function" && sprites[0] && sprites[0].length > 4) {
                    set_microimgs_fun(0, 7, "#bf_set01_5");
                    imgsrc = $("#bf-microimgs img.bf-visible").attr("src") || $("#bf-microimgs img").eq(4).attr("src");
                }
                if (!imgsrc) imgsrc = "images/simulator/LM/micrographs/10x_kidney_5.jpg";
                $("#bf-mid-img").attr("src", imgsrc);
            } catch (e) { console.warn("LFM_fast_forward L7:", e); }
            break;
        case "L8":
            markPrefix(["L1", "L2", "L3", "L4", "L5", "L6", "L7"]);
            try {
                $("#imaging-tab").addClass("totally-hidden");
                $("#condenser-tab").removeClass("totally-hidden").removeClass("totally-hiddenn");
                diaphg_x = 0;
                diaphg_y = 0;
            } catch (e) {}
            runSteps(9);  // 执行到 step 9 才能激活 FIELD DIAPHRAGM 滑块
            try {
                $("#bf-fdiaphragm").slider("value", 100);
                if (typeof diapragm_pos_fn === "function") {
                    diaphg_scale = (typeof scroll_equation === "function") ? scroll_equation(100, 0, 100, 14.0, 2.0) : 2.0;
                    diapragm_pos_fn(0, 0, diaphg_scale);
                }
                $("#bf-cfocus").slider("value", 84);
                diaphg_blur = 0;
                if (typeof diaphg_fx !== "undefined" && diaphg_fx) diaphg_fx.setAttribute("stdDeviation", "0");
                if (typeof deactivate_condenserPos === "function") deactivate_condenserPos();
                var imgsrc = null;
                if (typeof set_microimgs_fun === "function" && sprites[0] && sprites[0].length > 4) {
                    set_microimgs_fun(0, 7, "#bf_set01_5");
                    imgsrc = $("#bf-microimgs img.bf-visible").attr("src") || $("#bf-microimgs img").eq(4).attr("src");
                }
                if (!imgsrc) imgsrc = "images/simulator/LM/micrographs/10x_kidney_5.jpg";
                $("#bf-mid-img").attr("src", imgsrc);
            } catch (e) { console.warn("LFM_fast_forward L8:", e); }
            break;
        case "L9": markPrefix(["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"]); runSteps(11); break;
        case "L10":
            markPrefix(["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9"]);
            runSteps(14);  // 执行到 step 14：MOVE SLIDE 与 IMAGING SOFTWARE 已启用，用户尚未操作
            try {
                $("#imaging-tab").removeClass("totally-hidden");
                $("#condenser-tab").addClass("totally-hidden");
                $("#bf-noeyepiece").addClass("bf-invisible").removeClass("bf-visible");
                $("#bf-wh-balance").removeClass("bf-invisible").addClass("bf-visible");
                if (typeof set_microimgs_fun === "function" && sprites[0] && sprites[0].length > 4) {
                    set_microimgs_fun(0, 7, "#bf-wh-balance");
                }
                $("#bf-wh-balance").attr("src", ($("#bf-wh-balance").attr("src") || "images/simulator/LM/micrographs/10x_kidney_11.jpg"));
                $("#bf-wh-balance").css("transform", "translateX(0px)");
                $("#bf-moveslide").slider("value", 100);
                if (typeof activate_slider === "function") activate_slider("#bf-moveslide");
                if (typeof activate_sqr_btn === "function") activate_sqr_btn("#imgsoft-btn");
                diaphg_scale = 9.7;
                diaphg_x = 0;
                diaphg_y = 0;
                if (typeof diapragm_pos_fn === "function") diapragm_pos_fn(0, 0, 9.7);
                $("#eyepiece-svg").addClass("totally-hidden");
                $("#bf-micrographs").addClass("bf-view-large");
            } catch (e) { console.warn("LFM_fast_forward L10:", e); }
            break;
        case "L11":
            markPrefix(["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10"]);
            runSteps(17);
            try {
                $("#eyepiece-svg").addClass("totally-hidden");
                $("#imaging-modal").toggleClass("totally-hidden", false);
                if (typeof deactivate_sqr_btn === "function") deactivate_sqr_btn("#white-btn");
                if (typeof activate_slider === "function") activate_slider("#exposure");
                $("#exposure-vals p").toggleClass("label-disabled", false);
                if (typeof activate_sqr_btn === "function") activate_sqr_btn("#lut-btn");
                diaphg_scale = 9.7;
                diaphg_x = 0;
                diaphg_y = 0;
                if (typeof diapragm_pos_fn === "function") diapragm_pos_fn(0, 0, 9.7);
                $("#bf-micrographs").addClass("bf-view-large");
            } catch (e) { console.warn("LFM_fast_forward L11:", e); }
            break;
        case "L12":
            markPrefix(["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "L11"]);
            runSteps(18);
            try {
                $("#eyepiece-svg").addClass("totally-hidden");
                $("#imaging-btn").click();
                $("#imaging-modal").toggleClass("totally-hidden", false);
                if (typeof deactivate_sqr_btn === "function") deactivate_sqr_btn("#white-btn");
                if (typeof activate_slider === "function") activate_slider("#exposure");
                $("#exposure-vals p").toggleClass("label-disabled", false);
                if (typeof activate_sqr_btn === "function") {
                    activate_sqr_btn("#lut-btn");
                    activate_sqr_btn("#bf-capture-btn");
                }
                if (typeof set_microimgs_fun === "function") set_microimgs_fun(1, 7, "#bf_set02_3");
                LUT_bool = true;
                diaphg_scale = 9.7;
                diaphg_x = 0;
                diaphg_y = 0;
                if (typeof diapragm_pos_fn === "function") diapragm_pos_fn(0, 0, 9.7);
                $("#bf-micrographs").addClass("bf-view-large");
            } catch (e) { console.warn("LFM_fast_forward L12:", e); }
            break;
        default:
            console.warn("LFM_fast_forward_to_subtask: unknown subtaskId:", subtaskId);
    }
};
// ======================= END FAST FORWARD FOR BENCHMARK ======================== //
