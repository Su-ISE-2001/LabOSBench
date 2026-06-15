/* XRD_simulator javascript functions    

Created  by Andres Vasquez for AMMRF'S www.myscope.training
—— www.andresvasquez.net ——
copyright:This work is licensed under a Creative Commons Attribution 4.0 International License.

************************************************************************/
var svg_curve = document.getElementById('svg-curve');
var canvas = document.getElementById('canvas-curve');
var ctx = canvas.getContext('2d');

//var bufferC_XRD_01 = document.createElement("canvas");
//var bufferCtx_XRD_01 = bufferC_XRD_01.getContext("2d");

var chosen_specimen;
var promise_fullfilled_num = 0;
var promises_total = 8;
var sprites = [];
var power_timer;
var scan_timer;
var power_val = 10;
var start_angle = 5;
var end_angle = 80;
var step_arr_pos = 0;
var step_val = 0;
var steptime_arr_pos = 0;
var steptime_val = 0;
var steps_num = 0;
var scan_time = 0;
var scan_angle = 0;
var increment_angle = 0;
var start_arr_pos = 0;
var end_arr_pos = 0;
var drawFPS = 1000;
var switch_angle_a = true;
var switch_angle_b = true;
var switch_step_size = true;
var switch_step_time = true;
var bool_first_time = true;

canvas.width = 740;
canvas.height = 570;




// ======================= START ======================== //
const specimen_reset_fn = () => {
    steptime_val = 0;
    $("#start-angle-line").css("opacity", "0");
    $("#end-angle-group").css("opacity", "0");
    $("#scantime-label").toggleClass("label-disabled", true);
    $("#scantime-div").toggleClass("div-disabled", true);
    $("#scantime-val").html('-');
    //    deactivate_round_btn("#btn-standby", "#standby-label");
    //    $("#btn-standby").toggleClass("green-halo", false);
    //    deactivate_sqr_btn("#btn-power", "off", "#power-label");
    //    $("#stats-kv").toggleClass("div-disabled", true);
    //    $("#stats-ma").toggleClass("div-disabled", true);
    //    power_val = 10;
    //    $("#kv-val").html(power_val);
    //    $("#ma-val").html(power_val);
    deactivate_angles("#stats-start button", "#start-div");
    deactivate_angles("#stats-end button", "#end-div");
    $('#step').val('empty');
    $("#step").selectmenu("refresh");
    step_val = 0;
    deactivate_dd("#step");
    $('#time-step').val('empty');
    $("#time-step").selectmenu("refresh");
    steptime_arr_pos = 0;
    deactivate_dd("#time-step");
    deactivate_sqr_btn("#btn-save-dff");
    deactivate_sqr_btn("#btn-start-scan");
    XRD_step_num = 2;
    switch_angle_a = true;
    switch_angle_b = true;
    switch_step_size = true;
    switch_step_time = true;
}
// ======================= END ======================== //
// ======================= START ======================== //
for (let i = 0; i <= promises_total + 1; i++) {
    sprites[i] = new Array();
}

const do_when_done = (max, str_id, images_arr) => {
    for (let i = 1; i <= max; i++) {
        images_arr[i - 1] = document.getElementById(`${str_id}_${i}`);
    }
    promise_fullfilled_num++;
    switch (promise_fullfilled_num) {
        case 1:
            i_promise_file(1, `js/XRD_cartesian_plane_`, `js_script`, sprites[promise_fullfilled_num], `js`);
            $("#svg-diagram").html(svg_radiometer);
            break;
        case 2:
            $("#loading-modal").toggleClass("totally-hidden", true);
            $("#top-bar").toggleClass("modal-is-open", false);
            $("#simulator-base").toggleClass("modal-is-open", false);
            $("#svg-curve").html(cartesian_axis);
            console.log("sigue prometiendo");
            break;
    }
}

// ======================= START ======================== //
const i_promise_file = (max, path_str, id_str, arr, extension) => {
    let data_promises = [];
    for (let i = 1; i <= max; i++) {
        var promise = Loader.js(`${path_str}${i}.${extension}`, `${id_str}_${i}`);
        data_promises.push(promise);
    }
    Promise.all(data_promises).then(messages => {
        do_when_done(max, id_str, arr);
    }).catch(error => {
        console.error("Rejected!", error);
    });
}
// =======================  END END  ==================== //
i_promise_file(1, `js/XRD_radiometer_`, `js_script`, sprites[promise_fullfilled_num], `js`);
// =======================  END END  ==================== //
// ======================= START INSTRUCTIONS ======================== //
// 禁用顶部文字说明：display_instruction 不再更新任何指导文本
const display_instruction = () => {
    // 清空顶部说明文字，并且不再做淡入淡出动画
    $("#top-instructions-txt").html("");
};
// =======================  END END  ==================== //


// =======================  JQUERYUI  ==================== //
$(function () {
    // ======================= START DROP DOWN ======================== //

    $("#specimen").selectmenu({
        select: function (event, data) {
            deactivate_sqr_btn("#btn-save-dff");
            $("#svg-curve").html(cartesian_axis);
            chosen_specimen = parseInt(data.item.value);
            // Benchmark: S1 SelectSpecimen 成功（选择了一个合法样品）
            if (window.XRD_BENCHMARK_API && typeof XRD_BENCHMARK_API.markSubtaskSuccess === "function") {
                XRD_BENCHMARK_API.markSubtaskSuccess("S1");
            }
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            XRD_step_num = 2;
            XRD_step_2();
        },
        //        disabled: true
    });
    $("#step").selectmenu({
        select: function (event, data) {
            step_arr_pos = parseInt(data.item.value);
            switch (step_arr_pos) {
                case 1:
                    step_val = 0.005;
                    break;
                case 9:
                    step_val = 0.01;
                    break;
                case 15:
                    step_val = 0.02;
                    break;
            }
            scan_time_fun();
            // Benchmark: S5 SetStepSize 成功（选中了合法步长）
            if (window.XRD_BENCHMARK_API && typeof XRD_BENCHMARK_API.markSubtaskSuccess === "function") {
                XRD_BENCHMARK_API.markSubtaskSuccess("S5");
            }
            XRD_step_num = 6;
            if (switch_step_size) next_step();
            switch_step_size = false;
            switch_angle_a = false;
            switch_angle_b = false;
        },
        disabled: true
    });
    $("#time-step").selectmenu({
        select: function (event, data) {
            steptime_arr_pos = parseInt(data.item.value);
            switch (steptime_arr_pos) {
                case 0:
                    steptime_val = 0.2;
                    break;
                case 2:
                    steptime_val = 0.04;
                    break;
                case 1:
                    steptime_val = 0.08;
                    break;
            }
            scan_time_fun();
            // Benchmark: S6 SetScanRate 成功（选中了合法扫描速率）
            if (window.XRD_BENCHMARK_API && typeof XRD_BENCHMARK_API.markSubtaskSuccess === "function") {
                XRD_BENCHMARK_API.markSubtaskSuccess("S6");
            }
            activate_sqr_btn("#btn-start-scan");
            XRD_step_num = 7;
            if (switch_step_time) next_step();
            switch_step_time = false;
            switch_angle_a = false;
            switch_angle_b = false;
        },
        disabled: true
    });

    // =======================  END END DROP DOWN  ==================== //
});
// ======================= END ======================== //


var activate_sqr_btn = (dom_name, label_name) => {
    $(dom_name).toggleClass("btn-disabled", false);
    $(dom_name).prop('disabled', false);
    $(dom_name).css("cursor", "pointer");
    $(label_name).toggleClass("label-disabled", false);
}

var deactivate_sqr_btn = (dom_name, on_off = "off", label_name) => {
    $(dom_name).toggleClass("btn-disabled", true);
    $(dom_name).toggleClass("btn-active", false);
    $(dom_name).prop('disabled', true);
    $(dom_name).prop('value', on_off);
    $(label_name).toggleClass("label-disabled", true);
}

var deactivate_round_btn = (dom_name, label_name) => {
    $(dom_name).toggleClass("btn-disabled", true);
    $(dom_name).toggleClass("round-btn-active", false);
    $(dom_name).prop('disabled', true);
    $(dom_name).prop('value', "off");
    $(label_name).toggleClass("label-disabled", true);
}

var activate_angles = (dom_name, div_name) => {
    $(dom_name).prop('disabled', false);
    $(dom_name).toggleClass("btn-disabled", false);
    $(div_name).toggleClass("div-disabled", false);
}

var deactivate_angles = (dom_name, div_name) => {
    $(dom_name).prop('disabled', true);
    $(dom_name).toggleClass("btn-disabled", true);
    $(div_name).toggleClass("div-disabled", true);
}

var deactivate_slider = (dom_name) => {
    $(dom_name).slider("disable");
    $(dom_name + "-label").toggleClass("label-disabled", true);
}

var activate_dd = (dom_name) => {
    $(dom_name).selectmenu("enable");
    $(dom_name + "-label").toggleClass("label-disabled", false);
}

var deactivate_dd = (dom_name) => {
    $(dom_name).selectmenu("disable");
    $(dom_name + "-label").toggleClass("label-disabled", true);
}

// ======================= START ======================== //
// ======================= END ======================== //
$('.btn').click(function (e) {
    if (e.target.value == "off") {
        e.target.value = "on";
        $("#" + e.target.id).toggleClass("btn-active", true);
    } else {
        e.target.value = "off";
        $("#" + e.target.id).toggleClass("btn-active", false);
    }
    e.target.disabled = true;
    $("#" + e.target.id).css("cursor", "not-allowed");
    switch (e.target.id) {
        case "btn-doors":
            if (e.target.value == "off") {
                $("#btn-doors").html("OPEN");
                close_doors_fn();
            } else {
                $("#btn-doors").html("CLOSE");
                doors_fn();
            }
            break;
        case "btn-start-scan":
            deactivate_sqr_btn("#btn-save-dff");
            $("#top-instructions-txt").html("");
            if (e.target.value == "on") {
                $("#svg-curve").html(cartesian_axis);
                $(this).html("SCANNING");
                $("#btn-shutter").toggleClass("shutter-active", true);
                $("#x-ray-in").toggleClass("ray-r", true);
                $("#svg-diagram line#ray-l").css("opacity", "1");
                $("#btn-shutter").html("OPEN");
                let y_child = (chosen_specimen * 3) + (steptime_arr_pos + 1);
                $(`#y_axis g:nth-of-type(${y_child})`).toggleClass("y-visible", true);
                $(`#y_axis g:nth-of-type(${y_child})`).toggleClass("y-group", false);
                $("#degree-l text").toggleClass("y-visible", true);
                $("#degree-r text").toggleClass("y-visible", true);
                $("#degree-l text").html(`${start_angle}&#176;`);
                $("#degree-r text").html(`${end_angle}&#176;`);
                eraseInvisibleY();
            }
            scan_angle = 0;
            increment_angle = 0;
            scan_timer = setInterval(scan_anim_fun, 50);
            start_arr_pos = get_arr_start_fun();
            end_arr_pos = get_arr_end_fun();
            incremented_end_arr_pos = start_arr_pos;
            drawCurve_timer = setInterval(increment_curve_fun, 1000 / drawFPS);
            break;
        case "btn-save-dff":
            export_StyledSVG(svg_curve);
            // Benchmark: S8 SaveResult 成功（成功导出衍射图）
            if (window.XRD_BENCHMARK_API && typeof XRD_BENCHMARK_API.markSubtaskSuccess === "function") {
                XRD_BENCHMARK_API.markSubtaskSuccess("S8");
            }
            deactivate_sqr_btn("#btn-save-dff");
            break;
        default:
            //        code block
    }
});
// ======================= END ======================== //
// ======================= END ======================== //
$('#btn-standby').click(function (e) {
    bool_first_time = false;
    if (e.target.value == "off") {
        e.target.value = "on";
        $("#" + e.target.id).toggleClass("round-btn-active", true);
    } else {
        e.target.value = "off";
        $("#" + e.target.id).toggleClass("round-btn-active", false);
    }
    e.target.disabled = true;
    $("#" + e.target.id).css("cursor", "not-allowed");
    $("#stats-kv").toggleClass("div-disabled", false);
    $("#stats-ma").toggleClass("div-disabled", false);
    $(this).toggleClass("blinker", true);
    power_timer = setInterval(increasePower_fn, 400);
});
// ======================= END ======================== //

// ======================= START ======================== //
const doors_fn = () => {
    let open_doors = anime.timeline({
        easing: 'linear',
        duration: 1000,
    });

    open_doors
        .add({
            targets: '#svg-diagram g#xrd-specimen',
            translateY: "40vw",
            scale: 2.5,
            complete: function (anim) {}
        }, '-=1000')
        .add({
            targets: '#svg-diagram g#door-l',
            translateX: "-120vw"
        })
        .add({
            targets: '#svg-diagram g#door-r',
            translateX: "120vw",
            complete: function (anim) {
                $("#svg-diagram g#xrd-specimen").css("opacity", "1");
                specimen_fn();
            }
        }, '-=1000');
}

// ======================= END ======================== //
// ======================= START ======================== //
const specimen_fn = () => {
    anime({
        targets: '#svg-diagram g#xrd-specimen',
        translateY: {
            value: "0vw",
            duration: 1000,
            easing: 'linear'
        },
        scale: {
            value: 1,
            duration: 1000,
            easing: 'linear'
        },
        complete: function (anim) {
            $("#svg-diagram g#xrd-specimen").css("filter", "none");
            // Benchmark: S2 OpenDoors 成功（门打开且样品进入视图）
            if (window.XRD_BENCHMARK_API && typeof XRD_BENCHMARK_API.markSubtaskSuccess === "function") {
                XRD_BENCHMARK_API.markSubtaskSuccess("S2");
            }
            next_step();
        }
    });
}

// ======================= END ======================== //
// ======================= START ======================== //
const close_doors_fn = () => {
    let close_doors = anime.timeline({
        easing: 'linear',
        duration: 1000,
    });

    close_doors
        .add({
            targets: '#svg-diagram g#door-l',
            translateX: "0vw"
        })
        .add({
            targets: '#svg-diagram g#door-r',
            translateX: "0vw",
            complete: function (anim) {
                // Benchmark: S2a CloseDoors 成功（门关闭完成）
                if (window.XRD_BENCHMARK_API && typeof XRD_BENCHMARK_API.markSubtaskSuccess === "function") {
                    XRD_BENCHMARK_API.markSubtaskSuccess("S2a");
                }
                if (!bool_first_time) XRD_step_num = 5;
                next_step();
            }
        }, '-=1000');
}

// ======================= END ======================== //

// ======================= START ======================== //
const increasePower_fn = () => {
    power_val += 5;
    if (power_val <= 45) {
        $("#kv-val").html(power_val);
    } else if (power_val <= 80) {
        $("#ma-val").html(power_val - 40);
    } else {
        clearInterval(power_timer);
        $("#btn-standby").toggleClass("blinker", false);
        $("#btn-standby").toggleClass("green-halo", true);
        activate_sqr_btn("#btn-power", "#power-label");
        $("#btn-power").trigger("click");
        $("#btn-power").html("ON");
        // Benchmark: S3 PowerUp 成功（电源就绪）
        if (window.XRD_BENCHMARK_API && typeof XRD_BENCHMARK_API.markSubtaskSuccess === "function") {
            XRD_BENCHMARK_API.markSubtaskSuccess("S3");
        }
        next_step();
    }

}
// ======================= END ======================== //
// ======================= START ======================== //
$('#btn-start-dw').click(function (e) {
    if (start_angle > 5) {
        $(this).css("cursor", "pointer");
        start_angle -= 5;
        set_angles_fun();
    } else {
        $(this).css("cursor", "not-allowed");
    }
    $("#start-txt").html(`${start_angle}&#176;`);
    XRD_step_num = 5;
    // Benchmark: S4 SetAngles 成功（设置了合法的起始/终止角度）
    if (window.XRD_BENCHMARK_API && typeof XRD_BENCHMARK_API.markSubtaskSuccess === "function") {
        XRD_BENCHMARK_API.markSubtaskSuccess("S4");
    }
    if (switch_angle_a) next_step();
    switch_angle_a = false;
})

$('#btn-start-up').click(function (e) {
    if (start_angle < 105 && start_angle < (end_angle - 5)) {
        $(this).css("cursor", "pointer");
        start_angle += 5;
        set_angles_fun();
    } else {
        $(this).css("cursor", "not-allowed");
    }
    $("#start-txt").html(`${start_angle}&#176;`);
    XRD_step_num = 5;
    if (window.XRD_BENCHMARK_API && typeof XRD_BENCHMARK_API.markSubtaskSuccess === "function") {
        XRD_BENCHMARK_API.markSubtaskSuccess("S4");
    }
    if (switch_angle_a) next_step();
    switch_angle_a = false;
})

$('#btn-start-dw').hover(function () {
    if (start_angle == 5) {
        $(this).css("cursor", "not-allowed");
    } else {
        $(this).css("cursor", "pointer");
    }
})

$('#btn-start-up').hover(function () {
    if (start_angle <= 105 && start_angle < (end_angle - 5)) {
        $(this).css("cursor", "pointer");
    } else {
        $(this).css("cursor", "not-allowed");
    }
})

$('#btn-end-dw').click(function (e) {
    //    switch_step_size = false;
    if (end_angle > 10 && end_angle > (start_angle + 5)) {
        $(this).css("cursor", "pointer");
        end_angle -= 5;
        set_angles_fun();
    } else {
        $(this).css("cursor", "not-allowed");
    }
    $("#end-txt").html(`${end_angle}&#176;`);
    XRD_step_num = 5;
    if (window.XRD_BENCHMARK_API && typeof XRD_BENCHMARK_API.markSubtaskSuccess === "function") {
        XRD_BENCHMARK_API.markSubtaskSuccess("S4");
    }
    if (switch_angle_b) next_step();
    switch_angle_b = false;
    switch_angle_a = false;
})

$('#btn-end-up').click(function (e) {
    if (end_angle < 110) {
        $(this).css("cursor", "pointer");
        end_angle += 5;
        set_angles_fun();
    } else {
        $(this).css("cursor", "not-allowed");
    }
    $("#end-txt").html(`${end_angle}&#176;`);
    XRD_step_num = 5;
    if (window.XRD_BENCHMARK_API && typeof XRD_BENCHMARK_API.markSubtaskSuccess === "function") {
        XRD_BENCHMARK_API.markSubtaskSuccess("S4");
    }
    if (switch_angle_b) next_step();
    switch_angle_b = false;
    switch_angle_a = false;
})

$('#btn-end-dw').hover(function (e) {
    if (end_angle > 10 && end_angle > (start_angle + 5)) {
        $(this).css("cursor", "pointer");
    } else {
        $(this).css("cursor", "not-allowed");
    }
})

$('#btn-end-up').hover(function (e) {
    if (end_angle == 110) {
        $(this).css("cursor", "not-allowed");
    } else {
        $(this).css("cursor", "pointer");
    }
})


const set_angles_fun = (start_angl = start_angle, end_angl = end_angle) => {
    let new_start = scroll_equation(start_angl, 5, 105, 0, -52.5);
    let angle_device_l = scroll_equation(start_angl, 5, 105, 5, 57.5);
    let angle_device_r = scroll_equation(start_angl, 5, 105, -5, -57.5);
    let new_end = scroll_equation(end_angl, 110, 10, 0, 52.5);
    $("#start-angle-line").css("transform", `rotate(${new_start}deg)`);
    $("#start-mask").css("transform", `rotate(${new_start-new_end}deg)`);
    $("#end-angle-group").css("transform", `rotate(${new_end}deg)`);
    $("#detector-l").css("transform", `translate(-2.2vw, -2.3vw) rotate(${angle_device_l}deg)`);
    $("#detector-r").css("transform", `translate(-4.4vw, -4.4vw) rotate(${angle_device_r}deg)`);
    //    console.log({
    //        new_start
    //    }, {
    //        new_end
    //    });
    scan_time_fun();
}
// ======================= END ======================== //

// ======================= START ======================== //
var drawCurve_timer;
var incremented_end_arr_pos = 0;
const increment_curve_fun = () => {
    incremented_end_arr_pos += 4;
    if (incremented_end_arr_pos <= end_arr_pos) {
        drawCurve();
    } else {
        clearInterval(drawCurve_timer);
        XRD_step_num = 8;
        next_step();
    }
}
// ======================= END ======================== //

// ======================= START ======================== //
const scan_time_fun = () => {
    scan_time = (end_angle - start_angle) / steptime_val;
    (steptime_val != 0) ? $("#scantime-val").html(scan_time + " secs"): $("#scantime-val").html('-');
}
// ======================= END ======================== //


// ======================= FAST FORWARD FOR BENCHMARK ======================== //
// 将模拟器直接快进到某个子任务开始前的状态，便于单独测试某一步。
// 仅在基准测试 / Agent 评估脚本中通过 window.XRD_fast_forward_to_subtask(...) 调用。
window.XRD_fast_forward_to_subtask = function (subtaskId) {
    // 统一从干净 baseline 开始
    if (typeof specimen_reset_fn === "function") {
        specimen_reset_fn();
    }

    const markSuccess = function (id) {
        if (window.XRD_BENCHMARK_API && typeof XRD_BENCHMARK_API.markSubtaskSuccess === "function") {
            XRD_BENCHMARK_API.markSubtaskSuccess(id);
        }
    };

    const markPrefix = function (ids) {
        ids.forEach(function (id) { markSuccess(id); });
    };

    switch (subtaskId) {
        case "S1":
            // 初始状态：只需要正常选择样品即可
            break;

        case "S2":
            // 已完成 S1（选择样品），当前只测开门
            markSuccess("S1");
            XRD_step_num = 2;
            if (typeof XRD_step_2 === "function") {
                XRD_step_2();
            }
            break;

        case "S2a":
            // 已完成 S1/S2，门已打开，只测关门
            markPrefix(["S1", "S2"]);
            // 让 DOORS 按钮处于可点击状态，视为“可以关门”的一步
            XRD_step_num = 3;
            if (typeof XRD_step_3 === "function") {
                XRD_step_3();
            }
            break;

        case "S3":
            // 已完成 S1/S2/S2a，只测加电（STANDBY → POWER）
            markPrefix(["S1", "S2", "S2a"]);
            // 直接进入启用 STANDBY 的步骤
            XRD_step_num = 4;
            if (typeof XRD_step_4 === "function") {
                XRD_step_4();
            }
            break;

        case "S4":
            // 已完成 S1–S3，只测角度设置
            markPrefix(["S1", "S2", "S2a", "S3"]);
            XRD_step_num = 5;
            if (typeof XRD_step_5 === "function") {
                XRD_step_5();
            }
            break;

        case "S5":
            // 已完成 S1–S4，只测步长选择
            markPrefix(["S1", "S2", "S2a", "S3", "S4"]);
            XRD_step_num = 5;
            if (typeof XRD_step_5 === "function") {
                XRD_step_5();
            }
            break;

        case "S6":
            // 已完成 S1–S5，只测扫描速率选择
            markPrefix(["S1", "S2", "S2a", "S3", "S4", "S5"]);
            // 先启用角度和步长
            XRD_step_num = 5;
            if (typeof XRD_step_5 === "function") {
                XRD_step_5();
            }
            // 再启用扫描速率下拉
            XRD_step_num = 6;
            if (typeof XRD_step_6 === "function") {
                XRD_step_6();
            }
            break;

        case "S7":
            // 已完成 S1–S6，只测开始扫描
            markPrefix(["S1", "S2", "S2a", "S3", "S4", "S5", "S6"]);
            // 设定一个合法的角度范围和参数，并启用 START SCAN
            start_angle = 5;
            end_angle = 80;
            step_val = 0.02;
            steptime_val = 0.2;
            if (typeof set_angles_fun === "function") {
                set_angles_fun();
            }
            if (typeof scan_time_fun === "function") {
                scan_time_fun();
            }
            activate_sqr_btn("#btn-start-scan");
            break;

        case "S8":
            // 已完成 S1–S7，只测保存结果
            markPrefix(["S1", "S2", "S2a", "S3", "S4", "S5", "S6", "S7"]);
            // 直接激活保存按钮，模拟扫描已完成的状态
            activate_sqr_btn("#btn-save-dff");
            break;

        default:
            console.warn("XRD_fast_forward_to_subtask: unknown subtaskId:", subtaskId);
    }
};
// ======================= END FAST FORWARD FOR BENCHMARK ======================== //

const scan_back_fun = () => {
    $("#btn-shutter").toggleClass("shutter-active", false);
    $("#x-ray-in").toggleClass("ray-r", false);
    $("#svg-diagram line#ray-l").css("opacity", "0");
    $("#btn-shutter").html("CLOSED");
    $("#btn-start-scan").html("START SCAN");
    deactivate_sqr_btn("#btn-start-scan");
    if (scan_angle > start_angle) {
        increment_angle--;
        scan_angle = start_angle + increment_angle;
        set_angles_fun(scan_angle);
    } else {
        clearInterval(scan_timer);
        activate_sqr_btn("#btn-start-scan");
        activate_sqr_btn("#btn-save-dff");
        activate_dd("#specimen");
        // Benchmark: S7 RunScan 成功（扫描完成且保存按钮激活）
        if (window.XRD_BENCHMARK_API && typeof XRD_BENCHMARK_API.markSubtaskSuccess === "function") {
            XRD_BENCHMARK_API.markSubtaskSuccess("S7");
        }
    }

}
const scan_anim_fun = () => {
    $("#svg-diagram #red-spot").css("fill", "#FF0000");
    if (scan_angle < end_angle) {
        increment_angle++;
        scan_angle = start_angle + increment_angle;
        set_angles_fun(scan_angle);
    } else {
        clearInterval(scan_timer);
        scan_timer = setInterval(scan_back_fun, 10);
        $("#svg-diagram #red-spot").css("fill", "#8D7F7E");
    }
}
// ======================= START ======================== //

const get_arr_start_fun = () => {
    let from_angle;
    for (let i = 0; i < x_data.length; i++) {
        if (x_data[i] > start_angle) {
            from_angle = i;
            return from_angle;
        }
    }
}

const get_arr_end_fun = () => {
    let to_angle;
    for (let i = (x_data.length) - 1; i > 0; i--) {
        if (x_data[i] < end_angle) {
            to_angle = i;
            return to_angle;
        }
    }
}
// ======================= END ======================== //
// ======================= START ======================== //

function drawCurve() {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    //    ctx.lineWidth = 10;
    ctx.strokeStyle = '#1f77b4';
    ctx.beginPath();
    let start_y = scroll_equation(y_data[chosen_specimen][0][steptime_arr_pos], y_min[chosen_specimen][steptime_arr_pos], y_max[chosen_specimen][steptime_arr_pos], y_axis_h, 0);
    let start_x = scroll_equation(x_data[start_arr_pos], start_angle, end_angle, 0, x_axis_w);
    ctx.moveTo(start_x, start_y);
    for (var i = 1; i < incremented_end_arr_pos; i++) {
        let current_y = scroll_equation(y_data[chosen_specimen][i][steptime_arr_pos], y_min[chosen_specimen][steptime_arr_pos], y_max[chosen_specimen][steptime_arr_pos], y_axis_h, 0);
        let current_x = scroll_equation(x_data[i], start_angle, end_angle, 0, x_axis_w);
        ctx.lineTo(current_x, current_y);
    }
    ctx.stroke();
}
// ======================= END ======================== //


// ======================= START DRGGABLE MODALS ======================== //
$("#tem-diagram-modal").draggable();
// ======================= END  ======================== //
// ======================= START ======================== //


$("#close-tem-diagram").click(function (e) {
    e.preventDefault();
    $("#tem-diagram-modal").toggleClass("totally-hidden", true);
    deactivate_sqr_btn("#btn-diagram-tem");
    activate_sqr_btn("#btn-diagram-tem");
});

// =======================  END END  ==================== //
// ======================= START ======================== //


$("#close-save").click(function (e) {
    e.preventDefault();
    $("#save-modal-window").toggleClass("totally-hidden", true);
});

// =======================  END END  ==================== //

// =======================  END END  ==================== //
$("#close-resize").click(() => {
    toogle_fn("#modal-resize", "totally-hidden", false);
});
// ======================= START ======================== //

// ======================= START ======================== //
var svg_w = 1010;
var svg_h = 550;
var canv_w = 892;
var canv_h = 478;

function saveXRDIMG(the_svg) {
    var resizedCanvas = document.createElement("canvas");
    var resizedContext = resizedCanvas.getContext("2d");
    resizedCanvas.width = svg_w;
    resizedCanvas.height = svg_h;
    resizedContext.fillStyle = "white";
    resizedContext.fillRect(0, 0, svg_w, svg_h);
    resizedContext.drawImage(the_svg, 0, 0, 835, 655, 0, 0, svg_w, svg_h);
    resizedContext.drawImage(canvas, 88, 20, canv_w, canv_h);

    /// create an "off-screen" anchor tag
    var lnk = document.createElement('a'),
        e;
    /// the key here is to set the download attribute of the a tag
    let specimen_title = $(`#specimen option[value=${chosen_specimen}]`).text();
    lnk.download = `Diffractogram of ${specimen_title}, from the XRD simulator.jpg`;
    /// convert canvastoPrint content to data-uri for link. When download
    /// attribute is set the content pointed to by link will be
    /// pushed as "download" in HTML5 capable browsers
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
// ======================= START ======================== //
var ContainerElements = ["svg", "g"];
var RelevantStyles = {
    "svg": ["width", "height"],
    "g": ["font-size", "font-family", "font-weight", "opacity"],
    "text": ["fill", "font-size", "font-family", "font-weight", "transform"],
    "text#y-label": ["transform"],
    "line": ["stroke", "stroke-width"],
    ".y-group": ["opacity"],
    "g.y-group.y-visible": ["opacity"]
};


function read_Element(ParentNode, OrigData) {
    var Children = ParentNode.childNodes;
    var OrigChildDat = OrigData.childNodes;

    for (var cd = 0; cd < Children.length; cd++) {
        var Child = Children[cd];

        var TagName = Child.tagName;
        if (ContainerElements.indexOf(TagName) != -1) {
            read_Element(Child, OrigChildDat[cd])
        } else if (TagName in RelevantStyles) {
            var StyleDef = window.getComputedStyle(OrigChildDat[cd]);

            var StyleString = "";
            for (var st = 0; st < RelevantStyles[TagName].length; st++) {
                StyleString += RelevantStyles[TagName][st] + ":" + StyleDef.getPropertyValue(RelevantStyles[TagName][st]) + "; ";
            }

            Child.setAttribute("style", StyleString);
        }
    }

}

function eraseInvisibleY() {
    document.querySelectorAll('.y-group').forEach(function (a) {
        a.remove()
    })
}

function export_StyledSVG(SVGElem) {
    $("#svg-curve").attr("width", "835");
    $("#svg-curve").attr("height", "655");
    var oDOM = SVGElem.cloneNode(true);
    oDOM.id = "svg-copy"
    read_Element(oDOM, SVGElem);
    var data = new XMLSerializer().serializeToString(oDOM);
    var svg = "data:image/svg+xml," + data;

    let img_svg = new Image();
    img_svg.onload = function () {
        img_svg.width = svg_w;
        img_svg.height = svg_h;
        saveXRDIMG(img_svg)
    }
    img_svg.src = svg;
}
// ======================= END ======================== //
