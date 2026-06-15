/* APT_simulator javascript functions    

Created  by Andres Vasquez for AMMRF'S www.myscope.training
info@andresvasquez.net  —— www.andresvasquez.net ——
copyright:This work is licensed under a Creative Commons Attribution 4.0 International License.

************************************************************************/
var canvas = document.getElementById('main-canvas');
var ctx = canvas.getContext('2d');
var target_canvas = document.getElementById('target-canvas');
var target_ctx = target_canvas.getContext('2d');
var tem_query_params = new URLSearchParams(window.location.search);
var TEM_HIDE_GUIDANCE = tem_query_params.get("hide_guidance") === "1" || tem_query_params.get("benchmark") === "1";
var bufferC_TEM_01 = document.createElement("canvas");
var bufferCtx_TEM_01 = bufferC_TEM_01.getContext("2d");
var bufferC_TEM_02 = document.createElement("canvas");
var bufferCtx_TEM_02 = bufferC_TEM_02.getContext("2d");
var txt_top_instructions = document.getElementById('top-instructions');
var promise_fullfilled_num = 0;
var promises_total = 11;
var sample_set;
var sprites = [];
var w_h = 512;
var f_current = 0;
var incrementTimeout;
var speed = 500;
var xpos = 406;
var ypos = 101;
var radiusx = 135;
var radiusy = 135;
var beam_rotation = 45;
var displayed_img;
var chosen_sample = "0";
canvas.width = w_h;
canvas.height = w_h;
target_canvas.width = w_h;
target_canvas.height = w_h;
bufferC_TEM_02.width = w_h;
bufferC_TEM_02.height = w_h;
var origin_axis = 0;
var source_x = 0;
var source_y = 0;
var hi_origin_axis = 0;
var hi_source_x = 0;
var hi_source_y = 0;
var increment = 5; //changes with the controller
var increment_setup = 13; //changes with the controller
var wobblerEffect;
var polarity = 1;
var xval = 489;
var yval = 489;
var img_w_h = 1248;
var brightness_style = 100;
var sprite_num = 0;
var sprite_bw;
var bright_val;
bufferC_TEM_01.width = img_w_h;
bufferC_TEM_01.height = img_w_h;
var blur_style;
var displayed_bar;
var displayed_msk;

var currentImg = 0;
var canvas_data_tem = [{
    c: canvas,
    ctx: ctx,
    swidth: 872,
    sheight: 872,
    bufferC: bufferC_TEM_02,
    bufferCtx: bufferCtx_TEM_02
        }];
var adquireRaster_bool = false;
var green_mesh;
var stage_increment = 0;
var tem_stage_x = 0;
var tem_stage_y = 0;
var tem_stage_z = 0;
var tilt_x = 0;
var tilt_y = 0;
var activity_num = 1;
var bool_imgSeqAnimation = false;
var bool_rasterEffect = false;
if (TEM_HIDE_GUIDANCE) {
    document.body.classList.add("benchmark-hide-guidance");
    window.TEM_HIDE_GUIDANCE = true;
}
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
            //            displayed_img = common_set_1;
            Loader.mp4("images/simulator/TEM/micrographs/fft_1.mp4", "fftvideo");
            i_promise_file(10, `images/simulator/TEM/micrographs/green/nano/nano_`, `nano_set`, sprites[promise_fullfilled_num], `jpg`);
            break;
        case 2:
            i_promise_file(6, `images/simulator/TEM/micrographs/green/zebra/zebra_`, `zebra_set`, sprites[promise_fullfilled_num], `jpg`);
            break;
        case 3:
            i_promise_file(10, `images/simulator/TEM/micrographs/green/metal/metal_`, `metal_set`, sprites[promise_fullfilled_num], `jpg`);
            break;
        case 4:
            i_promise_file(10, `images/simulator/TEM/micrographs/green/mineral/mineral_`, `mineral_set`, sprites[promise_fullfilled_num], `jpg`);
            break;
        case 5:
            //            displayed_img = common_set_1;
            i_promise_file(4, `images/simulator/TEM/micrographs/green/nano/nano_scalebar_`, `nano_bar_set`, sprites[promise_fullfilled_num], `png`);
            break;
        case 6:
            i_promise_file(4, `images/simulator/TEM/micrographs/green/zebra/zebra_scalebar_`, `zebra_bar_set`, sprites[promise_fullfilled_num], `png`);
            break;
        case 7:
            i_promise_file(4, `images/simulator/TEM/micrographs/green/metal/metal_scalebar_`, `metal_bar_set`, sprites[promise_fullfilled_num], `png`);
            break;
        case 8:
            i_promise_file(4, `images/simulator/TEM/micrographs/green/mineral/mineral_scalebar_`, `mineral_bar_set`, sprites[promise_fullfilled_num], `png`);
            break;
        case 9:
            i_promise_file(2, `images/simulator/TEM/micrographs/green/mask_`, `masks_set`, sprites[promise_fullfilled_num], `png`);
            break;
        case 10:
            i_promise_file(200, `images/simulator/TEM/micrographs/focus/ronchigram_focus_`, `ronchigram_focus`, sprites[promise_fullfilled_num], `jpg`);
            break;
        case 11:
            i_promise_file(113, `images/simulator/TEM/micrographs/stigmator/ronchigram_stigmator_`, `ronchigram_stigmator`, sprites[promise_fullfilled_num], `jpg`);
            Loader.jpg("images/simulator/TEM/micrographs/stigmator/stigmator-align.jpg", "stigmator_align");
            Loader.jpg("images/simulator/TEM/micrographs/stigmator/ronchigram_bf.jpg", "stigmator_bf");
            break;
        case 12:
            i_promise_file(4, `images/simulator/TEM/micrographs/green/mesh/mesh_`, `mesh`, sprites[promise_fullfilled_num], `jpg`);
            break;
        case 13:
            canvas_data_tem[0].sprite_arr = sprites[11];
            $("#loading-modal").toggleClass("totally-hidden", true);
            $("#top-bar").toggleClass("modal-is-open", false);
            $("#simulator-base").toggleClass("modal-is-open", false);
            Loader.js("js/TEM_video.js");
            console.log("sigue prometiendo");
            break;
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
i_promise_file(9, `images/simulator/TEM/micrographs/green/tem_`, `common_set`, sprites[promise_fullfilled_num], `jpg`);
// =======================  END END  ==================== //
// ======================= START INSTRUCTIONS ======================== //
const display_instruction = () => {
    if (TEM_HIDE_GUIDANCE) {
        $("#top-instructions-txt").html("");
        return;
    }
    //    instruct_text = TEM_step_num + '. ' + eval('instruction_step_' + TEM_step_num);
    instruct_text = eval('instruction_step_' + TEM_step_num);
    $("#top-instructions-txt").fadeTo(100, 0, function () {
        $("#top-instructions-txt").html(instruct_text);
        $("#top-instructions-txt").fadeTo(1000, 1);
    });

};
// =======================  END END  ==================== //
// ======================= START INSTRUCTIONS ======================== //
var source_w_h;
const draw_tem = (origin_x = 0, origin_y = 0) => {
    let degrees = beam_rotation * (Math.PI / 180);
    source_w_h = displayed_img.width - (origin_axis * 2);
    ctx.save();
    ctx.clearRect(0, 0, w_h, w_h);
    ctx.beginPath();
    ctx.ellipse(xpos, ypos, radiusx, radiusy, degrees, 0, 2 * Math.PI);
    ctx.clip();
    ctx.drawImage(displayed_img, source_x, source_y, source_w_h, source_w_h, origin_x, origin_y, w_h, w_h);
    //    ctx.drawImage(displayed_img, 0, 0, w_h, w_h);
    ctx.restore();
};
// =======================  END END  ==================== //

// ======================= START ======================== //
const blue_fun = () => {
    bufferCtx_TEM_01.clearRect(0, 0, bufferC_TEM_01.width, bufferC_TEM_01.height);
    bufferCtx_TEM_01.beginPath();
    bufferCtx_TEM_01.arc(xval, yval, 80, 0, 2 * Math.PI);
    bufferCtx_TEM_01.moveTo(xval - 5, yval);
    bufferCtx_TEM_01.lineTo(xval + 5, yval);
    bufferCtx_TEM_01.moveTo(xval, yval - 5);
    bufferCtx_TEM_01.lineTo(xval, yval + 5);
    bufferCtx_TEM_01.strokeStyle = "blue";
    bufferCtx_TEM_01.lineWidth = 2;
    bufferCtx_TEM_01.stroke();
    target_ctx.clearRect(0, 0, w_h, w_h);
    target_ctx.drawImage(bufferC_TEM_01, source_x, source_y, source_w_h, source_w_h, 0, 0, w_h, w_h);
}
// =======================  END END  ==================== //

// ======================= START ======================== //
const dffctn_msk_fun = () => {
    displayed_msk = sprites[9][0];
    ctx.drawImage(displayed_msk, 0, 0, displayed_msk.width, displayed_msk.height, 0, 0, w_h, w_h);
}
// =======================  END END  ==================== //

// ======================= START ======================== //
var wobble_bool = false;
var the_increment = increment;
const wobbleIt = () => {
    (increment_setup == 13) ? $("#spinner-3-z-up").css("cursor", "not-allowed"): $("#spinner-3-z-up").css("cursor", "pointer");
    (increment_setup == 0) ? $("#spinner-3-z-down").css("cursor", "not-allowed"): $("#spinner-3-z-down").css("cursor", "pointer");
    if (source_x == origin_axis) {
        the_increment = increment;
    }
    let wobble_size = Math.ceil(the_increment ** 1.2);
    let blur_val = increment * 2;
    let gap = 2 * wobble_size;
    let limit_l = origin_axis - gap;
    let limit_r = origin_axis + gap;
    let source_xy = source_x;
    canvas.style.filter = `blur(${blur_val}px) brightness(${brightness_style}%)`;
    wobblerEffect = requestAnimationFrame(() => wobbleIt());
    source_xy += gap * polarity;
    if (source_xy <= limit_l) {
        source_xy = limit_l;
        polarity *= -1;
    }
    if (source_xy >= limit_r) {
        source_xy = limit_r;
        polarity *= -1;
    }
    source_x = source_xy;
    source_y = source_xy;
    draw_tem();
};
// ======================= END ======================== //
// =======================  JQUERYUI  ==================== //
$(function () {
    // ======================= START SLIDERS ======================== //

    $("#focus").slider({
        range: "min",
        min: 0,
        max: 100,
        value: 55,
        animate: true,
        slide: function (event, ui) {
            let blur_val = Math.floor(scroll_equation(ui.value, 0, 100, -70, 130));
            blur_style = blur_val / 10;
            if (blur_style < 0) blur_style *= (-1);
            if (TEM_step_num == 58) {
                ronchigram_fun(ui.value);
            } else if (TEM_step_num == 52) {
                canvas.style.filter = `blur(${blur_style+2}px) brightness(100%)`;
            } else {
                canvas.style.filter = `blur(${blur_style}px) brightness(100%)`;
            }
        },
        stop: function (event, ui) {
            if (TEM_step_num == 58) {
                if (ui.value == 110 || ui.value == 111 || ui.value == 112) next_step();
            } else {
                if (blur_style < 0.5) next_step();
            }
        },
        disabled: true
    });

    $("#brightness").slider({
        range: "min",
        min: 0,
        max: 200,
        value: 47,
        animate: true,
        slide: function (event, ui) {
            if (ui.value <= 100) {
                bright_val = ui.value - 100;
            } else {
                bright_val = scroll_equation(ui.value, 0, 100, 100, 0);
            }
            bright_val *= -1;
            if (bright_val == -0) bright_val = 0;
            let radius_xy = Math.round(scroll_equation(bright_val, 0, 100, w_h * 0.01, w_h / 2));
            if (TEM_step_num == 36 || TEM_step_num == 40) {
                if (bright_val <= 20) {
                    let xtra_brightness = Math.round(scroll_equation(bright_val, 0, 20, 200, 100));
                    canvas.style.filter = `blur(0px) brightness(${xtra_brightness}%)`;
                } else {
                    canvas.style.filter = `blur(0px) brightness(100%)`;
                }
            }
            radiusx = radius_xy;
            radiusy = radius_xy;

            if (TEM_step_num != 36 && bright_val <= 100) {
                draw_tem();
            } else if (bright_val > 0 && TEM_step_num == 36) {
                draw_tem();
            }
        },
        stop: function (event, ui) {
            //            draw_tem();
            if (TEM_step_num != 36 && bright_val >= 99) {
                next_step();
            } else if (TEM_step_num == 36 && bright_val <= 2) {
                next_step();
            }
        },
        start: function (event, ui) {
            $("button[id|='spinner-3-z']").toggleClass("btn-disabled", false);
            deactivate_spinner("#specimen-position");
            $("#specimen-position .title-z").toggleClass("label-disabled", false);
        },
        disabled: true
    });

    $("#fil-current").slider({
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
    // =======================  END SLIDERS CHANNEL 1 END  ==================== //
    // ======================= START DROP DOWN ======================== //

    $("#sample").selectmenu({
        select: function (event, data) {
            sample_mesh_fn();
            chosen_sample = parseInt(data.item.value);
            green_mesh = sprites[12][chosen_sample - 1];
            displayed_img = green_mesh;
            sample_set = chosen_sample;
            (chosen_sample == 2) ? low_volt_fn(): hi_volt_fn();
            $("#acc-volt").selectmenu("refresh");
            deactivate_dd("#sample");
        },
        disabled: true
    });
    $("#acc-volt").selectmenu({
        select: function (event, data) {
            deactivate_dd("#acc-volt");
            next_step();
            switch (data.item.value) {
                case "a":
                    f_current = 60;
                    break;
                case "b":
                    f_current = 100;
                    break;
            }
        },
        disabled: true
    });
    $("#magnification").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "0":
                    return;
                    break;
                case "a":
                    stage_increment = 1;
                    if (TEM_step_num == 34) {
                        sprite_num = 3;
                    } else {
                        $("#spinn-val-z").html(`${tem_stage_z} µm`);
                        sprite_num = 0;
                        canvas.style.filter = `blur(6px) brightness(${brightness_style}%)`;
                    }
                    displayed_img = sprites[sample_set][sprite_num];
                    break;
                case "b":
                    stage_increment = 0.5;
                    (TEM_step_num == 34) ? sprite_num = 4: sprite_num = 1;
                    displayed_img = sprites[sample_set][sprite_num];
                    break;
                case "c":
                    //                    if (TEM_step_num != 35) {
                    stage_increment = 0.1;
                    (TEM_step_num == 34) ? canvas.style.filter = `blur(0px) brightness(100%)`: canvas.style.filter = `blur(4px) brightness(100%)`;
                    (TEM_step_num == 34) ? sprite_num = 5: sprite_num = 2;
                    displayed_img = sprites[sample_set][sprite_num];
                    //                    }
                    break;
                case "d":
                    stage_increment = 0.02;
                    canvas.style.filter = `blur(4px) brightness(100%)`;
                    if (TEM_step_num == 70) {
                        displayed_img = sprites[0][6];
                        noiseY = tvCounter;
                        noise_fn();
                        bool_rasterEffect = true;
                    } else {
                        origin_axis = 0;
                        source_x = 0;
                        source_y = 0;
                        sprite_num = 8;
                        displayed_img = sprites[sample_set][sprite_num];
                    }
                    break;
            }
            if (TEM_step_num == 34) {
                ctx.drawImage(displayed_img, source_x, source_y, source_w_h, source_w_h, 0, 0, w_h, w_h);
                displayed_bar = sprites[parseInt(sample_set) + 4][sprite_num - 3];
                ctx.drawImage(displayed_bar, 0, 0, displayed_bar.width, displayed_bar.height, 0, 0, w_h, w_h);
            } else if (TEM_step_num == 51) {
                draw_tem();
                next_step();
            } else if (TEM_step_num == 70) {
                //                draw_tem();
                next_step();
            } else {
                origin_axis = 240;
                source_x = origin_axis;
                source_y = origin_axis;
                radiusx = 256;
                radiusy = 256;
                draw_tem();
                next_step();
            }
        },
        disabled: true
    });

    $("#aperture-dd").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "0":
                    //                    next_step();
                    break;
                case "a":
                    $("#btn-diagram-tem").trigger("click");
                    activate_sqr_btn("#btn-diag-c-aperture");
                    break;
                case "b":
                    if (TEM_step_num != 35) {
                        beam_rotation = 0;
                        activate_sqr_btn("#btn-diag-o-aperture");
                        colored_stroke_fn("o-aperture-l");
                        colored_stroke_fn("o-aperture-r");
                        $("#btn-diagram-tem").trigger("click");
                    }
                    break;
                case "c":
                    xpos = 236;
                    ypos = 276;
                    radiusx = w_h / 4;
                    radiusy = w_h / 4;
                    activate_sqr_btn("#btn-diag-sad-aperture");
                    break;
            }
            deactivate_dd("#aperture-dd");
        },
        disabled: true
    });
    $("#apt-size").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "a":
                    brightness_style = 60;
                    canvas.style.filter = `blur(6px) brightness(${brightness_style}%)`;
                    break;
                case "b":
                    brightness_style = 100;
                    canvas.style.filter = `blur(2px) brightness(${brightness_style}%)`;
                    break;
                case "c":
                    brightness_style = 125;
                    canvas.style.filter = `blur(2px) brightness(${brightness_style}%)`;
                    break;
            }
            xpos = 156;
            ypos = 321;
            radiusx = 100;
            radiusy = 135;
            beam_rotation = 15;
            draw_tem();
            if (TEM_step_num == 11) next_step();
        },
        disabled: true
    });
    $("#stem-imaging").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "a":
                    fRate = 3;
                    noiseY = tvCounter;
                    displayed_img = sprites[0][5];
                    noise_fn();
                    bool_rasterEffect = true;
                    next_step();
                    break;
                case "b":
                    displayed_img = stigmator_bf;
                    ctx.drawImage(displayed_img, 0, 0, 872, 872, 0, 0, w_h, w_h);
                    $("#eyepiece-circle").css("opacity", "0");
                    next_step();
                    break;
            }
        },
        disabled: true
    });
    $("#stem").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "a":
                    break;
                case "b":
                    displayed_img = sprites[0][4];
                    noise_fn();
                    bool_rasterEffect = true;
                    next_step();
                    break;
            }
        },
        disabled: true
    });
    $("#lens").selectmenu({
        select: function (event, data) {
            switch (data.item.value) {
                case "a":
                    imgSeqAnimation(true, 0, 112, canvas_data_tem, next_step);
                    bool_imgSeqAnimation = true;
                    deactivate_dd("#lens");
                    break;
                case "b":
                    break;
            }
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
    $(dom_name).toggleClass("current-control", true);
}

var deactivate_sqr_btn = (dom_name, on_off = "off", label_name) => {
    $(dom_name).toggleClass("btn-disabled", true);
    $(dom_name).toggleClass("btn-active", false);
    $(dom_name).prop('disabled', true);
    $(dom_name).prop('value', on_off);
    $(label_name).toggleClass("label-disabled", true);
    $(dom_name).toggleClass("current-control", false);
}

var activate_slider = (dom_name) => {
    $(dom_name).slider("enable");
    $(dom_name + "-label").toggleClass("label-disabled", false);
    $(dom_name).toggleClass("current-slider", true);
}

var deactivate_slider = (dom_name) => {
    $(dom_name).slider("disable");
    $(dom_name + "-label").toggleClass("label-disabled", true);
    $(dom_name).toggleClass("current-slider", false);
}

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

var activate_spinner = (dom_name, ext = "-div") => {
    $(dom_name + "-div button").prop("disabled", false);
    $(dom_name + "-label").toggleClass("label-disabled", false);
    $(dom_name + "-div").toggleClass("div-disabled", false);
    $(dom_name + ext).toggleClass("current-control", true);
}

var deactivate_spinner = (dom_name, ext = "-div") => {
    $(dom_name + "-div button").prop("disabled", true);
    $(dom_name + "-label").toggleClass("label-disabled", true);
    $(dom_name + "-div").toggleClass("div-disabled", true);
    $(dom_name + ext).toggleClass("current-control", false);
}

// ======================= START ======================== //
const low_volt_fn = () => {
    $('#acc-volt>option:eq(1)').attr("disabled", false);
    $('#acc-volt>option:eq(2)').attr("disabled", true);
};
const hi_volt_fn = () => {
    $('#acc-volt>option:eq(1)').attr("disabled", true);
    $('#acc-volt>option:eq(2)').attr("disabled", false);
};
// ======================= END ======================== //

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
    let yes_blue = false;
    let blue_centeredX = (origin_axis - ((img_w_h / 2) - xval));
    let blue_centeredY = (origin_axis - ((img_w_h / 2) - yval));
    deactivate_dd("#apt-size");
    if (TEM_step_num == 30) {
        if (sample_set == 2 || sample_set == 4) next_step();
    }
    switch (spin_id) {
        case "spinner-1-x-down":
            if (source_x < (origin_axis * 2)) {
                source_x += 5;
                tem_stage_x += stage_increment;
            }
            $("#spinn-val-x").html(`${tem_stage_x.toFixed(1)} µm`);
            if ((TEM_step_num != 30 && TEM_step_num != 31) || ((TEM_step_num == 30 || TEM_step_num == 31) && (sample_set != 2 && sample_set != 4))) yes_blue = true;
            break;
        case "spinner-1-x-up":
            if (source_x > 0) {
                source_x -= 5;
                tem_stage_x -= stage_increment;
            }
            $("#spinn-val-x").html(`${tem_stage_x.toFixed(1)} µm`);
            if ((TEM_step_num != 30 && TEM_step_num != 31) || ((TEM_step_num == 30 || TEM_step_num == 31) && (sample_set != 2 && sample_set != 4))) yes_blue = true;
            break;
        case "spinner-1-y-down":
            if (source_y > 0) {
                source_y -= 5;
                tem_stage_y -= stage_increment;
            }
            $("#spinn-val-y").html(`${tem_stage_y.toFixed(1)} µm`);
            if ((TEM_step_num != 30 && TEM_step_num != 31) || ((TEM_step_num == 30 || TEM_step_num == 31) && (sample_set != 2 && sample_set != 4))) yes_blue = true;
            break;
        case "spinner-1-y-up":
            if (source_y < (origin_axis * 2)) {
                source_y += 5;
                tem_stage_y += stage_increment;
            }
            $("#spinn-val-y").html(`${tem_stage_y.toFixed(1)} µm`);
            if ((TEM_step_num != 30 && TEM_step_num != 31) || ((TEM_step_num == 30 || TEM_step_num == 31) && (sample_set != 2 && sample_set != 4))) yes_blue = true;
            break;
        case "spinner-2-tx-down":
            if (source_x < (origin_axis * 2)) {
                source_x += 5;
                tilt_x += 0.1;
            }
            $("#spinn-val-tx").html(`${tilt_x.toFixed(1)}&deg;&nbsp;`);
            yes_blue = true;
            break;
        case "spinner-2-tx-up":
            if (source_x > 0) {
                source_x -= 5;
                tilt_x -= 0.1;
            }
            $("#spinn-val-tx").html(`${tilt_x.toFixed(1)}&deg;&nbsp;`);
            yes_blue = true;
            break;
        case "spinner-2-ty-down":
            if (source_y > 0) {
                source_y -= 5;
                tilt_y -= 0.1;
            }
            $("#spinn-val-ty").html(`${tilt_y.toFixed(1)}&deg;&nbsp;`);
            yes_blue = true;
            break;
        case "spinner-2-ty-up":
            if (source_y < (origin_axis * 2)) {
                source_y += 5;
                tilt_y += 0.1;
            }
            $("#spinn-val-ty").html(`${tilt_y.toFixed(1)}&deg;&nbsp;`);
            yes_blue = true;
            break;
        case "spinner-3-z-down":
            if (increment_setup > 0) {
                increment_setup--;
                tem_stage_z -= 3;
            }
            increment = increment_setup - 8;
            $("#spinn-val-z").html(`${tem_stage_z} µm`);
            if (increment < 0) {
                TEM_step_num = 23;
                next_step();
                increment *= (-1);
            } else if (increment === 0) {
                TEM_step_num = 24;
                next_step();
            } else {
                TEM_step_num = 23;
                next_step();
            };
            break;
        case "spinner-3-z-up":
            if (increment_setup < 13) {
                increment_setup++;
                tem_stage_z += 3;
            }
            increment = increment_setup - 8;
            $("#spinn-val-z").html(`${tem_stage_z} µm`);
            if (increment < 0) {
                TEM_step_num = 23;
                next_step();
                increment *= (-1);
            } else if (increment === 0) {
                TEM_step_num = 24;
                next_step();
            } else {
                TEM_step_num = 23;
                next_step();
            };
            break;
        case "spinner-3-x-down":
        case "spinner-4-x-down":
            xpos -= 5;
            draw_tem();
            if (xpos == w_h / 2 && ypos == w_h / 2) {
                stopSpinning();
                return next_step();
            }
            break;
        case "spinner-3-x-up":
        case "spinner-4-x-up":
            xpos += 5;
            draw_tem();
            if (xpos == w_h / 2 && ypos == w_h / 2) {
                stopSpinning();
                return next_step();
            }
            break;
        case "spinner-3-y-down":
        case "spinner-4-y-down":
            ypos += 5;
            draw_tem();
            if (xpos == w_h / 2 && ypos == w_h / 2) {
                stopSpinning();
                return next_step();
            }
            break;
        case "spinner-3-y-up":
        case "spinner-4-y-up":
            ypos -= 5;
            draw_tem();
            if (xpos == w_h / 2 && ypos == w_h / 2) {
                stopSpinning();
                return next_step();
            }
            break;
        case "spinner-5-x-down":
            if (radiusx > 5) radiusx -= 5;
            draw_tem();
            if (radiusx == radiusy) {
                stopSpinning();
                return next_step();
            }
            break;
        case "spinner-5-x-up":
            radiusx += 5;
            draw_tem();
            if (radiusx == radiusy) {
                stopSpinning();
                return next_step();
            }
            break;
        case "spinner-5-y-down":
            if (radiusy > 5) radiusy -= 5;
            draw_tem();
            if (radiusx == radiusy) {
                stopSpinning();
                return next_step();
            }
            break;
        case "spinner-5-y-up":
            radiusy += 5;
            draw_tem();
            if (radiusx == radiusy) {
                stopSpinning();
                return next_step();
            }
            break;
        case "spinner-6-x-down":
            if (source_x <= 155) source_x += 5;
            draw_tem();
            if (source_y == 30 && source_x == 80) return next_step();
            break;
        case "spinner-6-x-up":
            if (source_x > 0) source_x -= 5;
            draw_tem();
            if (source_y == 30 && source_x == 80) return next_step();
            break;
        case "spinner-6-y-down":
            if (source_y > 0) source_y -= 5;
            draw_tem();
            if (source_y == 30 && source_x == 80) return next_step();
            break;
        case "spinner-6-y-up":
            if (source_y <= 25) source_y += 5;
            draw_tem();
            if (source_y == 30 && source_x == 80) return next_step();
            break;
    }

    (TEM_step_num == 38 || TEM_step_num == 39) ? ctx.drawImage(displayed_img, source_x, source_y, source_w_h, source_w_h, 0, 0, w_h, w_h): draw_tem();

    if (yes_blue) {
        blue_fun();
        if (source_x == blue_centeredX && source_y == blue_centeredY) {
            bufferCtx_TEM_01.clearRect(0, 0, w_h, w_h);
            target_ctx.clearRect(0, 0, w_h, w_h);
            stopSpinning();
            return next_step();
        }
    }
    if (TEM_step_num == 38) dffctn_msk_fun();
    incrementTimeout = setTimeout(() => {
        spinnIt_fn(spin_id, speed * 0.8);
    }, speed);
}

function stopSpinning() {
    clearTimeout(incrementTimeout);
}
// ======================= END ======================== //
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
        case "btn-restart":
            deactivate_sqr_btn("#btn-restart");
            break;
        case "btn-diagram-tem":
            $("#tem-diagram-modal").toggleClass("totally-hidden", false);
            break;
        case "btn-specimen":
            $("#btn-specimen").html("IN");
            specimen_insert();
            break;
        case "btn-filament":
            activate_slider("#fil-current");
            $("#fil-current").toggleClass("current-slider", false);
            $("#fil-current").slider("value", f_current);
            $("#beam-axis").css("opacity", "1");
            $("#beams-imaging").css("opacity", "1");
            next_step();
            break;
        case "btn-tem":
            deactivate_sqr_btn("#btn-stem");
            activate_sqr_btn("#btn-stem");
            break;
        case "btn-stem":
            deactivate_sqr_btn("#btn-tem");
            displayed_img = sprites[0][7];
            let displayed_roch = sprites[10][56];
            ctx.drawImage(displayed_roch, 0, 0, displayed_roch.width, displayed_roch.height, 0, 0, w_h, w_h);
            $('#close-tem-diagram').click();
            next_step();
            break;
        case "btn-imaging":
            deactivate_sqr_btn("#btn-diffraction");
            //            $("#btn-imaging").toggleClass("current-control", false);
            if (TEM_step_num == 39 || TEM_step_num == 48) {
                origin_axis = hi_origin_axis;
                source_x = hi_source_x;
                source_y = hi_source_y;
                displayed_img = sprites[sample_set][sprite_num];
                $("#beam-axis").css("opacity", "1");
                $("#beams-imaging").css("opacity", "1");
                $("#beams-diffraction").css("opacity", "0");
                $("#eyepiece-circle").css("opacity", "1");
            } else {
                //                displayed_img = common_set_1;
                if (chosen_sample == 2) {
                    displayed_img = green_mesh
                } else {
                    radiusx = 256;
                    radiusy = 256;
                    displayed_img = sprites[sample_set][sprite_num];
                    if (TEM_step_num == 25) canvas.style.filter = `blur(0) brightness(${brightness_style}%)`;
                }
            }
            draw_tem();
            next_step();
            break;
        case "btn-diffraction":
            deactivate_sqr_btn("#btn-imaging");
            if (TEM_step_num == 37) {
                hi_origin_axis = origin_axis;
                hi_source_x = source_x;
                hi_source_y = source_y;
                displayed_img = common_set_4;
                source_x = 210;
                source_y = 175;
                xval = 619;
                yval = 624;
                ctx.drawImage(displayed_img, source_x, source_y, source_w_h, source_w_h, 0, 0, w_h, w_h);
                blue_fun();
                $("#eyepiece-circle").css("opacity", "1");
            } else if (TEM_step_num == 43) {
                hi_origin_axis = origin_axis;
                hi_source_x = source_x;
                hi_source_y = source_y;
                $("#beam-axis").css("opacity", "1");
                $("#beams-imaging").css("opacity", "0");
                $("#beams-diffraction").css("opacity", "1");
                displayed_img = sprites[sample_set][6];
                source_x = 0;
                source_y = 0;
                radiusx = w_h / 2;
                radiusy = w_h / 2;
                origin_axis = 0;
                source_w_h = img_w_h;
                draw_tem();
            } else {
                (chosen_sample == 2) ? displayed_img = common_set_3: displayed_img = common_set_2;
                draw_tem();
            }
            canvas.style.filter = "blur(0) brightness(100%)";
            next_step();
            break;
        case "btn-camera":
            if (e.target.value == "off") {
                $("#btn-camera").html("INSERT");
                $("#column-lid").toggleClass("flip-in-lid", true);
                $("#camera-sqr").toggleClass("slide-out-camera", true);
                $("#column-lid").toggleClass("flip-out-lid", false);
                $("#camera-sqr").toggleClass("slide-in-camera", false);
                next_step();
            } else {
                $("#btn-camera").html("RETRACT");
                if (TEM_step_num == 32) {
                    sprite_bw = sprite_num + 3;
                    displayed_bar = sprites[parseInt(sample_set) + 4][sprite_num];
                } else if (TEM_step_num == 45) {
                    sprite_bw = 7;
                    displayed_bar = sprites[6][3];
                } else if (TEM_step_num == 53) {
                    sprite_bw = 9;
                    displayed_bar = sprites[parseInt(sample_set) + 4][3];
                }
                $("#column-lid").toggleClass("flip-out-lid", true);
                $("#camera-sqr").toggleClass("slide-in-camera", true);
                $("#column-lid").toggleClass("flip-in-lid", false);
                $("#camera-sqr").toggleClass("slide-out-camera", false);
                displayed_img = sprites[sample_set][sprite_bw];
                ctx.drawImage(displayed_img, source_x, source_y, source_w_h, source_w_h, 0, 0, w_h, w_h);
                ctx.drawImage(displayed_bar, 0, 0, displayed_bar.width, displayed_bar.height, 0, 0, w_h, w_h);
                $("#eyepiece-circle").css("opacity", "0");
                $("#hair-cross").css("opacity", "0");
                deactivate_sqr_btn("#btn-camera", "off", "#camera-label");
                next_step();
            }
            e.target.disabled = false;
            deactivate_sqr_btn("#btn-camera", "off", "#camera-label");
            break;
        case "btn-wobbler":
            if (e.target.value == "on") {
                wobbleIt();
            } else {
                cancelAnimationFrame(wobblerEffect);
            }
            next_step();
            break;
        case "btn-acquire":
            if (TEM_step_num != 66 && TEM_step_num != 69 && TEM_step_num != 72) saveIMG();
            $("#btn-acquire").toggleClass("btn-disabled", false);
            $("#btn-acquire").prop('disabled', false);
            $("#btn-acquire").toggleClass("btn-active", false);
            switch (TEM_step_num) {
                case 34:
                    TEM_step_num = 33;
                    break;
                case 33:
                    next_step();
                    break;
                case 66:
                case 69:
                case 72:
                    tvCounter = 2;
                    fRate = 1;
                    adquireRaster_bool = true;
                    break;
                case 46:
                    high_fn();
                    break;
                case 54:
                    toSTEM_fn();
                    break;
            }
            break;
        case "btn-fft":
            $("#eyepiece-circle").css("opacity", "0");
            if (e.target.value == "off") {
                $(this).html("ON");
                canvas.style.filter = `blur(2px) brightness(100%)`;
                next_step();
            } else {
                $("#top-instructions-txt").html("");
                $(this).html("OFF");
                canvas.style.filter = `blur(0px) brightness(100%)`;
                playFFT();
            }
            break;
        default:
            //        code block
    }
    $(this).toggleClass("current-control", false);
});
// ======================= END ======================== //
// ======================= START ======================== //
$('.diagram-button').click(function (e) {
    if (e.target.value == "off") {
        e.target.value = "on";
        $("#" + e.target.id).html("REMOVE");
    } else {
        e.target.value = "off";
        $("#" + e.target.id).html("INSERT");
    }
    e.target.disabled = true;
    $("#" + e.target.id).css("cursor", "not-allowed");
    switch (e.target.id) {
        case "btn-diag-c-aperture":
            if (e.target.value == "off") {
                $("#btn-diag-c-aperture").html("INSERT");
                aperture_fn("c", 0.7);
            } else {
                $("#btn-diag-c-aperture").html("REMOVE");
                aperture_fn("c", 1);
            }
            break;
        case "btn-diag-specimen":
            if (e.target.value == "off") {
                $("#btn-diag-specimen").html("INSERT");
                specimen_out();
            } else {
                $("#btn-diag-specimen").html("REMOVE");
                specimen_in();
            }
            break;
        case "btn-diag-o-aperture":
            if (e.target.value == "off") {
                aperture_fn("o", 0.7);
            } else {
                xpos = 281;
                ypos = 336;
                radiusx = 60;
                radiusy = 60;
                aperture_fn("o", 1);
            }
            break;
        case "btn-diag-sad-aperture":
            if (e.target.value == "off") {
                aperture_fn("sad", 0.7);
            } else {
                aperture_fn("sad", 1);
                draw_tem();
                deactivate_dd("#aperture-dd");
            }
            break;
        case "btn-diag-df-stem":
            if (e.target.value == "off") {
                df_detector_out();
            } else {
                df_detector_in();
            }
            break;
        case "btn-diag-bf-stem":
            if (e.target.value == "off") {
                bf_detector_fn("-2vw");
            } else {
                bf_detector_fn("1.5vw");
            }
            break;
        case "btn-diag-b-block":
            if (e.target.value == "off") {
                bblock_fn(80);
                $("#beam-stop").css("opacity", "0");
                draw_tem();
            } else {
                displayed_msk = sprites[9][1];
                bblock_fn(0);
            }
            break;
    }
    deactivate_sqr_btn("#" + e.target.id);
});
// ======================= END ======================== //
// ======================= START ======================== //
const specimen_in = () => {
    //    deactivate_sqr_btn("#btn-diag-specimen", "on");
    anime({
        targets: '#tem-diagram-svg #specimen-holder',
        scale: {
            value: 1,
            duration: 800,
            easing: 'linear'
        },
        translateY: {
            value: 0,
            duration: 800,
            easing: 'easeInOutSine'
        },
        translateX: {
            value: 0,
            duration: 800,
            delay: 600,
            easing: 'easeInOutQuart'
        },
        complete: function (anim) {
            $("#airlock-label").toggleClass("label-disabled", false);
            $("#btn-airlock").html("EVACUATE");
            $("#btn-airlock").toggleClass("btn-active", true);
            $("#btn-airlock").toggleClass("blinker", true);
            $("#btn-airlock").prop('disabled', true);
            $("#diag-air").fadeTo(3000, 0, function () {
                $("#btn-airlock").toggleClass("blinker", false);
                activate_sqr_btn("#btn-specimen", "#specimen-label");
                next_step();
            });
        }
    });
}
// ======================= END ======================== //
// ======================= START ======================== //
const specimen_out = () => {
    //    deactivate_sqr_btn("#btn-diag-specimen");
    anime({
        targets: '#tem-diagram-svg #specimen-holder',
        translateX: {
            value: -180,
            duration: 800,
            easing: 'linear'
        },
        translateY: {
            value: -300,
            duration: 800,
            delay: 400,
            easing: 'easeInOutSine'
        },
        scale: {
            value: 1.15,
            duration: 800,
            delay: 600,
            easing: 'easeInOutQuart'
        },
        begin: function (anim) {
            $("#specimen-holder-tip").removeAttr("style");
        },
        complete: function (anim) {
            next_step();
        }
    });
}

// ======================= END ======================== //
// ======================= START ======================== //
const specimen_insert = () => {
    anime({
        targets: '#tem-diagram-svg #specimen-holder-arm',
        translateX: {
            value: "0vw",
            duration: 800,
            easing: 'linear'
        },
        complete: function (anim) {
            next_step();
        }
    });
}

// ======================= END ======================== //
// ======================= START ======================== //
const sample_mesh_fn = () => {
    document.getElementById("sample-mesh").style.transform = "translateX(-12%) translateY(-8%) scale(1)"
    anime({
        targets: '#tem-diagram-svg #sample-mesh',
        translateX: {
            value: "-13%",
            duration: 500,
            easing: 'linear',
            delay: 500,
        },
        translateY: {
            value: "-32%",
            duration: 500,
            easing: 'linear',
            delay: 500,
        },
        scale: {
            value: 0.1,
            duration: 500,
            easing: 'linear',
            delay: 500,
        },
        begin: function (anim) {
            document.getElementById("sample-mesh").style.opacity = "1";
        },
        complete: function (anim) {
            document.getElementById("sample-mesh").style.opacity = "0";
            document.getElementById("specimen-holder-tip").style.fill = "#C1481B";
            document.getElementById("specimen-holder-tip").style.stroke = "#C1481B";
            next_step();
        }
    });
}
// ======================= END ======================== //
// ======================= START ======================== //

const aperture_fn = (ap_id, ap_scale, doNext) => {
    let aperture_anim = anime.timeline({
        easing: 'linear',
        duration: 500,
    });

    aperture_anim
        .add({
            targets: `#tem-diagram-svg #${ap_id}-aperture-l`,
            scaleX: ap_scale
        })
        .add({
            targets: `#tem-diagram-svg #${ap_id}-aperture-r`,
            scaleX: ap_scale,
            complete: function (anim) {
                next_step();
            }
        }, '-=500');
}
// ======================= END ======================== //
// ======================= START ======================== //

const colored_stroke_fn = (part_id) => {
    document.getElementById(part_id).style.stroke = "#2196f3";
}
const black_stroke_fn = (part_id) => {
    document.getElementById(part_id).style.stroke = "#000000";
}
// ======================= END ======================== //
// ======================= START ======================== //
const df_detector_in = () => {
    let aperture_anim = anime.timeline({
        easing: 'linear',
        duration: 150,
    });

    aperture_anim
        .add({
            targets: '#tem-diagram-svg #df-detector-arm',
            translateX: "0vw"
        })
        .add({
            targets: '#tem-diagram-svg  .df-detector-bit',
            opacity: 1,
            complete: function (anim) {
                next_step();
            }
        });
}
// ======================= END ======================== //
// ======================= START ======================== //
const df_detector_out = () => {
    let aperture_anim = anime.timeline({
        easing: 'linear',
        duration: 150,
    });

    aperture_anim
        .add({
            targets: '#tem-diagram-svg  .df-detector-bit',
            opacity: 0
        })
        .add({
            targets: '#tem-diagram-svg #df-detector-arm',
            translateX: "-2vw",
            complete: function (anim) {
                next_step();
            }
        });
}
// ======================= END ======================== //
// ======================= START ======================== //
const bf_detector_fn = (x_val) => {
    anime({
        targets: '#tem-diagram-svg #bf-detector-arm',
        translateX: {
            value: x_val,
            duration: 150,
            easing: 'linear',
            complete: function (anim) {
                next_step();
            }
        }
    });
}
// ======================= END ======================== //
// ======================= START ======================== //

const bblock_fn = (rot_val) => {
    anime({
        targets: '#tem-diagram-svg #b-block-group',
        rotate: {
            value: rot_val,
            duration: 800,
            easing: 'linear'
        },
        complete: function (anim) {
            next_step();
        }
    });
}
// ======================= END ======================== //
// ======================= START ======================== //

const high_fn = () => {
    $("#top-instructions-txt").html("");
    $("#hr-modal-window").toggleClass("totally-hidden", false);
    deactivate_sqr_btn("#btn-acquire");
}
const toSTEM_fn = () => {
    $("#try-b a").html("Continue  to STEM mode where you will view the mineral sample.");
    $("#try-b a").attr("onclick", "TEM_step_55()");
    $("#hr-modal-window").toggleClass("totally-hidden", false);
    deactivate_sqr_btn("#btn-acquire");
    next_step();
}
// ======================= END ======================== //
// ======================= START ======================== //
var idata;
var noiseY = 0;
var tvCounter = 2;
var fRate = 5;
const noise_fn = () => {
    idata = ctx.createImageData(w_h, w_h);
    let buffer32 = new Uint32Array(idata.data.buffer);
    let len = buffer32.length;
    for (i = 0; i < len;) buffer32[i++] = ((255 * Math.random()) | 0) << 24;
    raster_it();
}
const raster_it = () => {
    let sheight = tvCounter - noiseY;
    if (sheight < 1) sheight = 1;
    rasterEffect = requestAnimationFrame(() => raster_it());
    if (tvCounter < ctx.canvas.height + fRate) {
        bufferCtx_TEM_01.drawImage(displayed_img, 0, 0, img_w_h, img_w_h, 0, 0, w_h, w_h);
        ctx.drawImage(bufferC_TEM_01, 0, noiseY, w_h, sheight, 0, noiseY, w_h, (tvCounter - noiseY));
        ctx.putImageData(idata, 0, 0, 0, tvCounter, w_h, 5);
        tvCounter += fRate;
    } else {
        if (adquireRaster_bool == true) {
            if (TEM_step_num == 66 || TEM_step_num == 69 || TEM_step_num == 72) {
                cancelAnimationFrame(rasterEffect);
                bool_rasterEffect = false;
                saveIMG();
                next_step();
            }
            adquireRaster_bool = false;
        }
        noiseY = 2;
        tvCounter = 2;
    }

}
// ======================= END ======================== //
// ======================= START ======================== //
const ronchigram_fun = (slider_pos) => {
    let ronchigram_img = sprites[10][slider_pos];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(ronchigram_img,
        0,
        0,
        ronchigram_img.width,
        ronchigram_img.height,
        0,
        0,
        w_h,
        w_h
    );
};
// ======================= END ======================== //
// ======================= START ======================== //
const restart_diffraction = () => {
    $("#eyepiece-circle").css("opacity", "1");
    $('#close-tem-diagram').click();
    //    deactivate_sqr_btn(".btn");
    //    deactivate_sqr_btn(".diagram-button");
    deactivate_spinner("#specimen-tilt", "");
    $("#hr-modal-window").toggleClass("totally-hidden", true);
    //    $(".current-control").toggleClass("current-control", false);
    //    $('#close-tem-diagram').click();
    //    target_ctx.clearRect(0, 0, w_h, w_h);
    //    $("#hair-cross").css("opacity", "0");
    $("#brightness").slider("value", "0");
    bright_val = 100;
    $("#btn-tem").toggleClass("btn-active", true);
    $("#btn-tem").attr("value", "on");
    $("#btn-tem").toggleClass("btn-disabled", false);
    $("#btn-imaging").toggleClass("btn-active", true);
    $("#btn-imaging").attr("value", "on");
    $("#btn-imaging").toggleClass("btn-disabled", false);
    $("#beams-imaging").css("opacity", "1");
    $("#beams-diffraction").css("opacity", "0");
    $('#aperture-dd>option:eq(2)').attr("disabled", false);
    $('#aperture-dd>option:eq(3)').attr("disabled", true);

    $('#aperture-dd').val('0');
    $("#aperture-dd").selectmenu("refresh");
    $("#aperture-dd-button .ui-selectmenu-text").html("OBJECTIVE");

    deactivate_dd("#aperture-dd");
    $("#sad-aperture-l").css("transform", "scaleX(0.7)");
    $("#sad-aperture-r").css("transform", "scaleX(0.7)");
    black_stroke_fn("sad-aperture-l");
    black_stroke_fn("sad-aperture-r");
    $("#btn-diag-sad-aperture").attr("value", "off");
    $("#btn-diag-sad-aperture").html("INSERT");
    $("#btn-diag-b-block").attr("value", "off");
    $("#btn-diag-b-block").html("INSERT");
    $("#beam-stop").css("opacity", "0");
    $("#b-block-group").css("transform", "rotate(80deg)");
    black_stroke_fn("b-block-oval");
    black_stroke_fn("b-block-handle");
    document.getElementById("b-block-oval").style.fill = "#000000";
    canvas.style.filter = "blur(0px) brightness(100%)";
    $("#btn-camera").html("INSERT");
    $("#column-lid").toggleClass("flip-in-lid", false);
    $("#camera-sqr").toggleClass("slide-out-camera", false);
    $("#column-lid").toggleClass("flip-out-lid", false);
    $("#camera-sqr").toggleClass("slide-in-camera", false);
    deactivate_sqr_btn("#btn-camera", "off", "#camera-label");

    deactivate_spinner("#ap-spinner");

    $('#magnification').val('0');
    $("#magnification").selectmenu("refresh");
    $("#magnification-button .ui-selectmenu-text").html("HIGH");

    sprite_num = 2;
    xpos = 256;
    ypos = 256;
    origin_axis = 240;
    radiusx = 256;
    radiusy = 256;
    displayed_img = sprites[sample_set][sprite_num];
    if (chosen_sample == 1) {
        source_x = 115;
        source_y = 45;
    } else {
        source_x = 125;
        source_y = 375;
    }
    source_w_h = 768;
    draw_tem();
    TEM_step_num = 35;
    next_step();
};
// ======================= END ======================== //
// ======================= START ======================== //
const restart_hr = () => {
    TEM_step_num = 46;
    $('#btn-diagram-tem').click();
    $("#eyepiece-circle").css("opacity", "0");
    $("#hr-modal-window").toggleClass("totally-hidden", true);
    $("#btn-tem").toggleClass("btn-active", true);
    $("#btn-tem").attr("value", "on");
    $("#btn-tem").toggleClass("btn-disabled", false);
    $("#btn-diffraction").toggleClass("btn-active", true);
    $("#btn-diffraction").attr("value", "on");
    $("#btn-diffraction").toggleClass("btn-disabled", false);
    $("#beams-imaging").css("opacity", "0");
    $("#beams-diffraction").css("opacity", "1");

    $('#aperture-dd').val('0');
    $("#aperture-dd").selectmenu("refresh");
    $("#aperture-dd-button .ui-selectmenu-text").html("SAD");

    $("#sad-aperture-l").css("transform", "scaleX(1)");
    $("#sad-aperture-r").css("transform", "scaleX(1)");
    black_stroke_fn("sad-aperture-l");
    black_stroke_fn("sad-aperture-r");
    $("#btn-diag-sad-aperture").attr("value", "on");
    $("#btn-diag-sad-aperture").html("REMOVE");

    $("#btn-diag-b-block").attr("value", "on");
    $("#btn-diag-b-block").html("REMOVE");
    $("#beam-stop").css("opacity", "1");
    $("#b-block-group").css("transform", "rotate(0deg)");
    displayed_msk = sprites[9][1];
    black_stroke_fn("b-block-oval");
    black_stroke_fn("b-block-handle");
    document.getElementById("b-block-oval").style.fill = "#000000";
    $("#focus").slider("value", 45);
    canvas.style.filter = "blur(0px) brightness(100%)";
    $("#btn-camera").html("RETRACT");
    activate_sqr_btn("#btn-camera");
    $("#column-lid").toggleClass("flip-in-lid", false);
    $("#camera-sqr").toggleClass("slide-out-camera", false);
    $("#column-lid").toggleClass("flip-out-lid", true);
    $("#camera-sqr").toggleClass("slide-in-camera", true);
    $("#btn-camera").toggleClass("current-control", true);
    $('#magnification').val('0');
    $("#magnification").selectmenu("refresh");
    $("#magnification-button .ui-selectmenu-text").html("");
    fft_video.pause();
    fft_video.currentTime = 0;
    clearInterval(canvasInterval);
    $("#btn-fft").html("ON");
    blur_style = 2;
    sprite_num = 2;
    xpos = 256;
    ypos = 256;
    origin_axis = 0;
    radiusx = 256;
    radiusy = 256;
    sprite_bw = 7;
    displayed_img = sprites[sample_set][sprite_bw];
    source_x = 0;
    source_y = 0;
    source_w_h = 1248;
    draw_tem();
    ctx.drawImage(displayed_msk, 0, 0, displayed_msk.width, displayed_msk.height, 0, 0, w_h, w_h);
    next_step();
};
// ======================= END ======================== //
// ======================= START ======================== //
const restart_stem = () => {
    if (bool_imgSeqAnimation) stop_imgSeqAnimation(0);
    bool_imgSeqAnimation = false
    if (bool_rasterEffect) cancelAnimationFrame(rasterEffect);
    bool_rasterEffect = false;
    $("#eyepiece-circle").css("opacity", "0");
    $('#btn-diagram-tem').click();
    deactivate_spinner("#lens-aligment");
    deactivate_spinner("#ap-spinner");
    $("#hr-modal-window").toggleClass("totally-hidden", true);
    $("#brightness").slider("value", "0");
    bright_val = 100;
    $("#btn-tem").toggleClass("btn-active", true);
    $("#btn-tem").attr("value", "on");
    $("#btn-tem").toggleClass("btn-disabled", false);
    $("#btn-stem").toggleClass("btn-disabled", true);
    $("#btn-imaging").toggleClass("btn-active", true);
    $("#btn-imaging").attr("value", "on");
    $("#btn-imaging").toggleClass("btn-disabled", false);

    $("#beam-axis").css("opacity", "1");
    $("#beams-imaging").css("opacity", "1");
    $("#beams-diffraction").css("opacity", "0");
    $("#beams-bf").css("opacity", "0");
    $("#beams-df").css("opacity", "0");

    $('#aperture-dd').val('0');
    $("#aperture-dd").selectmenu("refresh");
    $("#aperture-dd-button .ui-selectmenu-text").html("SAD");
    deactivate_dd("#aperture-dd");

    $("#c-aperture-l").css("transform", "scaleX(1)");
    $("#c-aperture-r").css("transform", "scaleX(1)");
    colored_stroke_fn("c-aperture-l");
    colored_stroke_fn("c-aperture-r");
    $("#btn-diag-c-aperture").attr("value", "on");
    $("#btn-diag-c-aperture").html("REMOVE");
    activate_sqr_btn("#btn-diag-c-aperture");


    $("#btn-diag-bf-stem").attr("value", "off");
    $("#btn-diag-bf-stem").html("INSERT");
    $("#bf-detector-arm").css("transform", "translateX(-2vw)");


    $("#btn-diag-df-stem").attr("value", "off");
    $("#btn-diag-df-stem").html("INSERT");
    $("#df-detector-arm").css("transform", "translateX(-2vw)");
    $(".df-detector-bit").css("opacity", "0");

    canvas.style.filter = "blur(0px) brightness(100%)";
    $("#btn-camera").html("INSERT");
    $("#column-lid").toggleClass("flip-in-lid", false);
    $("#camera-sqr").toggleClass("slide-out-camera", false);
    $("#column-lid").toggleClass("flip-out-lid", false);
    $("#camera-sqr").toggleClass("slide-in-camera", false);
    deactivate_sqr_btn("#btn-camera", "off", "#camera-label");

    $('#lens').val('0');
    $("#lens").selectmenu("refresh");
    $('#stem-imaging>option:eq(2)').attr("disabled", false);
    $('#stem-imaging>option:eq(1)').attr("disabled", true);
    $('#stem-imaging').val('0');
    $("#stem-imaging").selectmenu("refresh");
    $('#stem').val('0');
    $("#stem").selectmenu("refresh");
    $('#magnification').val('0');
    $("#magnification").selectmenu("refresh");
    $("#magnification-button .ui-selectmenu-text").html("");
    deactivate_slider("#focus");
    $("#focus").slider("option", "max", 199);
    $("#focus").slider("value", 55);
    deactivate_dd("#lens");
    deactivate_dd("#stem-imaging");
    deactivate_dd("#stem");
    adquireRaster_bool = false;
    tvCounter = 2;
    noiseY = 0;
    fRate = 5;
    blur_style = 0;
    sprite_num = 8;
    xpos = 256;
    ypos = 256;
    origin_axis = 0;
    radiusx = 256;
    radiusy = 256;
    displayed_img = sprites[sample_set][sprite_num + 1];
    source_x = 0;
    source_y = 0;
    source_w_h = 1248;
    ctx.drawImage(displayed_img, source_x, source_y, source_w_h, source_w_h, 0, 0, w_h, w_h);
    TEM_step_num = 55;
    next_step();
};
// ======================= END ======================== //
// ======================= START ======================== //
const restartAcivity = () => {
    deactivate_sqr_btn(".btn");
    deactivate_sqr_btn(".diagram-button");
    $(".current-control").toggleClass("current-control", false);
    target_ctx.clearRect(0, 0, w_h, w_h);
    $("#hair-cross").css("opacity", "0");
    txt_top_instructions.style.fontSize = "16px"
    switch (activity_num) {
        case 1:
            window.location.href = window.location.href;
            break;
        case 2:
            restart_diffraction();
            break;
        case 3:
            restart_hr();
            break;
        case 4:
            restart_stem();
            break;
    }
};
// ======================= END ======================== //
// ======================= START ======================== //
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
    $("#btn-diagram-tem").toggleClass("current-control", false);
});

// ======================= BENCHMARK: 分步测试跳转到指定步骤（跳过前面步骤） ==================== //
// stepIndex: 0=已完成 S1，当前为 S2；... 6=已完成 S7，当前为 S8；7=已完成 S8，当前为 S9；8=已完成 S9，当前为 S10
window.TEM_JUMP_TO_STATE = function (stepIndex) {
    if (typeof stepIndex !== "number" || stepIndex < 0 || stepIndex > 8) return;
    var $ = window.jQuery;
    if (!$) return;
    if (stepIndex >= 0) {
        var selVal = "2";
        $("#sample").val(selVal);
        if ($("#sample").length && typeof $("#sample").selectmenu === "function") $("#sample").selectmenu("refresh");
        if (typeof chosen_sample !== "undefined") chosen_sample = 2;
        if (typeof sample_set !== "undefined") sample_set = 2;
        if (typeof sprites !== "undefined" && sprites[12] && sprites[12][chosen_sample - 1]) {
            green_mesh = sprites[12][chosen_sample - 1];
            displayed_img = green_mesh;
            if (typeof low_volt_fn === "function" && typeof hi_volt_fn === "function") {
                (chosen_sample === 2) ? low_volt_fn() : hi_volt_fn();
            }
            if ($("#acc-volt").length && typeof $("#acc-volt").selectmenu === "function") $("#acc-volt").selectmenu("refresh");
        }
        if (stepIndex > 0) $("#tem-diagram-modal").addClass("totally-hidden");
    }
    if (stepIndex >= 1 && document.querySelector("#btn-diag-specimen")) {
        document.querySelector("#btn-diag-specimen").innerHTML = "INSERT";
        document.querySelector("#btn-diag-specimen").value = "off";
    }
    if (stepIndex >= 2 && document.querySelector("#btn-airlock")) {
        document.querySelector("#btn-airlock").disabled = true;
        document.querySelector("#btn-airlock").innerHTML = "EVACUATE";
    }
    if (stepIndex >= 3 && document.querySelector("#btn-specimen")) {
        document.querySelector("#btn-specimen").innerHTML = "IN";
        document.querySelector("#btn-specimen").setAttribute("value", "on");
    }
    if (stepIndex >= 4) {
        $("#acc-volt").val("a");
        if (typeof $("#acc-volt").selectmenu === "function") $("#acc-volt").selectmenu("refresh");
    }
    if (stepIndex >= 5 && document.querySelector("#btn-filament")) {
        document.querySelector("#btn-filament").setAttribute("value", "on");
        $("#btn-filament")
            .prop("disabled", false)
            .removeClass("btn-disabled")
            .addClass("btn-active");
        $("#filament-label").removeClass("label-disabled");
        if (typeof $("#fil-current").slider === "function") {
            $("#fil-current").slider("enable");
            $("#fil-current").slider("value", 60);
        }
        $("#beam-axis").css("opacity", "0.7");
        $("#beams-imaging").css("opacity", "0.7");
    }
    if (stepIndex >= 4) {
        $("#magnification").val("b");
        if (typeof $("#magnification").selectmenu === "function") {
            $("#magnification").selectmenu("refresh");
        }
        $("#magnification").trigger("change");
        if (typeof sprites !== "undefined" && typeof sample_set !== "undefined" && sprites[sample_set] && sprites[sample_set][1]) {
            displayed_img = sprites[sample_set][1];
            if (typeof origin_axis !== "undefined") origin_axis = 240;
            if (typeof source_x !== "undefined") source_x = 240;
            if (typeof source_y !== "undefined") source_y = 240;
            if (typeof radiusx !== "undefined") radiusx = 256;
            if (typeof radiusy !== "undefined") radiusy = 256;
            if (typeof sprite_num !== "undefined") sprite_num = 1;
            $("#main-canvas").css("background-color", "black");
            if (typeof canvas !== "undefined" && canvas.style) {
                canvas.style.filter = "blur(6px) brightness(" + (typeof brightness_style !== "undefined" ? brightness_style : 100) + "%)";
            }
            if (typeof draw_tem === "function") draw_tem();
        }
    }
    if (stepIndex >= 7) {
        if (typeof activate_spinner === "function") activate_spinner("#specimen-position", "");
        $("#specimen-position .title-z").toggleClass("label-disabled", false);
        $("#spinn-val-x").html("1 µm");
        if (typeof tem_stage_x !== "undefined") tem_stage_x = 1;
    }
    if (stepIndex >= 8) {
        if (typeof activate_slider === "function") activate_slider("#focus");
        try { $("#focus").slider("value", 50); } catch (e) {}
        if (typeof blur_style !== "undefined") blur_style = 0.5;
    }
    if (stepIndex >= 9 && document.querySelector("#save-modal-window")) {
        document.querySelector("#save-modal-window").classList.remove("totally-hidden");
    }
    if (stepIndex === 0) {
        window.TEM_step_num = 3;
        var fn3 = window["TEM_step_3"];
        if (typeof fn3 === "function") fn3();
        window.TEM_step_num = 3;
        return;
    }
    window.TEM_step_num = 2;
    var i, fn;
    for (i = 0; i <= stepIndex && i < 5; i++) {
        if (typeof window.next_step === "function") window.next_step();
    }
    if (stepIndex >= 5) {
        if (typeof window.next_step === "function") { window.next_step(); window.next_step(); }
    }
    if (stepIndex === 5) {
        window.TEM_step_num = 25;
    }
    if (stepIndex === 6) {
        fn = window["TEM_step_25"];
        if (typeof fn === "function") fn();
        window.TEM_step_num = 30;
    }
    if (stepIndex === 7) {
        fn = window["TEM_step_29"];
        if (typeof fn === "function") fn();
        if (typeof activate_slider === "function") activate_slider("#focus");
        window.TEM_step_num = 30;
    }
    if (stepIndex === 8) {
        fn = window["TEM_step_31"];
        if (typeof fn === "function") fn();
        window.TEM_step_num = 31;
    }
};

// =======================  END END  ==================== //
// ======================= START ======================== //


$("#btn-restart").click(function (e) {
    e.preventDefault();
    restartAcivity();
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
// ======================= BENCHMARK：打开 TEM 中所有主要控件，允许任意顺序点击 ======================== //
$(function () {
    try {
        $(".btn, .diagram-button, .spinn-btn").prop("disabled", false).removeClass("btn-disabled");
        $("select").each(function () {
            try {
                $(this).prop("disabled", false);
                if (typeof $(this).selectmenu === "function") {
                    $(this).selectmenu("enable");
                }
            } catch (e) {}
        });
        ["#brightness", "#fil-current", "#focus"].forEach(function (sel) {
            try {
                if (typeof $(sel).slider === "function") {
                    $(sel).slider("enable");
                }
            } catch (e) {}
        });
        $("#specimen-position-div, #specimen-tilt-div, #ap-spinner-div, #lens-aligment-div").removeClass("div-disabled");
    } catch (e) {}
});
// ======================= END ======================== //

function saveIMG() {
    var resizedCanvas = document.createElement("canvas");
    var resizedContext = resizedCanvas.getContext("2d");
    resizedCanvas.height = "1248";
    resizedCanvas.width = "1248";
    resizedContext.drawImage(canvas, 0, 0, 1248, 1248);

    /// create an "off-screen" anchor tag
    var lnk = document.createElement('a'),
        e;
    /// the key here is to set the download attribute of the a tag
    lnk.download = 'Image from the TEM simulator.jpg';
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

$(document).on("keypress", function (e) {
    //    if (e.originalEvent.key == "p") {
    //        xpos = 251;
    //        ypos = 251;
    //    }
    //    if (e.originalEvent.key == "l") {
    //        xval = 629;
    //        yval = 629;
    //        blue_fun();
    //    }
});
