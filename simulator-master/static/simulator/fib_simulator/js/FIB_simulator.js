/* APT_simulator javascript functions    

Created  by Andres Vasquez for AMMRF'S www.myscope.training
info@andresvasquez.net  —— www.andresvasquez.net ——
copyright:This work is licensed under a Creative Commons Attribution 4.0 International License.

************************************************************************/
let canvas_ch1 = document.querySelector("#ch1-canvas");
let ctx_ch1 = canvas_ch1.getContext("2d");
let canvas_ch2 = document.querySelector("#ch2-canvas");
let ctx_ch2 = canvas_ch2.getContext("2d");
let canvas_ch3 = document.querySelector("#ch3-canvas");
let ctx_ch3 = canvas_ch3.getContext("2d");
let canvas_ch4 = document.querySelector("#ch4-canvas");
let ctx_ch4 = canvas_ch4.getContext("2d");
let bufferC_01 = document.createElement("canvas");
let bufferCtx_01 = bufferC_01.getContext("2d");
let bufferC_02 = document.createElement("canvas");
let bufferCtx_02 = bufferC_02.getContext("2d");
let bufferC_03 = document.createElement("canvas");
let bufferCtx_03 = bufferC_03.getContext("2d");
let bufferC_04 = document.createElement("canvas");
let bufferCtx_04 = bufferC_04.getContext("2d");
let bufferC_focus = document.createElement("canvas");
let bufferCtx_focus = bufferC_focus.getContext("2d");
let canvas_w = 1280;
let canvas_h = 859;
canvas_ch1.width = canvas_w;
canvas_ch1.height = canvas_h;
canvas_ch2.width = canvas_w;
canvas_ch2.height = canvas_h;
canvas_ch3.width = canvas_w;
canvas_ch3.height = canvas_h;
canvas_ch4.width = 640;
canvas_ch4.height = 428;
bufferC_01.width = canvas_w;
bufferC_01.height = canvas_h;
bufferC_02.width = canvas_w;
bufferC_02.height = canvas_h;
bufferC_03.width = canvas_w;
bufferC_03.height = canvas_h;
bufferC_04.width = 640;
bufferC_04.height = 428;
bufferC_focus.width = canvas_w;
bufferC_focus.height = canvas_h;

let promise_fullfilled_num = 0;
let promises_total = 40;
let sprites = [];
let nav_pic;
let ch1_pic;
let al_sample = false;
let close_area_modal = 0;
let autobright_l_var = 0;
let live_left = 0;
let live_right = 0;
let b_currentr_a_var = 0;
let magnification_d_var = 0;
let t_a_var = 0;
let b_currentr_b_var = 0;
let b_currentr_d_var = 0;
let pattern_a = 0;
let stop_live_l_var = 0;
let surface_var = 0;
let cross_var = 0;
let pt_needle_var = 0;
let save_var = 0;
let start_patterning = 0;
let delete_patterns = 0;
let capture_l_var = 0;

let currentImg = 0;
let canvas_data_ch4 = [{
    c: canvas_ch4,
    ctx: ctx_ch4,
    swidth: 640,
    sheight: 428,
    bufferC: bufferC_04,
    bufferCtx: bufferCtx_04
        }];
let canvas_data_ch1 = [{
    c: canvas_ch1,
    ctx: ctx_ch1,
    swidth: canvas_w,
    sheight: canvas_h,
    bufferC: bufferC_01,
    bufferCtx: bufferCtx_01
        }];
let two_canvas_data = [{
        c: canvas_ch1,
        ctx: ctx_ch1,
        swidth: canvas_w,
        sheight: canvas_h,
        bufferC: bufferC_01,
        bufferCtx: bufferCtx_01
        },
    {
        c: canvas_ch4,
        ctx: ctx_ch4,
        swidth: 640,
        sheight: 428,
        bufferC: bufferC_04,
        bufferCtx: bufferCtx_04
        }];

let pupup_mssg = "";
let bools = false;
let acc_volt_left_b_bol = false;
let beam_current_left_a_bol = false;
let acc_volt_right_d_bol = false;
let beam_current_right_a_bol = false;
let stage_z_increment = 0;
let wd_down_increment = 7;
let wd_up_increment = 7.045;
let z_up_increment = 13.003;
let bsr_x_increment = 80;
let bsr_y_increment = 0;
let stage_z_slider_val = 40;


let scan_ch01;
let scan_ch02;
let pattern_countdown;
let al_ch1_11_bool = false;
// ======================= START ======================== //

// =======================  END END  ==================== //
// ======================= START ACTIVATE BTN ======================== //
const reset_vars = () => {
    close_area_modal = 2;
    autobright_l_var = 0;
    live_left = 0;
    live_right = 0;
    b_currentr_a_var = 0;
    magnification_d_var = 0;
    t_a_var = 0;
    b_currentr_b_var = 0;
    b_currentr_d_var = 0;
    pattern_a = 0;
    stop_live_l_var = 0;
    surface_var = 0;
    cross_var = 0;
    pt_needle_var = 0;
    save_var = 0;
    start_patterning = 0;
    delete_patterns = 0;
    capture_l_var = 0;
    stage_z_slider_val = 40;
    acc_volt_right_d_bol = false;
    beam_current_right_a_bol = false;
    $("#spinner-beamshift-r-x").spinner("value", 0);
    $("#spinner-beamshift-r-y").spinner("value", 0);
    $("#focus-left").slider("value", 60);
    $("#stage-z").slider("value", 40);
    $("#wd-val").html("--");
    //    sample_reset_dd("acc-volt-left");
    //    sample_reset_dd("beam-current-left");
    //    reset_dd("magnification", 4, 1);
    //    sample_reset_dd("magnification");
    sample_reset_dd("acc-volt-right");
    sample_reset_dd("beam-current-right");
    reset_dd("magnificationr", 4, 3);
    $("#magnificationr").selectmenu("disable");
    //    sample_reset_dd("magnificationr");
}
// ======================= END ======================== //
// ======================= START ACTIVATE BTN ======================== //
const activate_btn = (btn_id_str) => {
    $("#" + btn_id_str + "-btn").prop("disabled", false);
    $("#" + btn_id_str + "-btn").css("cursor", "pointer");
    toogle_fn("#" + btn_id_str + "-div", "div-disabled", true);
}
// ======================= END ======================== //
// ======================= START DEACTIVATE BTN ======================== //
const deactivate_btn = (btn_id_str) => {
    $("#" + btn_id_str + "-btn").prop("disabled", true);
    $("#" + btn_id_str + "-btn").css("cursor", "not-allowed");
    toogle_fn("#" + btn_id_str + "-btn", "controls-btn-active", true);
    toogle_fn("#" + btn_id_str + "-div", "div-disabled", false);
}
// ======================= END ======================== //
// ======================= START DEACTIVATE DROP DOWN ======================== //
const activate_dd = (dd_id_str) => {
    toogle_fn("#" + dd_id_str + "-label", "label-disabled", true);
    $("#" + dd_id_str).selectmenu("enable");
}
// ======================= END ======================== //
// ======================= START DEACTIVATE DROP DOWN ======================== //
const deactivate_dd = (dd_id_str) => {
    $("#" + dd_id_str).selectmenu("disable");
    $("#" + dd_id_str + "-button").css('opacity', '1');
}
// ======================= END ======================== //
// 同步 jQuery selectmenu 按钮上的文字（占位 value=0 或仅改 disabled 后，.ui-selectmenu-text 有时不同步）
function fib_sync_selectmenu_button(dd_id_str) {
    if (typeof $ === "undefined") return;
    var $s = $("#" + dd_id_str);
    if (!$s.length) return;
    try {
        if ($s.data("ui-selectmenu")) {
            $s.selectmenu("refresh");
        }
    } catch (e) { /* ignore */ }
    var lab = $s.find(">option:selected").text() || "";
    var $tx = $("#" + dd_id_str + "-button .ui-selectmenu-text");
    if ($tx.length) {
        $tx.text(lab);
    }
}
// ======================= START ======================== //
const reset_dd = (dd_id_str, disab, enab) => {
    const $dd = $("#" + dd_id_str);
    $dd.find(">option:eq(" + disab + ")").attr("disabled", true);
    $dd.find(">option:eq(" + enab + ")").attr("disabled", false);
    // 若当前选中项被设为 disabled，selectmenu 会卡在无效 value 上；回到占位项（不自动选 enab），由用户/Agent 再选（如 F13 的 10pA）
    const $selOpt = $dd.find(">option:selected");
    if ($selOpt.length && $selOpt.prop("disabled")) {
        const $place = $dd.find(">option:eq(0)");
        if ($place.length) {
            $place.attr("disabled", false);
            $dd.val($place.val());
        }
    }
    $dd.selectmenu("refresh");
    $dd.selectmenu("enable");
    fib_sync_selectmenu_button(dd_id_str);
}
// ======================= END ======================== //    
// ======================= START ======================== //
const sample_reset_dd = (dd_id_str, disab, enab) => {
    $("#" + dd_id_str + "-button .ui-selectmenu-text").html("");
    $("#" + dd_id_str).selectmenu("disable");
}
// ======================= END ======================== //

// =======================  END END  ==================== //

$(function () {
    // ======================= START DROP DOWN ======================== //
    $("#sample").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "a":
                    al_sample = true;
                    reset_vars();
                    sample_fn();
                    break;
                case "b":
                    sample_fn();
                    break;
            }
        },
        disabled: true
    });
    $("#acc-volt-left").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "b":
                    acc_volt_left_b_bol = true;
                    bools = checking_bools(acc_volt_left_b_bol, beam_current_left_a_bol);
                    if (bools) ebeam_dd_01_fun();
                    break;
            }
        },
        disabled: true
    });
    $("#acc-volt-right").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "d":
                    acc_volt_right_d_bol = true;
                    bools = checking_bools(acc_volt_right_d_bol, beam_current_right_a_bol);
                    if (bools) ibeam_dd_01_fun();
                    break;
            }
        },
        disabled: true
    });
    $("#magnification").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "a":
                    magnification_a_fn();
                    break;
                case "c":
                    magnification_c_fn();
                    break;
                case "d":
                    magnification_d_fn();
                    break;
            }
        },
        disabled: true
    });
    $("#magnificationr").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "c":
                    magnificationr_c_fn();
                    break;
                case "d":
                    magnificationr_d_fn();
                    break;
            }
        },
        disabled: true
    });
    $("#beam-current-left").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "a":
                    beam_current_left_a_bol = true;
                    bools = checking_bools(acc_volt_left_b_bol, beam_current_left_a_bol);
                    if (bools) ebeam_dd_01_fun();
                    break;
            }
        },
        disabled: true
    });
    $("#beam-current-right").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "a":
                    if (typeof delete_patterns !== "undefined" && delete_patterns >= 2 && window.FIB_BENCHMARK_API && typeof window.FIB_BENCHMARK_API.markSubtaskSuccess === "function") {
                        window.FIB_BENCHMARK_API.markSubtaskSuccess("F13");
                    }
                    switch (b_currentr_a_var) {
                        case 0:
                            beam_current_right_a_bol = true;
                            bools = checking_bools(acc_volt_right_d_bol, beam_current_right_a_bol);
                            if (bools) ibeam_dd_01_fun();
                            break;
                        case 1:
                            instruction = "Set the electron beam <b>Magnification</b> to 5000x.";
                            reset_dd("magnification", 3, 4);
                            showInstruction(instruction);
                            deactivate_dd("beam-current-right");
                            break;
                        case 2:
                            instruction = "Click electron beam <b>Live View</b> button to get an image of the sample.";
                            b_currentr_a_fn();
                            break;
                    }
                    b_currentr_a_var++;
                    break;
                case "b":
                    b_currentr_b_fn();
                    break;
                case "d":
                    b_currentr_d_fn();
                    break;
                case "e":
                    b_currentr_e_fn();
                    break;
            }
            setTimeout(function () {
                fib_sync_selectmenu_button("beam-current-right");
            }, 0);
        },
        disabled: true
    });
    $("#wd-dropdown").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "f":
                    wd_f_fn();
                    break;
            }
        },
        disabled: true
    });
    $("#t-dropdown").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "a":
                    t_a_fn();
                    break;
                case "b":
                    t_b_fn();
                    break;
                case "c":
                    t_c_fn();
                    break;
            }
        },
        disabled: true
    });
    $("#patterns").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "a":
                case "b":
                    patterns_a_fn();
                    break;
                case "c":
                    patterns_c_fn();
                    break;
                case "d":
                    patterns_d_fn();
                    break;
                case "e":
                    patterns_e_fn();
                    break;
            }
        },
        disabled: true
    });
    // =======================  END END DROP DOWN  ==================== //

    // ======================= START SLIDERS ======================== //
    $("#focus-left").slider({
        range: "min",
        min: 0,
        max: 100,
        value: 60,
        animate: true,
        step: 0.1,
        slide: function (event, ui) {
            focus_ch1(ui.value);
        },
        start: function (event, ui) {
            toogle_fn("#wd-div", "div-disabled", true);
        },
        stop: function (event, ui) {
            if (ui.value >= 72 && ui.value <= 77) {
                instruction = "Click electron beam <b>Auto Brightness & Contrast</b> button.";
                activate_btn("autobright-left");
                $("#focus-left").slider("disable");
                $("#focus-left").css('opacity', '1');
            } else {
                instruction = "Adjust electron beam <b>Focus</b> to focus the image.";
                deactivate_btn("autobright-left");
            }
            showInstruction(instruction);
        },
        disabled: true
    });
    $("#focus-right").slider({
        range: "min",
        min: 0,
        max: 100,
        value: 0,
        animate: true,
        slide: function (event, ui) {},
        stop: function (event, ui) {},
        disabled: true
    });
    $("#stage-z").slider({
        range: "min",
        min: 0,
        max: 100,
        value: stage_z_slider_val,
        animate: true,
        slide: function (event, ui) {},
        stop: function (event, ui) {},
        disabled: true
    });
    $("#remaining-time-progressbar").progressbar({
        value: 0
    });

    // ======================= START SPINNERS ======================== //
    $("#spinner-beamshift-r-x").spinner({
        max: 80,
        min: -80,
        step: 10,
        incremental: false,
        change: function (event, ui) {}
    });
    $("#spinner-beamshift-r-y").spinner({
        max: 130,
        min: -80,
        step: 10,
        incremental: false,
        change: function (event, ui) {}
    });
});
// ======================= START ======================== //
$('.spinn-btn').click(function (e) {
    let top_bsr_x_increment = (al_sample) ? 0 : 80;
    let top_bsr_y_increment = (al_sample) ? 0 : 130;
    switch (e.target.id) {
        case "beamshift-right-x-up":
            $("#spinner-beamshift-r-x").spinner("stepDown");
            scan_ch02.sx = bsr_x_increment + $("#spinner-beamshift-r-x").spinner("value");
            if (scan_ch02.sx == top_bsr_x_increment) {
                $("#beamshift-right-x-up").prop("disabled", true);
                $("#beamshift-right-x-up").css("cursor", "not-allowed");
            };
            if (scan_ch02.sy == top_bsr_y_increment && scan_ch02.sx == top_bsr_x_increment) beam_feat_centered_01();
            break;
        case "beamshift-right-x-down":
            break;
        case "beamshift-right-y-up":
            $("#spinner-beamshift-r-y").spinner("stepUp");
            scan_ch02.sy = (bsr_y_increment * -1) + $("#spinner-beamshift-r-y").spinner("value");
            if (scan_ch02.sy == top_bsr_y_increment) {
                $("#beamshift-right-y-up").prop("disabled", true);
                $("#beamshift-right-y-up").css("cursor", "not-allowed");
            };
            if (scan_ch02.sy == top_bsr_y_increment && scan_ch02.sx == top_bsr_x_increment) beam_feat_centered_01();
            break;
        case "beamshift-right-y-down":
            break;

        case "stage-z-up":
            if (stage_z_increment < 339) {
                stage_z_slider_val += 5;
                $("#stage-z").slider("value", stage_z_slider_val);
                stage_z_increment += 113;
                z_up_increment += 0.011;
                wd_up_increment -= 0.011;
                if (stage_z_increment == 339) stage_z_done("up_01");
                vals_stagez_up01();
            }
            scan_ch01.sy = stage_z_increment;
            scan_ch01.tvCounter = 2;
            break;
        case "stage-z-down":
            if (al_ch1_11_bool) {
                if (stage_z_increment > 0) {
                    stage_z_slider_val -= 5;
                    $("#stage-z").slider("value", stage_z_slider_val);
                    stage_z_increment -= 30;
                    wd_down_increment += 0.003;
                    if (stage_z_increment == 0) stage_z_done("up_01");
                }
                scan_ch01.sy = stage_z_increment;
                scan_ch01.tvCounter = 2;
                scan_ch01.img = al_ch1_set_11;
                vals_stagez_down01(); //PENDING
            } else {
                if (stage_z_increment > 0) {
                    stage_z_slider_val -= 5;
                    $("#stage-z").slider("value", stage_z_slider_val);
                    stage_z_increment -= 20;
                    let ii = (al_sample) ? 0.012 : 0.011;
                    wd_down_increment += ii;
                    let z_sample = (al_sample) ? 40 : 0;
                    if (stage_z_increment == z_sample) stage_z_done("down_01");
                }
                scan_ch01.sy = stage_z_increment;
                scan_ch01.tvCounter = 2;
                scan_ch01.img = (al_sample) ? al_ch1_set_8 : si_ch1_set_8;
                vals_stagez_down01();
            }
            break;
    }
});
// ======================= END ======================== //
//// ======================= START ======================== //
$("#close-area").click(() => {
    toogle_fn("#modal-messages", "totally-hidden", false);

    switch (close_area_modal) {
        case 0:
            activate_btn("vent");
            instruction = "Click <b>Vent</b> to vent the chamber, load the samples onto the stage and shut the chamber door immediately.";
            showInstruction(instruction);
            break;
        case 1:
            stop_imgSeqAnimation(0);
            toogle_fn("#ebeam-x", "div-disabled", true);
            toogle_fn("#ebeam-y", "div-disabled", true);
            toogle_fn("#ebeam-z", "div-disabled", true);
            toogle_fn("#ebeam-r", "div-disabled", true);
            toogle_fn("#t-div", "div-disabled", true);
            canvas_data_ch4[0].sprite_arr = sprites[1];
            imgSeqAnimation(true, 0, 33, canvas_data_ch4, nav_cam, z_val);
            break;
        case 2:
            toogle_fn("#centerpoint-right", "totally-hidden", true);
            toogle_fn("#centerpoint-left", "totally-hidden", true);
            instruction = "Set stage <b>Tilt</b> to 10 degrees.";
            showInstruction(instruction);
            if (al_sample) {
                reset_dd("t-dropdown", 1, 2);
            } else {
                $("#t-dropdown").selectmenu("enable");
            }
            break;
        case 3:
            instruction = "Select the higher ion <b>Beam Current</b> of 3nA for milling. If you leave it at 10pA it will take a VERY long time! 10pA is just used for imaging.";
            showInstruction(instruction);
            reset_dd("beam-current-right", 1, 4);
            break;
        case 4:
        case 5:
            instruction = "Click electron beam <b>Live View</b> button to get an image of the sample.";
            showInstruction(instruction);
            activate_btn("live-left");
            break;
        case 6:
            instruction = "Please select a suitable ion beam current to continue to the next step.";
            showInstruction(instruction);
            reset_dd("beam-current-right", 1, 2);
            break;
        case 7:
            instruction = "Set Pattern to Cross Section Cutting. The dimension of the pattern is 8x6x3 &#181;m.";
            showInstruction(instruction);
            reset_dd("patterns", 3, 4);
            break;
        case 8:
            instruction = "We will now use a lower ion beam current to finely polish to milled cross section. Select 0.1nA.";
            showInstruction(instruction);
            reset_dd("beam-current-right", 4, 2);
            break;
        case 9:
            instruction = "Click <b>Cross Section</b> to remove the image tilt correction .";
            showInstruction(instruction);
            $("#cross-section").prop("disabled", false);
            break;
    }
    close_area_modal++
});
// ======================= END  ======================== //
$("#close-modal-instructions").click(() => {
    toogle_fn("#modal-instructions", "totally-hidden", false);
});
// ======================= START ======================== //
// ======================= END  ======================== //
// ======================= START ======================== //
const activate_pump = () => {
    if (window.FIB_BENCHMARK_API && typeof window.FIB_BENCHMARK_API.markSubtaskSuccess === "function") {
        window.FIB_BENCHMARK_API.markSubtaskSuccess("F1");
    }
    activate_btn("pump");
    instruction = "Click <b>Pump</b> to pump down the chamber.";
    showInstruction(instruction);
    stop_imgSeqAnimation(43);
    canvas_data_ch4[0].sprite_arr = sprites[0];
    imgSeqAnimation(false, 44, 48, canvas_data_ch4);
}
// ======================= START ======================== //
const z_val = () => {
    let z = scroll_equation(currentImg, 0, 33, 0, 12.5);
    $("#ebeam-z-val").html(z.toFixed(3) + "mm");
}

// ======================= END ======================== //
// ======================= START ======================== //
const nav_cam = () => {
    nav_pic = document.getElementById("nav-cam");
    stop_imgSeqAnimation(0);
    canvas_data_ch4[0].sprite_arr = sprites[2];
    imgSeqAnimation(true, 0, 139, canvas_data_ch4, end_nav_cam, nav_cam_vals);
}

// ======================= END ======================== //

// ======================= START ======================== //
const nav_cam_vals = () => {
    let x, y, z, r, t;
    if (currentImg <= 18) {
        z = scroll_equation(currentImg, 0, 18, 12.5, 6);
        $("#ebeam-z-val").html(z.toFixed(3) + "mm");
    }
    if (currentImg >= 19 && currentImg <= 54) {
        x = scroll_equation(currentImg, 19, 54, 0, -50.3);
        $("#ebeam-x-val").html(x.toFixed(3) + "mm");
        y = scroll_equation(currentImg, 19, 54, 0, 53.6);
        $("#ebeam-y-val").html(y.toFixed(3) + "mm");
    }
    if (currentImg >= 55 && currentImg <= 70) {
        r = -2.033 * (currentImg - 55);
        $("#ebeam-r-val").html(r.toFixed(1) + "&deg;");
        t = -0.666 * (currentImg - 55);
        $("#ebeam-t-val").html(t.toFixed(1) + "&deg;");
    }
    if (currentImg == 73) {
        ctx_ch3.drawImage(nav_pic, 0, 0, 1280, 859, 0, 0, canvas_ch3.width, canvas_ch3.height);
    }
    if (currentImg >= 75 && currentImg <= 88) {
        r = (2.346 * (currentImg - 75)) - 30.5;
        if (r.toFixed(1) == -0.0) r = 0;
        $("#ebeam-r-val").html(r.toFixed(1) + "&deg;");
        t = (0.769 * (currentImg - 75)) - 10;
        if (t.toFixed(1) == -0.0) t = 0;
        $("#ebeam-t-val").html(t.toFixed(1) + "&deg;");
    }
    if (currentImg >= 89 && currentImg <= 119) {
        x = scroll_equation(currentImg, 89, 119, -50.3, 0);
        if (x.toFixed(1) == -0.0) x = 0.000;
        $("#ebeam-x-val").html(x.toFixed(3) + "mm");
        y = scroll_equation(currentImg, 89, 119, 53.6, 0);
        $("#ebeam-y-val").html(y.toFixed(3) + "mm");
    }
    if (currentImg >= 125 && currentImg <= 138) {
        z = scroll_equation(currentImg, 125, 138, 6, 12.5);
        $("#ebeam-z-val").html(z.toFixed(3) + "mm");
    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const end_nav_cam = () => {
    stop_imgSeqAnimation(139);
    imgSeqAnimation(false, 139, 143, canvas_data_ch4);
    instruction = "Select <b>Sample 'Si Wafer'</b> for the experiment.";
    showInstruction(instruction);
    activate_dd("sample");
}
// ======================= END ======================== //
// ======================= START ======================== //
const centerstg_vals = () => {
    let x, y;
    if (currentImg >= 0 && currentImg <= 7) {
        x = scroll_equation(currentImg, 0, 6, -4.3, 0);
        $("#ebeam-x-val").html(x.toFixed(3) + "mm");
        y = scroll_equation(currentImg, 0, 6, 1.3, 0);
        $("#ebeam-y-val").html(y.toFixed(3) + "mm");
    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const end_centerstg = () => {
    stop_imgSeqAnimation(7);
    imgSeqAnimation(false, 7, 10, canvas_data_ch4);
    instruction = "We will now compare the effect of different beam currents on a heterogeneous sample. Select the <b>Aluminium Stub'</b> sample.";
    showInstruction(instruction);
    reset_dd("sample", 2, 1);
}
// ======================= END ======================== //
// ======================= START ======================== //
const sample_fn = () => {
    toogle_fn("#top-instructions", "top-instructions-on", true);
    deactivate_dd("sample");
    stop_imgSeqAnimation(0);
    canvas_data_ch4[0].sprite_arr = sprites[3];
    if (al_sample) {
        toogle_fn("#sample-mark-al", "totally-hidden", true);
        toogle_fn("#sample-mark-si", "totally-hidden", false);
        imgSeqAnimation(true, 0, 7, canvas_data_ch4, end_sample_al, sample_anim);
    } else {
        toogle_fn("#sample-mark-si", "totally-hidden", true);
        toogle_fn("#sample-mark-al", "totally-hidden", false);
        imgSeqAnimation(true, 0, 7, canvas_data_ch4, end_sample_si, sample_anim);
    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const sample_anim = () => {
    let x, y;
    let max_x = (al_sample) ? -1.711 : -4.343;
    let max_y = (al_sample) ? -8.766 : -1.332;
    if (currentImg >= 0 && currentImg < 7) {
        x = scroll_equation(currentImg, 0, 6, 0, max_x);
        $("#ebeam-x-val").html(x.toFixed(3) + "mm");
        y = scroll_equation(currentImg, 0, 6, 0, max_y);
        $("#ebeam-y-val").html(y.toFixed(3) + "mm");
    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const end_sample_si = () => {
    if (window.FIB_BENCHMARK_API && typeof window.FIB_BENCHMARK_API.markSubtaskSuccess === "function") {
        window.FIB_BENCHMARK_API.markSubtaskSuccess("F3");
    }
    stop_imgSeqAnimation(7);
    imgSeqAnimation(false, 7, 10, canvas_data_ch4);
    instruction = "Now we set the parameters ready for viewing our sample. Set the electron beam <b>Acceleration Voltage</b> to 5kV and <b>Beam Current</b> to 0.1nA.";
    showInstruction(instruction);
    activate_dd("acc-volt-left");
    activate_dd("beam-current-left");
}
// ======================= END ======================== //
// ======================= START ======================== //
const end_sample_al = () => {
    if (window.FIB_BENCHMARK_API && typeof window.FIB_BENCHMARK_API.markSubtaskSuccess === "function") {
        window.FIB_BENCHMARK_API.markSubtaskSuccess("F3");
    }
    stop_imgSeqAnimation(7);
    imgSeqAnimation(false, 7, 10, canvas_data_ch4);
    ht_fn();
}
// ======================= END ======================== //
// ======================= START ======================== //
const ebeam_dd_01_fun = () => {
    instruction = "Turn on the electron beam by clicking the electron beam <b>HT</b> button.";
    showInstruction(instruction);
    deactivate_dd("acc-volt-left");
    deactivate_dd("beam-current-left");
    activate_btn("ht");
}
// ======================= END ======================== //
// ======================= START ======================== //
const ibeam_dd_01_fun = () => {
    if (al_sample) {
        htr_fn();
    } else {
        instruction = "Turn on the ion beam by clicking the ion beam <b>HT</b> button.";
        showInstruction(instruction);
        deactivate_dd("acc-volt-right");
        deactivate_dd("beam-current-right");
        activate_btn("htr");
    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const ht_fn = () => {
    if (window.FIB_BENCHMARK_API && typeof window.FIB_BENCHMARK_API.markSubtaskSuccess === "function") {
        window.FIB_BENCHMARK_API.markSubtaskSuccess("F4");
    }
    if (al_sample) {
        instruction = "Lower the electron beam magnification to 500x";
        reset_dd("magnification", 4, 1);
    } else {
        instruction = "We start with a low magnification for the electron beam to locate our feature of interest – select 500x";
        activate_dd("magnification");
    }
    showInstruction(instruction);
    deactivate_btn("ht");
}
// ======================= END ======================== //
// ======================= START ======================== //
const htr_fn = () => {
    instruction = "Select a <b>Magnification</b> of 3000x";
    showInstruction(instruction);
    deactivate_btn("htr");
    activate_dd("magnificationr");
}
// ======================= END ======================== //
// ======================= START ======================== //
const magnification_a_fn = () => {
    instruction = "Click electron beam <b>Live View</b> button to get an image of the sample.";
    showInstruction(instruction);
    deactivate_dd("magnification");
    activate_btn("live-left");
}
// ======================= END ======================== //
// ======================= START ======================== //
const focus_ch1 = (focus_val) => {
    let ch1_set_1 = (al_sample) ? al_ch1_set_1 : si_ch1_set_1;
    let ch1_set_2 = (al_sample) ? al_ch1_set_2 : si_ch1_set_2;
    let ch1_set_3 = (al_sample) ? al_ch1_set_3 : si_ch1_set_3;
    let ch1_set_4 = (al_sample) ? al_ch1_set_4 : si_ch1_set_4;
    if (focus_val <= 72) {
        bufferCtx_focus.drawImage(ch1_set_1, 0, 0, canvas_w, canvas_h, 0, 0, canvas_w, canvas_h);
        let ch1_set_2_alpha = scroll_equation(focus_val, 0, 100, 1.0, 0.0);
        bufferCtx_focus.globalAlpha = ch1_set_2_alpha;
        bufferCtx_focus.drawImage(ch1_set_3, 0, 0, canvas_w, canvas_h, 0, 0, canvas_w, canvas_h);
    }
    if (focus_val >= 73 && focus_val <= 77) {
        bufferCtx_focus.globalAlpha = 1;
        bufferCtx_focus.drawImage(ch1_set_2, 0, 0, canvas_w, canvas_h, 0, 0, canvas_w, canvas_h);
    }
    if (focus_val >= 78 && focus_val <= 100) {
        bufferCtx_focus.drawImage(ch1_set_1, 0, 0, canvas_w, canvas_h, 0, 0, canvas_w, canvas_h);
        let ch1_set_4_alpha = scroll_equation(focus_val, 0, 100, 1.0, 0.3);
        bufferCtx_focus.globalAlpha = ch1_set_4_alpha;
        bufferCtx_focus.drawImage(ch1_set_4, 0, 0, canvas_w, canvas_h, 0, 0, canvas_w, canvas_h);

    }
    scan_ch01.tvCounter = 2;
    scan_ch01.img = bufferC_focus;
    $("#wd-val").html((focus_val / 10).toFixed(2));
}
// ======================= END ======================== //
// ======================= START ======================== //
const end_centerft = () => {
    if (window.FIB_BENCHMARK_API && typeof window.FIB_BENCHMARK_API.markSubtaskSuccess === "function") {
        window.FIB_BENCHMARK_API.markSubtaskSuccess("F5");
    }
    stop_imgSeqAnimation(0);
    canvas_data_ch4[0].sprite_arr = sprites[6];
    imgSeqAnimation(false, 0, 3, canvas_data_ch4);
    instruction = "Increase the <b>Magnification</b> to 3000x.";
    showInstruction(instruction);
    scan_ch01.tvCounter = 2;
    scan_ch01.img = (al_sample) ? al_ch1_set_6 : si_ch1_set_6;
    scan_ch01.draw_it();
    reset_dd("magnification", 1, 3);
}
// ======================= END ======================== //
// ======================= START ======================== //
const magnification_c_fn = () => {
    scan_ch01.tvCounter = 2;
    if (al_sample) {
        scan_ch01.img = al_ch1_set_7;
        instruction = "Set the <b>Working Distance</b> to 7mm.";
    } else {
        scan_ch01.img = si_ch1_set_7;
        instruction = "Set the <b>Working Distance</b> to 7mm to bring the stage close to the eucentric height position.";
        toogle_fn("#modal-instructions", "totally-hidden", true);
    }
    scaleBar_fun("ch1", 44, "30");
    showInstruction(instruction);
    deactivate_dd("magnification");

    $("#wd-dropdown").selectmenu("enable");
}
// ======================= END ======================== //
// ======================= START ======================== //
const magnificationr_c_fn = () => {
    deactivate_dd("magnificationr");
    instruction = "Click the ion beam <b>Live View</b> button to get an ion beam image of your sample.";
    showInstruction(instruction);
    activate_btn("live-right");
}
// ======================= END ======================== //
// ======================= START ======================== //
const magnification_d_fn = () => {
    deactivate_dd("magnification");
    switch (magnification_d_var) {
        case 0:
            instruction = "Click the electron beam <b>Live View</b> to show the milled area.";
            b_currentr_a_fn();
            break;
        case 1:
            toogle_fn("#top-instructions", "top-instructions-on", true);
            scan_ch01.tvCounter = 2;
            scan_ch01.img = (al_sample) ? al_ch1_set_15 : si_ch1_set_15;
            scaleBar_fun("ch1", 24, "10");
            instruction = "Click Electron beam Live View button to stop the scan.";
            activate_btn("live-left");
            break;
    }
    showInstruction(instruction);
    magnification_d_var++;
}
// ======================= END ======================== //
// ======================= START ======================== //
const magnificationr_d_fn = () => {
    deactivate_dd("magnificationr");
    activate_btn("snap-right");
    //    $("#magnification>option:eq(3)").attr("disabled", true);
    //    $("#magnification-button .ui-selectmenu-text").html("5000x");
}
// ======================= END ======================== //
// ======================= START ======================== //
const wd_f_fn = () => {
    cancelAnimationFrame(scan_ch01.scanEffect);
    deactivate_dd("wd-dropdown");
    $("#wd-val").html("7mm");
    stop_imgSeqAnimation(0);
    two_canvas_data[0].sprite_arr = (al_sample) ? sprites[23] : sprites[7];
    two_canvas_data[1].sprite_arr = sprites[8];
    imgSeqAnimation(true, 0, 8, two_canvas_data, end_wd_7mm, z_vals_wd7);
}
// ======================= END ======================== //
// ======================= START ======================== //
const z_vals_wd7 = () => {
    let z;
    if (al_sample) {
        z = scroll_equation(currentImg, 0, 7, 13.036, 13.589);
    } else {
        z = scroll_equation(currentImg, 0, 7, 12.5, 13.049);
    }
    $("#ebeam-z-val").html(z.toFixed(3) + "mm");
}
// ======================= END ======================== //
// ======================= START ======================== //
const end_wd_7mm = () => {
    if (window.FIB_BENCHMARK_API && typeof window.FIB_BENCHMARK_API.markSubtaskSuccess === "function") {
        window.FIB_BENCHMARK_API.markSubtaskSuccess("F6");
    }
    toogle_fn("#top-instructions", "top-instructions-on", true);

    stop_imgSeqAnimation(4);
    canvas_data_ch4[0].sprite_arr = sprites[8];
    imgSeqAnimation(false, 4, 9, canvas_data_ch4);

    scan_ch01.tvCounter = 2;
    scan_ch01.img = (al_sample) ? al_ch1_set_8 : si_ch1_set_8;
    scan_ch01.draw_it();

    pupup_mssg = "We now need to tilt the sample to check that it is centred perfectly at the eucentric position. <br>It is crucial to set this position correctly since all the insertable/retractable detectors and gas injection needles are calibrated and aligned to this position. <br>Failure to do so would lead to serious damage of the machine. <br>We start by doing a small tilt and centring the feature so when we do a greater tilt the feature doesn’t move out of the field of view. Start by selecting 10 degrees in the tilt drop down.";
    $("#info-area").html(pupup_mssg);
    toogle_fn("#modal-messages", "totally-hidden", true);

}
// ======================= END ======================== //
// ======================= START ======================== //
const end_tilt10 = () => {
    if (window.FIB_BENCHMARK_API && typeof window.FIB_BENCHMARK_API.markSubtaskSuccess === "function") {
        window.FIB_BENCHMARK_API.markSubtaskSuccess("F7");
    }
    stop_imgSeqAnimation(0);
    stage_z_increment = (al_sample) ? 80 : 80;
    scan_ch01.sy = stage_z_increment;
    scan_ch01.tvCounter = 2;
    scan_ch01.img = (al_sample) ? al_ch1_set_8 : si_ch1_set_8;
    scan_ch01.draw_it();
    canvas_data_ch4[0].sprite_arr = sprites[11];
    imgSeqAnimation(false, 0, 3, canvas_data_ch4);

    instruction = "Adjust the <b>Stage Z control</b> to bring the feature of interest in the SEM back to the centre of the screen.";
    showInstruction(instruction);
    toogle_fn("#stage-z-label", "label-disabled", true);
    toogle_fn("#stage-z-div", "div-disabled", true);
    toogle_fn("#stage-z-down", "btn-disabled", true);
    $("#stage-z").css('opacity', '1');
    $("#stage-z-down").prop("disabled", false);
    $("#stage-z-down").css("cursor", "pointer");
}
// ======================= END ======================== //
// ======================= START ======================== //
const vals_stagez_down01 = () => {
    let z;
    if (al_sample) {
        if (al_ch1_11_bool) {
            z = scroll_equation(stage_z_increment, 80, 0, 13.564, 13.555);
        } else {
            z = scroll_equation(stage_z_increment, 80, 0, 13.589, 13.564);
        }
    } else {
        z = scroll_equation(stage_z_increment, 80, 0, 13.049, 13.004);
    }
    $("#ebeam-z-val").html(z.toFixed(3) + "mm");
    let wd = wd_down_increment;
    $("#wd-val").html(wd.toFixed(3));
}

// ======================= END ======================== //
// ======================= START ======================== //
const vals_stagez_up01 = () => {
    let z = z_up_increment;
    $("#ebeam-z-val").html(z.toFixed(3) + "mm");
    let wd = wd_up_increment;
    $("#wd-val").html(wd.toFixed(3));
}

// ======================= END ======================== //
// ======================= START ======================== //
const stage_z_done = (up_down) => {
    if (window.FIB_BENCHMARK_API && typeof window.FIB_BENCHMARK_API.markSubtaskSuccess === "function") {
        window.FIB_BENCHMARK_API.markSubtaskSuccess("F8");
    }
    switch (up_down) {
        case "down_01":
            reset_dd("t-dropdown", 2, 1);
            instruction = "Set stage <b>Tilt</b> angle back to 0 degrees to double check that the cross remains in the centre of the screen.";
            break;
        case "up_01":
            instruction = "Click electron beam <b>Live View</b> button to stop the scan.";
            activate_btn("live-left");
            break;
    }
    toogle_fn("#stage-z-down", "btn-disabled", false);
    $("#stage-z-down").prop("disabled", true);
    $("#stage-z-down").css("cursor", "not-allowed");
    toogle_fn("#stage-z-up", "btn-disabled", false);
    $("#stage-z-up").prop("disabled", true);
    $("#stage-z-up").css("cursor", "not-allowed");
    $("#stage-z").css('opacity', '1');

    showInstruction(instruction);
}
// ======================= END ======================== //
// ======================= START ======================== //
const t_a_fn = () => {
    toogle_fn("#top-instructions", "top-instructions-on", true);
    $("#ebeam-t-val").html("0&deg;");
    scan_ch01.sy = 0;
    cancelAnimationFrame(scan_ch01.scanEffect);
    stop_imgSeqAnimation(0);
    switch (t_a_var) {
        case 0:
            two_canvas_data[0].sprite_arr = (al_sample) ? sprites[23] : sprites[12];
            two_canvas_data[1].sprite_arr = sprites[10];
            imgSeqAnimation(true, 0, 10, two_canvas_data, end_tilt_0);
            break;
        case 1:
            canvas_data_ch4[0].sprite_arr = sprites[14];
            imgSeqAnimation(true, 0, 48, canvas_data_ch4, end_final_tilt_0);
            deactivate_dd("t-dropdown");
            break;
    }
    t_a_var++;
}
// ======================= END ======================== //
// ======================= START ======================== //
const t_b_fn = () => {
    cancelAnimationFrame(scan_ch01.scanEffect);
    $("#ebeam-t-val").html("10&deg;");

    stop_imgSeqAnimation(0);
    let ch1_sprites = [sprites[9][0], sprites[9][0], sprites[9][1], sprites[9][1], sprites[9][2], sprites[9][2], sprites[9][3], sprites[9][3], sprites[9][4], sprites[9][4]];
    two_canvas_data[0].sprite_arr = (al_sample) ? sprites[24] : ch1_sprites;

    let ch4_sprites = sprites[10];
    two_canvas_data[1].sprite_arr = ch4_sprites.slice().reverse();
    imgSeqAnimation(true, 0, 10, two_canvas_data, end_tilt10);

    deactivate_dd("t-dropdown");
}
// ======================= END ======================== //
// ======================= START ======================== //
const t_c_fn = () => {
    $("#ebeam-t-val").html("52&deg;");
    deactivate_dd("t-dropdown");
    toogle_fn("#top-instructions", "top-instructions-on", true);

    cancelAnimationFrame(scan_ch01.scanEffect);
    stop_imgSeqAnimation(0);
    two_canvas_data[0].sprite_arr = (al_sample) ? sprites[25] : sprites[13];

    let ch4_sprites = sprites[14];
    two_canvas_data[1].sprite_arr = ch4_sprites.slice().reverse();
    imgSeqAnimation(true, 0, 48, two_canvas_data, end_tilt_52);
}
// ======================= END ======================== //
// ======================= START ======================== //
const end_tilt_0 = () => {
    reset_dd("t-dropdown", 1, 3);
    instruction = "Next we tilt to 52 degrees to further refine the eucentric height using the Stage Z control. This adjusts the position of the sample so that the ion beam is coincident with the electron beam.";
    showInstruction(instruction);

    scan_ch01.tvCounter = 2;
    scan_ch01.img = (al_sample) ? al_ch1_set_9 : si_ch1_set_9;
    scan_ch01.draw_it();

    stop_imgSeqAnimation(4);
    canvas_data_ch4[0].sprite_arr = sprites[8];
    imgSeqAnimation(false, 4, 9, canvas_data_ch4);
}
// ======================= END ======================== //
// ======================= START ======================== //
const end_final_tilt_0 = () => {
    if (window.FIB_BENCHMARK_API && typeof window.FIB_BENCHMARK_API.markSubtaskSuccess === "function") {
        window.FIB_BENCHMARK_API.markSubtaskSuccess("F20");
    }
    stop_imgSeqAnimation(7);
    canvas_data_ch4[0].sprite_arr = sprites[8];
    imgSeqAnimation(false, 7, 9, canvas_data_ch4);
    if (al_sample) {
        pupup_mssg = "<p><b>Congratulations!!</b><br>You have completed the FIB simulator activity.</p><br><div id='save-data-btns' class='flex'><button class='btn' id='start-again'  onclick='start_again()'>Start again</button><button class='btn' id='go-home'  onclick='location.href=\"http://localhost\"'>Start Page</button></div></div>";
        $("#info-area").html(pupup_mssg);
        toogle_fn("#modal-messages", "totally-hidden", true);
    } else {
        instruction = "Click button <b>Centre Stage</b>.";
        showInstruction(instruction);
        activate_btn("centerstage");
    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const end_tilt_52 = () => {
    instruction = "Click electron beam <b>Auto Brightness & Contrast</b> button.";
    showInstruction(instruction);
    activate_btn("autobright-left");

    stop_imgSeqAnimation(0);
    canvas_data_ch4[0].sprite_arr = sprites[16];
    imgSeqAnimation(false, 0, 3, canvas_data_ch4);
    scan_ch01.tvCounter = 2;
    scan_ch01.img = (al_sample) ? al_ch1_set_10 : si_ch1_set_10;
    scan_ch01.draw_it();
}
// ======================= END ======================== //
// ======================= START ======================== //
const beam_feat_centered_01 = () => {
    if (window.FIB_BENCHMARK_API && typeof window.FIB_BENCHMARK_API.markSubtaskSuccess === "function") {
        window.FIB_BENCHMARK_API.markSubtaskSuccess("F9");
    }
    toogle_fn("#centerpoint-right", "totally-hidden", false);
    toogle_fn("#centerpoint-left", "totally-hidden", false);
    $(".bsr-div button").css("cursor", "not-allowed");
    instruction = "Stop <b>Live View</b>. If you keep imaging with the ion beam you will gradually start to mill your sample";
    showInstruction(instruction);
    toogle_fn("#beam-shift-label", "label-disabled", false);
    toogle_fn(".bsr-div", "div-disabled", false);
    toogle_fn(".bsr-div button", "btn-disabled", false);
    $(".bsr-div button").prop("disabled", true);
    activate_btn("live-right");
}
// ======================= END ======================== //
// ======================= START ======================== //
const set_cd = (hh, mm, ss) => {
    $("#cd_h").html(hh);
    $("#cd_m").html(mm);
    $("#cd_s").html(ss);
}
// ======================= END ======================== //
// ======================= START ======================== //
const b_currentr_a_fn = () => {
    showInstruction(instruction);
    activate_btn("live-left");
    deactivate_dd("beam-current-right");
}
// ======================= END ======================== //
// ======================= START ======================== //
const b_currentr_b_fn = () => {
    switch (b_currentr_b_var) {
        case 0:
            instruction = "Reduce the <b>Magnification</b> to 500x in the electron beam view so you can see the Pt needle as it is inserted.";
            reset_dd("magnification", 4, 1);
            break;
        case 1:
            instruction = "Set Pattern to Cleaning Cross Section Cutting. The dimension of the pattern is 8x0.25x3 &#181;m.";
            reset_dd("patterns", 4, 5);
            $("#patterns-button .ui-selectmenu-text").html("");
            break;
    }
    b_currentr_b_var++;
    deactivate_dd("beam-current-right");
    showInstruction(instruction);
}
// ======================= END ======================== //
// ======================= START ======================== //
const b_currentr_d_fn = () => {
    instruction = "Click <b>Start</b> to start patterning.";
    toogle_fn("#pattern-controls-label", "label-disabled", true);
    activate_btn("start");
    deactivate_dd("beam-current-right");
    switch (b_currentr_d_var) {
        case 0:
            set_cd("00", "01", "00");
            break;
        case 1:
            set_cd("00", "00", "48");
            break;
    }
    b_currentr_d_var++;
    showInstruction(instruction);

}
// ======================= END ======================== //
// ======================= START ======================== //
const b_currentr_e_fn = () => {
    if (al_sample) {
        instruction = "Set <b>Pattern</b> to Rectangular Al milling. The dimension of the pattern is 5x5x2 &#181;m.";
        reset_dd("patterns", 5, 2);
        $("#patterns-button .ui-selectmenu-text").html("");
    } else {
        instruction = "Set <b>Pattern</b> to Rectangular Si milling. The dimension of the pattern is 5x5x2 &#181;m.";
        activate_dd("patterns");
    }
    showInstruction(instruction);
    activate_dd("patterns");
}
// ======================= END ======================== //
// ======================= START ======================== //
const deactivate_snap_r = () => {
    if (window.FIB_BENCHMARK_API && typeof window.FIB_BENCHMARK_API.markSubtaskSuccess === "function") {
        window.FIB_BENCHMARK_API.markSubtaskSuccess("F16");
    }
    if (al_sample) {
        instruction = "We will now compare the effect of different beam currents on a heterogeneous sample. Set <b>Pattern</b> to Rectangular Al milling. The dimension of the pattern is 5x5x2 &#181;m.";
        reset_dd("patterns", 5, 2);
        $("#patterns-button .ui-selectmenu-text").html("");
    } else {
        instruction = "We will now compare the effect of different beam currents on a smooth sample. Set <b>Pattern</b> to Rectangular Si milling. The dimension of the pattern is 5x5x2 &#181;m.";
        activate_dd("patterns");
    }
    showInstruction(instruction);
    toogle_fn("#pause-ch2", "totally-hidden", true);
}
// ======================= END ======================== //
// ======================= START ======================== //
const clear_patterns = () => {
    set_cd("00", "00", "00");
    toogle_fn("#remaining-time-div", "div-disabled", false);
    $('#remaining-time-progressbar').progressbar("value", 0);
}
// ======================= END ======================== //
// ======================= START ======================== //
const patterns_a_dragged = () => {
    toogle_fn("#top-instructions", "top-instructions-on", true);
    switch (pattern_a) {
        case 0:
            set_cd("05", "09", "52");
            if (al_sample) {
                ctx_ch2.drawImage(patterns_set_6, 0, 0, 1280, 859, 0, 0, canvas_w, canvas_h);
            } else {
                ctx_ch2.drawImage(patterns_set_1, 0, 0, 1280, 859, 0, 0, canvas_w, canvas_h);
            }

            pupup_mssg = "The estimated time to complete this job is 05h:09m:52s based on the rectangle dimensions and the current ion beam current of 10pA. <br>The long time required to complete this job is due to a very low beam current.";
            $("#info-area").html(pupup_mssg);
            toogle_fn("#modal-messages", "totally-hidden", true);

            break;
        case 1:
            if (al_sample) {
                set_cd("00", "00", "03");
                ctx_ch2.drawImage(patterns_set_7, 0, 0, 1280, 859, 0, 0, canvas_w, canvas_h);
            } else {
                set_cd("00", "00", "06");
                ctx_ch2.drawImage(patterns_set_2, 0, 0, 1280, 859, 0, 0, canvas_w, canvas_h);
            }
            instruction = "Click <b>Start</b> to start patterning.";
            showInstruction(instruction);

            activate_btn("start");
            break;
    }
    pattern_a++;
}
// ======================= END ======================== //
// ======================= START ======================== //
const patterns_c_dragged = () => {
    toogle_fn("#top-instructions", "top-instructions-on", true);
    set_cd("00", "34", "24");
    if (al_sample) {
        ctx_ch2.drawImage(patterns_set_8, 0, 0, 1280, 859, 0, 0, canvas_w, canvas_h);
    } else {
        ctx_ch2.drawImage(patterns_set_3, 0, 0, 1280, 859, 0, 0, canvas_w, canvas_h);
    }
    pupup_mssg = "Unlike FIB milling, ion beam assisted deposition has a current range for deposition. The range for Pt deposition is 2-10pA/&#181;m<sup>2</sup>. <br>The total area for the Pt deposition pattern is 10&#181;m<sup>2</sup>, so the available beam current range would be between 20pA - 100pA. <br>You need to select a suitable ion beam current within this range.";
    $("#info-area").html(pupup_mssg);
    toogle_fn("#modal-messages", "totally-hidden", true);
}
// ======================= END ======================== //
// ======================= START ======================== //
const patterns_d_dragged = () => {
    set_cd("00", "23", "55");
    if (al_sample) {
        ctx_ch2.drawImage(patterns_set_9, 0, 0, 1280, 859, 0, 0, canvas_w, canvas_h);
    } else {
        ctx_ch2.drawImage(patterns_set_4, 0, 0, 1280, 859, 0, 0, canvas_w, canvas_h);
    }
    instruction = "Select the higher ion <b>Beam Current</b> of 3nA for milling your cross section.";
    showInstruction(instruction);
    reset_dd("beam-current-right", 2, 4);
}
// ======================= END ======================== //
// ======================= START ======================== //
const patterns_e_dragged = () => {
    if (al_sample) {
        set_cd("00", "01", "39");
        ctx_ch2.drawImage(patterns_set_10, 0, 0, 1280, 859, 0, 0, canvas_w, canvas_h);
    } else {
        set_cd("00", "00", "33");
        ctx_ch2.drawImage(patterns_set_5, 0, 0, 1280, 859, 0, 0, canvas_w, canvas_h);
    }
    instruction = "Click <b>Start</b> to start patterning.";
    showInstruction(instruction);
    activate_btn("start");
}
// ======================= END ======================== //
// ======================= START ======================== //
const patterns_a_fn = () => {
    instruction = "Drag the milling pattern to the correct location on your sample. This is marked by the blue rectangle";
    showInstruction(instruction);
    let my_text = (al_sample) ? "Rect. Al milling" : "Rect. Si milling";
    $("#patterns-button .ui-selectmenu-text").html(my_text);
    switch (pattern_a) {
        case 0:
            if (al_sample) {
                dragPattern("6", "312 204", patterns_a_dragged);
            } else {
                dragPattern("1", "201 204", patterns_a_dragged);
            }
            break;
        case 1:
            if (al_sample) {
                dragPattern("7", "1037 231", patterns_a_dragged);
            } else {
                dragPattern("2", "1090 239", patterns_a_dragged);
            }
            break;
    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const patterns_c_fn = () => {
    instruction = "Drag the milling pattern to the correct location on your sample. This is marked by the blue rectangle";
    showInstruction(instruction);
    if (al_sample) {
        dragPattern("8", "473 594", patterns_c_dragged);
    } else {
        dragPattern("3", "537 518", patterns_c_dragged);
    }
}
// ======================= END ======================== //
// ======================= START ======================== //

const patterns_d_fn = () => {
    instruction = "Drag the milling pattern to the correct location on your sample. This is marked by the blue rectangle";
    showInstruction(instruction);
    $("#patterns-button .ui-selectmenu-text").html("Cross-sect. cut.");
    if (al_sample) {
        dragPattern("9", "493 696", patterns_d_dragged);
    } else {
        dragPattern("4", "560 602", patterns_d_dragged);
    }
}
// ======================= END ======================== //
// ======================= START ======================== //

const patterns_e_fn = () => {
    instruction = "Drag the milling pattern to the correct location on your sample. This is marked by the blue rectangle";
    showInstruction(instruction);
    $("#patterns-button .ui-selectmenu-text").html("Cleaning c-s cutt.");
    if (al_sample) {
        dragPattern("10", "493 591", patterns_e_dragged);
    } else {
        dragPattern("5", "561 508", patterns_e_dragged);
    }
}
// ======================= END ======================== //
// ======================= START ======================== //
const dragPattern = (id, origin, next_fun) => {
    let bound = "#svg-dd-" + id;
    let drag = "#drag" + id;
    let drop = "#drop" + id;
    let pattern = "#pattern" + id;
    deactivate_dd("patterns");
    toogle_fn("#remaining-time-div", "div-disabled", true);
    toogle_fn("#pattern-properties-div", "div-disabled", true);
    toogle_fn(bound, "totally-hidden", true);
    Draggable.create(drag, {
        bounds: bound,
        onDragEnd: function () {
            if (this.hitTest(drop)) {
                gsap.to(drop, {
                    opacity: 0.5
                });
                gsap.to(this.target, {
                    duration: 0.6,
                    opacity: 0,
                    scale: 0.3,
                    svgOrigin: origin,
                    onComplete: next_fun()
                }).then(toogle_fn(bound, "totally-hidden", false));
            }
        }
    });
}
// ======================= END ======================== //
// ======================= START ======================== //
const stop_live_l = () => {
    switch (stop_live_l_var) {
        case 0:
            instruction = "Set the ion beam <b>Acceleration Voltage</b> to 30kV and <b>Beam Current</b> to 10pA. ";
            activate_dd("acc-volt-right");
            activate_dd("beam-current-right");
            break;
        case 1:
            instruction = "Next job is to deposit a Pt layer on the sample surface to protect the surface and prevent curtaining. <br>Set <b>Pattern</b> to Pt Deposition. The dimension of the pattern is 5x2x1 &#181;m.";
            let disable_patt = (al_sample) ? 2 : 1;
            reset_dd("patterns", disable_patt, 3);
            $("#patterns-button .ui-selectmenu-text").html("");
            break;
        case 2:
            instruction = "Click <b>Start</b> to start patterning.";
            activate_btn("start");
            break;
    }
    showInstruction(instruction);
    toogle_fn("#pause-ch1", "totally-hidden", true);
    deactivate_btn("live-left");
    stop_live_l_var++;
}
// ======================= END ======================== //
// ======================= START ======================== //
const stop_live_r_01 = () => {
    instruction = "Increase the ion beam <b>Magnification</b> to 5000x and take a <b>Snapshot</b> of your sample. The short exposure needed for a snapshot minimises beam damage.";
    showInstruction(instruction);
    toogle_fn("#pause-ch2", "totally-hidden", true);
    reset_dd("magnificationr", 3, 4);
}
// ======================= END ======================== //
// ======================= START ======================== //
const end_pattern_01 = () => {
    instruction = "Click <b>Delete</b> to remove the finished pattern.";
    showInstruction(instruction);
    activate_btn("delete-pattern");
}
// ======================= END ======================== //
// ======================= START ======================== //
const surface_fn = () => {
    scan_ch01.tvCounter = 2;
    switch (surface_var) {
        case 0:
            toogle_fn("#dynamic-focus-form", "checkbox-disabled", true);
            $("#dynamic-focus").prop("checked", true);
            toogle_fn("#tilt-correction-form", "checkbox-disabled", true);
            $("#tilt-correction").prop("checked", true);
            $("#surface").prop("disabled", true);
            scan_ch01.img = (al_sample) ? al_ch1_set_16 : si_ch1_set_16;
            instruction = "Click electron beam <b>Capture</b> to capture an SEM image of the sample";
            activate_btn("capture-left");
            break;
        case 1:
            toogle_fn("#cross-section-form", "checkbox-disabled", true);
            $("#cross-section").prop("disabled", false);
            $("#dynamic-focus").prop("checked", false);
            $("#tilt-correction").prop("checked", false);
            $("#surface").prop("disabled", true);
            scan_ch01.img = (al_sample) ? al_ch1_set_15 : si_ch1_set_15;
            instruction = "Tick <b>Cross Section</b> to apply image tilt correction for optimal viewing of the cross sections of the milled areas.";
            break;
    }
    surface_var++;
    showInstruction(instruction);
}
// ======================= END ======================== //
// ======================= START ======================== //
const cross_fn = () => {
    $("#cross-section").prop("disabled", true);
    scan_ch01.tvCounter = 2;
    switch (cross_var) {
        case 0:
            toogle_fn("#dynamic-focus-form", "checkbox-disabled", true);
            $("#dynamic-focus").prop("checked", true);
            toogle_fn("#tilt-correction-form", "checkbox-disabled", true);
            $("#tilt-correction").prop("checked", true);
            scan_ch01.img = (al_sample) ? al_ch1_set_18 : si_ch1_set_18;
            instruction = "Click electron beam <b>Capture</b> to capture an SEM image of the sample";
            activate_btn("capture-left");
            break;
        case 1:
            $("#dynamic-focus").prop("checked", false);
            $("#tilt-correction").prop("checked", false);
            scan_ch01.img = (al_sample) ? al_ch1_set_15 : si_ch1_set_15;
            instruction = "Click electron beam <b>Live View</b> button to stop the scan.";
            activate_btn("live-left");
            break;
        case 2:
            $("#dynamic-focus").prop("checked", true);
            $("#tilt-correction").prop("checked", true);
            scan_ch01.img = (al_sample) ? al_ch1_set_24 : si_ch1_set_24;
            instruction = "Click electron beam <b>Capture</b> to capture an SEM image of the sample";
            activate_btn("capture-left");
            break;
        case 3:
            if (window.FIB_BENCHMARK_API && typeof window.FIB_BENCHMARK_API.markSubtaskSuccess === "function") {
                window.FIB_BENCHMARK_API.markSubtaskSuccess("F19");
            }
            $("#dynamic-focus").prop("checked", false);
            $("#tilt-correction").prop("checked", false);
            let instruction_zero = "Set <b>Tilt</b> to 0 degrees";
            instruction = (al_sample) ? instruction_zero + "." : instruction_zero + " so we can select our next sample.";
            reset_dd("t-dropdown", 3, 1);
            break;
    }
    cross_var++;
    showInstruction(instruction);
}
// ======================= END ======================== //
// ======================= START ======================== //
const pt_needle_fn = () => {
    toogle_fn("#top-instructions", "top-instructions-on", true);
    switch (pt_needle_var) {
        case 0:
            $("#pt-needle").prop("disabled", true);
            cancelAnimationFrame(scan_ch01.scanEffect);
            stop_imgSeqAnimation(0);
            two_canvas_data[0].sprite_arr = (al_sample) ? sprites[26] : sprites[18];
            let a = sprites[19].slice(0, 3);
            let ch4_sprites = [].concat(a, a, a, a, sprites[19]);
            two_canvas_data[1].sprite_arr = ch4_sprites;
            imgSeqAnimation(true, 0, 19, two_canvas_data, needle_in);
            break;
        case 1:
            $("#pt-needle").prop("disabled", true);
            $("#pt-needle").prop("checked", false);
            stop_imgSeqAnimation(0);
            let ch4_arr = sprites[19];
            canvas_data_ch4[0].sprite_arr = ch4_arr.slice().reverse();
            imgSeqAnimation(true, 0, 13, canvas_data_ch4, needle_out);
            break;
    }
    pt_needle_var++;
}
// ======================= END ======================== //
// ======================= START ======================== //
const needle_in = () => {
    if (window.FIB_BENCHMARK_API && typeof window.FIB_BENCHMARK_API.markSubtaskSuccess === "function") {
        window.FIB_BENCHMARK_API.markSubtaskSuccess("F14");
    }
    stop_imgSeqAnimation(0);
    let a = sprites[19].slice(9, 13);
    canvas_data_ch4[0].sprite_arr = a;
    imgSeqAnimation(false, 0, 4, canvas_data_ch4);

    let ch1_set_21 = (al_sample) ? al_ch1_set_21 : si_ch1_set_21;
    scan_ch01 = new Channel_scan(ch1_set_21, ctx_ch1, bufferCtx_01);
    scan_ch01.drawBuffer();

    instruction = "Increase <b>Magnification</b> to 5000x in the electron beam view.";
    showInstruction(instruction);
    reset_dd("magnification", 1, 4);
}
// ======================= END ======================== //
// ======================= START ======================== //
const needle_out = () => {
    stop_imgSeqAnimation(0);
    canvas_data_ch4[0].sprite_arr = sprites[19];
    imgSeqAnimation(false, 0, 3, canvas_data_ch4);

    instruction = "Click electron beam <b>Capture</b> to capture an SEM image of the sample.";
    showInstruction(instruction);
    activate_btn("capture-left");
}
// ======================= END ======================== //
// ======================= START ======================== //
const save_pop = () => {
    deactivate_btn("capture-left");
    toogle_fn("#pause-ch1", "totally-hidden", true);
    pupup_mssg = "You can save the image in your computer.<br>When ready, close this window and continue with the simulator.<br><br><div id='save-div' class='flex-evenly'><button class='btn' id='save-btn' onclick='save_fn()'>Save</button></div>"
    $("#info-area").html(pupup_mssg);
    toogle_fn("#modal-messages", "totally-hidden", true);
    $("#save-btn").css("cursor", "pointer");
}
// ======================= END ======================== //
const save_fn = () => {
    savePNG(canvas_ch1, 'image from the FIB simulator.png');
};
// ======================= START ======================== //
const capture_l_fn = () => {
    cancelAnimationFrame(scan_ch01.scanEffect);
    switch (capture_l_var) {
        case 1:
            scan_ch01.img = (al_sample) ? al_ch1_set_17 : si_ch1_set_17;
            break;
        case 2:
            scan_ch01.img = (al_sample) ? al_ch1_set_19 : si_ch1_set_19;
            break;
        case 3:
            scan_ch01.img = (al_sample) ? al_ch1_set_22 : si_ch1_set_22;
            break;
        case 4:
            scan_ch01.img = (al_sample) ? al_ch1_set_25 : si_ch1_set_25;
            break;
        case 5:
            scan_ch01.img = (al_sample) ? al_ch1_set_27 : si_ch1_set_27;
            break;
    }

    scan_ch01.after_snapshot_fn = save_pop;
    scan_ch01.tvCounter = 2;
    scan_ch01.constant_scanning = false;
    scan_ch01.drawBuffer();
}
// ======================= END ======================== //
// =======================  START  ==================== //
const start_again = () => {
    location.reload();
    location.reload(true);
}

const go_home = () => {
    location.href = "index.html";
}
// =======================  END END  ==================== //
// ======================= START ======================== //
const scaleBar_fun = (channel, size, num) => {
    toogle_fn(".scale-" + channel, "totally-hidden", true);
    document.getElementById("scalebar-" + channel).style.width = (size) + "%";
    document.getElementById("scale-unit-" + channel).innerHTML = num + "&micro;m";
}
// ======================= END ======================== //
// ======================= START ======================== //
const console_log = () => {
    stop_imgSeqAnimation(0);
    console.log("CONSOLE_LOG FUN");
}
// ======================= END ======================== //
// ======================= START ======================== //
for (let i = 0; i < promises_total; i++) {
    sprites[i] = new Array();
}

const do_when_done = (max, str_id, images_arr) => {
    promise_fullfilled_num++;
    for (let i = 1; i <= max; i++) {
        images_arr[i - 1] = document.getElementById(`${str_id}_${i}`);
    }
    switch (promise_fullfilled_num) {
        case 1:
            canvas_data_ch4[0].sprite_arr = sprites[0];
            imgSeqAnimation(false, 0, 3, canvas_data_ch4);
            toogle_fn("#modal-loading", "totally-hidden", false);
            toogle_fn("#top-bar", "modal-is-open", true);
            toogle_fn("#simulator-base", "modal-is-open", true);
            toogle_fn("#modal-messages", "totally-hidden", true);
            i_promise_jpg(33, `images/simulator/FIB/sequences/5_stage_up/5_ch4_`, `5_ch4_set`, sprites[promise_fullfilled_num]);
            break;
        case 2:
            Loader.jpg("images/simulator/FIB/sequences/5_navcam/nav-cam-photo.jpg", "nav-cam");
            Loader.svg("images/simulator/FIB/sequences/patterns_svg/centerpoint.svg", "centerpoint");
            i_promise_jpg(143, `images/simulator/FIB/sequences/5_navcam/5_navcam_ch4_`, `5_navcam_ch4_set`, sprites[promise_fullfilled_num]);
            break;
        case 3:
            i_promise_jpg(10, `images/simulator/FIB/sequences/6_si_sample/6_si_ch4_`, `6_si_ch4_set`, sprites[promise_fullfilled_num]);
            break;
        case 4:
            i_promise_jpg(27, `images/simulator/FIB/sequences/si_ch1/si_ch1_`, `si_ch1_set`, sprites[promise_fullfilled_num]);
            break;
        case 5:
            i_promise_jpg(20, `images/simulator/FIB/sequences/14_center_feature/14_ch1_`, `14_ch1_set`, sprites[promise_fullfilled_num]);
            break;
        case 6:
            i_promise_jpg(3, `images/simulator/FIB/sequences/14_center_feature/14_ch4_`, `14_ch4_set`, sprites[promise_fullfilled_num]);
            break;
        case 7:
            i_promise_jpg(9, `images/simulator/FIB/sequences/17_to7mm_wd/17_ch1_`, `17_ch1_set`, sprites[promise_fullfilled_num]);
            break;
        case 8:
            i_promise_jpg(9, `images/simulator/FIB/sequences/17_to7mm_wd/17_ch4_`, `17_ch4_set`, sprites[promise_fullfilled_num]);
            break;
        case 9:
            i_promise_jpg(5, `images/simulator/FIB/sequences/19_tilt_10/19_ch1_`, `19_ch1_set`, sprites[promise_fullfilled_num]);
            break;
        case 10:
            i_promise_jpg(10, `images/simulator/FIB/sequences/21_tilt_backto_0/21_ch4_`, `21_ch4_set`, sprites[promise_fullfilled_num]);
            break;
        case 11:
            i_promise_jpg(3, `images/simulator/FIB/sequences/20_z_10deg/20_ch4_`, `20_ch4_set`, sprites[promise_fullfilled_num]);
            break;
        case 12:
            i_promise_jpg(10, `images/simulator/FIB/sequences/21_tilt_backto_0/21_ch1_`, `21_ch1_set`, sprites[promise_fullfilled_num]);
            break;
        case 13:
            i_promise_jpg(48, `images/simulator/FIB/sequences/22_tilt_52/22_ch1_`, `22_ch1_set`, sprites[promise_fullfilled_num]);
            break;
        case 14:
            i_promise_jpg(48, `images/simulator/FIB/sequences/80_tilt_backto_0/80_ch4_`, `80_ch4_set`, sprites[promise_fullfilled_num]);
            break;
        case 15:
            i_promise_jpg(8, `images/simulator/FIB/sequences/24_z_52/24_ch1_`, `24_ch1_set`, sprites[promise_fullfilled_num]);
            break;
        case 16:
            i_promise_jpg(3, `images/simulator/FIB/sequences/24_z_52/24_ch4_`, `24_ch4_set`, sprites[promise_fullfilled_num]);
            break;
        case 17:
            i_promise_file(10, `images/simulator/FIB/sequences/patterns_svg/pattern_`, `patterns_set`, sprites[promise_fullfilled_num], "svg");
            break;
        case 18:
            i_promise_jpg(25, `images/simulator/FIB/sequences/58_ptneedle/58_ch1_`, `58_ch1_set`, sprites[promise_fullfilled_num]);
            break;
        case 19:
            i_promise_jpg(13, `images/simulator/FIB/sequences/58_ptneedle/58_ch4_`, `58_ch4_set`, sprites[promise_fullfilled_num]);
            break;
        case 20:
            i_promise_jpg(10, `images/simulator/FIB/sequences/86_back_to_center/86_ch4_`, `86_ch4_set`, sprites[promise_fullfilled_num]);
            break;
        case 21:
            i_promise_jpg(27, `images/simulator/FIB/sequences/al_ch1/al_ch1_`, `al_ch1_set`, sprites[promise_fullfilled_num]);
            break;
        case 22:
            i_promise_jpg(20, `images/simulator/FIB/sequences/94_center_feature/94_ch1_`, `94_ch1_set`, sprites[promise_fullfilled_num]);
            break;
        case 23:
            i_promise_jpg(10, `images/simulator/FIB/sequences/97_to7mm_wd/97_ch1_`, `97_ch1_set`, sprites[promise_fullfilled_num]);
            break;
        case 24:
            i_promise_jpg(10, `images/simulator/FIB/sequences/99_tilt_10/99_ch1_`, `99_ch1_set`, sprites[promise_fullfilled_num]);
            break;
        case 25:
            i_promise_jpg(48, `images/simulator/FIB/sequences/102_tilt_52/102_ch1_`, `102_ch1_set`, sprites[promise_fullfilled_num]);
            break;
        case 26:
            i_promise_jpg(25, `images/simulator/FIB/sequences/138_ptneedle/138_ch1_`, `138_ch1_set`, sprites[promise_fullfilled_num]);
            break;
        case 27:
            console.log("sigue prometiendo");
            break;

        default:
    }
}

const i_promise_jpg = (max, path_str, id_str, arr) => {
    let data_promises = [];
    for (let i = 1; i <= max; i++) {
        var promise = Loader.jpg(`${path_str}${i}.jpg`, `${id_str}_${i}`);
        data_promises.push(promise);
    }
    Promise.all(data_promises).then(messages => {
        do_when_done(max, id_str, arr);
    }).catch(error => {
        console.error("Rejected!", error);
    });
}

i_promise_jpg(48, `images/simulator/FIB/sequences/2_loading/2_ch4_`, `set1`, sprites[promise_fullfilled_num]);
// =======================  END END  ==================== //
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
// ======================= START ======================== //
$('.controls-btn').click(function (e) {
    $("#" + e.target.id).css("cursor", "not-allowed");
    toogle_fn("#" + e.target.id, "controls-btn-active", false);
    let is_disabled = $("#" + e.target.id).prop("disabled");
    if (!is_disabled) $("#" + e.target.id).prop("disabled", true);
});
// =======================  END END  ==================== //
// ======================= START ======================== //

$("#vent-btn").click(() => {
    toogle_fn("#top-instructions", "top-instructions-on", true);
    stop_imgSeqAnimation(0);
    canvas_data_ch4[0].sprite_arr = sprites[0];
    imgSeqAnimation(true, 1, 48, canvas_data_ch4, activate_pump);
});

$("#pump-btn").click(() => {
    if (window.FIB_BENCHMARK_API && typeof window.FIB_BENCHMARK_API.markSubtaskSuccess === "function") {
        window.FIB_BENCHMARK_API.markSubtaskSuccess("F2");
    }
    toogle_fn("#top-instructions", "top-instructions-on", true);
    toogle_fn("#air-div", "air-pumped", false);
    deactivate_btn("vent");
    pupup_mssg = "Watch how the stage moves as we take a photo to help us locate our specimen.";
    $("#info-area").html(pupup_mssg);
    setTimeout(function () {
        toogle_fn("#modal-messages", "totally-hidden", true);
    }, 3000);
});

$("#ht-btn").click(() => {
    ht_fn();
});

$("#htr-btn").click(() => {
    htr_fn();
});

$("#live-left-btn").click(() => {
    switch (live_left) {
        case 0:
            instruction = "Adjust electron beam <b>Focus</b> to focus the image.";
            toogle_fn("#pause-ch1", "totally-hidden", false);
            let ch1_set_1 = (al_sample) ? al_ch1_set_1 : si_ch1_set_1;
            let ch1_set_2 = (al_sample) ? al_ch1_set_2 : si_ch1_set_2;
            let ch1_set_3 = (al_sample) ? al_ch1_set_3 : si_ch1_set_3;
            scaleBar_fun("ch1", 48, "200");

            bufferCtx_focus.drawImage(ch1_set_1, 0, 0, canvas_w, canvas_h, 0, 0, canvas_w, canvas_h);
            let ch1_set_2_alpha = scroll_equation(60, 0, 100, 1.0, 0.0);
            bufferCtx_focus.globalAlpha = ch1_set_2_alpha;
            bufferCtx_focus.drawImage(ch1_set_3, 0, 0, canvas_w, canvas_h, 0, 0, canvas_w, canvas_h);

            scan_ch01 = new Channel_scan(bufferC_focus, ctx_ch1, bufferCtx_01);
            scan_ch01.drawBuffer();

            toogle_fn("#focus-left-div", "div-disabled", true);
            toogle_fn("#focus-left-label", "label-disabled", true);
            $("#focus-left").slider("enable");
            break;
        case 1:
            toogle_fn("#top-instructions", "top-instructions-on", true);
            scan_ch01.after_snapshot_fn = stop_live_l;
            scan_ch01.constant_scanning = false;
            break;
        case 2:
            instruction = "Click electron beam <b>Auto Brightness & Contrast</b> button.";
            toogle_fn("#pause-ch1", "totally-hidden", false);
            let ch1_set_14 = (al_sample) ? al_ch1_set_14 : si_ch1_set_14;
            scaleBar_fun("ch1", 24, "10");
            scan_ch01 = new Channel_scan(ch1_set_14, ctx_ch1, bufferCtx_01);
            scan_ch01.drawBuffer();
            activate_btn("autobright-left");
            break;
        case 3:
            instruction = "Tick <b>Surface</b> again to remove the image tilt correction.";
            toogle_fn("#pause-ch1", "totally-hidden", false);
            cancelAnimationFrame(scan_ch01.scanEffect);
            let ch1_set_16 = (al_sample) ? al_ch1_set_16 : si_ch1_set_16;
            scan_ch01 = new Channel_scan(ch1_set_16, ctx_ch1, bufferCtx_01);
            scan_ch01.constant_scanning = true;
            scan_ch01.drawBuffer();
            toogle_fn("#img-tilt-label", "label-disabled", true);
            toogle_fn("#surface-form", "checkbox-disabled", true);
            $("#surface").prop("disabled", false);
            break;
        case 4:
            instruction = "Click <b>Cross Section</b> to remove the image tilt correction.";
            toogle_fn("#pause-ch1", "totally-hidden", false);
            cancelAnimationFrame(scan_ch01.scanEffect);
            let ch1_set_18 = (al_sample) ? al_ch1_set_18 : si_ch1_set_18;
            scan_ch01 = new Channel_scan(ch1_set_18, ctx_ch1, bufferCtx_01);
            scan_ch01.constant_scanning = true;
            scan_ch01.drawBuffer();
            $("#cross-section").prop("disabled", false);
            break;
        case 5:
            toogle_fn("#top-instructions", "top-instructions-on", true);
            scan_ch01.after_snapshot_fn = stop_live_l;
            scan_ch01.constant_scanning = false;
            break;
        case 6:
            instruction = "Check <b>Pt Needle</b> box to insert needle.";
            toogle_fn("#pause-ch1", "totally-hidden", false);
            let ch1_set_20 = (al_sample) ? al_ch1_set_20 : si_ch1_set_20;
            scaleBar_fun("ch1", 48, "200");
            scan_ch01 = new Channel_scan(ch1_set_20, ctx_ch1, bufferCtx_01);
            scan_ch01.constant_scanning = true;
            scan_ch01.drawBuffer();
            toogle_fn("#pt-needle-form", "checkbox-disabled", true);
            $("#pt-needle").prop("disabled", false);
            break;
        case 7:
            toogle_fn("#top-instructions", "top-instructions-on", true);
            scan_ch01.after_snapshot_fn = stop_live_l;
            scan_ch01.constant_scanning = false;
            break;
        case 8:
            instruction = "Tick <b>Cross Section</b> to apply image tilt correction to optimise visualisation of the interior of the milled cross section.";
            toogle_fn("#pause-ch1", "totally-hidden", false);
            cancelAnimationFrame(scan_ch01.scanEffect);
            let ch1_set_23 = (al_sample) ? al_ch1_set_23 : si_ch1_set_23;
            scan_ch01 = new Channel_scan(ch1_set_23, ctx_ch1, bufferCtx_01);
            scan_ch01.constant_scanning = true;
            scan_ch01.drawBuffer();
            $("#cross-section").prop("disabled", false);
            break;
        case 9:
            instruction = "Click electron beam <b>Capture</b> to capture an SEM image of the sample.";
            toogle_fn("#pause-ch1", "totally-hidden", false);
            cancelAnimationFrame(scan_ch01.scanEffect);
            let ch1_set_26 = (al_sample) ? al_ch1_set_26 : si_ch1_set_26;
            scan_ch01 = new Channel_scan(ch1_set_26, ctx_ch1, bufferCtx_01);
            scan_ch01.constant_scanning = true;
            scan_ch01.drawBuffer();
            activate_btn("capture-left");
            break;
    }

    showInstruction(instruction);
    live_left++
});

$("#live-right-btn").click(() => {
    switch (live_right) {
        case 0:
            if (al_sample) {
                bsr_x_increment = 60;
                bsr_y_increment = 10;
                scan_ch02 = new Channel_scan(al_ch1_set_13, ctx_ch2, bufferCtx_02, 60, 0);
                $("#beamshift-right-x-up").prop("disabled", false);
                $("#beamshift-right-x-up").css("cursor", "pointer");
            } else {
                scan_ch02 = new Channel_scan(si_ch1_set_13, ctx_ch2, bufferCtx_02, 80, 0);
                $("#beamshift-right-y-up").prop("disabled", false);
                $("#beamshift-right-y-up").css("cursor", "pointer");
            }
            scaleBar_fun("ch2", 44, "30");
            scan_ch02.drawBuffer();
            instruction = "Use the ion <b>Beam Shift X/Y</b> controller to move the feature to the centre of the ion beam screen.";
            toogle_fn("#pause-ch2", "totally-hidden", false);
            toogle_fn("#beam-shift-label", "label-disabled", true);
            toogle_fn(".bsr-div", "div-disabled", true);
            toogle_fn(".bsr-div button", "btn-disabled", true);

            break;
        case 1:
            toogle_fn("#top-instructions", "top-instructions-on", true);
            scan_ch02.after_snapshot_fn = stop_live_r_01;
            scan_ch02.constant_scanning = false;
            deactivate_btn("live-right");
            break;
    }

    showInstruction(instruction);
    live_right++
});

$("#autobright-left-btn").click(() => {
    switch (autobright_l_var) {
        case 0:
            scan_ch01.tvCounter = 2;
            if (al_sample) {
                instruction = "Click the <b>Centre the Feature</b> button and then in the ‘e beam view’ window click on the feature of interest, the X, to bring it to the centre of the field of view.";
                scan_ch01.img = al_ch1_set_5;
            } else {
                instruction = "Click the <b>Centre the Feature</b> button and then click on the feature of interest in the ‘e beam view’ window. Here, this is the X.";
                scan_ch01.img = si_ch1_set_5;
            }
            $("#focus-left").slider("disable");
            $("#focus-left").css('opacity', '1');
            activate_btn("centerfeature");
            break;
        case 1:
            scan_ch01.tvCounter = 2;
            instruction = "Adjust the <b>Stage Z control</b> to bring the feature of interest in SEM back to the centre of the screen.";

            if (al_sample) {
                al_ch1_11_bool = true;
                stage_z_increment = 90;
                scan_ch01.sy = stage_z_increment;
                scan_ch01.img = al_ch1_set_11;
                toogle_fn("#stage-z-down", "btn-disabled", true);
                $("#stage-z-down").prop("disabled", false);
                $("#stage-z-down").css("cursor", "pointer");
            } else {
                scan_ch01.img = si_ch1_set_11;
                toogle_fn("#stage-z-up", "btn-disabled", true);
                $("#stage-z-up").prop("disabled", false);
                $("#stage-z-up").css("cursor", "pointer");
            }
            toogle_fn("#stage-z-label", "label-disabled", true);
            toogle_fn("#stage-z-div", "div-disabled", true);
            $("#stage-z").css('opacity', '1');
            break;
        case 2:
            instruction = "Tick <b>Surface</b> to apply tilt correction to see a an optimal view of the sample surface.";
            scan_ch01.tvCounter = 2;

            if (al_sample) {
                scan_ch01.img = al_ch1_set_15;
            } else {
                scan_ch01.img = si_ch1_set_15;
            }
            toogle_fn("#img-tilt-label", "label-disabled", true);
            toogle_fn("#surface-form", "checkbox-disabled", true);
            $("#surface").prop("disabled", false);
            break;
    }
    showInstruction(instruction);
    autobright_l_var++
    deactivate_btn("autobright-left");
});

const centreFtr_fun = (sample) => {
    toogle_fn("#top-instructions", "top-instructions-on", true);
    cancelAnimationFrame(scan_ch01.scanEffect);
    stop_imgSeqAnimation(0);
    //    
    if (al_sample) {
        $("#ebeam-x-val").html("-1.8 mm");
        $("#ebeam-y-val").html("8.7 mm");
        canvas_data_ch1[0].sprite_arr = sprites[22];
        toogle_fn("#hotspot-al", "totally-hidden", false);
    } else {
        $("#ebeam-x-val").html("-4.3 mm");
        $("#ebeam-y-val").html("1.3 mm");
        canvas_data_ch1[0].sprite_arr = sprites[5];
        toogle_fn("#hotspot-si", "totally-hidden", false);
    }
    imgSeqAnimation(true, 0, 20, canvas_data_ch1, end_centerft);
}

$("#centerfeature-btn").click(() => {
    if (al_sample) {
        toogle_fn("#hotspot-al", "totally-hidden", true);
    } else {
        toogle_fn("#hotspot-si", "totally-hidden", true);
    }
    deactivate_btn("centerfeature");
});


$("#snap-right-btn").click(() => {
    scan_ch02.constant_scanning = false;
    scan_ch02.sx = 0;
    scan_ch02.sy = 0;
    scan_ch02.tvCounter = 2;
    scan_ch02.img = (al_sample) ? al_ch1_set_12 : si_ch1_set_12;
    scaleBar_fun("ch2", 24, "10");
    scan_ch02.after_snapshot_fn = deactivate_snap_r;
    scan_ch02.draw_it();

    toogle_fn("#pause-ch2", "totally-hidden", false);
    deactivate_btn("snap-right");
});

$("#start-btn").click(() => {
    if (window.FIB_BENCHMARK_API && typeof window.FIB_BENCHMARK_API.markSubtaskSuccess === "function") {
        if (start_patterning === 0) window.FIB_BENCHMARK_API.markSubtaskSuccess("F10");
        else if (start_patterning === 1) window.FIB_BENCHMARK_API.markSubtaskSuccess("F12");
        else if (start_patterning === 2) window.FIB_BENCHMARK_API.markSubtaskSuccess("F15");
        else if (start_patterning === 3) window.FIB_BENCHMARK_API.markSubtaskSuccess("F17");
        else if (start_patterning === 4) window.FIB_BENCHMARK_API.markSubtaskSuccess("F18");
    }
    toogle_fn("#top-instructions", "top-instructions-on", true);
    deactivate_btn("start");

    switch (start_patterning) {
        case 0:
            pattern_countdown = new Countdown(1, null, "cd_h", "cd_m", "cd_s", "remaining-time-progressbar", end_pattern_01);
            break;
        case 1:
            pattern_countdown = new Countdown(0.6, "cd_h", "cd_m", "cd_s", null, "remaining-time-progressbar", end_pattern_01);
            break;
        case 2:
            pattern_countdown = new Countdown(3.26, null, "cd_h", "cd_m", "cd_s", "remaining-time-progressbar", end_pattern_01);
            break;
        case 3:
            pattern_countdown = new Countdown(0.48, null, "cd_h", "cd_m", "cd_s", "remaining-time-progressbar", end_pattern_01);
            break;
        case 4:
            pattern_countdown = new Countdown(0.33, null, "cd_h", "cd_m", "cd_s", "remaining-time-progressbar", end_pattern_01);
            break;
    }
    start_patterning++;

    pattern_countdown.startTimer();
});

$("#delete-pattern-btn").click(() => {
    if (window.FIB_BENCHMARK_API && typeof window.FIB_BENCHMARK_API.markSubtaskSuccess === "function") {
        if (delete_patterns === 0) window.FIB_BENCHMARK_API.markSubtaskSuccess("F11");
        else if (delete_patterns === 1) window.FIB_BENCHMARK_API.markSubtaskSuccess("F13");
    }
    deactivate_btn("delete-pattern");
    clear_patterns();
    $("#patterns>option:eq(0)").attr("selected", "selected");
    $("#patterns").prop("disabled", true);

    deactivate_dd("patterns");
    $("#patterns-button .ui-selectmenu-text").html("");
    let ch1_set_12 = (al_sample) ? al_ch1_set_12 : si_ch1_set_12;
    ctx_ch2.drawImage(ch1_set_12, 0, 0, canvas_w, canvas_h, 0, 0, canvas_w, canvas_h);


    switch (delete_patterns) {
        case 0:
            instruction = "Set the ion <b>Beam Current</b> to 30nA to mill another rectangle with the higher beam current.";
            reset_dd("beam-current-right", 4, 5);
            break;
        case 1:
            // 教程里已选过一次 10pA，b_currentr_a_var 已为 1；此处需再选 10pA 应走 case 0，否则会进 case 1 立刻 deactivate 下拉
            b_currentr_a_var = 0;
            instruction = "It is always good practice to set the beam current back to a low current so you don’t accidentally mill your sample when you next select the ion beam. Select the lower ion <b>Beam Current</b> of 10pA.";
            reset_dd("beam-current-right", 5, 1);
            break;
        case 2:
            instruction = "Check <b>Pt Needle</b> box to insert needle.";
            if (typeof toogle_fn === "function") toogle_fn("#pt-needle-form", "checkbox-disabled", true);
            $("#pt-needle").prop("disabled", false);
            break;
        case 3:
            instruction = "Click the electron beam <b>Live View</b> to show the milled area.";
            activate_btn("live-left");
            break;
        case 4:
            instruction = "Set the ion <b>Beam Current</b> to 10pA.";
            reset_dd("beam-current-right", 2, 1);
            break;
    }
    delete_patterns++;
    showInstruction(instruction);
});

$("#capture-left-btn").click(() => {
    toogle_fn("#top-instructions", "top-instructions-on", true);

    scan_ch01.constant_scanning = false;
    scan_ch01.after_snapshot_fn = capture_l_fn;
    deactivate_btn("live-left");
    capture_l_var++;
    if (capture_l_var == 3) scan_ch01.drawBuffer();
});

$("#centerstage-btn").click(() => {
    toogle_fn("#top-instructions", "top-instructions-on", true);
    stop_imgSeqAnimation(0);
    canvas_data_ch4[0].sprite_arr = sprites[20];
    imgSeqAnimation(true, 0, 7, canvas_data_ch4, end_centerstg, centerstg_vals);
    deactivate_btn("centerstage");
    reset_dd("sample", 2, 1);
});

// ======================= FAST FORWARD FOR BENCHMARK ======================== //
// 将 benchmark 中前置子任务标记为已完成，并一键设置 UI 到“该步前”状态（全步骤 F1～F20）。
function _ff_run() {
    for (let i = 0; i < arguments.length; i++) {
        try {
            if (typeof arguments[i] === "function") arguments[i]();
        } catch (e) {
            console.warn("FIB_fast_forward step", i, e);
        }
    }
}
function _ff_to_F5_setup() {
    try {
        if (typeof stop_imgSeqAnimation === "function") stop_imgSeqAnimation(0);
        if (typeof canvas_data_ch4 !== "undefined" && canvas_data_ch4[0] && typeof sprites !== "undefined" && sprites[0]) {
            canvas_data_ch4[0].sprite_arr = sprites[0];
        }
    } catch (e) {}
    _ff_run(activate_pump);
    _ff_run(function () { deactivate_btn("vent"); });
    _ff_run(function () { if (typeof toogle_fn === "function" && typeof $ !== "undefined" && $("#air-div").length) toogle_fn("#air-div", "air-pumped", false); });
    _ff_run(end_nav_cam);
    _ff_run(function () {
        if (typeof reset_dd === "function") reset_dd("sample", 0, 2);
        if (typeof $ !== "undefined" && $("#sample").length) { $("#sample").val("b"); $("#sample").selectmenu("refresh"); }
        if (typeof deactivate_dd === "function") deactivate_dd("sample");
        try {
            var navImg = document.getElementById("nav-cam");
            if (navImg && navImg.complete && navImg.naturalWidth && typeof ctx_ch3 !== "undefined" && ctx_ch3 && typeof canvas_ch3 !== "undefined" && canvas_ch3) {
                ctx_ch3.drawImage(navImg, 0, 0, 1280, 859, 0, 0, canvas_ch3.width, canvas_ch3.height);
            } else {
                var _img = new Image();
                _img.onload = function () {
                    try { if (typeof nav_pic !== "undefined") nav_pic = _img; } catch (e) {}
                    if (typeof ctx_ch3 !== "undefined" && ctx_ch3 && typeof canvas_ch3 !== "undefined" && canvas_ch3) {
                        ctx_ch3.drawImage(_img, 0, 0, 1280, 859, 0, 0, canvas_ch3.width, canvas_ch3.height);
                    }
                };
                _img.src = "images/simulator/FIB/sequences/5_navcam/nav-cam-photo.jpg";
            }
        } catch (e) { console.warn("_ff_to_F5_setup nav photo", e); }
    });
    _ff_run(end_sample_si);
    _ff_run(function () {
        if (typeof $ !== "undefined") {
            $("#acc-volt-left").val("b");
            $("#beam-current-left").val("a");
            $("#acc-volt-left").selectmenu("refresh");
            $("#beam-current-left").selectmenu("refresh");
        }
        if (typeof deactivate_dd === "function") {
            deactivate_dd("acc-volt-left");
            deactivate_dd("beam-current-left");
        }
    });
    _ff_run(ht_fn);
}
function _ff_to_F6() {
    _ff_to_F5_setup();
    _ff_run(function () {
        if (typeof reset_dd === "function") reset_dd("magnification", 4, 1);
        if (typeof magnification_a_fn === "function") magnification_a_fn();
    });
    if (typeof $ !== "undefined" && $("#live-left-btn").length) {
        try { $("#live-left-btn").trigger("click"); } catch (e) {}
    }
    _ff_run(end_centerft);
}
function _ff_to_F7() {
    _ff_to_F6();
    _ff_run(magnification_c_fn, end_wd_7mm);
}
function _ff_to_F8() {
    _ff_to_F7();
    _ff_run(end_tilt10);
}
window.FIB_fast_forward_to_subtask = function (subtaskId) {
    const FIB_ORDER = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17", "F18", "F19", "F20"];
    const idx = FIB_ORDER.indexOf(subtaskId);
    if (idx < 0) return;
    const api = window.FIB_BENCHMARK_API;
    if (api && typeof api.markSubtaskSuccess === "function") {
        for (let i = 0; i < idx; i++) {
            api.markSubtaskSuccess(FIB_ORDER[i]);
        }
    }
    try {
        switch (subtaskId) {
            case "F1":
                break;
            case "F2":
                try {
                    if (typeof stop_imgSeqAnimation === "function") stop_imgSeqAnimation(0);
                    if (typeof canvas_data_ch4 !== "undefined" && canvas_data_ch4[0] && typeof sprites !== "undefined" && sprites[0]) {
                        canvas_data_ch4[0].sprite_arr = sprites[0];
                    }
                } catch (e) {}
                _ff_run(activate_pump);
                _ff_run(function () { deactivate_btn("vent"); });
                break;
            case "F3":
                _ff_run(end_nav_cam);
                if (typeof activate_dd === "function") {
                    activate_dd("sample");
                }
                if (typeof instruction !== "undefined" && typeof showInstruction === "function") {
                    instruction = "Select <b>Sample 'Si Wafer'</b> for the experiment.";
                    showInstruction(instruction);
                }
                try {
                    var navImg = document.getElementById("nav-cam");
                    if (navImg && navImg.complete && navImg.naturalWidth && typeof ctx_ch3 !== "undefined" && ctx_ch3 && typeof canvas_ch3 !== "undefined" && canvas_ch3) {
                        ctx_ch3.drawImage(navImg, 0, 0, 1280, 859, 0, 0, canvas_ch3.width, canvas_ch3.height);
                    } else {
                        var _img = new Image();
                        _img.onload = function () {
                            try { nav_pic = _img; } catch (e) {}
                            if (typeof ctx_ch3 !== "undefined" && ctx_ch3 && typeof canvas_ch3 !== "undefined" && canvas_ch3) {
                                ctx_ch3.drawImage(_img, 0, 0, 1280, 859, 0, 0, canvas_ch3.width, canvas_ch3.height);
                            }
                        };
                        _img.src = "images/simulator/FIB/sequences/5_navcam/nav-cam-photo.jpg";
                    }
                } catch (e) { console.warn("F3 nav photo", e); }
                break;
            case "F4":
                _ff_run(end_sample_si);
                break;
            case "F5":
                _ff_to_F5_setup();
                break;
            case "F6":
                _ff_to_F6();
                if (typeof toogle_fn === "function" && typeof $ !== "undefined") {
                    try {
                        toogle_fn("#wd-div", "div-disabled", true);
                        if ($("#wd-dropdown").length) $("#wd-dropdown").selectmenu("enable");
                    } catch (e) {}
                }
                break;
            case "F7":
                _ff_to_F7();
                break;
            case "F8":
                _ff_to_F8();
                break;
            case "F9":
                _ff_to_F8();
                if (typeof stage_z_done === "function") stage_z_done("up_01");
                if (typeof $ !== "undefined" && $("#live-left-btn").length) {
                    try { $("#live-left-btn").trigger("click"); } catch (e) {}
                }
                _ff_run(stop_live_l);
                if (typeof reset_dd === "function") {
                    reset_dd("acc-volt-right", 1, 0);
                    reset_dd("beam-current-right", 1, 0);
                }
                _ff_run(htr_fn);
                break;
            case "F10":
                _ff_to_F8();
                if (typeof stage_z_done === "function") stage_z_done("up_01");
                if (typeof $ !== "undefined" && $("#live-left-btn").length) {
                    try { $("#live-left-btn").trigger("click"); } catch (e) {}
                }
                _ff_run(stop_live_l);
                if (typeof reset_dd === "function") {
                    reset_dd("acc-volt-right", 1, 0);
                    reset_dd("beam-current-right", 1, 0);
                }
                _ff_run(htr_fn);
                if (typeof $ !== "undefined" && $("#htr-btn").length) {
                    try { $("#htr-btn").trigger("click"); } catch (e) {}
                }
                if (typeof magnificationr_c_fn === "function") magnificationr_c_fn();
                if (typeof $ !== "undefined" && $("#live-right-btn").length) {
                    try { $("#live-right-btn").trigger("click"); } catch (e) {}
                }
                _ff_run(beam_feat_centered_01, b_currentr_e_fn);
                break;
            case "F11":
                start_patterning = 0;
                delete_patterns = 0;
                pattern_a = 0;
                _ff_to_F8();
                if (typeof stage_z_done === "function") stage_z_done("up_01");
                if (typeof $ !== "undefined" && $("#live-left-btn").length) {
                    try { $("#live-left-btn").trigger("click"); } catch (e) {}
                }
                _ff_run(stop_live_l);
                if (typeof reset_dd === "function") {
                    reset_dd("acc-volt-right", 1, 0);
                    reset_dd("beam-current-right", 1, 0);
                }
                _ff_run(htr_fn);
                if (typeof $ !== "undefined" && $("#htr-btn").length) {
                    try { $("#htr-btn").trigger("click"); } catch (e) {}
                }
                if (typeof magnificationr_c_fn === "function") magnificationr_c_fn();
                if (typeof $ !== "undefined" && $("#live-right-btn").length) {
                    try { $("#live-right-btn").trigger("click"); } catch (e) {}
                }
                _ff_run(beam_feat_centered_01, b_currentr_e_fn);
                if (typeof patterns_a_fn === "function") patterns_a_fn();
                if (typeof $ !== "undefined" && $("#start-btn").length) {
                    try { $("#start-btn").trigger("click"); } catch (e) {}
                }
                _ff_run(end_pattern_01);
                break;
            case "F12":
                // 原先只设变量 + end_pattern_01，未跑 F2～F11 的 UI 链，界面不像「F11 结束后」。
                // 正确做法：先快进到 F11 结束点前（含第一次 pattern + end_pattern_01），再模拟点 Delete（F11 完成态：delete_patterns 0→1）。
                window.FIB_fast_forward_to_subtask("F11");
                try {
                    if (typeof $ !== "undefined" && $("#delete-pattern-btn").length) {
                        var $db = $("#delete-pattern-btn");
                        if (!$db.prop("disabled")) {
                            $db.trigger("click");
                        }
                    }
                } catch (e) {
                    console.warn("F12: delete-pattern click", e);
                }
                if (typeof b_currentr_d_fn === "function") b_currentr_d_fn();
                break;
            case "F13":
                // 原先只设 start_patterning/delete_patterns，未包含 F12 及第二次铣削链，界面不像「F12 完成后」。
                window.FIB_fast_forward_to_subtask("F12");
                try {
                    // F11 快进里只调了 patterns_a_fn，GSAP 拖放可能未完成；补一次使 pattern_a 与画布与第一次铣削一致
                    if (typeof pattern_a !== "undefined" && pattern_a < 1 && typeof patterns_a_dragged === "function") {
                        patterns_a_dragged();
                    }
                    pattern_a = 1;
                    if (typeof patterns_a_fn === "function") patterns_a_fn();
                    if (typeof patterns_a_dragged === "function") patterns_a_dragged();
                    if (typeof $ !== "undefined" && $("#start-btn").length) {
                        try { $("#start-btn").trigger("click"); } catch (e2) {}
                    }
                    _ff_run(end_pattern_01);
                } catch (e) {
                    console.warn("F13: second rectangular pattern chain", e);
                }
                b_currentr_a_var = 0;
                if (typeof reset_dd === "function") reset_dd("beam-current-right", 5, 1);
                if (typeof b_currentr_b_fn === "function") b_currentr_b_fn();
                if (typeof activate_dd === "function") activate_dd("beam-current-right");
                break;
            case "F14":
                // 与 F12→F13 一致：先快进到 F13 起点（第二次铣削后、可调 10pA），再模拟「F13 做完」再进入 F14 任务前
                window.FIB_fast_forward_to_subtask("F13");
                // F13 快进未自动点「第二次铣削后」那一次 Delete，delete_patterns 常为 1；补点至 2 才能与选 10pA 逻辑一致
                try {
                    if (typeof $ !== "undefined" && $("#delete-pattern-btn").length && typeof delete_patterns !== "undefined" && delete_patterns < 2 && !$("#delete-pattern-btn").prop("disabled")) {
                        $("#delete-pattern-btn").trigger("click");
                    }
                } catch (e) {
                    console.warn("F14: delete before 10pA", e);
                }
                b_currentr_a_var = 0;
                try {
                    if (typeof $ !== "undefined" && $("#beam-current-right").length) {
                        try {
                            if (typeof activate_dd === "function") activate_dd("beam-current-right");
                        } catch (ea) {}
                        var $bcrF14 = $("#beam-current-right");
                        $bcrF14.val("a");
                        var smF14 = $bcrF14.data("ui-selectmenu");
                        if (smF14 && typeof smF14.refresh === "function") {
                            smF14.refresh();
                        }
                        if (smF14 && typeof smF14._trigger === "function") {
                            var evF14 = typeof $ !== "undefined" && typeof $.Event === "function" ? $.Event("selectmenuselect") : null;
                            smF14._trigger("select", evF14, { item: { value: "a", label: "10pA" } });
                        } else {
                            if (typeof delete_patterns !== "undefined" && delete_patterns >= 2 && window.FIB_BENCHMARK_API && typeof window.FIB_BENCHMARK_API.markSubtaskSuccess === "function") {
                                window.FIB_BENCHMARK_API.markSubtaskSuccess("F13");
                            }
                            if (b_currentr_a_var === 0) {
                                beam_current_right_a_bol = true;
                                var boolsF14 = checking_bools(acc_volt_right_d_bol, beam_current_right_a_bol);
                                if (boolsF14 && typeof ibeam_dd_01_fun === "function") ibeam_dd_01_fun();
                            }
                            b_currentr_a_var++;
                        }
                        if (typeof fib_sync_selectmenu_button === "function") fib_sync_selectmenu_button("beam-current-right");
                    }
                } catch (e2) {
                    console.warn("F14: beam 10pA selectmenu", e2);
                }
                // 教程：10pA 后再 Delete 一次（delete_patterns===2 时走 case 2）才解锁 Pt Needle；每次 Delete 会 deactivate_btn，须先重新 enable 再 trigger
                try {
                    if (typeof $ !== "undefined" && $("#delete-pattern-btn").length && typeof delete_patterns !== "undefined" && delete_patterns === 2) {
                        if (typeof activate_btn === "function") activate_btn("delete-pattern");
                        $("#delete-pattern-btn").trigger("click");
                    }
                } catch (e3) {
                    console.warn("F14: delete after 10pA", e3);
                }
                start_patterning = 2;
                pattern_a = 1;
                if (typeof $ !== "undefined" && $("#pt-needle").length) {
                    if (typeof toogle_fn === "function") toogle_fn("#pt-needle-form", "checkbox-disabled", true);
                    $("#pt-needle").prop("disabled", false);
                    $("#pt-needle").prop("checked", false);
                }
                break;
            case "F15":
                // 先快进到 F14 起点，再模拟 F14 完成（插针）及后续教程步，到「可选 Pt Deposition、尚未选 pattern」
                window.FIB_fast_forward_to_subtask("F14");
                try {
                    if (typeof $ !== "undefined" && $("#pt-needle").length) {
                        $("#pt-needle").prop("checked", true);
                        $("#pt-needle").prop("disabled", true);
                    }
                    pt_needle_var = 1;
                    if (typeof needle_in === "function") needle_in();
                } catch (e) {
                    console.warn("F15: complete F14 (needle_in)", e);
                }
                try {
                    magnification_d_var = 0;
                    if (typeof $ !== "undefined" && $("#magnification").length) {
                        $("#magnification").val("d");
                        var smMagF15 = $("#magnification").data("ui-selectmenu");
                        if (smMagF15 && typeof smMagF15.refresh === "function") smMagF15.refresh();
                        if (smMagF15 && typeof smMagF15._trigger === "function") {
                            var evMagF15 = typeof $ !== "undefined" && typeof $.Event === "function" ? $.Event("selectmenuselect") : null;
                            smMagF15._trigger("select", evMagF15, { item: { value: "d" } });
                        } else if (typeof magnification_d_fn === "function") {
                            magnification_d_fn();
                        }
                        if (typeof fib_sync_selectmenu_button === "function") fib_sync_selectmenu_button("magnification");
                    }
                } catch (e2) {
                    console.warn("F15: magnification 5000x", e2);
                }
                try {
                    stop_live_l_var = 1;
                    if (typeof stop_live_l === "function") stop_live_l();
                } catch (e3) {
                    console.warn("F15: stop_live_l (Pt Deposition pattern ready)", e3);
                }
                delete_patterns = 3;
                start_patterning = 2;
                pattern_a = 1;
                break;
            case "F16":
                // 先快进到 F15 起点，再模拟 F15 完成（Pt Deposition + START + 铣削结束），到 F16 任务前（stop_live_r_01，尚未 5000x/Snapshot）
                window.FIB_fast_forward_to_subtask("F15");
                try {
                    if (typeof $ !== "undefined" && $("#patterns").length) {
                        if (typeof activate_dd === "function") activate_dd("patterns");
                        var $patF16 = $("#patterns");
                        $patF16.val("c");
                        var smPatF16 = $patF16.data("ui-selectmenu");
                        if (smPatF16 && typeof smPatF16.refresh === "function") smPatF16.refresh();
                        if (smPatF16 && typeof smPatF16._trigger === "function") {
                            var evPatF16 = typeof $ !== "undefined" && typeof $.Event === "function" ? $.Event("selectmenuselect") : null;
                            smPatF16._trigger("select", evPatF16, { item: { value: "c" } });
                        } else if (typeof patterns_c_fn === "function") {
                            patterns_c_fn();
                        }
                        if (typeof $ !== "undefined" && $("#patterns-button").length) {
                            $("#patterns-button").find(".ui-selectmenu-text").html("Pt Deposition");
                        }
                    }
                    if (typeof patterns_c_dragged === "function") patterns_c_dragged();
                } catch (e) {
                    console.warn("F16: F15 Pt Deposition pattern", e);
                }
                try {
                    if (typeof $ !== "undefined" && $("#beam-current-right").length) {
                        if (typeof activate_dd === "function") activate_dd("beam-current-right");
                        var $bcrF16 = $("#beam-current-right");
                        $bcrF16.val("d");
                        var smBcF16 = $bcrF16.data("ui-selectmenu");
                        if (smBcF16 && typeof smBcF16.refresh === "function") smBcF16.refresh();
                        if (smBcF16 && typeof smBcF16._trigger === "function") {
                            var evBcF16 = typeof $ !== "undefined" && typeof $.Event === "function" ? $.Event("selectmenuselect") : null;
                            smBcF16._trigger("select", evBcF16, { item: { value: "d" } });
                        } else if (typeof b_currentr_d_fn === "function") {
                            b_currentr_d_fn();
                        }
                        if (typeof fib_sync_selectmenu_button === "function") fib_sync_selectmenu_button("beam-current-right");
                    }
                } catch (e2) {
                    console.warn("F16: beam 3nA → Start enabled", e2);
                }
                try {
                    if (typeof activate_btn === "function") activate_btn("start");
                    if (typeof $ !== "undefined" && $("#start-btn").length) {
                        $("#start-btn").trigger("click");
                    }
                    if (typeof end_pattern_01 === "function") end_pattern_01();
                } catch (e3) {
                    console.warn("F16: F15 START + end_pattern", e3);
                }
                try {
                    if (typeof stop_live_r_01 === "function") stop_live_r_01();
                } catch (e4) {
                    console.warn("F16: stop_live_r_01 (ion 5000x + Snapshot prompt)", e4);
                }
                start_patterning = 3;
                pattern_a = 1;
                delete_patterns = 3;
                break;
            case "F17":
                // 先快进到 F16 起点，再模拟 F16 完成（离子束 5000x + Snapshot），到 F17 任务前（PATTERN 可选、尚未选 Cross Section）
                window.FIB_fast_forward_to_subtask("F16");
                try {
                    if ((typeof scan_ch02 === "undefined" || !scan_ch02) && typeof $ !== "undefined" && $("#live-right-btn").length) {
                        if (typeof activate_btn === "function") activate_btn("live-right");
                        $("#live-right-btn").trigger("click");
                    }
                } catch (e0) {
                    console.warn("F17: init ion live for snap", e0);
                }
                try {
                    if (typeof $ !== "undefined" && $("#magnificationr").length) {
                        $("#magnificationr").val("d");
                        var smMagRF17 = $("#magnificationr").data("ui-selectmenu");
                        if (smMagRF17 && typeof smMagRF17.refresh === "function") smMagRF17.refresh();
                        if (smMagRF17 && typeof smMagRF17._trigger === "function") {
                            var evMagRF17 = typeof $ !== "undefined" && typeof $.Event === "function" ? $.Event("selectmenuselect") : null;
                            smMagRF17._trigger("select", evMagRF17, { item: { value: "d" } });
                        } else if (typeof magnificationr_d_fn === "function") {
                            magnificationr_d_fn();
                        }
                        if (typeof fib_sync_selectmenu_button === "function") fib_sync_selectmenu_button("magnificationr");
                    }
                } catch (e) {
                    console.warn("F17: ion magnification 5000x", e);
                }
                var f17SnapDone = false;
                try {
                    if (typeof $ !== "undefined" && $("#snap-right-btn").length) {
                        if (typeof activate_btn === "function") activate_btn("snap-right");
                        $("#snap-right-btn").trigger("click");
                        f17SnapDone = true;
                    }
                } catch (e2) {
                    console.warn("F17: snap-right", e2);
                }
                if (!f17SnapDone) {
                    try {
                        if (typeof deactivate_snap_r === "function") deactivate_snap_r();
                    } catch (e2b) {
                        console.warn("F17: deactivate_snap_r fallback", e2b);
                    }
                }
                try {
                    if (typeof reset_dd === "function") {
                        var disPatF17 = (typeof al_sample !== "undefined" && al_sample) ? 2 : 1;
                        reset_dd("patterns", disPatF17, 4);
                    }
                    if (typeof activate_dd === "function") activate_dd("patterns");
                    if (typeof $ !== "undefined" && $("#patterns-button").length) {
                        $("#patterns-button").find(".ui-selectmenu-text").html("");
                    }
                } catch (e3) {
                    console.warn("F17: patterns ready for Cross Section Cutting", e3);
                }
                start_patterning = 3;
                pattern_a = 1;
                delete_patterns = 3;
                break;
            case "F18":
                // 先快进到 F17 起点，再模拟 F17 完成（Cross Section + 3nA + START），到 F18 任务前（Cleaning Cross Section 可选、尚未 START）
                window.FIB_fast_forward_to_subtask("F17");
                try {
                    if (typeof $ !== "undefined" && $("#patterns").length) {
                        if (typeof activate_dd === "function") activate_dd("patterns");
                        var $patF18 = $("#patterns");
                        $patF18.val("d");
                        var smPatF18 = $patF18.data("ui-selectmenu");
                        if (smPatF18 && typeof smPatF18.refresh === "function") smPatF18.refresh();
                        if (smPatF18 && typeof smPatF18._trigger === "function") {
                            var evPatF18 = typeof $ !== "undefined" && typeof $.Event === "function" ? $.Event("selectmenuselect") : null;
                            smPatF18._trigger("select", evPatF18, { item: { value: "d" } });
                        } else if (typeof patterns_d_fn === "function") {
                            patterns_d_fn();
                        }
                        if (typeof $ !== "undefined" && $("#patterns-button").length) {
                            $("#patterns-button").find(".ui-selectmenu-text").html("Cross-sect. cut.");
                        }
                    }
                    if (typeof patterns_d_dragged === "function") patterns_d_dragged();
                } catch (e) {
                    console.warn("F18: F17 Cross Section pattern", e);
                }
                try {
                    if (typeof $ !== "undefined" && $("#beam-current-right").length) {
                        if (typeof activate_dd === "function") activate_dd("beam-current-right");
                        var $bcrF18 = $("#beam-current-right");
                        $bcrF18.val("d");
                        var smBcF18 = $bcrF18.data("ui-selectmenu");
                        if (smBcF18 && typeof smBcF18.refresh === "function") smBcF18.refresh();
                        if (smBcF18 && typeof smBcF18._trigger === "function") {
                            var evBcF18 = typeof $ !== "undefined" && typeof $.Event === "function" ? $.Event("selectmenuselect") : null;
                            smBcF18._trigger("select", evBcF18, { item: { value: "d" } });
                        } else if (typeof b_currentr_d_fn === "function") {
                            b_currentr_d_fn();
                        }
                        if (typeof fib_sync_selectmenu_button === "function") fib_sync_selectmenu_button("beam-current-right");
                    }
                } catch (e2) {
                    console.warn("F18: F17 beam 3nA → Start", e2);
                }
                try {
                    if (typeof activate_btn === "function") activate_btn("start");
                    if (typeof $ !== "undefined" && $("#start-btn").length) {
                        $("#start-btn").trigger("click");
                    }
                    if (typeof end_pattern_01 === "function") end_pattern_01();
                } catch (e3) {
                    console.warn("F18: F17 START + end_pattern", e3);
                }
                try {
                    if (typeof reset_dd === "function") reset_dd("beam-current-right", 4, 2);
                    b_currentr_b_var = 1;
                    if (typeof b_currentr_b_fn === "function") b_currentr_b_fn();
                    if (typeof activate_dd === "function") activate_dd("patterns");
                } catch (e4) {
                    console.warn("F18: Cleaning Cross Section pattern ready", e4);
                }
                start_patterning = 4;
                pattern_a = 1;
                delete_patterns = 3;
                break;
            case "F19":
                // 先快进到 F18 起点，再模拟 F18 完成（Cleaning Cross Section + 0.1nA + START），到 F19 任务前（Cross Section 可勾选、尚未做截面成像/Tilt 0°）
                window.FIB_fast_forward_to_subtask("F18");
                try {
                    if (typeof $ !== "undefined" && $("#patterns").length) {
                        if (typeof activate_dd === "function") activate_dd("patterns");
                        var $patF19 = $("#patterns");
                        $patF19.val("e");
                        var smPatF19 = $patF19.data("ui-selectmenu");
                        if (smPatF19 && typeof smPatF19.refresh === "function") smPatF19.refresh();
                        if (smPatF19 && typeof smPatF19._trigger === "function") {
                            var evPatF19 = typeof $ !== "undefined" && typeof $.Event === "function" ? $.Event("selectmenuselect") : null;
                            smPatF19._trigger("select", evPatF19, { item: { value: "e" } });
                        } else if (typeof patterns_e_fn === "function") {
                            patterns_e_fn();
                        }
                        if (typeof $ !== "undefined" && $("#patterns-button").length) {
                            $("#patterns-button").find(".ui-selectmenu-text").html("Cleaning c-s cutt.");
                        }
                    }
                    if (typeof patterns_e_dragged === "function") patterns_e_dragged();
                } catch (e) {
                    console.warn("F19: F18 Cleaning Cross Section pattern", e);
                }
                try {
                    if (typeof $ !== "undefined" && $("#beam-current-right").length) {
                        if (typeof activate_dd === "function") activate_dd("beam-current-right");
                        var $bcrF19 = $("#beam-current-right");
                        $bcrF19.val("b");
                        var smBcF19 = $bcrF19.data("ui-selectmenu");
                        if (smBcF19 && typeof smBcF19.refresh === "function") smBcF19.refresh();
                        if (smBcF19 && typeof smBcF19._trigger === "function") {
                            var evBcF19 = typeof $ !== "undefined" && typeof $.Event === "function" ? $.Event("selectmenuselect") : null;
                            smBcF19._trigger("select", evBcF19, { item: { value: "b" } });
                        }
                        if (typeof fib_sync_selectmenu_button === "function") fib_sync_selectmenu_button("beam-current-right");
                    }
                } catch (e2) {
                    console.warn("F19: beam 0.1nA", e2);
                }
                try {
                    if (typeof activate_btn === "function") activate_btn("start");
                    if (typeof $ !== "undefined" && $("#start-btn").length) {
                        $("#start-btn").trigger("click");
                    }
                    if (typeof end_pattern_01 === "function") end_pattern_01();
                } catch (e3) {
                    console.warn("F19: F18 START + end_pattern", e3);
                }
                try {
                    cross_var = 0;
                    if (typeof toogle_fn === "function") toogle_fn("#cross-section-form", "checkbox-disabled", true);
                    if (typeof $ !== "undefined" && $("#cross-section").length) {
                        $("#cross-section").prop("disabled", false);
                        $("#cross-section").prop("checked", false);
                    }
                    if (typeof scan_ch01 !== "undefined" && scan_ch01) {
                        scan_ch01.tvCounter = 2;
                        scan_ch01.img = (typeof al_sample !== "undefined" && al_sample) ? al_ch1_set_15 : si_ch1_set_15;
                    }
                    if (typeof instruction !== "undefined" && typeof showInstruction === "function") {
                        instruction = "Tick <b>Cross Section</b> to apply image tilt correction for optimal viewing of the cross sections of the milled areas.";
                        showInstruction(instruction);
                    }
                    surface_var = 2;
                } catch (e4) {
                    console.warn("F19: Cross Section imaging ready", e4);
                }
                start_patterning = 5;
                pattern_a = 1;
                delete_patterns = 3;
                break;
            case "F20":
                // 先快进到 F19 起点，再模拟 F19 完成（Cross Section 成像链 case0–3），到 F20 任务前（提示 Tilt 0°、尚未选 Tilt / Centre Stage）
                window.FIB_fast_forward_to_subtask("F19");
                try {
                    cross_var = 0;
                    for (var fc = 0; fc < 4; fc++) {
                        if (typeof cross_fn === "function") cross_fn();
                    }
                } catch (e) {
                    console.warn("F20: F19 cross_fn chain", e);
                }
                try {
                    if (typeof activate_dd === "function") activate_dd("t-dropdown");
                    if (typeof $ !== "undefined" && $("#t-dropdown").length) {
                        var $tdd = $("#t-dropdown");
                        var placeVal = $tdd.find(">option:eq(0)").val();
                        if (placeVal !== undefined) {
                            $tdd.val(placeVal);
                        }
                        var smT = $tdd.data("ui-selectmenu");
                        if (smT && typeof smT.refresh === "function") smT.refresh();
                        if (typeof fib_sync_selectmenu_button === "function") fib_sync_selectmenu_button("t-dropdown");
                    }
                    t_a_var = 1;
                } catch (e2) {
                    console.warn("F20: tilt dropdown ready (0 deg)", e2);
                }
                start_patterning = 5;
                pattern_a = 1;
                delete_patterns = 3;
                break;
                default:
                    break;
            }
        } catch (e) {
            console.warn("FIB_fast_forward_to_subtask UI setup:", e);
        }
};
// ======================= END FAST FORWARD FOR BENCHMARK ======================== //

// =======================  END END  ==================== //
