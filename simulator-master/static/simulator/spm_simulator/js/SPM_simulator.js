/* LM simulator javascript functions    
Created  by Andres Vasquez for AMMRF'S https://www.myscope.training
info@andresvasquez.net  —— https://www.andresvasquez.net ——
copyright:This work is licensed under a Creative Commons Attribution 4.0 International License.
************************************************************************/
var canvas_tip = document.querySelector("#tip-area");
var ctx_tip = canvas_tip.getContext("2d");
var canvas_micrograph = document.querySelector("#micrograph");
var ctx_micrograph = canvas_micrograph.getContext("2d");
var canvas_glitch = document.querySelector("#micrograph-glitch");
var ctx_glitch = canvas_glitch.getContext("2d");
var canvas_profile = document.querySelector("#profile-canvas");
var ctx_profile = canvas_profile.getContext("2d");
var canvas_dark = document.querySelector("#micrograph-dark");
var ctx_dark = canvas_dark.getContext("2d");
var canvas_scanline = document.querySelector("#micrograph-scanline");
var ctx_scanline = canvas_scanline.getContext("2d");
var bufferC_01 = document.createElement("canvas");
var bufferCtx_01 = bufferC_01.getContext("2d");
var bufferC_02 = document.createElement("canvas");
var bufferCtx_02 = bufferC_02.getContext("2d");
var bufferC_03 = document.createElement("canvas");
var bufferCtx_03 = bufferC_03.getContext("2d");
var invisible_canvas = document.createElement("canvas");
var invisible_ctx = invisible_canvas.getContext("2d");
var orange_target = document.getElementById("orange-target");
var t_down = document.getElementById("tapping-tip-down");
var t_up = document.getElementById("tapping-tip-up");
var c_down = document.getElementById("contact-tip-down");
var c_up = document.getElementById("contact-tip-up");
var laser_spot = document.getElementById("laser-spot");
var diode = document.getElementById("diode");
var oval = document.getElementById("oval");
var d1 = document.getElementById("d1");
var d2 = document.getElementById("d2");
var d3 = document.getElementById("d3");
var d4 = document.getElementById("d4");


// ======================= START ======================== //
var tapping_svg = document.getElementById("tapping");
var contact_svg = document.getElementById("contact");
var focus_blur = document.getElementById("focus-blur");
var line_bottom = document.getElementById("line-bottom");
var line_top = document.getElementById("line-top");

canvas_glitch.style.filter = "brightness(0.8)";
invisible_canvas.setAttribute("id", "invisible-canvas");
var close_area_modal = 0;
promise_fullfilled_num = 0;
sprites = [];
var xpos;
var ypos;
var tapping = false;
var signal_bool = false;
var centering_bool = false;
var bools = false;
var freq_from_bool = false;
var freq_to_bool = false;
var start_scan_bool = false;
var integral_bool = false;
var scan_rate_bool = false;
var set_point_bool = false;
var motor_bool = false;
var double_bool = false;
var offset = 25;
var current_ypos;
var current_diodepos;

var scan_micrograph;
var scan_micrograph_img;
var turbulence = document.getElementById("svg-turbulence");
var blur_fx = document.getElementById("svg-blur");
var frame_rate;
var spm_noise;
var glitch_num = 0;
var alpha_num = 0;
var integral_val = 0;
var scan_size_val = 0;
var id_num = 0;
var tapping_num = 0;
var contact_num = 0;
var modal_text = "";
var _y_array = [];
var _y = 0;
var translateL;
var translateR;

var anim_bool = true;
var scan_animation;
var scan_animation_rate = 100;
var cantilever_rotation;
var cantilever_angle = 0.5;
var scan_rotation_rate = 50;
var blur_val;
var laser_init_ypos = 75;
var laserScan_ypos = laser_init_ypos;

var top_y1 = 39.5;
var top_y2 = 39.51;
var bottom_y1 = 40.5;
var bottom_y2 = 40.51;
var laser_ypos_difference = 0;
var temp_y_orig_diff;
var temp_y_diff;
var hitting_bool = false;
var freq_val;
var current_tvCounter;
var incrementTimeout;
var speed = 500;
var inside_x;
var inside_y;
var x_unit;
var y_unit;
var prev_x_unit;
var prev_y_unit;
var spinn_bool = true;
var hit_tapping_1 = [[121, 101], [129, 130], [150, 118]];
var hit_tapping_2 = [[121, 101], [129, 130], [100, 113]];
var hit_contact_1 = [[92, 118], [127, 97], [145, 128]];
var no_hit_contact_1 = [[125, 111], [102, 112], [120, 101]];
var no_hit_contact_2 = [[125, 111], [102, 112], [119, 114]];
var tapping_overlap = [[121, 101], [150, 84], [150, 118]];
var contact_overlap = [[145, 87], [127, 97], [145, 128]];
var stage_animation;
var c_setpoint_val = 0;
var c_set_pointV = document.getElementById("set-point-val");
var amplitude_val = 200;
var amplitudemV = document.getElementById("amplitude-val");
var scanY_is2_bool = false;
var bf_val = {
    val_both: 0,
    valx: 0,
    valy: 0,
    blur: 0,
    dark_sqr: 0
}

var diode_obj = {
    diodeX: getRandomInt(145, 200),
    diodeY: getRandomInt(2, 30)
}
var motor_obj = {
    sliderVal: 0,
    cantileverY: 0,
    tipY: 15,
    tipBlur: 12,
    alpha: 0.2
}

var reset_bool = false;
var glitch_amount;
// =======================  END END  ==================== //

// ======================= START ======================== //
const reset_vars_fun = () => {
    canvas_glitch.style.filter = "brightness(0.8)";
    invisible_canvas.setAttribute("id", "invisible-canvas");
    close_area_modal = 0;
    //    promise_fullfilled_num = 0;
    //    sprites = [];
    xpos = undefined;
    ypos = undefined;
    tapping = false;
    signal_bool = false;
    centering_bool = false;
    bools = false;
    freq_from_bool = false;
    freq_to_bool = false;
    start_scan_bool = false;
    integral_bool = false;
    scan_rate_bool = false;
    set_point_bool = false;
    motor_bool = false;
    double_bool = false;
    current_ypos = undefined;
    current_diodepos = undefined;

    scan_micrograph = undefined;
    scan_micrograph_img = undefined;
    turbulence = document.getElementById("svg-turbulence");
    blur_fx = document.getElementById("svg-blur");
    frame_rate = undefined;
    spm_noise = undefined;
    glitch_num = 0;
    alpha_num = 0;
    integral_val = 0;
    scan_size_val = 0;
    id_num = 0;
    tapping_num = 0;
    contact_num = 0;
    _y_array = [];
    _y = 0;
    translateL = undefined;
    translateR = undefined;

    anim_bool = true;
    scan_animation;
    scan_animation_rate = 100;
    cantilever_rotation;
    cantilever_angle = 0.5;
    scan_rotation_rate = 50;
    blur_val = undefined;
    laser_init_ypos = 75;
    laserScan_ypos = laser_init_ypos;

    top_y1 = 39.5;
    top_y2 = 39.51;
    bottom_y1 = 40.5;
    bottom_y2 = 40.51;
    laser_ypos_difference = 0;
    temp_y_orig_diff = undefined;
    temp_y_diff = undefined;
    hitting_bool = false;
    freq_val = undefined;
    current_tvCounter = undefined;
    incrementTimeout = undefined;
    speed = 500;
    inside_x = undefined;
    inside_y = undefined;
    x_unit = undefined;
    y_unit = undefined;
    prev_x_unit = undefined;
    prev_y_unit = undefined;
    glitch_amount = undefined;
    spinn_bool = true;
    hit_tapping_1 = [[121, 101], [129, 130], [150, 118]];
    hit_tapping_2 = [[121, 101], [129, 130], [100, 113]];
    hit_contact_1 = [[92, 118], [127, 97], [145, 128]];
    no_hit_contact_1 = [[125, 111], [102, 112], [120, 101]];
    no_hit_contact_2 = [[125, 111], [102, 112], [119, 114]];
    tapping_overlap = [[121, 101], [150, 84], [150, 118]];
    contact_overlap = [[145, 87], [127, 97], [145, 128]];
    stage_animation = undefined;
    c_setpoint_val = 0;
    amplitude_val = 200;
    scanY_is2_bool = false;
    bf_val = {
        val_both: 0,
        valx: 0,
        valy: 0,
        blur: 0,
        dark_sqr: 0
    }

    diode_obj = {
        diodeX: getRandomInt(145, 200),
        diodeY: getRandomInt(2, 30)
    }
    motor_obj = {
        sliderVal: 0,
        cantileverY: 0,
        tipY: 15,
        tipBlur: 12,
        alpha: 0.2
    }

    modal_text = "The Integral gain increases the amount of input signal from the photodiode. <br>Close this window and set an initial value.";
    $("#info-area").html(modal_text);
    toogle_fn("#modal-messages", "totally-hidden", false);

    deactivate_btn("engage");
    deactivate_btn("disengage");

    $("#motor").slider('value', 0);
    $("#motor").slider("disable");
    focus_blur.setStdDeviation(12, 12);

    toogle_fn("#btn-image", "btn-active", true);
    toogle_fn("#btn-profile", "btn-active", true);
    toogle_fn("#btn-tuning", "btn-active", true);

    reset_sample_dd("freq-from");
    reset_sample_dd("freq-to");
    $("#freq-from-button").css("cursor", "pointer");
    //    $("#freq-from-button").css('opacity', '0.35');
    $("#freq-to-button").css("cursor", "pointer");
    //    $("#freq-to-button").css('opacity', '0.35');
    deactivate_btn("auto-tune");
    toogle_fn("#freq-label", "label-disabled", false);
    toogle_fn("#freq-from-label", "label-disabled", false);
    toogle_fn("#freq-to-label", "label-disabled", false);
    toogle_fn("#scan-size-label", "label-disabled", false);
    reset_sample_dd("scan-rate");
    toogle_fn("#scan-rate-label", "label-disabled", false);

    $("#integral-gains").slider('value', 0);
    $("#integral-gains").slider("disable");
    $("#integral-val").html("0");
    toogle_fn("#integral-gains-label", "label-disabled", false);
    toogle_fn("#integral-val", "label-disabled", false);


    c_set_pointV.innerHTML = "0V";
    $("#set-point-slider").slider('value', 100);
    $("#point-val").html("100%");
    $("#set-point-slider").slider("disable");
    $("#set-point-div button").prop("disabled", true);
    toogle_fn("#set-point-label", "label-disabled", false);
    toogle_fn("#set-point-div", "div-disabled", false);
    toogle_fn("#point-slider-label", "label-disabled", false);
    toogle_fn("#point-val", "label-disabled", false);

    amplitudemV.innerHTML = "200mV";
    toogle_fn("#amplitude-label", "label-disabled", false);
    toogle_fn("#amplitude-div", "div-disabled", false);

    $("#amplitude-div button").prop("disabled", true);


    $("#amplitude-div button").css("cursor", "pointer");
    $("#amplitude-div button").css('opacity', '1');


    deactivate_btn("scan");
    deactivate_btn("save");
}
// =======================  END END  ==================== //

var wh = 1280;
var invisible_wh = 102;
canvas_tip.width = 300;
canvas_tip.height = 300;
canvas_micrograph.width = wh;
canvas_micrograph.height = wh;
canvas_glitch.width = wh;
canvas_glitch.height = wh;
canvas_dark.width = wh;
canvas_dark.height = wh;
canvas_scanline.width = wh;
canvas_scanline.height = wh;
bufferC_01.width = wh;
bufferC_01.height = wh;
bufferC_02.width = wh;
bufferC_02.height = wh;
bufferC_03.width = wh;
bufferC_03.height = wh;
canvas_profile.width = wh;
canvas_profile.height = 130;
invisible_canvas.width = invisible_wh;
invisible_canvas.height = invisible_wh;

// =======================  END END  ==================== //
// ======================= START ======================== //
const move_diode_fn = () => {
    diode.style.transform = `translate(${diode_obj.diodeX}px,${diode_obj.diodeY}px)`;
}
// ======================= START ======================== //
const motor_move_fn = () => {
    motor_bool = true;
    tapping_svg.style.transform = `translateY(${motor_obj.cantileverY}px)`;
    contact_svg.style.transform = `translateY(${motor_obj.cantileverY}px)`;
    ctx_tip.clearRect(0, 0, canvas_tip.width, canvas_tip.height);
    diode.style.transform = `translate(${diode_obj.diodeX}px,${diode_obj.diodeY}px)`;
    let tipY = motor_obj.tipY - 15;
    t_down.style.transform = `translate(0, ${tipY}px)`;
    t_up.style.transform = `translate(0, ${tipY*-1}px)`;
    c_down.style.transform = `translate(0, ${tipY}px)`;
    c_up.style.transform = `translate(0, ${tipY*-1}px)`;
    let blur = (motor_obj.tipBlur - 12) * -1;
    if (blur <= 1.5) blur = 1.5;
    focus_blur.setStdDeviation(blur, blur);
    $("#shadow-contact").css('opacity', motor_obj.alpha);
    $("#shadow-tip").css('opacity', motor_obj.alpha);
    draw_laser();
}
// ======================= END ======================== //
// ======================= START ACTIVATE BTN ======================== //
const activate_btn = (btn_id_str) => {
    $("#" + btn_id_str + "-btn").prop("disabled", false);
    $("#" + btn_id_str + "-btn").css("cursor", "pointer");
    toogle_fn("#" + btn_id_str + "-btn", "btn-disabled", true);
}
// ======================= END ======================== //
// ======================= START DEACTIVATE BTN ======================== //
const deactivate_btn = (btn_id_str) => {
    $("#" + btn_id_str + "-btn").prop("disabled", true);
    $("#" + btn_id_str + "-btn").css("cursor", "not-allowed");
    toogle_fn("#" + btn_id_str + "-btn", "btn-disabled", false);
}
// ======================= END ======================== //
// ======================= START DEACTIVATE DROP DOWN ======================== //
const activate_dd = (dd_id_str) => {
    toogle_fn("#" + dd_id_str + "-label", "label-disabled", true);
    $("#" + dd_id_str).selectmenu("enable");
    $("#" + dd_id_str + "-button").css('opacity', '1');
}
// ======================= END ======================== //
// ======================= START DEACTIVATE DROP DOWN ======================== //
const deactivate_dd = (dd_id_str) => {
    $("#" + dd_id_str).selectmenu("disable");
    $("#" + dd_id_str + "-button").css('opacity', '1');
}
// ======================= END ======================== //
// ======================= START ======================== //
const reset_sample_dd = (dd_id_str) => {
    $("#" + dd_id_str).val('a');
    $("#" + dd_id_str + ">option:eq(0)").attr("disabled", true);
    $("#" + dd_id_str + ">option:eq(0)").attr("selected", "selected");
    $("#" + dd_id_str + "-button").css('opacity', '0.35');
    $("#" + dd_id_str).selectmenu("refresh");
    $("#" + dd_id_str).selectmenu("disable");
}
// ======================= END ======================== //  
// ======================= START ======================== //
$(function () {
    // ======================= START SLIDERS ======================== //
    $("#motor").slider({
        range: "min",
        min: 0,
        max: 100,
        step: 5,
        value: 0,
        animate: true,
        slide: function (event, ui) {
            motor_obj.sliderVal = ui.value;
            toogle_fn("#top-instructions", "top-instructions-on", true);
            motor_obj.cantileverY = ui.value * 0.85;
            ypos = current_ypos + ui.value * 0.85;
            motor_obj.tipY = ui.value * 0.20;
            motor_obj.tipBlur = ui.value * 0.15;
            motor_obj.alpha = (ui.value * 0.008) + 0.2;
            diode_obj.diodeY = current_diodepos + ui.value * 0.85;
            motor_move_fn();
            if (ui.value >= 75 && ui.value < 88) {
                if (window.SPM_BENCHMARK_API && typeof window.SPM_BENCHMARK_API.markSubtaskSuccess === "function") {
                    window.SPM_BENCHMARK_API.markSubtaskSuccess("S11");
                }
                engage_fun();
            }
            if (ui.value >= 88) broken_fun();
        },
        stop: function (event, ui) {},
        disabled: true
    });

    $("#sum-signal").slider({
        range: "min",
        min: 0,
        max: 100,
        step: 1,
        value: 0,
        animate: true,
        slide: function (event, ui) {},
        stop: function (event, ui) {},
        disabled: true
    });

    $("#integral-gains").slider({
        range: "min",
        min: 0,
        max: 10,
        step: 1,
        value: 0,
        animate: true,
        slide: function (event, ui) {
            bufferCtx_03.clearRect(0, 0, wh, wh);
            integral_val = ui.value;
            tapping_num = (integral_val < 6) ? 2 : 7;
            contact_num = (integral_val < 6) ? 2 : 8;
            toogle_fn("#top-instructions", "top-instructions-on", true);
            $("#integral-val").html(integral_val);
            updateBF();
        },
        stop: function (event, ui) {
            if (!scan_rate_bool) {
                integral_val = ui.value;
                tapping_num = (integral_val < 6) ? 2 : 7;
                contact_num = (integral_val < 6) ? 2 : 8;
                toogle_fn("#top-instructions", "top-instructions-on", true);
                $("#integral-val").html(integral_val);
                updateBF();
            }
            if (!integral_bool) {
                if (window.SPM_BENCHMARK_API && typeof window.SPM_BENCHMARK_API.markSubtaskSuccess === "function") {
                    window.SPM_BENCHMARK_API.markSubtaskSuccess("S8");
                }
                set_scan_rate_fun();
            }
        },
        disabled: true
    });

    $("#set-point-slider").slider({
        range: "min",
        min: 0,
        max: 100,
        step: 1,
        value: 100,
        animate: true,
        slide: function (event, ui) {
            toogle_fn("#top-instructions", "top-instructions-on", true);
            $("#point-val").html(ui.value + "%");
            blur_fun(ui.value);
            if (ui.value <= 50 && double_bool == false) {
                double_bool = true;
                doubleIt();
            }
        },
        stop: function (event, ui) {
            if (!set_point_bool) {
                if (window.SPM_BENCHMARK_API && typeof window.SPM_BENCHMARK_API.markSubtaskSuccess === "function") {
                    window.SPM_BENCHMARK_API.markSubtaskSuccess("S10");
                }
                set_motor_fun();
            }
        },
        disabled: true
    });

    // =======================  END SLIDERS END  ==================== //
    // ======================= START SELECTMENUS ======================== //
    $("#mode").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "b":
                    //                    $('#scan-size').append('<option id="scan-g-contact" value="g">50&#181;m</option>');
                    contact_mode();
                    break;
                case "c":
                    //                    $('#scan-size').children('option#scan-g-contact').remove();
                    tapping_mode();
                    if (window.SPM_BENCHMARK_API && typeof window.SPM_BENCHMARK_API.markSubtaskSuccess === "function") {
                        window.SPM_BENCHMARK_API.markSubtaskSuccess("S1");
                    }
                    break;
            }
            //            $('#scan-size').selectmenu("refresh");
        }
        //        , disabled: true
    });

    $("#freq-from").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "e":
                    freq_from_bool = true;
                    bools = checking_bools(freq_from_bool, freq_to_bool);
                    if (bools) {
                        if (window.SPM_BENCHMARK_API && typeof window.SPM_BENCHMARK_API.markSubtaskSuccess === "function") {
                            window.SPM_BENCHMARK_API.markSubtaskSuccess("S5");
                        }
                        autotune_fun();
                    }
                    break;
            }
        },
        disabled: true
    });
    $("#freq-to").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "f":
                    freq_to_bool = true;
                    bools = checking_bools(freq_from_bool, freq_to_bool);
                    if (bools) {
                        if (window.SPM_BENCHMARK_API && typeof window.SPM_BENCHMARK_API.markSubtaskSuccess === "function") {
                            window.SPM_BENCHMARK_API.markSubtaskSuccess("S5");
                        }
                        autotune_fun();
                    }
                    break;
            }
        },
        disabled: true
    });
    $("#scan-size").selectmenu({
        select: function (event, data) {
            scan_size_val = data.item.value;
            bufferCtx_03.clearRect(0, 0, wh, wh);
            ctx_glitch.clearRect(0, 0, wh, wh);
            bufferCtx_02.clearRect(0, 0, wh, wh);
            updateBF();
            if (!start_scan_bool && !reset_bool) {
                if (window.SPM_BENCHMARK_API && typeof window.SPM_BENCHMARK_API.markSubtaskSuccess === "function") {
                    window.SPM_BENCHMARK_API.markSubtaskSuccess("S7");
                }
                set_integral_fun();
            }
        },
        disabled: true
    });
    $("#scan-rate").selectmenu({
        select: function (event, data) {
            if (start_scan_bool) current_tvCounter = scan_micrograph.tvCounter;
            switch (data.item.value) {
                case "b":
                    frame_rate = 0.1;
                    scan_animation_rate = 260;
                    bufferCtx_03.clearRect(0, 0, wh, wh);
                    break;
                case "c":
                    frame_rate = 0.3;
                    scan_animation_rate = 230;
                    bufferCtx_03.clearRect(0, 0, wh, wh);
                    break;
                case "d":
                    frame_rate = 0.5;
                    scan_animation_rate = 200;
                    bufferCtx_03.clearRect(0, 0, wh, wh);
                    break;
                case "e":
                    frame_rate = 1;
                    scan_animation_rate = 170;
                    bufferCtx_03.clearRect(0, 0, wh, wh);
                    break;
                case "f":
                    frame_rate = 2;
                    glitch_amount = 2;
                    scan_animation_rate = 130;
                    bufferCtx_03.clearRect(0, 0, wh, wh);
                    if (start_scan_bool) spm_noise.glitch();
                    break;
                case "g":
                    frame_rate = 4;
                    glitch_amount = 4;
                    scan_animation_rate = 120;
                    bufferCtx_03.clearRect(0, 0, wh, wh);
                    if (start_scan_bool) spm_noise.glitch();
                    break;
                case "h":
                    frame_rate = 7;
                    glitch_amount = 8;
                    scan_animation_rate = 110;
                    bufferCtx_03.clearRect(0, 0, wh, wh);
                    if (start_scan_bool) spm_noise.glitch();
                    break;
                case "i":
                    frame_rate = 10;
                    glitch_amount = 16;
                    scan_animation_rate = 100;
                    if (start_scan_bool) spm_noise.glitch();
                    break;
                case "j":
                    frame_rate = 14;
                    glitch_amount = 32;
                    scan_animation_rate = 90;
                    if (start_scan_bool) spm_noise.glitch();
                    break;
            }
            if (start_scan_bool) stage_anim_fun();
            if (!start_scan_bool && !reset_bool) {
                if (window.SPM_BENCHMARK_API && typeof window.SPM_BENCHMARK_API.markSubtaskSuccess === "function") {
                    window.SPM_BENCHMARK_API.markSubtaskSuccess("S9");
                }
                set_point_fun();
            }
            if (scan_micrograph) scan_micrograph.fRate = frame_rate;
            if (frame_rate < 5) {
                bf_val.valy = 0;
            } else {
                bf_val.valy = scroll_equation(integral_val, 5, 30, 0, 0.2);
            }
            freq_val = 0 + " " + bf_val.valy;
        },
        change: function (event, data) {
            if (start_scan_bool) scan_micrograph.tvCounter = current_tvCounter;
        },
        disabled: true
    });

    // =======================  END SELECTMENUS END  ==================== //
});
// ======================= START ======================== //
for (let i = 0; i <= promise_fullfilled_num + 1; i++) {
    sprites[i] = new Array();
}

const do_when_done = (max, str_id, images_arr) => {
    for (let i = 1; i <= max; i++) {
        images_arr[i - 1] = document.getElementById(`${str_id}_${i}`);
    }
    switch (promise_fullfilled_num) {
        case 0:
            i_promise_file(11, `images/simulator/SPM/micrographs/tapping_`, `tapping_set`, sprites[promise_fullfilled_num], `jpg`);
            break;
        case 1:
            toogle_fn("#modal-loading", "totally-hidden", false);
            toogle_fn("#top-bar", "modal-is-open", true);
            toogle_fn("#simulator-base", "modal-is-open", true);
            //            scan_micrograph = new Channel_scan(contact_set_2, ctx_micrograph, bufferCtx_01);
            //            Loader.jpg("images/simulator/FIB/sequences/5_navcam/nav-cam-photo.jpg", "nav-cam");
            //            Loader.svg("images/simulator/FIB/sequences/patterns_svg/centerpoint.svg", "centerpoint");
            i_promise_file(7, `images/simulator/SPM/micrographs/tuning_`, `tuning_set`, sprites[promise_fullfilled_num], `svg`);
            console.log("sigue prometiendo");
            break;

        default:
    }
    promise_fullfilled_num++;
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

i_promise_file(13, `images/simulator/SPM/micrographs/contact_`, `contact_set`, sprites[promise_fullfilled_num], "jpg");
// =======================  END END  ==================== //
//// ======================= START ======================== //
$("#close-popup").click(() => {
    toogle_fn("#modal-messages", "totally-hidden", false);
    switch (close_area_modal) {
        case 0:
            let caution;
            if (tapping) {
                caution = "Caution. If the amplitude set-point is too low in tapping mode you will be imaging with too much force and you can damage the tip. You will observe the tip damage in your image.";
            } else {
                caution = "Caution. If the set-point is too high in contact mode you will be imaging with too much force and you can damage the tip.";
            }
            modal_text = caution;
            break;
        case 1:
            modal_text = "A good distance from the probe to the surface is about 100&#181;m, at this point the cantilever in the image control window will be nearly in focus.<br>The cantilever's tip may break if you get any closer to the surface.<br>Close this window and move the probe close to surface using the <b>Motor</b> slider.";
            break;
        case 2:
            break;
    }
    $("#info-area").html(modal_text);
    close_area_modal++
});
// ======================= END  ======================== //
//// ======================= START ======================== //
$("#close-save").click(() => {
    toogle_fn("#modal-end", "totally-hidden", false);
});
// ======================= END  ======================== //
// ======================= START ======================== //

$('.spinn-btn').on('mousedown click mouseup mouseleave', e => {
    if (e.type == "mousedown") {
        spinnIt_fn(e.target.id, speed);
    } else {
        stopSpinning();
    }

});
// Increment function
function spinnIt_fn(spin_id, speed) {
    reset_bool = false;
    if (x_unit >= 1 && x_unit <= 92 && y_unit >= 1 && y_unit <= 52) {
        inside_x = xpos;
        inside_y = ypos;
        prev_x_unit = x_unit;
        prev_y_unit = y_unit;
        switch (spin_id) {
            case "alignment-x-up":
                xpos++;
                ypos -= 0.5774;
                x_unit++;
                top_laser_pos();
                break;
            case "alignment-x-down":
                xpos--;
                ypos += 0.5774;
                x_unit--;
                top_laser_pos();
                break;
            case "alignment-y-up":
                ypos--;
                xpos -= 1.7321;
                y_unit--;
                top_laser_pos();
                break;
            case "alignment-y-down":
                ypos++;
                xpos += 1.7321;
                y_unit++;
                top_laser_pos();
                break;
            case "photodiode-x-up":
                spinn_bool = true;
                diode_obj.diodeX++;
                if (diode_obj.diodeX > 210) diode_obj.diodeX = 210;
                move_diode_fn();
                break;
            case "photodiode-x-down":
                spinn_bool = true;
                diode_obj.diodeX--;
                if (diode_obj.diodeX < 100) diode_obj.diodeX = 100;
                move_diode_fn();
                break;
            case "photodiode-y-up":
                spinn_bool = true;
                diode_obj.diodeY--;
                if (diode_obj.diodeY < 2) diode_obj.diodeY = 2;
                move_diode_fn();
                break;
            case "photodiode-y-down":
                spinn_bool = true;
                diode_obj.diodeY++;
                if (diode_obj.diodeY > 90) diode_obj.diodeY = 90;
                move_diode_fn();
                break;
        }
    } else {
        ypos = inside_y;
        xpos = inside_x;
        x_unit = prev_x_unit;
        y_unit = prev_y_unit;
    }

    ctx_tip.clearRect(0, 0, canvas_tip.width, canvas_tip.height);
    draw_laser();
    incrementTimeout = setTimeout(() => {
        if (spinn_bool) {
            spinnIt_fn(spin_id, speed * 0.8);
        } else {
            centering_bool = true;
        }
    }, speed);
}

function stopSpinning() {
    clearTimeout(incrementTimeout);
}
// ======================= END ======================== //


// ======================= START ======================== //
const alignment_fn = () => {
    let a = 135 - xpos;
    let b = 122 - ypos;
    let h = Math.floor(Math.hypot(a, b));
    let signal;
    if (hitting_bool) {
        signal = scroll_equation(h, 20, 0, 0, 100);
    } else {
        signal = 0;
    }
    $("#sum-signal").slider("value", signal);
    if (signal >= 97) {
        oval.setAttribute("stroke-width", "2");
        instruction = "Use the <b>Photodiode</b> controllers to move laser spot to the centre of photodiode.";
        if (!signal_bool) showInstruction(instruction);
        signal_bool = true;
        if (window.SPM_BENCHMARK_API && typeof window.SPM_BENCHMARK_API.markSubtaskSuccess === "function") {
            window.SPM_BENCHMARK_API.markSubtaskSuccess("S2");
        }
        spinn_bool = false;
        $(".aligment-div button").prop("disabled", true);
        toogle_fn("#aligment-label", "label-disabled", false);
        toogle_fn(".aligment-div", "div-disabled", false);
        $(".photodiode-div button").prop("disabled", false);
        toogle_fn("#photodiode-label", "label-disabled", true);
        toogle_fn(".photodiode-div", "div-disabled", true);

    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const diode_alpha_fn = () => {
    let a = (diode_obj.diodeX + 40) - (xpos + 75);
    let b = (diode_obj.diodeY + 40) - (ypos - 75);
    let h = Math.floor(Math.hypot(a, b));
    if (h > 20) h = 20;
    let d_alpha = scroll_equation(h, 20, 0, 0.4, 1.0);
    return d_alpha;
}
// ======================= END ======================== //
// ======================= START ======================== //
const diode_highlight_fn = () => {
    let d_alpha = diode_alpha_fn();
    let bent_posX = xpos + 75;
    let bent_posY = ypos - 75;
    let diode_centerX = diode_obj.diodeX + 40;
    let diode_centerY = diode_obj.diodeY + 40;
    (bent_posX < diode_centerX && bent_posY < diode_centerY) ? $("#d1").css('opacity', d_alpha): $("#d1").css('opacity', "0.2");
    (bent_posX > diode_centerX && bent_posY < diode_centerY) ? $("#d2").css('opacity', d_alpha): $("#d2").css('opacity', "0.2");
    (bent_posX > diode_centerX && bent_posY > diode_centerY) ? $("#d3").css('opacity', d_alpha): $("#d3").css('opacity', "0.2");
    (bent_posX < diode_centerX && bent_posY > diode_centerY) ? $("#d4").css('opacity', d_alpha): $("#d4").css('opacity', "0.2");
}
// ======================= END ======================== //
// ======================= START ======================== //
const centering_diode_fn = () => {
    let d_alpha = diode_alpha_fn();
    let bent_posX = xpos + 75;
    let bent_posY = ypos - 75;
    let diode_centerX = diode_obj.diodeX + 40;
    let diode_centerY = diode_obj.diodeY + 40;
    if (d_alpha < 1) {
        if (bent_posX < diode_centerX + 5 && bent_posY < diode_centerY + 5) $("#d1").css('opacity', d_alpha);
        if (bent_posX > diode_centerX - 5 && bent_posY < diode_centerY + 5) $("#d2").css('opacity', d_alpha);
        if (bent_posX > diode_centerX - 5 && bent_posY > diode_centerY - 5) $("#d3").css('opacity', d_alpha);
        if (bent_posX < diode_centerX + 5 && bent_posY > diode_centerY - 5) $("#d4").css('opacity', d_alpha);
    } else {
        centering_bool = false;
        spinn_bool = false;
        $(".photodiode-div button").prop("disabled", true);
        toogle_fn("#photodiode-label", "label-disabled", false);
        toogle_fn(".photodiode-div", "div-disabled", false);
        if (window.SPM_BENCHMARK_API && typeof window.SPM_BENCHMARK_API.markSubtaskSuccess === "function") {
            window.SPM_BENCHMARK_API.markSubtaskSuccess("S3");
        }
        tapping ? set_amplitude() : set_scan();
    }
}
// ======================= END ======================== //

// ======================= START ======================== //
const top_laser_pos = () => {
    alignment_fn();
    laser_spot.style.transform = `translate(${(y_unit*-3)+200}px,${(x_unit*1.75)+20}px)`;
}
// ======================= END ======================== //
// ======================= START ======================== //
const sample_select = () => {
    toogle_fn(".diode-lines", "totally-hidden", false);
    line_top.setAttribute("y1", "39.5");
    line_top.setAttribute("y2", "39.5");
    line_bottom.setAttribute("y1", "40.5");
    line_bottom.setAttribute("y2", "40.5");
    toogle_fn("#btn-optic", "btn-active", false);
    $(".aligment-div button").prop("disabled", false);
    toogle_fn("#aligment-label", "label-disabled", true);
    toogle_fn(".aligment-div", "div-disabled", true);
    move_diode_fn();
    toogle_fn("#diode", "totally-hidden", true);
    instruction = "Use the <b>Alignment</b> controller to move the laser spot onto the optimum position on the end and in the middle of the cantilever.";
    showInstruction(instruction);
    ctx_tip.clearRect(0, 0, canvas_tip.width, canvas_tip.height);
    draw_laser();
    toogle_fn("#orange-target", "totally-hidden", true);
}
// =======================  END END  ==================== //

const draw_laser = () => {
    if (scan_micrograph) {
        if (scan_micrograph.tvCounter < 100) {
            turbulence.setAttribute("baseFrequency", freq_val);
        }
    }
    laserScan_ypos = laser_ypos_difference + laser_init_ypos;
    ctx_tip.beginPath();
    ctx_tip.moveTo(xpos, 0);
    ctx_tip.shadowBlur = 6;
    ctx_tip.shadowColor = "#FA4224";
    ctx_tip.strokeStyle = "#ED0DD9";
    ctx_tip.lineTo(xpos, ypos);
    if (!motor_bool) {
        if (tapping) {
            //OptionTapping
            if (pointInTriangle([xpos, ypos], hit_tapping_1) || pointInTriangle([xpos, ypos], hit_tapping_2)) {
                hitting_bool = true;
                ctx_tip.lineTo(xpos + 75, ypos - laserScan_ypos);
                (signal_bool && centering_bool) ? centering_diode_fn(): diode_highlight_fn();
            } else {
                hitting_bool = false;
                ctx_tip.lineTo(xpos, ypos + 87);
                $("#d1").css('opacity', "0.2");
                $("#d2").css('opacity', "0.2");
                $("#d3").css('opacity', "0.2");
                $("#d4").css('opacity', "0.2");
            }
            let tapping_overlapping = pointInTriangle([xpos, ypos], tapping_overlap);
            toogle_fn("#tapping-copy", "totally-hidden", tapping_overlapping);
        } else {
            //OptionContact
            let no_bend_laser1 = pointInTriangle([xpos, ypos], no_hit_contact_1);
            let no_bend_laser2 = pointInTriangle([xpos, ypos], no_hit_contact_2);
            let contact_overlapping = pointInTriangle([xpos, ypos], contact_overlap);
            if (pointInTriangle([xpos, ypos], hit_contact_1) && (!no_bend_laser1) && (!no_bend_laser2)) {
                hitting_bool = true;
                ctx_tip.lineTo(xpos + 75, ypos - laserScan_ypos);
                (signal_bool && centering_bool) ? centering_diode_fn(): diode_highlight_fn();
            } else {
                hitting_bool = false;
                ctx_tip.lineTo(xpos, ypos + 87);
                $("#d1").css('opacity', "0.2");
                $("#d2").css('opacity', "0.2");
                $("#d3").css('opacity', "0.2");
                $("#d4").css('opacity', "0.2");
            }
            if (contact_overlapping || no_bend_laser1 || no_bend_laser2) {
                toogle_fn("#contact-copy", "totally-hidden", true);
            } else {
                toogle_fn("#contact-copy", "totally-hidden", false);
            }
        }
    } else {
        ctx_tip.lineTo(xpos + 75, ypos - laserScan_ypos);
    }
    ctx_tip.stroke();
    orange_target.style.transform = `translate(${xpos-12}px, ${ypos-7}px)`;


}
// ======================= START ======================== //

// =======================  END END  ==================== //
// ======================= START ======================== //
const cartesian_laser = () => {
    xpos = getRandomInt(91, 139);
    ypos = getRandomInt(146, 168);
    let x_start = 48;
    let y_start = 145;
    let y_segment_length = ypos - y_start;
    let x_far_from_zero = y_segment_length * 1.7321;
    let current_x_level = x_start + x_far_from_zero;
    x_unit = (xpos - current_x_level) / 2;
    let x_segment_length = (x_start) - xpos;
    let y_far_from_zero = x_segment_length * 0.5774;
    let current_y_level = (y_start) + y_far_from_zero;
    y_unit = (ypos - current_y_level) / 2;
}
// =======================  END END  ==================== //
// ======================= START ======================== //
const contact_mode = () => {
    reset_vars_fun();
    $('#scan-size').append('<option id="scan-g-contact" value="g">50&#181;m</option>');
    reset_sample_dd("scan-size");
    $('#scan-size').selectmenu("refresh");
    c_down.style.transform = `translate(0, ${15}px)`;
    c_up.style.transform = `translate(0, ${-15}px)`;
    tapping = false;
    cartesian_laser();
    top_laser_pos();
    deactivate_dd("mode");
    sample_select();
    contact_svg.style.transform = `translateY(0px)`;
    toogle_fn("#tapping-shadow", "totally-hidden", false);
    toogle_fn(".tapping-tip", "totally-hidden", false);
    toogle_fn("#laser-spot", "totally-hidden", true);
    toogle_fn("#contact-shadow", "totally-hidden", true);
    toogle_fn(".contact-tip", "totally-hidden", true);
    ctx_micrograph.clearRect(0, 0, wh, wh);
    ctx_micrograph.drawImage(contact_set_1, 0, 0, wh, wh);
}
// =======================  END END  ==================== //
// ======================= START ======================== //
const tapping_mode = () => {
    reset_vars_fun();
    $('#scan-size').children('option#scan-g-contact').remove();
    reset_sample_dd("scan-size");
    $('#scan-size').selectmenu("refresh");
    t_down.style.transform = `translate(0, ${15}px)`;
    t_up.style.transform = `translate(0, ${-15}px)`;
    tapping = true;
    cartesian_laser();
    top_laser_pos();
    deactivate_dd("mode");
    sample_select();
    tapping_svg.style.transform = `translateY(0px)`;
    toogle_fn("#contact-shadow", "totally-hidden", false);
    toogle_fn(".contact-tip", "totally-hidden", false);
    toogle_fn("#laser-spot", "totally-hidden", true);
    toogle_fn("#tapping-shadow", "totally-hidden", true);
    toogle_fn(".tapping-tip", "totally-hidden", true);
    ctx_micrograph.clearRect(0, 0, wh, wh);
    ctx_micrograph.drawImage(tapping_set_1, 0, 0, wh, wh);
}
// =======================  END END  ==================== //
// ======================= START ======================== //
const set_amplitude = () => {
    let mid_panel = document.querySelector('#mid-panel');
    sprites[1].forEach((tuning_img) => {
        tuning_img.removeAttribute("style");
        tuning_img.setAttribute("class", "micrograph-layer-img");
        mid_panel.append(tuning_img);
    });
    toogle_fn("#btn-optic", "btn-active", true);
    toogle_fn("#btn-tuning", "btn-active", false);
    instruction = "Now we will tune the cantilever. Set the <b>Target amplitude</b> to 500mV.";
    showInstruction(instruction);
    $("#amplitude-div button").prop("disabled", false);
    toogle_fn("#amplitude-label", "label-disabled", true);
    toogle_fn("#amplitude-div", "div-disabled", true);
}
// ======================= END ======================== //
// ======================= START ======================== //
const set_frequency = () => {
    instruction = "Set the <b>Frequency</b> range from 200 to 500KHz.";
    showInstruction(instruction);
    $("#amplitude-div button").prop("disabled", true);
    $("#amplitude-div button").css("cursor", "not-allowed");
    $("#amplitude-div button").css('opacity', '0.3');
    toogle_fn("#freq-label", "label-disabled", true);
    activate_dd("freq-from");
    activate_dd("freq-to");
}
// ======================= END ======================== //
// ======================= START ======================== //
const autotune_fun = () => {
    instruction = "Click the <b>Auto Tune</b> button to begin the automated tuning process.";
    showInstruction(instruction);
    deactivate_dd("freq-from");
    deactivate_dd("freq-to");
    activate_btn("auto-tune");
}
// ======================= END ======================== //
// ======================= START ======================== //
const set_scan = () => {
    activate_dd("scan-size");
    instruction = "Set the <b>Scan size</b>.";
    showInstruction(instruction);
}
// ======================= END ======================== //
// ======================= START ======================== //
const set_integral_fun = () => {
    instruction = "Set the value for the <b>Integral Gain</b>. Caution. Integral gain can produce noise in your image if it set too high. Start low and see what happens as you increase.";
    showInstruction(instruction);
    toogle_fn("#modal-messages", "totally-hidden", true);
    toogle_fn("#integral-gains-label", "label-disabled", true);
    toogle_fn("#integral-val", "label-disabled", true);
    $("#integral-gains").slider("enable");
}
// ======================= END ======================== //
// ======================= START ======================== //
const set_scan_rate_fun = () => {
    integral_bool = true;
    instruction = "Set the speed of the tip across the surface by selecting a <b>Scan Rate</b>. Caution. If the scan rate is too high the AFM tip will struggle to track the surface features.";
    showInstruction(instruction);
    activate_dd("scan-rate");
}
// ======================= END ======================== //
// ======================= START ======================== //
const set_point_fun = () => {
    scan_rate_bool = true;
    instruction = "Change the <b>Set Point</b> to control the amount of force to be applied to the sample surface while imaging.";
    showInstruction(instruction);
    toogle_fn("#modal-messages", "totally-hidden", true);
    if (tapping) {
        toogle_fn("#point-slider-label", "label-disabled", true);
        toogle_fn("#point-val", "label-disabled", true);
        $("#set-point-slider").slider("enable");
    } else {
        $("#set-point-div button").prop("disabled", false);
        toogle_fn("#set-point-label", "label-disabled", true);
        toogle_fn("#set-point-div", "div-disabled", true);
    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const c_setpoint_fun = () => {
    blur_fun(scroll_equation(c_setpoint_val, 0, 10, 100, 0));
    if (c_setpoint_val >= 5 && double_bool == false) {
        double_bool = true;
        doubleIt();
    }

    if (!set_point_bool) set_motor_fun();
}
// ======================= END ======================== //
// ======================= START ======================== //
const set_motor_fun = () => {
    set_point_bool = true;
    instruction = "Use the <b>Motor</b> slider to move probe close to surface.";
    toogle_fn("#modal-messages", "totally-hidden", true);
    showInstruction(instruction);
    current_ypos = ypos;
    current_diodepos = diode_obj.diodeY;
    toogle_fn("#motor-label", "label-disabled", true);
    $("#motor").slider("enable");
}
// ======================= END ======================== //
// ======================= START ======================== //
const engage_fun = () => {
    instruction = "Use the <b>Engage</b> button to begin the automated computer approach.";
    showInstruction(instruction);
    activate_btn("engage");
}
// ======================= END ======================== //
// ======================= START ======================== //
const engage_stage_fun = () => {
    motor_bool = true;

    let cantilever_toEngage = tapping ? tapping_svg : contact_svg;
    let engageCantilever_animation = anime({
        targets: cantilever_toEngage,
        translateY: 93,
        easing: 'easeInOutSine'
    });
    let engageDiode_animation = anime({
        targets: diode_obj,
        diodeY: 100,
        easing: 'easeInOutSine',
        update: function () {
            diode.style.transform = `translate(${diode_obj.diodeX}px,${diode_obj.diodeY}px)`;
        }
    });
    let tipY = motor_obj.tipY - 15;
    t_down.style.transform = `translate(0, ${tipY}px)`;
    t_up.style.transform = `translate(0, ${tipY*-1}px)`;
    c_down.style.transform = `translate(0, ${tipY}px)`;
    c_up.style.transform = `translate(0, ${tipY*-1}px)`;

    let blur = (motor_obj.tipBlur - 12) * -1;
    if (blur <= 1.5) blur = 1.5;
    focus_blur.setStdDeviation(blur, blur);
    $("#shadow-contact").css('opacity', motor_obj.alpha);
    $("#shadow-tip").css('opacity', motor_obj.alpha);

    let temp_ypos = {
        y: ypos
    }
    let engageLaser_animation = anime({
        targets: temp_ypos,
        y: 215,
        easing: 'easeInOutSine',
        update: function () {
            ypos = temp_ypos.y;
            ctx_tip.clearRect(0, 0, canvas_tip.width, canvas_tip.height);
            draw_laser();
        }
    });
}
// ======================= END ======================== //
// ======================= START ======================== //
const disengage_stage_fun = () => {
    anime.remove('.stage-move');
    canvas_micrograph.style.filter = "";
    canvas_dark.style.opacity = 0;
    let i = motor_obj.sliderVal;
    for (i; i > 74; i--) {
        motor_obj.cantileverY = i * 0.85;
        ypos = current_ypos + i * 0.85;
        diode_obj.diodeY = current_diodepos + i * 0.85;
        motor_move_fn();
        ctx_glitch.clearRect(0, 0, wh, wh);
    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const broken_fun = () => {
    if (window.SPM_BENCHMARK_API && typeof window.SPM_BENCHMARK_API.markSubtaskFailure === "function") {
        window.SPM_BENCHMARK_API.markSubtaskFailure("S11");
    }
    toogle_fn("#start-again", "totally-hidden", true);
    toogle_fn("#btn-profile", "btn-active", true);
    $("#motor").slider("disable");
    $("#integral-gains").slider("disable");
    $("#set-point-slider").slider("disable");
    deactivate_dd("scan-size");
    deactivate_dd("scan-rate");
    deactivate_btn("engage");
}
// ======================= END ======================== //
// ======================= START ======================== //

function scananim_fun() {
    //    temp_y_diff
    if (tapping) {
        laser_ypos_difference *= -1;
    } else {
        temp_y_orig_diff *= -1;
        temp_y_diff = Math.abs(temp_y_orig_diff);
        laser_ypos_difference = (temp_y_diff + (temp_y_orig_diff)) / 2;
    }
    ctx_tip.clearRect(0, 0, canvas_tip.width, canvas_tip.height);
    draw_laser();
}

function trigger_scananim_fun() {
    scan_animation = setInterval(function () {
        scananim_fun("First param", "Second param");
    }, scan_animation_rate);
    anime.remove('.stage-move');
    stage_animation = anime({
        targets: '.stage-move',
        translateX: [translateLx, translateRx],
        translateY: [translateLy, translateRy],
        direction: 'alternate',
        duration: scan_animation_rate,
        easing: 'cubicBezier(.5, .05, .1, .3)',
        loop: true
    });

}
// ======================= END ======================== //
// ======================= START ======================== //

function rotate_fun() {
    cantilever_angle *= -1;
    tapping_svg.style.transform = `translateY(93px) rotate(${cantilever_angle}deg)`;
}

function trigger_rotate_fun() {
    cantilever_rotation = setInterval(function () {
        rotate_fun("First param", "Second param");
    }, scan_rotation_rate);
}
// ======================= END ======================== //
// ======================= START ======================== //
function stage_anim_fun() {
    clearInterval(scan_animation);
    trigger_scananim_fun();
    if (tapping) {
        clearInterval(cantilever_rotation);
        trigger_rotate_fun();
    }
}
// ======================= END ======================== //
// ======================= START ======================== //

const display_micrograph_fun = () => {
    current_tvCounter = (scan_micrograph) ? scan_micrograph.tvCounter : 2;
    if (scan_micrograph) cancelAnimationFrame(scan_micrograph.scanEffect);
    bufferCtx_02.drawImage(scan_micrograph_img, 0, 0);
    scan_micrograph = new SPM_scan(bufferC_02, ctx_micrograph, bufferCtx_01, bufferC_02, ctx_glitch, bufferC_03, ctx_profile, invisible_ctx);
    scan_micrograph.fRate = frame_rate;
    scan_micrograph.ctx_scanline = ctx_scanline;
    scan_micrograph.drawBuffer();
    scan_micrograph.tvCounter = current_tvCounter;
    noise_loop_fn();
    scan_micrograph.profile_fun_bool = true;
    stage_anim_fun();
    doubleIt();
    if (frame_rate >= 2) spm_noise.glitch();
}
// =======================  END END  ==================== //
// ======================= START ======================== //
const updateBF = () => {
    switch (scan_size_val) {
        case "b":
            offset = 25;
            id_num = (tapping) ? tapping_num : contact_num;
            translateLx = 47.7321;
            translateLy = 178;
            translateRx = 44.2679;
            translateRy = 180;
            break;
        case "c":
            offset = 25;
            id_num = (tapping) ? tapping_num + 1 : contact_num + 1;
            translateLx = 49.4642;
            translateLy = 177;
            translateRx = 42.5358;
            translateRy = 181;
            break;
        case "d":
            offset = 25;
            id_num = (tapping) ? tapping_num + 2 : contact_num + 2;
            translateLx = 51.1963;
            translateLy = 176;
            translateRx = 40.8037;
            translateRy = 182;
            break;
        case "e":
            offset = 25;
            id_num = (tapping) ? tapping_num + 3 : contact_num + 3;
            translateLx = 54.6605;
            translateLy = 174;
            translateRx = 37.3395;
            translateRy = 184;
            break;
        case "f":
            offset = 15;
            id_num = (tapping) ? tapping_num + 4 : contact_num + 4;
            translateLx = 59.8568;
            translateLy = 171;
            translateRx = 32.1432;
            translateRy = 187;
            break;
        case "g":
            offset = 10;
            id_num = contact_num + 5;
            translateLx = 63.321;
            translateLy = 169;
            translateRx = 28.679;
            translateRy = 189;
            break;
    }
    scan_micrograph_img = (tapping) ? window[`tapping_set_${id_num}`] : window[`contact_set_${id_num}`];
    if (integral_val < 6 && integral_val > 3) {
        alpha_num = integral_val / 10;
    } else if (integral_val > 6) {
        alpha_num = scroll_equation(integral_val, 6, 10, 0.6, 1);
    } else {
        alpha_num = 0;
    }
    if (start_scan_bool) display_micrograph_fun();
}

const blur_fun = (blur_v) => {
    toogle_fn(".diode-lines", "totally-hidden", true);
    blur_val = blur_v;
    if (start_scan_bool) {
        laser_ypos_difference = (tapping) ? scroll_equation(blur_val, 0, 100, 0, 39) : scroll_equation(blur_val, 100, 0, 0, 39);
        temp_y_orig_diff = laser_ypos_difference;
        ctx_tip.clearRect(0, 0, canvas_tip.width, canvas_tip.height);
        draw_laser();
    }
    if (tapping) {
        bottom_y1 = scroll_equation(blur_val, 0, 100, 40.5, 79);
        bottom_y2 = scroll_equation(blur_val, 0, 100, 40.51, 79.01);
        top_y1 = scroll_equation(blur_val, 0, 100, 39.5, 1);
        top_y2 = scroll_equation(blur_val, 0, 100, 39.51, 1.01);
        line_top.setAttribute("y1", `${top_y1}`);
        line_top.setAttribute("y2", `${top_y2}`);
        line_bottom.setAttribute("y1", `${bottom_y1}`);
        line_bottom.setAttribute("y2", `${bottom_y2}`);
    } else {
        top_y1 = scroll_equation(blur_val, 100, 0, 39.5, 1);
        top_y2 = scroll_equation(blur_val, 100, 0, 39.51, 1.01);
        line_top.setAttribute("y1", `${top_y1}`);
        line_top.setAttribute("y2", `${top_y2}`);
    }
    let dark_color;
    if (blur_val > 97) {
        if (scan_micrograph) scan_micrograph.profile_straight_bool = true;
        dark_color = "#502301";
        bf_val.dark_sqr = 1;
    } else {
        if (scan_micrograph) scan_micrograph.profile_straight_bool = false;
        dark_color = "#251a00";
        bf_val.dark_sqr = (blur_val < 3) ? scroll_equation(blur_val, 0, 4, 1, 0) : 0;
    }
    canvas_dark.style.backgroundColor = dark_color;
    bf_val.blur = (blur_val <= 20) ? scroll_equation(blur_val, 0, 20, 2, 0.5) : 0;
    cantilever_angle = scroll_equation(blur_val, 0, 100, 0.5, 2);
    if (blur_val == 0) cantilever_angle = 0;

    if (start_scan_bool) {
        canvas_dark.style.opacity = bf_val.dark_sqr;
        blur_fx.setAttribute("stdDeviation", bf_val.blur);
        stage_anim_fun();
    }
}

const scanY_fun = () => {
    if (!scanY_is2_bool) {
        bufferCtx_02.clearRect(0, 0, wh, wh);
        bufferCtx_02.drawImage(scan_micrograph_img, 0, 0);
        doubleIt(2);
    }
}

const doubleIt = (scanY = scan_micrograph.tvCounter) => {
    let w_off = wh - offset;
    if (double_bool) {
        bufferCtx_02.globalAlpha = 0.3;
        bufferCtx_02.drawImage(bufferC_02, offset, scanY, w_off, wh - scanY, 0, scanY, w_off, wh - scanY);
        bufferCtx_02.drawImage(bufferC_02, wh - 1, scanY, 1, wh - scanY, w_off + 1, scanY, offset, wh - scanY);
        bufferCtx_02.globalAlpha = 1;
    }
    if (scanY !== 2) {
        scanY_is2_bool = false;
        scan_micrograph.doubleIt = scanY_fun;
    } else {
        scanY_is2_bool = true;
        scan_micrograph.doubleIt = empty_fn
    }
}
// =======================  END END  ==================== //
// ======================= START ======================== //
const spm_noise_fun = () => {
    var factor1 = 0.5;
    var factor2 = 1.0;
    var alpha = alpha_num;
    var maxHorizOffset = 15;
    var imgData = bufferCtx_02.getImageData(0, 0, wh, wh);
    for (var i = 0; i < imgData.data.length; i += 4) {
        var randColor1 = factor1 + Math.random() * factor2;
        var randColor2 = factor1 + Math.random() * factor2;
        var randColor3 = factor1 + Math.random() * factor2;
        let r = imgData.data[i] * 1 * randColor1; // red
        let g = imgData.data[i + 1] * 1 * randColor2; // green
        let b = imgData.data[i + 2] * 1 * randColor3; // blue

        imgData.data[i] = r * alpha + imgData.data[i] * (1 - alpha);
        imgData.data[i + 1] = g * alpha + imgData.data[i + 1] * (1 - alpha);
        imgData.data[i + 2] = b * alpha + imgData.data[i + 2] * (1 - alpha);
    }

    return {
        noise: function () {
            bufferCtx_02.putImageData(imgData, 0, 0);

            scan_micrograph.noiseY = scan_micrograph.tvCounter;
            spm_noise = spm_noise_fun();
        },
        glitch: function () {
            var verticalSlices = Math.round(scan_micrograph_img.height / glitch_amount);
            bufferCtx_03.clearRect(0, 0, wh, wh);
            for (var i = 0; i < verticalSlices; i++) {
                let horizOffset = getRandomInt(-Math.abs(maxHorizOffset), maxHorizOffset);
                let where_x = getRandomInt(0, wh);
                bufferCtx_03.putImageData(imgData, 0, i * verticalSlices, where_x, 0, where_x * horizOffset, getRandomInt(0, 15));
            }
        }
    }
};
// =======================  END END  ==================== //
// ======================= START ======================== //
const noise_loop_fn = () => {
    bufferCtx_02.drawImage(scan_micrograph_img, 0, 0);
    spm_noise = spm_noise_fun();
    spm_noise.noise();
    return
}
// ======================= END ======================== //
//////////////////////////////////////////////////
//////////////////////////////////////////////////
function rgbToHex(rgb) {
    var hex = Number(rgb).toString(16);
    if (hex.length < 2) {
        hex = "0" + hex;
    }
    return hex;
};

function wholeHex(r, g, b) {
    var red = rgbToHex(r);
    var green = rgbToHex(g);
    var blue = rgbToHex(b);
    var _hex = parseInt("0x" + red + green + blue) / 0xFFFFFF;
    _y = _hex * -1.8 * 69 + 69 * 1.6;
};

function profile_fn() {
    _y_array = [];
    let micrographData = scan_micrograph.bff2Data.data;
    for (let i = 0; i < micrographData.length; i += 408) {
        _y_array.push(new Array())
        for (let j = 0; j < 408; j += 1) {
            if (j % 4 == 1) {
                wholeHex(micrographData[j + i], micrographData[j + i + 1], micrographData[j + i + 2]);
            } else if (j % 4 == 0) {
                _y_array[i / 408].push(_y);
            }
        }
    }
    scan_micrograph.profile_fun_bool = false;
    scan_micrograph.profile_bool = true;
};
// =======================  END END  ==================== //
//////////////////////////////////////////////////
//////////////////////////////////////////////////
// ======================= START ======================== //
const console_log = () => {
    console.log("console_log fun");
}
// ======================= END ======================== //

// ======================= START ======================== //
//$('#btn').click(() => {});
$('.btn').click(function (e) {
    let tunning_arr = 6;
    switch (e.target.id) {
        case "auto-tune-btn":
            toogle_fn("#top-instructions", "top-instructions-on", true);
            toogle_fn("#auto-tune-btn", "btn-active", false);
            $("#auto-tune-btn").prop("disabled", true);
            $("#auto-tune-btn").css("cursor", "not-allowed");
            let clear_graph = setInterval(() => {
                if (tunning_arr >= 1) {
                    sprites[1][tunning_arr].classList.add("totally-hidden");
                } else {
                    toogle_fn("#auto-tune-btn", "btn-active", true);
                    deactivate_btn("auto-tune");
                    clearInterval(clear_graph);
                    if (window.SPM_BENCHMARK_API && typeof window.SPM_BENCHMARK_API.markSubtaskSuccess === "function") {
                        window.SPM_BENCHMARK_API.markSubtaskSuccess("S6");
                    }
                    set_scan();
                }
                tunning_arr--;
            }, 500);
            break;
        default:
            //        code block
    }
});

$('#set-point-down').click(function (e) {
    if (c_setpoint_val > 0) {
        c_setpoint_val--;
        c_setpoint_fun();
    }
    c_set_pointV.innerHTML = c_setpoint_val + "V";

})
$('#set-point-up').click(function (e) {
    if (c_setpoint_val < 10) {
        c_setpoint_val++;
        c_setpoint_fun();
    }
    c_set_pointV.innerHTML = c_setpoint_val + "V";
})

$('#amplitude-down').click(function (e) {
    if (amplitude_val > 0) amplitude_val -= 50;
    if (amplitude_val == 500) {
        if (window.SPM_BENCHMARK_API && typeof window.SPM_BENCHMARK_API.markSubtaskSuccess === "function") {
            window.SPM_BENCHMARK_API.markSubtaskSuccess("S4");
        }
        set_frequency();
    }
    amplitudemV.innerHTML = amplitude_val + "mV";

})
$('#amplitude-up').click(function (e) {
    if (amplitude_val < 500) amplitude_val += 50;
    if (amplitude_val == 500) {
        if (window.SPM_BENCHMARK_API && typeof window.SPM_BENCHMARK_API.markSubtaskSuccess === "function") {
            window.SPM_BENCHMARK_API.markSubtaskSuccess("S4");
        }
        set_frequency();
    }
    amplitudemV.innerHTML = amplitude_val + "mV";
})

$('#btn-reload').click(function () {
    location.reload();
    location.reload(true);
});

$('#engage-btn').click(function () {
    if (window.SPM_BENCHMARK_API && typeof window.SPM_BENCHMARK_API.markSubtaskSuccess === "function") {
        window.SPM_BENCHMARK_API.markSubtaskSuccess("S12");
    }
    instruction = "Click the <b>Scan</b> button to begin scanning.";
    showInstruction(instruction);
    deactivate_btn("engage");
    deactivate_dd("mode");
    activate_btn("scan");
    toogle_fn("#motor-label", "label-disabled", false);
    $("#motor").slider("disable");
    engage_stage_fun();

});

$('#scan-btn').click(function () {
    if (window.SPM_BENCHMARK_API && typeof window.SPM_BENCHMARK_API.markSubtaskSuccess === "function") {
        window.SPM_BENCHMARK_API.markSubtaskSuccess("S13");
    }
    toogle_fn("#btn-optic", "btn-active", true);
    toogle_fn("#btn-profile", "btn-active", false);
    start_scan_bool = true;
    blur_fun(blur_val);
    instruction = "Optimise scan parameters. Save the data when ready.";
    showInstruction(instruction);
    ctx_micrograph.clearRect(0, 0, wh, wh);
    if (tapping) toogle_fn("#tuning_set_1", "totally-hidden", false);
    toogle_fn("#optical-svg", "totally-hidden", false);
    deactivate_btn("scan");
    activate_btn("save");
    activate_btn("disengage");
    canvas_micrograph.style.filter = "url('#svg-filter')";
    if (scan_micrograph) scan_micrograph.tvCounter = 2;
    display_micrograph_fun();
    toogle_fn(".stage-move", "scanning-contact", false);
});

$('#disengage-btn').click(function () {
    ctx_scanline.clearRect(0, 0, wh, wh);
    activate_dd("mode");
    reset_bool = true;
    toogle_fn("#top-instructions", "top-instructions-on", true);
    toogle_fn("#btn-optic", "btn-active", false);
    toogle_fn("#btn-profile", "btn-active", true);
    start_scan_bool = false;
    clearInterval(scan_animation);
    clearInterval(cantilever_rotation);
    if (scan_micrograph) cancelAnimationFrame(scan_micrograph.scanEffect);
    deactivate_btn("save");
    activate_btn("engage");
    ctx_micrograph.clearRect(0, 0, wh, wh);
    let micrograph_img = (tapping) ? tapping_set_1 : contact_set_1;
    ctx_micrograph.drawImage(micrograph_img, 0, 0, wh, wh);
    ctx_profile.clearRect(0, 0, wh, wh);
    toogle_fn("#optical-svg", "totally-hidden", true);
    disengage_stage_fun();
});

$('#save-btn').click(function () {
    if (window.SPM_BENCHMARK_API && typeof window.SPM_BENCHMARK_API.markSubtaskSuccess === "function") {
        window.SPM_BENCHMARK_API.markSubtaskSuccess("S14");
    }
    savePNG(canvas_micrograph, 'image from the AFM simulator.png');
    let t_instruction_title = "Well done! <br>You have saved an AFM's tapping mode image.";
    let c_instruction_title = "Well done! <br>You have saved an AFM's contact mode image.";
    let t_instruction_retake = "Retake the activity or start the Contact Imaging Mode activity.";
    let c_instruction_retake = "Retake the activity or start the Tapping Imaging Mode activity.";
    let instruction_title = (tapping) ? t_instruction_title : c_instruction_title;
    $("#finished-txt").html(instruction_title);
    let instruction_retake = (tapping) ? t_instruction_retake : c_instruction_retake;
    $("#retake-txt").html(instruction_retake);
    toogle_fn("#modal-end", "totally-hidden", true);
});
// =======================  END END  ==================== //
// =======================  END END  ==================== //
$("#close-resize").click(() => {
    toogle_fn("#modal-resize", "totally-hidden", false);
});
// ======================= START ======================== //
// ======================= START ======================== //
//const resizeCanvasGraphs = () => {
//    let c = document.getElementsByClassName("screen-1-canvas");
//    let t = document.getElementsByClassName("win-title");
//    for (let i = 0; i < c.length; i++) {
//        c[i].width = c[i].parentElement.clientWidth * 0.98;
//        c[i].height = c[i].parentElement.clientHeight - (t[i].clientHeight + 3);
//    }
//}
//const resize = () => {
//    //    //CONDITIONAL MISSING HERE
//    resizeCanvasGraphs();
//}
//resize();
//window.onresize = resize;
// ======================= END ======================== //

// SPM Benchmark: fast-forward to subtask (for subtask demos)
window.SPM_fast_forward_to_subtask = function (subtaskId) {
    const SPM_ORDER = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "S11", "S12", "S13", "S14"];
    const idx = SPM_ORDER.indexOf(subtaskId);
    if (idx < 0) {
        console.warn("SPM_fast_forward_to_subtask: unknown subtaskId:", subtaskId);
        return;
    }
    const api = window.SPM_BENCHMARK_API;
    if (api && typeof api.markSubtaskSuccess === "function") {
        for (let i = 0; i < idx; i++) {
            api.markSubtaskSuccess(SPM_ORDER[i]);
        }
    }
    try {
        switch (subtaskId) {
            case "S1":
                break;
            case "S2":
                if (typeof tapping_mode === "function") tapping_mode();
                break;
            case "S3":
                if (typeof tapping_mode === "function") tapping_mode();
                if (typeof $ !== "undefined") {
                    xpos = 135;
                    ypos = 122;
                    x_unit = 40;
                    y_unit = 25;
                    inside_x = xpos;
                    inside_y = ypos;
                    prev_x_unit = x_unit;
                    prev_y_unit = y_unit;
                    hitting_bool = true;
                    signal_bool = true;
                    centering_bool = true;
                    spinn_bool = false;
                    diode_obj.diodeX = 150;
                    diode_obj.diodeY = 5;
                    $(".aligment-div button").prop("disabled", true);
                    if (typeof toogle_fn === "function") {
                        toogle_fn("#aligment-label", "label-disabled", false);
                        toogle_fn(".aligment-div", "div-disabled", false);
                        toogle_fn("#photodiode-label", "label-disabled", true);
                        toogle_fn(".photodiode-div", "div-disabled", true);
                    }
                    $(".photodiode-div button").prop("disabled", false);
                    $("#sum-signal").slider("value", 100);
                    if (typeof oval !== "undefined") oval.setAttribute("stroke-width", "2");
                    instruction = "Use the <b>Photodiode</b> controllers to move laser spot to the centre of photodiode.";
                    if (typeof showInstruction === "function") showInstruction(instruction);
                    if (typeof move_diode_fn === "function") move_diode_fn();
                    if (typeof ctx_tip !== "undefined") ctx_tip.clearRect(0, 0, canvas_tip.width, canvas_tip.height);
                    if (typeof draw_laser === "function") draw_laser();
                }
                break;
            case "S4":
                if (typeof tapping_mode === "function") tapping_mode();
                if (typeof $ !== "undefined") {
                    xpos = 135;
                    ypos = 122;
                    x_unit = 40;
                    y_unit = 25;
                    inside_x = xpos;
                    inside_y = ypos;
                    prev_x_unit = x_unit;
                    prev_y_unit = y_unit;
                    hitting_bool = true;
                    signal_bool = true;
                    centering_bool = true;
                    spinn_bool = false;
                    diode_obj.diodeX = 170;
                    diode_obj.diodeY = 7;
                    $(".aligment-div button").prop("disabled", true);
                    if (typeof toogle_fn === "function") {
                        toogle_fn("#aligment-label", "label-disabled", false);
                        toogle_fn(".aligment-div", "div-disabled", false);
                        toogle_fn("#photodiode-label", "label-disabled", true);
                        toogle_fn(".photodiode-div", "div-disabled", true);
                    }
                    $(".photodiode-div button").prop("disabled", false);
                    $("#sum-signal").slider("value", 100);
                    if (typeof oval !== "undefined") oval.setAttribute("stroke-width", "2");
                    if (typeof move_diode_fn === "function") move_diode_fn();
                    if (typeof ctx_tip !== "undefined") ctx_tip.clearRect(0, 0, canvas_tip.width, canvas_tip.height);
                    if (typeof draw_laser === "function") draw_laser();
                    if (typeof set_amplitude === "function") set_amplitude();
                }
                break;
            case "S5":
                if (typeof tapping_mode === "function") tapping_mode();
                if (typeof $ !== "undefined") {
                    xpos = 135;
                    ypos = 122;
                    x_unit = 40;
                    y_unit = 25;
                    inside_x = xpos;
                    inside_y = ypos;
                    prev_x_unit = x_unit;
                    prev_y_unit = y_unit;
                    hitting_bool = true;
                    signal_bool = true;
                    centering_bool = true;
                    spinn_bool = false;
                    diode_obj.diodeX = 170;
                    diode_obj.diodeY = 7;
                    $(".aligment-div button").prop("disabled", true);
                    if (typeof toogle_fn === "function") {
                        toogle_fn("#aligment-label", "label-disabled", false);
                        toogle_fn(".aligment-div", "div-disabled", false);
                        toogle_fn("#photodiode-label", "label-disabled", true);
                        toogle_fn(".photodiode-div", "div-disabled", true);
                    }
                    $(".photodiode-div button").prop("disabled", false);
                    $("#sum-signal").slider("value", 100);
                    if (typeof oval !== "undefined") oval.setAttribute("stroke-width", "2");
                    if (typeof move_diode_fn === "function") move_diode_fn();
                    if (typeof ctx_tip !== "undefined") ctx_tip.clearRect(0, 0, canvas_tip.width, canvas_tip.height);
                    if (typeof draw_laser === "function") draw_laser();
                    if (typeof set_amplitude === "function") set_amplitude();
                    amplitude_val = 500;
                    if (typeof amplitudemV !== "undefined") amplitudemV.innerHTML = "500mV";
                    if (typeof set_frequency === "function") set_frequency();
                }
                break;
            case "S6":
                if (typeof tapping_mode === "function") tapping_mode();
                if (typeof $ !== "undefined") {
                    xpos = 135;
                    ypos = 122;
                    x_unit = 40;
                    y_unit = 25;
                    inside_x = xpos;
                    inside_y = ypos;
                    prev_x_unit = x_unit;
                    prev_y_unit = y_unit;
                    hitting_bool = true;
                    signal_bool = true;
                    centering_bool = true;
                    spinn_bool = false;
                    diode_obj.diodeX = 170;
                    diode_obj.diodeY = 7;
                    $(".aligment-div button").prop("disabled", true);
                    if (typeof toogle_fn === "function") {
                        toogle_fn("#aligment-label", "label-disabled", false);
                        toogle_fn(".aligment-div", "div-disabled", false);
                        toogle_fn("#photodiode-label", "label-disabled", true);
                        toogle_fn(".photodiode-div", "div-disabled", true);
                    }
                    $(".photodiode-div button").prop("disabled", false);
                    $("#sum-signal").slider("value", 100);
                    if (typeof oval !== "undefined") oval.setAttribute("stroke-width", "2");
                    if (typeof move_diode_fn === "function") move_diode_fn();
                    if (typeof ctx_tip !== "undefined") ctx_tip.clearRect(0, 0, canvas_tip.width, canvas_tip.height);
                    if (typeof draw_laser === "function") draw_laser();
                    if (typeof set_amplitude === "function") set_amplitude();
                    amplitude_val = 500;
                    if (typeof amplitudemV !== "undefined") amplitudemV.innerHTML = "500mV";
                    if (typeof set_frequency === "function") set_frequency();
                    if (typeof autotune_fun === "function") autotune_fun();
                }
                break;
            case "S7":
                if (typeof tapping_mode === "function") tapping_mode();
                if (typeof $ !== "undefined") {
                    xpos = 135;
                    ypos = 122;
                    x_unit = 40;
                    y_unit = 25;
                    inside_x = xpos;
                    inside_y = ypos;
                    prev_x_unit = x_unit;
                    prev_y_unit = y_unit;
                    hitting_bool = true;
                    signal_bool = true;
                    centering_bool = true;
                    spinn_bool = false;
                    diode_obj.diodeX = 170;
                    diode_obj.diodeY = 7;
                    $(".aligment-div button").prop("disabled", true);
                    if (typeof toogle_fn === "function") {
                        toogle_fn("#aligment-label", "label-disabled", false);
                        toogle_fn(".aligment-div", "div-disabled", false);
                        toogle_fn("#photodiode-label", "label-disabled", true);
                        toogle_fn(".photodiode-div", "div-disabled", true);
                    }
                    $(".photodiode-div button").prop("disabled", false);
                    $("#sum-signal").slider("value", 100);
                    if (typeof oval !== "undefined") oval.setAttribute("stroke-width", "2");
                    if (typeof move_diode_fn === "function") move_diode_fn();
                    if (typeof ctx_tip !== "undefined") ctx_tip.clearRect(0, 0, canvas_tip.width, canvas_tip.height);
                    if (typeof draw_laser === "function") draw_laser();
                    if (typeof set_amplitude === "function") set_amplitude();
                    amplitude_val = 500;
                    if (typeof amplitudemV !== "undefined") amplitudemV.innerHTML = "500mV";
                    if (typeof set_frequency === "function") set_frequency();
                    if (typeof autotune_fun === "function") autotune_fun();
                    if (typeof deactivate_btn === "function") deactivate_btn("auto-tune");
                    if (typeof set_scan === "function") set_scan();
                }
                break;
            case "S8":
                if (typeof tapping_mode === "function") tapping_mode();
                if (typeof $ !== "undefined") {
                    xpos = 135;
                    ypos = 122;
                    x_unit = 40;
                    y_unit = 25;
                    inside_x = xpos;
                    inside_y = ypos;
                    prev_x_unit = x_unit;
                    prev_y_unit = y_unit;
                    hitting_bool = true;
                    signal_bool = true;
                    centering_bool = true;
                    spinn_bool = false;
                    diode_obj.diodeX = 170;
                    diode_obj.diodeY = 7;
                    $(".aligment-div button").prop("disabled", true);
                    if (typeof toogle_fn === "function") {
                        toogle_fn("#aligment-label", "label-disabled", false);
                        toogle_fn(".aligment-div", "div-disabled", false);
                        toogle_fn("#photodiode-label", "label-disabled", true);
                        toogle_fn(".photodiode-div", "div-disabled", true);
                    }
                    $(".photodiode-div button").prop("disabled", false);
                    $("#sum-signal").slider("value", 100);
                    if (typeof oval !== "undefined") oval.setAttribute("stroke-width", "2");
                    if (typeof move_diode_fn === "function") move_diode_fn();
                    if (typeof ctx_tip !== "undefined") ctx_tip.clearRect(0, 0, canvas_tip.width, canvas_tip.height);
                    if (typeof draw_laser === "function") draw_laser();
                    if (typeof set_amplitude === "function") set_amplitude();
                    amplitude_val = 500;
                    if (typeof amplitudemV !== "undefined") amplitudemV.innerHTML = "500mV";
                    if (typeof set_frequency === "function") set_frequency();
                    if (typeof autotune_fun === "function") autotune_fun();
                    if (typeof deactivate_btn === "function") deactivate_btn("auto-tune");
                    if (typeof set_scan === "function") set_scan();
                    scan_size_val = "b";
                    if (typeof set_integral_fun === "function") set_integral_fun();
                }
                break;
            case "S9":
                if (typeof tapping_mode === "function") tapping_mode();
                if (typeof $ !== "undefined") {
                    xpos = 135;
                    ypos = 122;
                    x_unit = 40;
                    y_unit = 25;
                    inside_x = xpos;
                    inside_y = ypos;
                    prev_x_unit = x_unit;
                    prev_y_unit = y_unit;
                    hitting_bool = true;
                    signal_bool = true;
                    centering_bool = true;
                    spinn_bool = false;
                    diode_obj.diodeX = 170;
                    diode_obj.diodeY = 7;
                    $(".aligment-div button").prop("disabled", true);
                    if (typeof toogle_fn === "function") {
                        toogle_fn("#aligment-label", "label-disabled", false);
                        toogle_fn(".aligment-div", "div-disabled", false);
                        toogle_fn("#photodiode-label", "label-disabled", true);
                        toogle_fn(".photodiode-div", "div-disabled", true);
                    }
                    $(".photodiode-div button").prop("disabled", false);
                    $("#sum-signal").slider("value", 100);
                    if (typeof oval !== "undefined") oval.setAttribute("stroke-width", "2");
                    if (typeof move_diode_fn === "function") move_diode_fn();
                    if (typeof ctx_tip !== "undefined") ctx_tip.clearRect(0, 0, canvas_tip.width, canvas_tip.height);
                    if (typeof draw_laser === "function") draw_laser();
                    if (typeof set_amplitude === "function") set_amplitude();
                    amplitude_val = 500;
                    if (typeof amplitudemV !== "undefined") amplitudemV.innerHTML = "500mV";
                    if (typeof set_frequency === "function") set_frequency();
                    if (typeof autotune_fun === "function") autotune_fun();
                    if (typeof deactivate_btn === "function") deactivate_btn("auto-tune");
                    if (typeof set_scan === "function") set_scan();
                    scan_size_val = "b";
                    if (typeof set_integral_fun === "function") set_integral_fun();
                    integral_val = 3;
                    if ($("#integral-gains").length) $("#integral-gains").slider("value", 3);
                    if ($("#integral-val").length) $("#integral-val").html("3");
                    if (typeof set_scan_rate_fun === "function") set_scan_rate_fun();
                }
                break;
            case "S10":
                if (typeof tapping_mode === "function") tapping_mode();
                if (typeof $ !== "undefined") {
                    xpos = 135;
                    ypos = 122;
                    x_unit = 40;
                    y_unit = 25;
                    inside_x = xpos;
                    inside_y = ypos;
                    prev_x_unit = x_unit;
                    prev_y_unit = y_unit;
                    hitting_bool = true;
                    signal_bool = true;
                    centering_bool = true;
                    spinn_bool = false;
                    diode_obj.diodeX = 170;
                    diode_obj.diodeY = 7;
                    $(".aligment-div button").prop("disabled", true);
                    if (typeof toogle_fn === "function") {
                        toogle_fn("#aligment-label", "label-disabled", false);
                        toogle_fn(".aligment-div", "div-disabled", false);
                        toogle_fn("#photodiode-label", "label-disabled", true);
                        toogle_fn(".photodiode-div", "div-disabled", true);
                    }
                    $(".photodiode-div button").prop("disabled", false);
                    $("#sum-signal").slider("value", 100);
                    if (typeof oval !== "undefined") oval.setAttribute("stroke-width", "2");
                    if (typeof move_diode_fn === "function") move_diode_fn();
                    if (typeof ctx_tip !== "undefined") ctx_tip.clearRect(0, 0, canvas_tip.width, canvas_tip.height);
                    if (typeof draw_laser === "function") draw_laser();
                    if (typeof set_amplitude === "function") set_amplitude();
                    amplitude_val = 500;
                    if (typeof amplitudemV !== "undefined") amplitudemV.innerHTML = "500mV";
                    if (typeof set_frequency === "function") set_frequency();
                    if (typeof autotune_fun === "function") autotune_fun();
                    if (typeof deactivate_btn === "function") deactivate_btn("auto-tune");
                    if (typeof set_scan === "function") set_scan();
                    scan_size_val = "b";
                    if (typeof set_integral_fun === "function") set_integral_fun();
                    integral_val = 3;
                    if ($("#integral-gains").length) $("#integral-gains").slider("value", 3);
                    if ($("#integral-val").length) $("#integral-val").html("3");
                    if (typeof set_scan_rate_fun === "function") set_scan_rate_fun();
                    frame_rate = 0.5;
                    scan_animation_rate = 200;
                    if (typeof deactivate_dd === "function") deactivate_dd("scan-rate");
                    if (typeof set_point_fun === "function") set_point_fun();
                }
                break;
            case "S11":
                if (typeof tapping_mode === "function") tapping_mode();
                if (typeof $ !== "undefined") {
                    xpos = 135;
                    ypos = 122;
                    x_unit = 40;
                    y_unit = 25;
                    inside_x = xpos;
                    inside_y = ypos;
                    prev_x_unit = x_unit;
                    prev_y_unit = y_unit;
                    hitting_bool = true;
                    signal_bool = true;
                    centering_bool = true;
                    spinn_bool = false;
                    diode_obj.diodeX = 170;
                    diode_obj.diodeY = 7;
                    $(".aligment-div button").prop("disabled", true);
                    if (typeof toogle_fn === "function") {
                        toogle_fn("#aligment-label", "label-disabled", false);
                        toogle_fn(".aligment-div", "div-disabled", false);
                        toogle_fn("#photodiode-label", "label-disabled", true);
                        toogle_fn(".photodiode-div", "div-disabled", true);
                    }
                    $(".photodiode-div button").prop("disabled", false);
                    $("#sum-signal").slider("value", 100);
                    if (typeof oval !== "undefined") oval.setAttribute("stroke-width", "2");
                    if (typeof move_diode_fn === "function") move_diode_fn();
                    if (typeof ctx_tip !== "undefined") ctx_tip.clearRect(0, 0, canvas_tip.width, canvas_tip.height);
                    if (typeof draw_laser === "function") draw_laser();
                    if (typeof set_amplitude === "function") set_amplitude();
                    amplitude_val = 500;
                    if (typeof amplitudemV !== "undefined") amplitudemV.innerHTML = "500mV";
                    if (typeof set_frequency === "function") set_frequency();
                    if (typeof autotune_fun === "function") autotune_fun();
                    if (typeof deactivate_btn === "function") deactivate_btn("auto-tune");
                    if (typeof set_scan === "function") set_scan();
                    scan_size_val = "b";
                    if (typeof set_integral_fun === "function") set_integral_fun();
                    integral_val = 3;
                    if ($("#integral-gains").length) $("#integral-gains").slider("value", 3);
                    if ($("#integral-val").length) $("#integral-val").html("3");
                    if (typeof set_scan_rate_fun === "function") set_scan_rate_fun();
                    frame_rate = 0.5;
                    scan_animation_rate = 200;
                    if (typeof deactivate_dd === "function") deactivate_dd("scan-rate");
                    if (typeof set_point_fun === "function") set_point_fun();
                    if (typeof set_motor_fun === "function") set_motor_fun();
                }
                break;
            case "S12":
                if (typeof tapping_mode === "function") tapping_mode();
                if (typeof $ !== "undefined") {
                    xpos = 135;
                    ypos = 122;
                    x_unit = 40;
                    y_unit = 25;
                    inside_x = xpos;
                    inside_y = ypos;
                    prev_x_unit = x_unit;
                    prev_y_unit = y_unit;
                    hitting_bool = true;
                    signal_bool = true;
                    centering_bool = true;
                    spinn_bool = false;
                    diode_obj.diodeX = 170;
                    diode_obj.diodeY = 7;
                    $(".aligment-div button").prop("disabled", true);
                    if (typeof toogle_fn === "function") {
                        toogle_fn("#aligment-label", "label-disabled", false);
                        toogle_fn(".aligment-div", "div-disabled", false);
                        toogle_fn("#photodiode-label", "label-disabled", true);
                        toogle_fn(".photodiode-div", "div-disabled", true);
                    }
                    $(".photodiode-div button").prop("disabled", false);
                    $("#sum-signal").slider("value", 100);
                    if (typeof oval !== "undefined") oval.setAttribute("stroke-width", "2");
                    if (typeof move_diode_fn === "function") move_diode_fn();
                    if (typeof ctx_tip !== "undefined") ctx_tip.clearRect(0, 0, canvas_tip.width, canvas_tip.height);
                    if (typeof draw_laser === "function") draw_laser();
                    if (typeof set_amplitude === "function") set_amplitude();
                    amplitude_val = 500;
                    if (typeof amplitudemV !== "undefined") amplitudemV.innerHTML = "500mV";
                    if (typeof set_frequency === "function") set_frequency();
                    if (typeof autotune_fun === "function") autotune_fun();
                    if (typeof deactivate_btn === "function") deactivate_btn("auto-tune");
                    if (typeof set_scan === "function") set_scan();
                    scan_size_val = "b";
                    if (typeof set_integral_fun === "function") set_integral_fun();
                    integral_val = 3;
                    if ($("#integral-gains").length) $("#integral-gains").slider("value", 3);
                    if ($("#integral-val").length) $("#integral-val").html("3");
                    if (typeof set_scan_rate_fun === "function") set_scan_rate_fun();
                    frame_rate = 0.5;
                    scan_animation_rate = 200;
                    if (typeof deactivate_dd === "function") deactivate_dd("scan-rate");
                    if (typeof set_point_fun === "function") set_point_fun();
                    if (typeof set_motor_fun === "function") set_motor_fun();
                    var motor_val = 80;
                    motor_obj.sliderVal = motor_val;
                    motor_obj.cantileverY = motor_val * 0.85;
                    motor_obj.tipY = motor_val * 0.20;
                    motor_obj.tipBlur = motor_val * 0.15;
                    motor_obj.alpha = (motor_val * 0.008) + 0.2;
                    ypos = current_ypos + motor_val * 0.85;
                    diode_obj.diodeY = current_diodepos + motor_val * 0.85;
                    if ($("#motor").length) $("#motor").slider("value", motor_val);
                    if (typeof motor_move_fn === "function") motor_move_fn();
                    if (typeof engage_fun === "function") engage_fun();
                }
                break;
            case "S13":
                if (typeof tapping_mode === "function") tapping_mode();
                if (typeof $ !== "undefined") {
                    xpos = 135;
                    ypos = 122;
                    x_unit = 40;
                    y_unit = 25;
                    inside_x = xpos;
                    inside_y = ypos;
                    prev_x_unit = x_unit;
                    prev_y_unit = y_unit;
                    hitting_bool = true;
                    signal_bool = true;
                    centering_bool = true;
                    spinn_bool = false;
                    diode_obj.diodeX = 170;
                    diode_obj.diodeY = 7;
                    $(".aligment-div button").prop("disabled", true);
                    if (typeof toogle_fn === "function") {
                        toogle_fn("#aligment-label", "label-disabled", false);
                        toogle_fn(".aligment-div", "div-disabled", false);
                        toogle_fn("#photodiode-label", "label-disabled", true);
                        toogle_fn(".photodiode-div", "div-disabled", true);
                    }
                    $(".photodiode-div button").prop("disabled", false);
                    $("#sum-signal").slider("value", 100);
                    if (typeof oval !== "undefined") oval.setAttribute("stroke-width", "2");
                    if (typeof move_diode_fn === "function") move_diode_fn();
                    if (typeof ctx_tip !== "undefined") ctx_tip.clearRect(0, 0, canvas_tip.width, canvas_tip.height);
                    if (typeof draw_laser === "function") draw_laser();
                    if (typeof set_amplitude === "function") set_amplitude();
                    amplitude_val = 500;
                    if (typeof amplitudemV !== "undefined") amplitudemV.innerHTML = "500mV";
                    if (typeof set_frequency === "function") set_frequency();
                    if (typeof autotune_fun === "function") autotune_fun();
                    if (typeof deactivate_btn === "function") deactivate_btn("auto-tune");
                    if (typeof set_scan === "function") set_scan();
                    scan_size_val = "b";
                    if (typeof set_integral_fun === "function") set_integral_fun();
                    integral_val = 3;
                    if ($("#integral-gains").length) $("#integral-gains").slider("value", 3);
                    if ($("#integral-val").length) $("#integral-val").html("3");
                    if (typeof set_scan_rate_fun === "function") set_scan_rate_fun();
                    frame_rate = 0.5;
                    scan_animation_rate = 200;
                    if (typeof deactivate_dd === "function") deactivate_dd("scan-rate");
                    if (typeof set_point_fun === "function") set_point_fun();
                    if (typeof set_motor_fun === "function") set_motor_fun();
                    var motor_val = 80;
                    motor_obj.sliderVal = motor_val;
                    motor_obj.cantileverY = motor_val * 0.85;
                    motor_obj.tipY = motor_val * 0.20;
                    motor_obj.tipBlur = motor_val * 0.15;
                    motor_obj.alpha = (motor_val * 0.008) + 0.2;
                    ypos = current_ypos + motor_val * 0.85;
                    diode_obj.diodeY = current_diodepos + motor_val * 0.85;
                    if ($("#motor").length) $("#motor").slider("value", motor_val);
                    if (typeof motor_move_fn === "function") motor_move_fn();
                    if (typeof engage_fun === "function") engage_fun();
                    if ($("#engage-btn").length) $("#engage-btn").trigger("click");
                }
                break;
            case "S14":
                if (typeof tapping_mode === "function") tapping_mode();
                if (typeof $ !== "undefined") {
                    xpos = 135;
                    ypos = 122;
                    x_unit = 40;
                    y_unit = 25;
                    inside_x = xpos;
                    inside_y = ypos;
                    prev_x_unit = x_unit;
                    prev_y_unit = y_unit;
                    hitting_bool = true;
                    signal_bool = true;
                    centering_bool = true;
                    spinn_bool = false;
                    diode_obj.diodeX = 170;
                    diode_obj.diodeY = 7;
                    $(".aligment-div button").prop("disabled", true);
                    if (typeof toogle_fn === "function") {
                        toogle_fn("#aligment-label", "label-disabled", false);
                        toogle_fn(".aligment-div", "div-disabled", false);
                        toogle_fn("#photodiode-label", "label-disabled", true);
                        toogle_fn(".photodiode-div", "div-disabled", true);
                    }
                    $(".photodiode-div button").prop("disabled", false);
                    $("#sum-signal").slider("value", 100);
                    if (typeof oval !== "undefined") oval.setAttribute("stroke-width", "2");
                    if (typeof move_diode_fn === "function") move_diode_fn();
                    if (typeof ctx_tip !== "undefined") ctx_tip.clearRect(0, 0, canvas_tip.width, canvas_tip.height);
                    if (typeof draw_laser === "function") draw_laser();
                    if (typeof set_amplitude === "function") set_amplitude();
                    amplitude_val = 500;
                    if (typeof amplitudemV !== "undefined") amplitudemV.innerHTML = "500mV";
                    if (typeof set_frequency === "function") set_frequency();
                    if (typeof autotune_fun === "function") autotune_fun();
                    if (typeof deactivate_btn === "function") deactivate_btn("auto-tune");
                    if (typeof set_scan === "function") set_scan();
                    scan_size_val = "b";
                    if (typeof set_integral_fun === "function") set_integral_fun();
                    integral_val = 3;
                    if ($("#integral-gains").length) $("#integral-gains").slider("value", 3);
                    if ($("#integral-val").length) $("#integral-val").html("3");
                    if (typeof set_scan_rate_fun === "function") set_scan_rate_fun();
                    frame_rate = 0.5;
                    scan_animation_rate = 200;
                    if (typeof deactivate_dd === "function") deactivate_dd("scan-rate");
                    if (typeof set_point_fun === "function") set_point_fun();
                    if (typeof set_motor_fun === "function") set_motor_fun();
                    var motor_val = 80;
                    motor_obj.sliderVal = motor_val;
                    motor_obj.cantileverY = motor_val * 0.85;
                    motor_obj.tipY = motor_val * 0.20;
                    motor_obj.tipBlur = motor_val * 0.15;
                    motor_obj.alpha = (motor_val * 0.008) + 0.2;
                    ypos = current_ypos + motor_val * 0.85;
                    diode_obj.diodeY = current_diodepos + motor_val * 0.85;
                    if ($("#motor").length) $("#motor").slider("value", motor_val);
                    if (typeof motor_move_fn === "function") motor_move_fn();
                    if (typeof engage_fun === "function") engage_fun();
                    tapping_num = 2;
                    contact_num = 2;
                    if (typeof updateBF === "function") updateBF();
                    if ($("#engage-btn").length) $("#engage-btn").trigger("click");
                    setTimeout(function () {
                        if ($("#scan-btn").length) $("#scan-btn").trigger("click");
                    }, 100);
                }
                break;
            default:
                if (typeof tapping_mode === "function") tapping_mode();
                break;
        }
    } catch (e) {
        console.warn("SPM_fast_forward:", e);
    }
};
