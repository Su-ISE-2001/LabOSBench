var TEM_step_num = 2;

function next_step() {
    let callback = 'TEM_step_' + TEM_step_num;
    window[callback]()
}

//function TEM_step_1 () {
//display_instruction();
//TEM_step_num = 2;
//next
//}

function TEM_step_2() {
    display_instruction();
    activate_sqr_btn("#btn-restart");
    $("#btn-restart").toggleClass("current-control", false);
    activate_dd("#sample");
    TEM_step_num = 3;
    //next
}

function TEM_step_3() {
    display_instruction();
    activate_sqr_btn("#btn-diag-specimen");
    TEM_step_num = 4;
    //next
}

function TEM_step_4() {
    display_instruction();
    deactivate_sqr_btn("#btn-airlock", "off", "#airlock-label");
    TEM_step_num = 5;
    //next
}

function TEM_step_5() {
    txt_top_instructions.style.fontSize = "14px";
    display_instruction();
    deactivate_sqr_btn("#btn-specimen", "off", "#specimen-label");
    activate_dd("#acc-volt");
    TEM_step_num = 6;
    //next
}

function TEM_step_6() {
    txt_top_instructions.style.fontSize = "16px";
    display_instruction();
    activate_sqr_btn("#btn-filament", "#filament-label");
    TEM_step_num = 7;
    //next
}

function TEM_step_7() {
    display_instruction();
    $("#btn-filament").toggleClass("current-control", false);
    $("#main-canvas").css("background-color", "black");
    $("#hair-cross").css("opacity", "1");
    activate_spinner("#beam-shift");
    draw_tem();
    TEM_step_num = 8;
    //next
}

function TEM_step_8() {
    display_instruction();
    stopSpinning();
    $("#hair-cross").css("opacity", "0");
    activate_slider("#brightness");
    deactivate_spinner("#beam-shift");
    TEM_step_num = 9;
    //next
}

function TEM_step_9() {
    display_instruction();
    deactivate_slider("#brightness");
    activate_dd("#aperture-dd");
    colored_stroke_fn("c-aperture-l");
    colored_stroke_fn("c-aperture-r");
    TEM_step_num = 10;
    //next
}

function TEM_step_10() {
    display_instruction();
    activate_dd("#apt-size");
    black_stroke_fn("c-aperture-l");
    black_stroke_fn("c-aperture-r");
    TEM_step_num = 11;
    //next
}

function TEM_step_11() {
    display_instruction();
    $("#apt-size-button").toggleClass("current-control", false);
    $("#hair-cross").css("opacity", "1");
    activate_spinner("#ap-spinner");
    TEM_step_num = 14; //skip two steps in grey
    //next
}

function TEM_step_12() {
    display_instruction();
    TEM_step_num = 13;
    //next
}

function TEM_step_13() {
    display_instruction();
    TEM_step_num = 14;
    //next
}

function TEM_step_14() {
    display_instruction();
    $("#hair-cross").css("opacity", "0");
    deactivate_spinner("#ap-spinner");
    activate_spinner("#stigmator");
    TEM_step_num = 15;
    //next
}

function TEM_step_15() {
    let brg_value = Math.round(scroll_equation(radiusx, w_h * 0.01, w_h / 2, 0, 100));
    $("#brightness").slider("value", 100 - brg_value);
    bright_val = brg_value;
    deactivate_spinner("#stigmator");
    $('#aperture-dd>option:eq(0)').attr("disabled", false);
    $('#aperture-dd>option:eq(1)').attr("disabled", true);
    $("#aperture-dd").selectmenu("refresh");
    TEM_step_num = 16;
    next_step();
    //next
}

function TEM_step_16() {
    txt_top_instructions.style.fontSize = "12px"
    display_instruction();
    activate_slider("#brightness");
    (chosen_sample == 2) ? TEM_step_num = 17: TEM_step_num = 21;
    //next
}

function TEM_step_17() {
    txt_top_instructions.style.fontSize = "16px"
    display_instruction();
    $("#btn-wobbler").toggleClass("current-control", false);
    //    cancelAnimationFrame(wobblerEffect);
    if (chosen_sample !== 2) {
        $("button[id|='spinner-3-z']").prop("disabled", true);
        $("button[id|='spinner-3-z']").toggleClass("btn-disabled", true);
        $("#specimen-position .title-z").toggleClass("label-disabled", true);
    }
    deactivate_slider("#brightness");
    activate_sqr_btn("#btn-diffraction");
    TEM_step_num = 18;
    //next
}

function TEM_step_18() {
    display_instruction();
    deactivate_sqr_btn("#btn-imaging");
    $('#aperture-dd>option:eq(0)').attr("disabled", true);
    $('#aperture-dd>option:eq(2)').attr("disabled", false);
    $("#aperture-dd").selectmenu("refresh");
    activate_dd("#aperture-dd");
    TEM_step_num = 19;
    //next
}

function TEM_step_19() {
    display_instruction();
    draw_tem();
    $("#hair-cross").css("opacity", "1");
    activate_spinner("#ap-spinner");
    black_stroke_fn("o-aperture-l");
    black_stroke_fn("o-aperture-r");
    TEM_step_num = 20;
    //next
}

function TEM_step_20() {
    display_instruction();
    $("#hair-cross").css("opacity", "0");
    deactivate_spinner("#ap-spinner");
    activate_sqr_btn("#btn-imaging");
    (chosen_sample == 2) ? TEM_step_num = 21: TEM_step_num = 25;
    //next
}

function TEM_step_21() {
    display_instruction();
    txt_top_instructions.style.fontSize = "16px"
    if (chosen_sample !== 2) deactivate_slider("#brightness");
    deactivate_sqr_btn("#btn-diffraction");
    activate_dd("#magnification");
    TEM_step_num = 22;
    //next
}

function TEM_step_22() {
    display_instruction();
    deactivate_dd("#magnification");
    activate_sqr_btn("#btn-wobbler");
    TEM_step_num = 23;
    //next
}

function TEM_step_23() {
    display_instruction();
    $("#btn-wobbler").prop('disabled', true);
    $("#btn-wobbler").css("cursor", "not-allowed");
    $("#btn-wobbler").toggleClass("current-control", false);
    activate_spinner("#specimen-position", "");
    $("button[id|='spinner-3-z']").toggleClass("btn-disabled", false);
    $("button[id|='spinner-1']").prop("disabled", true);
    $("button[id|='spinner-1']").toggleClass("btn-disabled", true);
    TEM_step_num = 24;
    //next
}

function TEM_step_24() {
    display_instruction();
    $("#specimen-position-div").toggleClass("current-control", false);
    $("#specimen-position").toggleClass("current-control", false);
    activate_sqr_btn("#btn-wobbler");
    (chosen_sample == 2) ? TEM_step_num = 25: TEM_step_num = 17;
    //next
}

function TEM_step_25() {
    display_instruction();
    //    cancelAnimationFrame(wobblerEffect);
    $("#btn-wobbler").toggleClass("current-control", false);
    $("#specimen-position").toggleClass("current-control", true);
    $("button[id|='spinner-3-z']").prop("disabled", true);
    $("button[id|='spinner-3-z']").toggleClass("btn-disabled", true);
    $("button[id|='spinner-1']").prop("disabled", false);
    $("button[id|='spinner-1']").toggleClass("btn-disabled", false);
    $("#specimen-position .spinn-axis-title").toggleClass("label-disabled", false);
    $("#specimen-position .title-z").toggleClass("label-disabled", true);
    $("#hair-cross").css("opacity", "1");
    switch (sample_set) {
        case 1:
            xval = 429;
            yval = 439;
            break;
        case 2:
            xval = 579;
            yval = 759;
            break;
        case 3:
            xval = 499;
            yval = 529;
            break;
        case 4:
            xval = 629;
            yval = 589;
            break;
    }
    blue_fun();
    TEM_step_num = 26;
    //next
}

function TEM_step_26() {
    display_instruction();
    $("button[id|='spinner-3-z']").toggleClass("btn-disabled", false);
    deactivate_spinner("#specimen-position", "");
    $('#magnification>option:eq(2)').attr("disabled", false);
    $('#magnification>option:eq(1)').attr("disabled", true);
    $("#magnification").selectmenu("refresh");
    activate_dd("#magnification");
    $("#hair-cross").css("opacity", "0");
    TEM_step_num = 27;
    //next
}

function TEM_step_27() {
    display_instruction();
    deactivate_dd("#magnification");
    activate_spinner("#specimen-position", "");
    $("button[id|='spinner-3-z']").prop("disabled", true);
    $("button[id|='spinner-3-z']").toggleClass("btn-disabled", true);
    $("#specimen-position .spinn-axis-title").toggleClass("label-disabled", false);
    $("#specimen-position .title-z").toggleClass("label-disabled", true);
    $("#hair-cross").css("opacity", "1");
    switch (sample_set) {
        case 1:
            xval = 479;
            yval = 679;
            break;
        case 2:
            xval = 589;
            yval = 629;
            break;
        case 3:
            xval = 479;
            yval = 569;
            break;
        case 4:
            xval = 859;
            yval = 809;
            break;
    }
    blue_fun();
    TEM_step_num = 28;
    //next
}

function TEM_step_28() {
    display_instruction();
    $("button[id|='spinner-3-z']").toggleClass("btn-disabled", false);
    deactivate_spinner("#specimen-position", "");
    $('#magnification>option:eq(3)').attr("disabled", false);
    $('#magnification>option:eq(2)').attr("disabled", true);
    $("#magnification").selectmenu("refresh");
    activate_dd("#magnification");
    $("#hair-cross").css("opacity", "0");
    TEM_step_num = 29;
    //next
}

function TEM_step_29() {
    if (sample_set == 1 || sample_set == 3) {
        instruction_step_29 += ", as indicated here by the blue circle.";
    } else {
        instruction_step_29 += ".";
    }
    display_instruction();
    deactivate_dd("#magnification");
    activate_spinner("#specimen-position", "");
    $("button[id|='spinner-3-z']").prop("disabled", true);
    $("button[id|='spinner-3-z']").toggleClass("btn-disabled", true);
    $("#specimen-position .spinn-axis-title").toggleClass("label-disabled", false);
    $("#specimen-position .title-z").toggleClass("label-disabled", true);
    $("#hair-cross").css("opacity", "1");
    switch (sample_set) {
        case 1:
            xval = 499;
            yval = 429;
            blue_fun();
            break;
        case 2:
            xval = 639;
            yval = 599;
            break;
        case 3:
            xval = 609;
            yval = 699;
            blue_fun();
            break;
        case 4:
            xval = 639;
            yval = 599;
            break;
    }
    TEM_step_num = 30;
    //next
}

function TEM_step_30() {
    display_instruction();
    $("#hair-cross").css("opacity", "0");
    deactivate_dd("#magnification");
    $("#specimen-position").toggleClass("current-control", false);
    if (sample_set == 1 || sample_set == 3) deactivate_spinner("#specimen-position", "");
    activate_slider("#focus");
    TEM_step_num = 31;
    //next
}

function TEM_step_31() {
    display_instruction();
    $("button[id|='spinner-3-z']").toggleClass("btn-disabled", false);
    deactivate_spinner("#specimen-position");
    $("#specimen-position .title-z").toggleClass("label-disabled", false);
    deactivate_slider("#focus");
    activate_sqr_btn("#btn-camera", "#camera-label");
    TEM_step_num = 32;
    //next
}

function TEM_step_32() {
    display_instruction();
    activate_sqr_btn("#btn-acquire");
    TEM_step_num = 33;
    //next
}

function TEM_step_33() {
    display_instruction();
    deactivate_sqr_btn("#btn-restart");
    $("#btn-acquire").toggleClass("current-control", false);
    (chosen_sample == 2) ? $("#retake-b").css("opacity", "0"): $("#retake-b").css("opacity", "1");
    (chosen_sample == 2) ? $("#ready-txt").html("When ready,"): $("#ready-txt").html("When ready, you can choose to either:");
    $("#save-modal-window").toggleClass("totally-hidden", false);
    $('#magnification>option:eq(1)').attr("disabled", false);
    $('#magnification>option:eq(2)').attr("disabled", false);
    $('#magnification>option:eq(3)').attr("disabled", false);
    $("#magnification").selectmenu("refresh");
    $("#focus").slider("value", 45);
    TEM_step_num = 34;
    //next
}

function TEM_step_34() {
    display_instruction();
    $("#column-lid").toggleClass("flip-in-lid", true);
    $("#camera-sqr").toggleClass("slide-out-camera", true);
    $("#column-lid").toggleClass("flip-out-lid", false);
    $("#camera-sqr").toggleClass("slide-in-camera", false);
    $("#eyepiece-circle").css("opacity", "1");
    $("#save-modal-window").toggleClass("totally-hidden", true);
    deactivate_dd("#magnification");
    deactivate_sqr_btn("#btn-acquire");
    if (sprite_num > 2) sprite_num -= 3;
    displayed_img = sprites[sample_set][sprite_num];
    draw_tem();
    $("#btn-camera").html("INSERT");
    TEM_step_num = 35;
    next_step();
    //next
}

function TEM_step_35() {
    display_instruction();
    activity_num = 2;
    activate_slider("#brightness");
    TEM_step_num = 36;
    //next
}

function TEM_step_36() {
    display_instruction();
    activate_sqr_btn("#btn-restart");
    $("#btn-restart").toggleClass("current-control", false);
    deactivate_slider("#brightness");
    activate_sqr_btn("#btn-diffraction");
    TEM_step_num = 37;
    //next
}

function TEM_step_37() {
    display_instruction();
    dffctn_msk_fun();
    $("#hair-cross").css("opacity", "1");
    activate_spinner("#specimen-tilt", "");
    TEM_step_num = 38;
    //next
}

function TEM_step_38() {
    display_instruction();
    dffctn_msk_fun();
    activate_sqr_btn("#btn-imaging");
    deactivate_spinner("#specimen-tilt", "");
    TEM_step_num = 39;
    //next
}

function TEM_step_39() {
    txt_top_instructions.style.fontSize = "14px"
    display_instruction();
    $("#eyepiece-circle").css("opacity", "1");
    $("#hair-cross").css("opacity", "0");
    canvas.style.filter = `blur(0px) brightness(200%)`;
    draw_tem();
    activate_slider("#brightness");
    TEM_step_num = 40;
    //next
}

function TEM_step_40() {
    txt_top_instructions.style.fontSize = "16px"
    display_instruction();
    deactivate_slider("#brightness");
    $("#btn-diagram-tem").trigger("click");
    $('#aperture-dd>option:eq(0)').attr("disabled", true);
    $('#aperture-dd>option:eq(1)').attr("disabled", true);
    $('#aperture-dd>option:eq(2)').attr("disabled", true);
    $('#aperture-dd>option:eq(3)').attr("disabled", false);
    $("#aperture-dd").selectmenu("refresh");
    colored_stroke_fn("sad-aperture-l");
    colored_stroke_fn("sad-aperture-r");
    activate_dd("#aperture-dd");
    TEM_step_num = 41;
}

function TEM_step_41() {
    display_instruction();
    activate_spinner("#ap-spinner");
    black_stroke_fn("sad-aperture-l");
    black_stroke_fn("sad-aperture-r");
    TEM_step_num = 42;
    //next
}

function TEM_step_42() {
    display_instruction();
    deactivate_spinner("#ap-spinner");
    deactivate_dd("#aperture-dd");
    activate_sqr_btn("#btn-diffraction");
    draw_tem();
    TEM_step_num = 43;
    //next
}

function TEM_step_43() {
    display_instruction();
    $('#magnification option').removeAttr("selected");
    $('#magnification option').attr("disabled", true);
    $('#magnification>option:eq(0)').attr("selected", "selected");
    $("#magnification").selectmenu("refresh");
    colored_stroke_fn("b-block-oval");
    colored_stroke_fn("b-block-handle");
    document.getElementById("b-block-oval").style.fill = "#2196f3";
    //    deactivate_sqr_btn("#btn-diffraction");
    $("#btn-diagram-tem").trigger("click");
    activate_sqr_btn("#btn-diag-b-block");
    TEM_step_num = 44;
    //next
}

function TEM_step_44() {
    display_instruction();
    $("#beam-stop").css("opacity", "1");
    ctx.drawImage(displayed_msk, 0, 0, displayed_msk.width, displayed_msk.height, 0, 0, w_h, w_h);
    black_stroke_fn("b-block-oval");
    black_stroke_fn("b-block-handle");
    document.getElementById("b-block-oval").style.fill = "#000000";
    activate_sqr_btn("#btn-camera", "#camera-label");
    TEM_step_num = 45;
    //next
}

function TEM_step_45() {
    display_instruction();
    ctx.drawImage(displayed_msk, 0, 0, displayed_msk.width, displayed_msk.height, 0, 0, w_h, w_h);
    activate_sqr_btn("#btn-acquire");
    TEM_step_num = 46;
    //next
}

function TEM_step_46() {
    display_instruction();
    activity_num = 3;
    deactivate_sqr_btn("#btn-restart");
    $("#btn-camera").prop('value', "on");
    activate_sqr_btn("#btn-camera", "#camera-label");
    $("#hr-modal-window").toggleClass("totally-hidden", true);
    TEM_step_num = 47;
    //next
}

function TEM_step_47() {
    display_instruction();
    activate_sqr_btn("#btn-restart");
    $("#btn-restart").toggleClass("current-control", false);
    activate_sqr_btn("#btn-imaging");
    sprite_num = 2;
    TEM_step_num = 48;
    //next
}

function TEM_step_48() {
    display_instruction();
    radiusx = w_h / 4;
    radiusy = w_h / 4;
    draw_tem();
    ctx.drawImage(displayed_msk, 0, 0, displayed_msk.width, displayed_msk.height, 0, 0, w_h, w_h);
    colored_stroke_fn("sad-aperture-l");
    colored_stroke_fn("sad-aperture-r");
    $("#btn-diagram-tem").trigger("click");
    $("#btn-diag-sad-aperture").prop('value', "on");
    activate_sqr_btn("#btn-diag-sad-aperture");
    TEM_step_num = 49;
    //next
}

function TEM_step_49() {
    display_instruction();
    radiusx = w_h / 2;
    radiusy = w_h / 2;
    draw_tem();
    ctx.drawImage(displayed_msk, 0, 0, displayed_msk.width, displayed_msk.height, 0, 0, w_h, w_h);
    black_stroke_fn("sad-aperture-l");
    black_stroke_fn("sad-aperture-r");
    colored_stroke_fn("b-block-oval");
    colored_stroke_fn("b-block-handle");
    document.getElementById("b-block-oval").style.fill = "#2196f3";
    $("#btn-diagram-tem").trigger("click");
    $("#btn-diag-b-block").prop('value', "on");
    activate_sqr_btn("#btn-diag-b-block");
    TEM_step_num = 50;
    //next
}

function TEM_step_50() {
    display_instruction();
    black_stroke_fn("b-block-oval");
    black_stroke_fn("b-block-handle");
    document.getElementById("b-block-oval").style.fill = "#000000";
    $("#magnification option").attr("disabled", true);
    $('#magnification>option:eq(4)').attr("disabled", false);
    $("#magnification").selectmenu("refresh");
    activate_dd("#magnification");
    TEM_step_num = 51;
    //next
}

function TEM_step_51() {
    display_instruction();
    deactivate_dd("#magnification");
    activate_slider("#focus");
    TEM_step_num = 52;
    //next
}

function TEM_step_52() {
    display_instruction();
    deactivate_slider("#focus");
    $("#focus").slider("value", 45);
    activate_sqr_btn("#btn-fft", "#fft-label");
    TEM_step_num = 520;
    //next
}

function TEM_step_520() {
    display_instruction();
    $("#focus").slider("value", 45);
    activate_sqr_btn("#btn-fft", "#fft-label");
    TEM_step_num = 521;
    //next
}

function TEM_step_521() {
    display_instruction();
    blur_style = 2;
    canvas.style.filter = `blur(2px) brightness(100%)`;
    displayed_img = sprites[sample_set][sprite_num + 1];
    ctx.drawImage(displayed_img, source_x, source_y, source_w_h, source_w_h, 0, 0, w_h, w_h);
    deactivate_sqr_btn("#btn-fft");
    $("#fft-label").toggleClass("label-disabled", true);
    activate_slider("#focus");
    TEM_step_num = 53;
    //next
}

function TEM_step_53() {
    display_instruction();
    deactivate_slider("#focus");
    activate_sqr_btn("#btn-acquire");
    TEM_step_num = 54;
    //next
}

function TEM_step_54() {
    display_instruction();
    $('#magnification option').removeAttr("selected");
    $('#magnification option').attr("disabled", true);
    $("#magnification").val("0").selectmenu("refresh");
    $("#magnification").selectmenu("refresh");
    TEM_step_num = 55;
    //next
}

function TEM_step_55() {
    display_instruction();
    activity_num = 4;
    deactivate_sqr_btn("#btn-restart");
    $("#column-lid").toggleClass("flip-in-lid", true);
    $("#camera-sqr").toggleClass("slide-out-camera", true);
    $("#column-lid").toggleClass("flip-out-lid", false);
    $("#camera-sqr").toggleClass("slide-in-camera", false);
    colored_stroke_fn("c-aperture-l");
    colored_stroke_fn("c-aperture-r");
    $("#hr-modal-window").toggleClass("totally-hidden", true);
    $("#btn-diag-c-aperture").prop('value', "on");
    activate_sqr_btn("#btn-diag-c-aperture");
    $("#btn-diagram-tem").trigger("click");
    TEM_step_num = 56;
    //next
}

function TEM_step_56() {
    display_instruction();
    activate_sqr_btn("#btn-restart");
    $("#btn-restart").toggleClass("current-control", false);
    black_stroke_fn("c-aperture-l");
    black_stroke_fn("c-aperture-r");
    activate_sqr_btn("#btn-stem");
    TEM_step_num = 57;
    //next
}

function TEM_step_57() {
    display_instruction();
    $("#eyepiece-circle").css("opacity", "1");
    activate_slider("#focus");
    $("#focus").slider("option", "max", 199);
    $("#focus").slider("value", 55);
    $("#beams-imaging").css("opacity", "0");
    TEM_step_num = 58;
    //next
}

function TEM_step_58() {
    txt_top_instructions.style.fontSize = "12px"
    display_instruction();
    deactivate_slider("#focus");
    activate_dd("#lens");
    TEM_step_num = 59;
    //next
}

function TEM_step_59() {
    txt_top_instructions.style.fontSize = "16px"
    display_instruction();
    stop_imgSeqAnimation(0);
    bool_imgSeqAnimation = false;
    deactivate_dd("#lens");
    displayed_img = stigmator_align;
    radiusx = 256;
    radiusy = 256;
    source_x = 40;
    source_y = 15;
    source_w_h = 872;
    origin_axis = 80.5;
    draw_tem();
    $("#hair-cross").css("opacity", "1");
    activate_spinner("#lens-aligment");
    TEM_step_num = 60;
    //next
}

function TEM_step_60() {
    display_instruction();
    $("#hair-cross").css("opacity", "0");
    deactivate_spinner("#lens-aligment");
    radiusx = 91;
    radiusy = 91;
    xpos = 246;
    ypos = 271;
    activate_sqr_btn("#btn-diag-c-aperture");
    $("#btn-diagram-tem").trigger("click");
    TEM_step_num = 61;
    //next
}

function TEM_step_61() {
    display_instruction();
    draw_tem();
    activate_spinner("#ap-spinner");
    TEM_step_num = 62;
    //next
}

function TEM_step_62() {
    display_instruction();
    deactivate_spinner("#ap-spinner");
    activate_sqr_btn("#btn-diag-bf-stem");
    $("#btn-diagram-tem").trigger("click");
    TEM_step_num = 63;
    //next
}

function TEM_step_63() {
    display_instruction();
    activate_dd("#stem-imaging");
    TEM_step_num = 64;
    //next
}

function TEM_step_64() {
    display_instruction();
    $("#beams-bf").css("opacity", "1");
    deactivate_dd("#stem-imaging");
    activate_dd("#stem");
    TEM_step_num = 65;
    //next
}

function TEM_step_65() {
    display_instruction();
    deactivate_dd("#stem");
    activate_sqr_btn("#btn-acquire");
    TEM_step_num = 66;
    //next
}

function TEM_step_66() {
    display_instruction();
    deactivate_sqr_btn("#btn-acquire");
    activate_sqr_btn("#btn-diag-df-stem");
    $("#btn-diagram-tem").trigger("click");
    fRate = 4;
    TEM_step_num = 67;
    //next
}

function TEM_step_67() {
    display_instruction();
    $('#stem-imaging>option:eq(1)').attr("disabled", false);
    $('#stem-imaging>option:eq(2)').attr("disabled", true);
    $("#stem-imaging").selectmenu("refresh");
    activate_dd("#stem-imaging");
    TEM_step_num = 68;
    //next
}

function TEM_step_68() {
    display_instruction();
    $("#beams-bf").css("opacity", "0");
    $("#beams-df").css("opacity", "1");
    deactivate_dd("#stem-imaging");
    activate_sqr_btn("#btn-acquire");
    TEM_step_num = 69;
    //next
}

function TEM_step_69() {
    display_instruction();
    deactivate_sqr_btn("#btn-acquire");
    $("#magnification option").attr("disabled", true);
    $('#magnification>option:eq(4)').attr("disabled", false);
    $("#magnification").selectmenu("refresh");
    activate_dd("#magnification");
    fRate = 4;
    $("#focus").slider("option", "max", 100);
    $("#focus").slider("value", 55);
    TEM_step_num = 70;
    //next
}

function TEM_step_70() {
    display_instruction();
    deactivate_dd("#magnification");
    activate_slider("#focus");
    TEM_step_num = 71;
    //next
}

function TEM_step_71() {
    display_instruction();
    deactivate_slider("#focus");
    activate_sqr_btn("#btn-acquire");
    TEM_step_num = 72;
    //next
}

function TEM_step_72() {
    display_instruction();
    $("#try-b").toggleClass("totally-hidden", true);
    $("#hr-intro").html("Congratulations you have completed the TEM simulator.");
    $("#try-a a").html("Would you like to return to the begining of the simulator and try another specimen?");
    $("#try-b").css("opacity", "0");
    $("#hr-modal-window").toggleClass("totally-hidden", false);
    fRate = 4;
    TEM_step_num = 73;
    //next
}
