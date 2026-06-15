var LFM_step_num = 1;

function next_step() {
    let callback = 'LFM_step_' + LFM_step_num;
    window[callback]()
}

function LFM_step_1() {
    if (window.LFM_BENCHMARK_API && typeof window.LFM_BENCHMARK_API.markSubtaskSuccess === "function") {
        window.LFM_BENCHMARK_API.markSubtaskSuccess("L1");
    }
    display_instruction();
    LFM_step_num = 2;
}

function LFM_step_2() {
    if (window.LFM_BENCHMARK_API && typeof window.LFM_BENCHMARK_API.markSubtaskSuccess === "function") {
        window.LFM_BENCHMARK_API.markSubtaskSuccess("L2");
    }
    display_instruction();
    LFM_step_num = 3;
}

function LFM_step_3() {
    display_instruction();
    reset_all_bf();
    $("#bf").toggleClass("totally-hidden", false);
    $("#confocal").toggleClass("totally-hidden", true);
    lightPath.innerHTML = bf_lightpath;
    $("#dragsample").toggleClass("totally-hidden", true);
    $("#sample-frame").toggleClass("totally-hidden", true);
    activate_round_btn("#halogen-btn");
    LFM_step_num = 4;
    //next 
}

function LFM_step_4() {
    display_instruction();
    $("#halogen-btn").prop('disabled', true);
    $(".mid-element").toggleClass("totally-hidden", false);
    $(".light-path").toggleClass("totally-hidden", false);
    $("#diaphragm-penta").toggleClass("totally-hidden", false);
    activate_sqr_btn("#bf-back-btn");
    activate_sqr_btn("#10x-btn", "#bf-objectives-label");
    LFM_step_num = 5;
    //next 
}

function LFM_step_5() {
    display_instruction();
    activate_slider("#bf-focus1");
    LFM_step_num = 6;
    //next 
}

function LFM_step_6() {
    display_instruction();
    activate_slider("#bf-fdiaphragm");
    LFM_step_num = 7;
    //next 
}

function LFM_step_7() {
    display_instruction();
    activate_slider("#bf-cfocus");
    LFM_step_num = 8;
    //next 
}

function LFM_step_8() {
    display_instruction();
    //diapragm_pos_fn(-5, -5, 1.75); //DELETE JUST FOR TESTING
    deactivate_slider("#bf-fdiaphragm");
    activate_condenserPos();
    LFM_step_num = 9;
    //next 
}

function LFM_step_9() {
    display_instruction();
    uncentered_diaphg_x = diaphg_x;
    uncentered_diaphg_y = diaphg_y;
    activate_slider("#bf-fdiaphragm");
    LFM_step_num = 10;
    //next 
}

function LFM_step_10() {
    display_instruction();
    deactivate_slider("#bf-fdiaphragm");
    activate_sqr_btn("#eyepiece-btn", "#eyepiece-label");
    $("#eyepiece-btn").css("cursor", "pointer");
    LFM_step_num = 11;
    //next 
}

function LFM_step_11() {
    display_instruction();
    $("#eyepiece-btn").css("cursor", "not-allowed");
    diapragm_pos_fn(-5, -5, 3.99);
    activate_slider("#bf-caperture");
    LFM_step_num = 12;
    //next 
}

function LFM_step_12() {
    display_instruction();
    activate_sqr_btn("#eyepiece-btn", "#eyepiece-label");
    //    $("#eyepiece-btn").prop('value', "on");
    $("#eyepiece-btn").css("cursor", "pointer");
    LFM_step_num = 13;
    //next 
}

function LFM_step_13() {
    display_instruction();
    $("#imaging-btn").click();
    $('#bf-mid-img').removeAttr('src');
    activate_slider("#bf-moveslide");
    LFM_step_num = 14;
    //next 
}

function LFM_step_14() {
    display_instruction();
    activate_sqr_btn("#imgsoft-btn");
    LFM_step_num = 15;
    //next 
}

function LFM_step_15() {
    display_instruction();
    activate_sqr_btn("#white-btn");
    LFM_step_num = 16;
    //next 
}

function LFM_step_16() {
    display_instruction();
    activate_slider("#bf-moveslide");
    LFM_step_num = 17;
    //next 
}

function LFM_step_17() {
    display_instruction();
    set_microimgs_fun(1, 7, "#bf_set02_3");
    activate_slider("#exposure");
    $("#exposure-vals p").toggleClass("label-disabled", false);
    LFM_step_num = 18;
    //next 
}

function LFM_step_18() {
    display_instruction();
    deactivate_sqr_btn("#40x-btn");
    LFM_step_num = 19;
    //next 
}

function LFM_step_19() {
    display_instruction();
    activate_sqr_btn("#40x-btn");
    LUT_bool = false;
    LFM_step_num = 20;
    //next 
}

function LFM_step_20() {
    display_instruction();
    LFM_step_num = 21;
    //next 
}

function LFM_step_21() {
    display_instruction();
    activate_sqr_btn("#imgsoft-btn");
    LFM_step_num = 22;
    //next 
}

function LFM_step_22() {
    display_instruction();
    LFM_step_num = 23;
    //next 
}

function LFM_step_23() {
    display_instruction();
    LFM_step_num = 24;
    //next 
}

function LFM_step_24() {
    display_instruction();
    LUT_bool = false;
    LFM_step_num = 25;
    //next 
}

function LFM_step_25() {
    display_instruction();
    reset_all_bf();
    $("#diaphragm-penta").toggleClass("totally-hidden", true);
    $("#bf").toggleClass("totally-hidden", false);
    $("#confocal").toggleClass("totally-hidden", true);
    lightPath.innerHTML = fluorescence_lightpath;
    activate_round_btn("#mercury-btn");
    LFM_step_num = 26;
    //next 
}

function LFM_step_26() {
    instruction_step_26 = eval('instruction_step_26_' + rgb_filter);
    display_instruction();
    deactivate_sqr_btn("#lut-btn");
    deactivate_sqr_btn("#bf-capture-btn");
    set_microimgs_fun(rgb_sprite10x, 12, "#" + rgb_filter + "_10x_6");
    set_histogram_fun(rgb_sprite10x_lut, 12, "#" + rgb_filter + "_10x_lut_6");
    $("#fluograph-btn").html("INSERT<br>" + rgb_filter + " FILTER");
    $("#fluograph-modal").toggleClass("totally-hidden", false);
    activate_sqr_btn("#fluograph-btn");
    $("#mercury-btn").prop('disabled', true);
    $(".light-path").toggleClass("totally-hidden", false);
    activate_sqr_btn("#fluograph-btn");
    activate_sqr_btn("#bf-back-btn");
    LFM_step_num = 27;
    //next 
}

function LFM_step_27() {
    display_instruction();
    color_lighpaths_fn();
    $(".mid-element").toggleClass("totally-hidden", false);
    activate_sqr_btn("#imgsoft-btn");
    $("#imaging-btn").click();
    LFM_step_num = 28;
    //next 
}

function LFM_step_28() {
    display_instruction();
    LFM_step_num = 29;
    //next 
}

function LFM_step_29() {
    display_instruction();
    LFM_step_num = 30;
    //next 
}

function LFM_step_30() {
    color_lighpaths_fn();
    instruction_step_30 = eval('instruction_step_30_' + rgb_filter);
    display_instruction();
    LUT_bool = false;
    LFM_step_num = 31;
    //next 
}

function LFM_step_31() {
    display_instruction();
    LFM_step_num = 32;
    //next 
}

function LFM_step_32() {
    display_instruction();
    activate_sqr_btn("#imgsoft-btn");
    LFM_step_num = 33;
    //next 
}

function LFM_step_33() {
    display_instruction();
    LFM_step_num = 34;
    //next 
}

function LFM_step_34() {
    display_instruction();
    LFM_step_num = 35;
    //next 
}

function LFM_step_35() {
    display_instruction();
    activate_sqr_btn("#bf-capture-btn");
    LUT_bool = false;
    LFM_step_num = 36;
    //next 
}

function LFM_step_36() {
    color_lighpaths_fn();
    instruction_step_36 = eval('instruction_step_36_' + rgb_filter);
    display_instruction();
    LFM_step_num = 37;
    //next 
}

function LFM_step_37() {
    display_instruction();
    LFM_step_num = 38;
    //next 
}

function LFM_step_38() {
    display_instruction();
    $("#activities-btn").trigger("click");
    $("#bf").toggleClass("totally-hidden", true);
    $("#confocal").toggleClass("totally-hidden", false);
    activate_sqr_btn("#activities-btn");
    activate_sqr_btn("#lp-btn");
    deactivate_sqr_btn("#confocal-back-btn");
    LFM_step_num = 39;
    //next 
}

function LFM_step_39() {
    LFM_step_num = 39;
    display_instruction();
    activate_sqr_btn("#confocal-back-btn");
    $("#close-conf-scenarios").trigger("click");
    $('#channel-3-checkbox').css('cursor', 'pointer');
    $("#channel-3-checkbox").prop('disabled', false);
    LFM_step_num = 40;
    //next 
}

function LFM_step_40() {
    display_instruction();
    $("#close-conf-scenarios").trigger("click");
    $("#gain3").slider("enable");
    $("#laser3").slider("disable");
    LFM_step_num = 41;
    //next 
}

function LFM_step_41() {
    display_instruction();
    $("#laser3").slider("enable");
    $("#gain3").slider("disable");
    deactivate_dd("#pinhole-size");
    LFM_step_num = 42;
    //next 
}

function LFM_step_42() {
    display_instruction();
    deactivate_dd("#image-size");
    reset_dd("#pinhole-size", 4);
    activate_dd("#pinhole-size");
    $("#laser3").slider("disable");
    LFM_step_num = 43;
    //next 
}

function LFM_step_43() {
    display_instruction();
    reset_dd("#image-size", 3);
    activate_dd("#image-size");
    deactivate_dd("#pinhole-size");
    LFM_step_num = 44;
    //next 
}

function LFM_step_44() {
    display_instruction();
    deactivate_round_btn("#live-btn");
    activate_round_btn("#live-btn");
    deactivate_dd("#image-size");
    deactivate_dd("#look-up");
    LFM_step_num = 45;
    //next 
}

function LFM_step_45() {
    display_instruction();
    $("#label-l").html("CHANNEL 3");
    $("#live-btn").prop('disabled', true);
    $("#gain3").slider("disable");
    reset_dd("#look-up", 2);
    activate_dd("#look-up");
    LFM_step_num = 46;
    //next 
}

function LFM_step_46() {
    display_instruction();
    deactivate_dd("#look-up");
    $("#gain3").slider("enable");
    $("#laser3").slider("disable");
    LFM_step_num = 47;
    //next 
}

function LFM_step_47() {
    display_instruction();
    $("#laser3").slider("enable");
    $("#gain3").slider("disable");
    LFM_step_num = 48;
    //next 
}

function LFM_step_48() {
    display_instruction();
    $("#laser3").slider("disable");
    $("#offset3").slider("enable");
    LFM_step_num = 49;
    //next 
}

function LFM_step_49() {
    display_instruction();
    $("#offset3").slider("disable");
    activate_dd("#look-up");
    reset_dd("#look-up", 3, 2);
    LFM_step_num = 50;
    //next 
}

function LFM_step_50() {
    display_instruction();
    deactivate_dd("#look-up");
    $("#live-btn").toggleClass("btn-clickable", true);
    $("#live-btn").prop('disabled', false);
    $("#live-btn").css("cursor", "");
    reset_dd("#image-size", 3, 3);
    deactivate_dd("#image-size");
    LFM_step_num = 51;
    //next 
}

function LFM_step_51() {
    display_instruction();
    deactivate_round_btn("#live-btn");
    $("#live-btn").prop('value', "on");
    $("#live-btn").toggleClass("btn-disabled", false);
    reset_dd("#image-size", 2, 3);
    activate_dd("#image-size");
    LFM_step_num = 52;
    //next 
}

function LFM_step_52() {
    display_instruction();
    $("#label-l").html("CHANNEL 3");
    $("#close-conf-scenarios").trigger("click");
    deactivate_sqr_btn("#confocal-back-btn");
    reset_dd("#objective", 4, 2);
    activate_dd("#objective");
    LFM_step_num = 55;
    //next 
}

function LFM_step_53() {
    display_instruction();
    LFM_step_num = 54;
    //next 
}

function LFM_step_54() {
    display_instruction();
    LFM_step_num = 55;
    //next 
}

function LFM_step_55() {
    display_instruction();
    activate_sqr_btn("#confocal-back-btn");
    deactivate_dd("#objective");
    reset_dd("#image-size", 3, 2);
    activate_dd("#image-size");
    LFM_step_num = 56;
    //next 
}

function LFM_step_56() {
    display_instruction();
    deactivate_dd("#image-size");
    deactivate_round_btn("#live-btn");
    activate_round_btn("#live-btn");
    LFM_step_num = 57;
    //next 
}

function LFM_step_57() {
    display_instruction();
    $("#live-btn").prop('disabled', true);
    $("#zpos-div p").toggleClass("label-disabled", false);
    $("#zpinhole-title").toggleClass("pinhole-title-disabled", false);
    $("#zpos").slider("enable");
    LFM_step_num = 58;
    //next 
}

function LFM_step_58() {
    display_instruction();
    $("#zpos").slider("disable");
    activate_dd("#look-up");
    reset_dd("#look-up", 2, 3);
    LFM_step_num = 59;
    //next 
}

function LFM_step_59() {
    display_instruction();
    $("#gain3").slider("enable");
    deactivate_dd("#look-up");
    LFM_step_num = 60;
    //next 
}

function LFM_step_60() {
    display_instruction();
    $("#laser3").slider("enable");
    $("#gain3").slider("disable");
    LFM_step_num = 61;
    //next 
}

function LFM_step_61() {
    display_instruction();
    $("#laser3").slider("disable");
    $("#offset3").slider("enable");
    LFM_step_num = 62;
    //next 
}

function LFM_step_62() {
    display_instruction();
    activate_dd("#look-up");
    $("#offset3").slider("disable");
    reset_dd("#look-up", 3, 2);
    activate_dd("#look-up");
    LFM_step_num = 63;
    //next 
}

function LFM_step_63() {
    display_instruction();
    deactivate_dd("#look-up");
    $("#live-btn").toggleClass("btn-clickable", true);
    $("#live-btn").prop('disabled', false);
    $("#live-btn").css("cursor", "");
    reset_dd("#image-size", 3, 3);
    deactivate_dd("#image-size");
    LFM_step_num = 64;
    //next 
}

function LFM_step_64() {
    display_instruction();
    deactivate_round_btn("#live-btn");
    $("#live-btn").prop('value', "on");
    $("#live-btn").toggleClass("btn-disabled", false);
    reset_dd("#image-size", 2, 3);
    activate_dd("#image-size");
    LFM_step_num = 65;
    //next 
}

function LFM_step_65() {
    display_instruction();
    $("#label-l").html("CHANNEL 3");
    deactivate_sqr_btn("#confocal-back-btn");
    $("#close-conf-scenarios").trigger("click");
    reset_dd("#image-size", 3, 2);
    activate_dd("#image-size");
    LFM_step_num = 66;
    //next 
}

function LFM_step_66() {
    display_instruction();
    activate_sqr_btn("#confocal-back-btn");
    $("#live-btn").prop('disabled', true);
    activate_dd("#look-up");
    reset_dd("#look-up", 2, 3);
    LFM_step_num = 67;
    //next 
}

function LFM_step_67() {
    display_instruction();
    deactivate_dd("#look-up");
    $("#live-btn").toggleClass("btn-clickable", true);
    $("#live-btn").prop('disabled', false);
    $("#live-btn").css("cursor", "");
    LFM_step_num = 68;
    //next 
}

function LFM_step_68() {
    display_instruction();
    deactivate_round_btn("#live-btn");
    $("#live-btn").prop('value', "on");
    $("#live-btn").toggleClass("btn-disabled", false);
    activate_round_btn("#capture-btn");
    deactivate_dd("#pinhole-size");
    LFM_step_num = 69;
    //next 
}

function LFM_step_69() {
    display_instruction();
    reset_dd("#pinhole-size", 8, 4);
    activate_dd("#pinhole-size");
    LFM_step_num = 70;
    //next 
}

function LFM_step_70() {
    display_instruction();
    deactivate_dd("#pinhole-size");
    activate_round_btn("#capture-btn");
    LFM_step_num = 71;
    //next 
}

function LFM_step_71() {
    LFM_step_num = 72;
    if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
    next_step();
    //next 
}

function LFM_step_72() {
    display_instruction();
    reset_dd("#pinhole-size", 1, 8);
    activate_dd("#pinhole-size");
    LFM_step_num = 73;
    //next 
}

function LFM_step_73() {
    display_instruction();
    $("#pinhole01-modal").toggleClass("totally-hidden", true);
    deactivate_dd("#pinhole-size");
    activate_round_btn("#capture-btn");
    LFM_step_num = 74;
    //next 
}

function LFM_step_74() {
    display_instruction();
    $("#label-r").html("PINHOLE = 0.4 AU (closed)");
    reset_dd("#look-up", 3, 2);
    activate_dd("#look-up");
    LFM_step_num = 75;
    //next 
}

function LFM_step_75() {
    $("#pinhole02-modal").toggleClass("totally-hidden", true);
    $("#label-l").html("CHANNEL 3");
    $("#label-r").html("");
    display_instruction();
    reset_dd("#pinhole-size", 4, 1);
    activate_dd("#pinhole-size");
    reset_dd("#pixel-dwell", 2, 2);
    $("#close-conf-scenarios").trigger("click");
    deactivate_sqr_btn("#confocal-back-btn");
    LFM_step_num = 76;
    //next 
}

function LFM_step_76() {
    display_instruction();
    reset_dd("#pixel-dwell", 2, 2);
    deactivate_dd("#pixel-dwell");
    activate_sqr_btn("#confocal-back-btn");
    deactivate_dd("#pinhole-size");
    activate_round_btn("#capture-btn");
    LFM_step_num = 77;
    //next 
}

function LFM_step_77() {
    display_instruction();
    $("#conf-txt-modal").toggleClass("totally-hidden", true);
    reset_dd("#pixel-dwell", 1, 2);
    activate_dd("#pixel-dwell");
    deactivate_dd("#pinhole-size");
    LFM_step_num = 78;
    //next 
}

function LFM_step_78() {
    display_instruction();
    reset_dd("#look-up", 2, 3);
    activate_dd("#look-up");
    deactivate_dd("#pixel-dwell");
    LFM_step_num = 79;
    //next 
}

function LFM_step_79() {
    display_instruction();
    deactivate_dd("#look-up");
    deactivate_round_btn("#live-btn");
    activate_round_btn("#live-btn");
    LFM_step_num = 80;
    //next 
}

function LFM_step_80() {
    display_instruction();
    $("#live-btn").toggleClass("btn-clickable", true);
    $("#live-btn").prop('disabled', false);
    $("#live-btn").css("cursor", "");
    LFM_step_num = 81;
    //next 
}

function LFM_step_81() {
    display_instruction();
    deactivate_round_btn("#live-btn");
    $("#live-btn").prop('value', "on");
    $("#live-btn").toggleClass("btn-disabled", false);
    activate_round_btn("#capture-btn");
    reset_dd("#pixel-dwell", 4, 1);
    deactivate_dd("#pixel-dwell");
    LFM_step_num = 82;
    //next 
}

function LFM_step_82() {
    display_instruction();
    reset_dd("#pixel-dwell", 4, 1);
    activate_dd("#pixel-dwell");
    LFM_step_num = 83;
    //next 
}

function LFM_step_83() {
    display_instruction();
    deactivate_dd("#pixel-dwell");
    displayed_img = sprites[35][4];
    deactivate_round_btn("#live-btn");
    activate_round_btn("#live-btn");
    LFM_step_num = 84;
    //next 
}

function LFM_step_84() {
    display_instruction();
    $("#live-btn").toggleClass("btn-clickable", true);
    $("#live-btn").prop('disabled', false);
    $("#live-btn").css("cursor", "");
    LFM_step_num = 85;
    //next 
}

function LFM_step_85() {
    display_instruction();
    deactivate_round_btn("#live-btn");
    $("#live-btn").prop('value', "on");
    $("#live-btn").toggleClass("btn-disabled", false);
    activate_round_btn("#capture-btn");
    LFM_step_num = 86;
    //next 
}

function LFM_step_86() {
    display_instruction();
    LFM_step_num = 87;
    reset_dd("#look-up", 3, 2);
    $("#look-up>option:eq(2)").attr("disabled", false);
    $("#look-up").selectmenu("refresh");
    activate_dd("#look-up");
    $('#dwell-l img').attr('src', dwell_1_5.src);
    $('#dwell-m img').attr('src', dwell_1_3.src);
    $('#dwell-r img').attr('src', dwell_1_2.src);
    $("#dwell-modal").toggleClass("totally-hidden", false);
    //next 
}

function LFM_step_87() {
    display_instruction();
    $("#label-l").html("CHANNEL 3");
    $("#close-conf-scenarios").trigger("click");
    deactivate_sqr_btn("#confocal-back-btn");
    reset_dd("#pixel-dwell", 2, 4);
    activate_dd("#pixel-dwell");
    $("#fps-txt").html("0.167");
    LFM_step_num = 88;
    //next 
}

function LFM_step_88() {
    display_instruction();
    activate_sqr_btn("#confocal-back-btn");
    deactivate_round_btn("#live-btn");
    activate_round_btn("#live-btn");
    deactivate_dd("#pixel-dwell");
    LFM_step_num = 89;
    //next 
}

function LFM_step_89() {
    display_instruction();
    $("#live-btn").prop('disabled', true);
    reset_dd("#image-size", 2, 3);
    activate_dd("#image-size");
    $("#live-btn").prop('disabled', true);
    LFM_step_num = 90;
    //next 
}

function LFM_step_90() {
    display_instruction();
    $("#live-btn").toggleClass("btn-clickable", true);
    $("#live-btn").prop('disabled', false);
    $("#live-btn").css("cursor", "");
    deactivate_round_btn("#capture-btn");
    $("#capture-btn").toggleClass("btn-disabled", false);
    LFM_step_num = 91;
    //next 
}

function LFM_step_91() {
    display_instruction();
    deactivate_round_btn("#live-btn");
    $("#live-btn").prop('value', "on");
    $("#live-btn").toggleClass("btn-disabled", false);
    $("#image-size option").attr("disabled", false);
    $("#image-size").val("2");
    $("#image-size").selectmenu("refresh");
    activate_dd("#image-size");
    activate_slider("#zoom");
    LFM_step_num = 92;
    //next 
}

function LFM_step_92() {
    display_instruction();
    $("#label-l").html("CHANNEL 3");
    deactivate_sqr_btn("#confocal-back-btn");
    $("#close-conf-scenarios").trigger("click");
    LFM_step_num = 93;
    reset_dd("#image-size", 3, 2);
    activate_dd("#image-size");
    //next 
}

function LFM_step_93() {
    display_instruction();
    activate_sqr_btn("#confocal-back-btn");
    deactivate_dd("#image-size");
    reset_dd("#scan-mode", 1);
    activate_dd("#scan-mode");
    LFM_step_num = 94;
    //next 
}

function LFM_step_94() {
    LFM_step_num = 93;
    next_step();
    //next 
}

function LFM_step_95() {
    display_instruction();
    deactivate_dd("#scan-mode");
    deactivate_round_btn("#live-btn");
    activate_round_btn("#live-btn");
    LFM_step_num = 96;
    //next 
}

function LFM_step_96() {
    display_instruction();
    $("#live-btn").toggleClass("btn-clickable", true);
    $("#live-btn").prop('disabled', false);
    $("#live-btn").css("cursor", "");
    LFM_step_num = 97;
    //next 
}

function LFM_step_97() {
    display_instruction();
    deactivate_round_btn("#live-btn");
    $("#live-btn").prop('value', "on");
    $("#live-btn").toggleClass("btn-disabled", false);
    $('#channel-4-checkbox').css('cursor', 'pointer');
    $("#channel-4-checkbox").prop('disabled', false);
    LFM_step_num = 98;
    //next 
}

function LFM_step_98() {
    display_instruction();
    $("#ost-txt").html("1.63&#181;m");
    reset_slider("#laser4", 20);
    reset_slider("#gain4", 45);
    deactivate_round_btn("#live-btn");
    activate_round_btn("#live-btn");
    LFM_step_num = 99;
    //next 
}

function LFM_step_99() {
    display_instruction();
    $("#label-r").html("CHANNEL 4");
    $("#live-btn").toggleClass("btn-clickable", true);
    $("#live-btn").prop('disabled', false);
    $("#live-btn").css("cursor", "");
    $("#multich-modal").toggleClass("totally-hidden", true);
    LFM_step_num = 100;
    //next 
}

function LFM_step_100() {
    display_instruction();
    deactivate_round_btn("#live-btn");
    $("#live-btn").prop('value', "on");
    $("#live-btn").toggleClass("btn-disabled", false);
    activate_round_btn("#capture-btn");
    LFM_step_num = 101;
    //next 
}

function LFM_step_101() {
    display_instruction();
    $("#multich02-modal").toggleClass("totally-hidden", true);
    reset_dd("#scan-mode", 2, 1);
    activate_dd("#scan-mode");
    reset_dd("#scan-mode", 2, 1);
    activate_dd("#scan-mode");
    LFM_step_num = 102;
    //next 
}

function LFM_step_102() {
    display_instruction();
    activate_round_btn("#capture-btn");
    deactivate_dd("#scan-mode");
    LFM_step_num = 103;
    //next 
}

function LFM_step_103() {
    display_instruction();
    $('#multich03-l img').attr('src', mchannel_1_3.src);
    $('#multich03-r img').attr('src', mchannel_1_6.src);
    LFM_step_num = 104;
    //next 
}

function LFM_step_104() {
    display_instruction();
    deactivate_round_btn("#live-btn");
    activate_round_btn("#live-btn");
    reset_slider("#laser2", 20);
    reset_slider("#gain2", 45);
    $("#channel-2-checkbox").prop('checked', true);
    $("#channel-2").toggleClass("disabled-channel", false);
    $('#channel-2-checkbox').css('cursor', 'not-allowed');
    $("#channel-2-checkbox").prop('disabled', false);
    $("#canvasf-modal").toggleClass("totally-hidden", true);
    LFM_step_num = 105;
    //next 
}

function LFM_step_105() {
    $("#label-l").html("CHANNEL 2");
    $("#label-r").html("CHANNEL 3");
    $("#label-f").html("CHANNEL 4");
    display_instruction();
    $("#live-btn").toggleClass("btn-clickable", true);
    $("#live-btn").prop('disabled', false);
    $("#live-btn").css("cursor", "");
    LFM_step_num = 106;
    //next 
}

function LFM_step_106() {
    display_instruction();
    deactivate_round_btn("#live-btn");
    $("#live-btn").prop('value', "on");
    $("#live-btn").toggleClass("btn-disabled", false);
    activate_round_btn("#capture-btn");
    LFM_step_num = 107;
    //next 
}

function LFM_step_107() {
    display_instruction();
    $("#close-conf-scenarios").trigger("click");
    deactivate_sqr_btn("#confocal-back-btn");
    LFM_step_num = 108;
    //next 
}

function LFM_step_108() {
    display_instruction();
    activate_sqr_btn("#confocal-back-btn");
    $("#label-l").html("CHANNEL 3");
    $("#live-btn").prop('disabled', true);
    $("#live-btn").prop('disabled', true);
    $("#zpos-div p").toggleClass("label-disabled", false);
    $("#zpinhole-title").toggleClass("pinhole-title-disabled", false);
    $("#zpos").slider("enable");
    LFM_step_num = 109;
    //next 
}

function LFM_step_109() {
    display_instruction();
    $("#range .stats-value .stat-title").css('opacity', '0');
    $("#range").toggleClass("stats-disabled", true);
    $('#zstacks-img').attr('src', conf_common_6.src);
    LFM_step_num = 110;
    //next 
}

function LFM_step_110() {
    display_instruction();
    $("#zpos").slider("disable");
    reset_dd("#step-size", 1);
    activate_dd("#step-size");
    $("#live-btn").prop('disabled', true);
    LFM_step_num = 111;
    //next 
}

function LFM_step_111() {
    display_instruction();
    deactivate_dd("#step-size");
    $("#live-btn").toggleClass("btn-clickable", true);
    $("#live-btn").prop('disabled', false);
    $("#live-btn").css("cursor", "");
    deactivate_round_btn("#capturez-btn");
    $("#capturez-btn").toggleClass("btn-disabled", false);
    LFM_step_num = 112;
    //next 
}

function LFM_step_112() {
    display_instruction();
    $("#zstacks-modal").toggleClass("totally-hidden", true);
    deactivate_round_btn("#live-btn");
    $("#live-btn").prop('value', "on");
    $('#zstacks-video').attr('src', zstack_video_1.src);
    $("#videoz-txt").html("Channel 3 3D image projection and rotation.");
    $("#live-btn").toggleClass("btn-disabled", false);
    deactivate_round_btn("#capturez-btn");
    activate_round_btn("#capturez-btn");
    LFM_step_num = 113;
    //next 
}

function LFM_step_113() {
    display_instruction();
    deactivate_round_btn("#capturez-btn");
    $("#videozstacks").slider("option", "max", zstack_video_1.duration);
    reset_slider("#videozstacks");
    activate_slider("#videozstacks");
    $("#videoz-modal").toggleClass("totally-hidden", false);
    LFM_step_num = 114;
    //next 
}

function LFM_step_114() {
    display_instruction();
    reset_dd("#step-size", 7, 1);
    activate_dd("#step-size");
    deactivate_round_btn("#capturez-btn");
    $("#capturez-btn").toggleClass("btn-disabled", false);
    LFM_step_num = 115;
    //next 
}

function LFM_step_115() {
    display_instruction();
    deactivate_dd("#step-size");
    $('#zstacks-video').attr('src', zstack_video_2.src);
    $("#videoz-txt").html("Channel 3 3D image projection and rotation.");
    deactivate_round_btn("#capturez-btn");
    activate_round_btn("#capturez-btn");
    LFM_step_num = 116;
    //next 
}

function LFM_step_116() {
    display_instruction();
    deactivate_round_btn("#capturez-btn");
    $("#videozstacks").slider("option", "max", zstack_video_2.duration);
    reset_slider("#videozstacks");
    activate_slider("#videozstacks");
    $("#videoz-modal").toggleClass("totally-hidden", false);
    LFM_step_num = 117;
    //next 
}

function LFM_step_117() {
    display_instruction();
    $('#channel-2-checkbox').css('cursor', 'pointer');
    $("#channel-2-checkbox").prop('disabled', false);
    LFM_step_num = 118;
    //next 
}

function LFM_step_118() {
    display_instruction();
    $("#label-l").html("CHANNEL 2");
    $("#label-r").html("CHANNEL 3");
    $("#label-f").html("CHANNEL 4");
    $('#channel-4-checkbox').css('cursor', 'pointer');
    $("#channel-4-checkbox").prop('disabled', false);
    deactivate_round_btn("#capturez-btn");
    $("#capturez-btn").toggleClass("btn-disabled", false);
    ctx_l.clearRect(0, 0, w_h, w_h);
    ctx_r.clearRect(0, 0, w_h, w_h);
    ctx_f.clearRect(0, 0, w_h, w_h);
    LFM_step_num = 119;
    //next 
}

function LFM_step_119() {
    display_instruction();
    $('#zstacks-video').attr('src', zstack_video_3.src);
    $("#videoz-txt").html("All channels 3D image projection and rotation.");
    $("#canvasf-modal").toggleClass("totally-hidden", false);
    deactivate_round_btn("#capturez-btn");
    activate_round_btn("#capturez-btn");
    LFM_step_num = 120;
    //next 
}

function LFM_step_120() {
    display_instruction();
    $("#single-light-path .light-path").css('opacity', '0');
    deactivate_round_btn("#capturez-btn");
    $("#videozstacks").slider("option", "max", zstack_video_3.duration);
    reset_slider("#videozstacks");
    activate_slider("#videozstacks");
    $("#videoz-modal").toggleClass("totally-hidden", false);
    $("#activities-btn").trigger("click");
    LFM_step_num = 121;
    //next 
}
