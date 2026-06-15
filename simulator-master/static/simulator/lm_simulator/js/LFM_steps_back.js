// ======================= START BACK ======================== //
const go_back = (_step = LFM_step_num) => {
    //    console.log("from go_back fn -- this is step" + _step);
    switch (_step) { //_step is the LFM_step_num where it will land when pressing back
        case 3:
            deactivate_sqr_btn("#10x-btn");
            break;
        case 4:
            reset_bf_focus();
            deactivate_sqr_btn("#10x-btn");
            break;
        case 5:
            reset_bf_focus();
            $("#bf-fdiaphragm").slider("value", 25);
            diaphg_fx.setAttribute("stdDeviation", 1.5);
            diapragm_pos_fn(90, -110, 10);
            deactivate_slider("#bf-fdiaphragm");
            break;
        case 6:
            $("#bf-fdiaphragm").slider("value", 25);
            $("#bf-cfocus").slider("value", 0);
            deactivate_slider("#bf-cfocus");
            diaphg_fx.setAttribute("stdDeviation", 1.5);
            diapragm_pos_fn(90, -110, 10);
            break;
        case 7:
            deactivate_condenserPos();
            $("#bf-cfocus").slider("value", 0);
            diapragm_pos_fn(90, -110, 2);
            diaphg_fx.setAttribute("stdDeviation", 2.5);
            break;
        case 8:
            $("#bf-fdiaphragm").slider("value", 100);
            diapragm_pos_fn(90, -110, 2); //ACTIVATE AFTER TESTING
            //diapragm_pos_fn(-5, -5, 2); //DELETE JUST ACTIVATE FOR TESTING
            deactivate_slider("#bf-fdiaphragm");
            break;
        case 9:
            $("#diaphragm-penta").toggleClass("totally-hidden", false);
            deactivate_sqr_btn("#eyepiece-btn");
            diapragm_pos_fn(-5, -5, 2);
            $("#bf-fdiaphragm").slider("value", 100);
            break;
        case 10:
            $("#bf-caperture").slider("value", 77);
            deactivate_slider("#bf-caperture");
            diapragm_pos_fn(-5, -5, 13.0);
            $("#bf_set01_5").removeClass("bf-invisible");
            $("#bf_set01_5").addClass("bf-visible");
            $("#bf-noeyepiece").removeClass("bf-visible");
            $("#bf-noeyepiece").addClass("bf-invisible");
            $("#eyepiece-btn").css("cursor", "pointer");
            $("#eyepiece-btn").prop('value', "off");
            $("#eyepiece-btn").html("REMOVE");
            $("#eyepiece-btn").toggleClass("btn-active", false);
            gsap.to("#eyepiece-on", {
                duration: 0.5,
                ease: "power2.out",
                scale: 1,
                opacity: 1
            });
            break;
        case 11:
            $("#bf-caperture").slider("value", 77);
            $("#eyepiece-btn").prop('disabled', "true");
            $("#eyepiece-btn").css("cursor", "not-allowed");
            diapragm_pos_fn(-5, -5, 3.99);
            break;
        case 12:
            $("#condenser-btn").click();
            $("#bf-moveslide").slider("value", 100);
            deactivate_slider("#bf-moveslide");
            $("#bf-wh-balance").css({
                transform: 'translateX(0px)'
            });
            diapragm_pos_fn(-5, -5, 9.7);
            $("#bf-noeyepiece").addClass("bf-visible");
            $("#bf-noeyepiece").removeClass("bf-invisible");
            $("#bf-wh-balance").removeClass("bf-visible");
            $("#bf-wh-balance").addClass("bf-invisible");
            $('#bf-mid-img').removeAttr('src');
            activate_slider("#bf-moveslide");
            activate_sqr_btn("#eyepiece-btn");
            $("#eyepiece-btn").css("cursor", "pointer");
            $("#eyepiece-btn").prop('value', "on");
            $("#eyepiece-btn").html("REPLACE");
            gsap.to("#eyepiece-on", {
                duration: 0.5,
                ease: "power2.in",
                scale: 1.1,
                opacity: 0
            });
            break;
        case 13:
            deactivate_sqr_btn("#imgsoft-btn");
            $("#bf-wh-balance").css({
                transform: 'translateX(0px)'
            });
            $("#bf-moveslide").slider("value", 100);
            break;
        case 14:
            $("#imaging-modal").toggleClass("totally-hidden", true);
            deactivate_sqr_btn("#imgsoft-btn");
            activate_sqr_btn("#imgsoft-btn");
            deactivate_sqr_btn("#white-btn");
            break;
        case 15:
            deactivate_sqr_btn("#white-btn");
            activate_sqr_btn("#white-btn");
            $('#bf-wh-balance').attr('src', bf_set01_11.src);
            $("#bf-moveslide").slider("value", 0);
            deactivate_slider("#bf-moveslide");
            $("#bf-wh-balance").css({
                transform: 'translateX(' + _w * -1 + 'px)'
            });
            break;
        case 16:
            $("#bf-moveslide").slider("value", 0);
            $("#exposure").slider("value", 2);
            deactivate_slider("#exposure");
            $("#exposure-vals p").toggleClass("label-disabled", true);
            set_microimgs_fun(0, 7, "#bf-wh-balance");
            $("#bf-wh-balance").addClass("bf-visible");
            $("#bf-wh-balance").css({
                transform: 'translateX(' + _w * -1 + 'px)'
            });
            break;
        case 17:
            $("#exposure").slider("value", 2);
            $("#bf-microimgs img").removeClass("bf-visible");
            $("#bf-microimgs #bf_set03_1").replaceWith(sprites[1][0]);
            $("#bf-microimgs #bf_set03_2").replaceWith(sprites[1][5]);
            $("#bf-microimgs #bf_set03_3").replaceWith(sprites[1][6]);
            $("#bf-microimgs #bf_set03_4").replaceWith(sprites[1][7]);
            $("#bf_set02_3").addClass("bf-visible");
            deactivate_sqr_btn("#bf-capture-btn");
            deactivate_sqr_btn("#lut-btn");
            $("#histogram-modal").toggleClass("totally-hidden", true);
            LUT_bool = false;
            break;
        case 18:
            $("#exposure").slider("value", 5);
            //            deactivate_slider("#exposure");
            $("#bf-microimgs img").removeClass("bf-visible");
            $("#bf-microimgs #bf_set03_1").replaceWith(sprites[1][0]);
            $("#bf-microimgs #bf_set03_2").replaceWith(sprites[1][5]);
            $("#bf-microimgs #bf_set03_3").replaceWith(sprites[1][6]);
            $("#bf-microimgs #bf_set03_4").replaceWith(sprites[1][7]);
            $("#bf_set02_6").addClass("bf-visible");
            deactivate_sqr_btn("#bf-capture-btn");
            deactivate_sqr_btn("#lut-btn");
            activate_sqr_btn("#lut-btn");
            $("#histogram-modal").toggleClass("totally-hidden", true);
            break;
        case 19:
            for (let i = 8; i >= 0; i--) {
                $("#bf-microimgs img:first-of-type").detach();
            }

            var reset_img_step19 = [sprites[2][3], sprites[2][2], sprites[2][1], sprites[1][4], sprites[1][3], sprites[1][2], sprites[1][1], sprites[2][0]];
            for (let id_val of reset_img_step19) {
                $(id_val).prependTo("#bf-microimgs");
                $("#bf-microimgs img").removeAttr("style");
            }
            $("#bf-microimgs img").removeClass("bf-visible");
            $("#bf_set02_5").addClass("bf-visible");

            deactivate_sqr_btn("#40x-btn");
            activate_sqr_btn("#40x-btn");
            activate_sqr_btn("#bf-capture-btn");

            $("#10x-btn").toggleClass("btn-active", true);
            $("#10x-btn").val("on");
            $("#imgsoft-btn").toggleClass("btn-active", true);
            $("#imgsoft-btn").val("on");
            $("#white-btn").toggleClass("btn-active", true);
            $("#white-btn").val("on");
            $("#lut-btn").toggleClass("btn-active", true);
            $("#lut-btn").val("on");
            $("#histogram-modal").toggleClass("totally-hidden", false);
            $("#imaging-modal").toggleClass("totally-hidden", false);
            $("#exposure").slider("option", "max", 7);
            $("#exposure").slider("value", 4);
            $("#bf-focus1").slider("option", "max", 60);
            $("#bf-focus1").slider("value", 40);
            deactivate_slider("#bf-focus1");
            break;
        case 20:
            $("#bf-microimgs img").removeClass("bf-visible");
            $("#bf_40xset01_9").addClass("bf-visible");
            $("#bf-focus1").slider("value", 80);
            deactivate_sqr_btn("#imgsoft-btn");
            activate_slider("#bf-focus1");
            break;
        case 21:
            set_microimgs_fun(3, 8, "#bf_40xset01_5");
            $("#exposure").slider("value", 9);
            deactivate_sqr_btn("#imgsoft-btn");
            activate_sqr_btn("#imgsoft-btn");
            $("#imaging-modal").toggleClass("totally-hidden", true);
            $("#exposure-to").html("8ms");
            break;
        case 22:
            $("#exposure").slider("value", 9);
            activate_slider("#exposure");
            $("#histogram-modal").toggleClass("totally-hidden", true);
            $("#bf-microimgs img").removeClass("bf-visible");
            $("#bf-microimgs #bf_40xset03_1").replaceWith(sprites[4][0]);
            $("#bf-microimgs #bf_40xset03_2").replaceWith(sprites[4][8]);
            $("#bf-microimgs #bf_40xset03_3").replaceWith(sprites[4][9]);
            $("#bf-microimgs #bf_40xset03_4").replaceWith(sprites[4][10]);
            $("#bf-microimgs #bf_40xset03_5").replaceWith(sprites[4][11]);
            $("#bf-microimgs img").removeAttr("style");
            $("#bf_40xset02_10").addClass("bf-visible");
            deactivate_sqr_btn("#lut-btn");
            deactivate_sqr_btn("#bf-capture-btn");
            LUT_bool = false;
            break;
        case 23:
            $("#exposure").slider("value", 6);
            $("#bf-microimgs img").removeClass("bf-visible");
            $("#bf_40xset02_7").addClass("bf-visible");
            deactivate_sqr_btn("#lut-btn");
            activate_sqr_btn("#lut-btn");
            deactivate_sqr_btn("#bf-capture-btn");
            break;
        case 25:
            $("#fluograph-modal").toggleClass("totally-hidden", true);
            break;
        case 26:
            $("#main-lens").css("fill", "#989898");
            $("#light-path-filtered").css("stroke", "#CECECE");
            $(".light-path-emerge").css("stroke", "#CECECE");
            $("#fluograph-modal").toggleClass("totally-hidden", false);
            $(".mid-element").toggleClass("totally-hidden", true);
            deactivate_sqr_btn("#imgsoft-btn");
            $("#condenser-btn").click();
            break;
        case 27:
            switch (rgb_filter) {
                case "RFP":
                    $("#bf-microimgs img").not("#bf-microimgs img:nth-last-child(1) ,#bf-microimgs img:nth-last-child(2)").toggleClass("bf-visible", false);
                    $("#" + rgb_filter + "_10x_6").addClass("bf-visible");
                    $("#imaging-modal").toggleClass("totally-hidden", true);
                    $("#exposure").slider("value", 5);
                    deactivate_sqr_btn("#imgsoft-btn");
                    activate_sqr_btn("#imgsoft-btn");
                    break;
                case "GFP":
                    rgb_filter = "RFP";
                    rgb_sprite10x = 6;
                    rgb_sprite10x_lut = 7;
                    set_microimgs_fun(rgb_sprite10x, 12, "#" + rgb_filter + "_10x_6");
                    set_histogram_fun(rgb_sprite10x_lut, 12, "#" + rgb_filter + "_10x_lut_6");
                    $("#exposure").slider("value", 5);
                    LFM_step_num = 29;
                    next_step();
                    break;
                case "DAPI":
                    rgb_filter = "GFP";
                    rgb_sprite10x = 18;
                    rgb_sprite10x_lut = 22;
                    set_microimgs_fun(rgb_sprite10x, 12, "#" + rgb_filter + "_10x_6");
                    set_histogram_fun(rgb_sprite10x_lut, 12, "#" + rgb_filter + "_10x_lut_6");
                    $("#exposure").slider("value", 5);
                    LFM_step_num = 29;
                    next_step();
                    break;
            }
            break;
        case 28:
            $("#lut-modal").toggleClass("totally-hidden", true);
            deactivate_sqr_btn("#lut-btn");
            deactivate_sqr_btn("#bf-capture-btn");
            activate_slider("#exposure");
            set_microimgs_fun(rgb_sprite10x, 12, "#" + rgb_filter + "_10x_6");
            set_histogram_fun(rgb_sprite10x_lut, 12, "#" + rgb_filter + "_10x_lut_6");
            $("#exposure").slider("value", 5);
            LUT_bool = false;
            break;
        case 29:
            $("#lut-modal").toggleClass("totally-hidden", true);
            set_microimgs_fun(rgb_sprite10x, 12, "#" + rgb_filter + "_10x_10");
            set_histogram_fun(rgb_sprite10x_lut, 12, "#" + rgb_filter + "_10x_lut_10");
            deactivate_sqr_btn("#lut-btn");
            activate_sqr_btn("#lut-btn");
            deactivate_sqr_btn("#bf-capture-btn");
            $("#exposure").slider("value", 9);
            break;
        case 30:
            $("#imaging-modal").toggleClass("totally-hidden", false);
            $("#lut-modal").toggleClass("totally-hidden", false);
            $("#overlay10-modal").toggleClass("totally-hidden", true);
            $("#imgsoft-btn").toggleClass("btn-active", true);
            $("#imgsoft-btn").val("on");
            deactivate_sqr_btn("#40x-btn");
            $("#exposure").slider("option", "max", 10);
            $("#exposure").slider("value", 9);
            break;
        case 31:
            $("#exposure").slider("value", 9);
            rgb_sprite10x = 19;
            rgb_sprite10x_lut = 23;
            rgb_filter = "DAPI"
            set_microimgs_fun(rgb_sprite10x, 12, "#" + rgb_filter + "_10x_10");
            set_histogram_fun(rgb_sprite10x_lut, 12, "#" + rgb_filter + "_10x_lut_10");
            deactivate_sqr_btn("#40x-btn");
            activate_sqr_btn("#40x-btn");
            deactivate_sqr_btn("#imgsoft-btn");
            break;
        case 32:
            switch (rgb_filter) {
                case "RFP":
                    rgb_filter = "GFP";
                    rgb_sprite40x = 20;
                    rgb_sprite40x_lut = 24;
                    set_microimgs_fun(rgb_sprite40x, 10, "#" + rgb_filter + "_40x_2");
                    set_histogram_fun(rgb_sprite40x_lut, 10, "#" + rgb_filter + "_40x_lut_2");
                    $("#exposure").slider("option", "max", 10);
                    $("#exposure").slider("value", 1);
                    LFM_step_num = 35;
                    next_step();
                    break;
                case "GFP":
                    rgb_filter = "DAPI";
                    rgb_sprite40x = 21;
                    rgb_sprite40x_lut = 25;
                    set_microimgs_fun(rgb_sprite40x, 10, "#" + rgb_filter + "_40x_2");
                    set_histogram_fun(rgb_sprite40x_lut, 10, "#" + rgb_filter + "_40x_lut_2");
                    $("#exposure").slider("option", "max", 10);
                    $("#exposure").slider("value", 1);
                    LFM_step_num = 35;
                    next_step();
                    break;
                case "DAPI":
                    $("#imaging-modal").toggleClass("totally-hidden", true);
                    $("#lut-modal").toggleClass("totally-hidden", true);
                    set_microimgs_fun(rgb_sprite40x, 10, "#" + rgb_filter + "_40x_2");
                    set_histogram_fun(rgb_sprite40x_lut, 10, "#" + rgb_filter + "_40x_lut_2");
                    $("#exposure").slider("option", "max", 10);
                    $("#exposure").slider("value", 1);
                    deactivate_sqr_btn("#imgsoft-btn");
                    activate_sqr_btn("#imgsoft-btn");
                    deactivate_sqr_btn("#lut-btn");
                    break;
            }

            break;
        case 33:
            $("#lut-modal").toggleClass("totally-hidden", true);
            deactivate_sqr_btn("#lut-btn");
            LUT_bool = false;
            break;
        case 34:
            deactivate_sqr_btn("#lut-btn");
            activate_sqr_btn("#lut-btn");
            deactivate_sqr_btn("#bf-capture-btn");
            let fluo_40exposure = $("#exposure").slider("value");
            fluo_40exposure += 1;
            set_microimgs_fun(rgb_sprite40x, 10, "#" + rgb_filter + "_40x_" + fluo_40exposure);
            set_histogram_fun(rgb_sprite40x_lut, 10, "#" + rgb_filter + "_40x_lut_" + fluo_40exposure);
            $("#lut-modal").toggleClass("totally-hidden", true);
            break;
        case 36:
            deactivate_sqr_btn("#lut-btn");
            activate_sqr_btn("#lut-btn");
            let fluo_40_exposure = $("#exposure").slider("value");
            fluo_40_exposure += 1;
            set_microimgs_fun(rgb_sprite40x, 10, "#" + rgb_filter + "_40x_" + fluo_40_exposure);
            set_histogram_fun(rgb_sprite40x_lut, 10, "#" + rgb_filter + "_40x_lut_" + fluo_40_exposure);
            $("#lut-modal").toggleClass("totally-hidden", true);
            $("#imaging-modal").toggleClass("totally-hidden", false);
            $("#overlay40-modal").toggleClass("totally-hidden", true);
            break;
        case 38:
            $("#channel-3-checkbox").prop('checked', false);
            $("#channel-3-checkbox").prop('disabled', true);
            break;
        case 39:
            $("#channel-3-checkbox").prop('checked', false);
            $("#channel-3-checkbox").prop('disabled', true);
            reset_slider("#gain3");
            totally_deactivate_channel("channel-3");
            break;
        case 40:
            reset_slider("#laser3");
            reset_slider("#gain3");
            break;
        case 41:
            reset_slider("#laser3");
            break;
        case 42:
            reset_dd("#image-size", 3);
            reset_dd("#pinhole-size", 4);
            $("#ost-txt").html("");
            break;
        case 43:
            reset_dd("#image-size", 3);
            deactivate_round_btn("#live-btn");
            break;
        case 44:
            tvCounter = 2;
            $("#single-light-path .light-path").css('opacity', '0');
            $(".monitor-label").html("");
            cancelAnimationFrame(rasterEffect);
            ctx_l.clearRect(0, 0, w_h, w_h);
            $("#live-btn").css("cursor", "");
            break;
        case 45:
            reset_dd("#look-up", 2);
            reset_slider("#gain3", 25);
            $("#gain3 .ui-slider-handle").text("40V");
            displayed_img = sprites[26][0];
            break;
        case 46:
            reset_slider("#laser3", 5);
            reset_slider("#gain3", 25);
            $("#gain3 .ui-slider-handle").text("40V");
            $("#laser3 .ui-slider-handle").text("5%");
            displayed_img = sprites[27][2];
            break;
        case 47:
            reset_slider("#laser3", 5);
            $("#laser3 .ui-slider-handle").text("5%");
            $("#offset3").slider("disable");
            break;
        case 48:
            reset_slider("#offset3", 0);
            reset_dd("#look-up", 3, 2);
            deactivate_dd("#look-up");
            break;
        case 49:
            displayed_img = sprites[29][3];
            $("#live-btn").prop('disabled', true);
            $("#live-btn").css("cursor", "not-allowed");
            break;
        case 50:
            cancelAnimationFrame(rasterEffect);
            tvCounter = 2;
            ch3_lightpath_fn();
            activate_round_btn("#live-btn");
            $("#close-conf-scenarios").trigger("click");
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            $("#live-btn").toggleClass("controls-btn-active", true);
            deactivate_round_btn("#capture-btn");
            $("#capture-btn").toggleClass("btn-disabled", false);
            raster_it();
            break;
        case 51:
            break;
        case 52:

            break;
        case 53:
            break;
        case 54:
            activate_dd("#objective");
            deactivate_dd("#image-size");
            $("#ost-txt").html("6.87&#181;m");
            LFM_step_num = 52;
            break;
        case 55:
            reset_dd("#image-size", 3, 2);
            deactivate_round_btn("#live-btn");
            break;
        case 56:
            displayed_img = sprites[26][2];
            $("#live-btn").css("cursor", "");
            reset_slider("#zpos", 50);
            $("#zpos").slider("disable");
            $("#zpos-div p").toggleClass("label-disabled", true);
            $("#zpinhole-title").toggleClass("pinhole-title-disabled", true);
            $("#single-light-path .light-path").css('opacity', '0');
            draw_single();
            cancelAnimationFrame(rasterEffect);
            break;
        case 57:
            displayed_img = sprites[30][9];
            reset_slider("#zpos", 50);
            $("#zpos").slider("enable");
            deactivate_dd("#look-up");
            break;
        case 58:
            displayed_img = sprites[30][8];
            reset_dd("#look-up", 3, 3);
            reset_slider("#gain3", 45);
            $("#gain3").slider("disable");
            break;
        case 59:
            displayed_img = sprites[31][5];
            reset_slider("#laser3", 20);
            $("#laser3").slider("disable");
            break;
        case 60:
            displayed_img = sprites[32][5];
            reset_slider("#offset3", 0);
            $("#offset3").slider("disable");
            break;
        case 61:
            reset_dd("#look-up", 3, 2);
            deactivate_dd("#look-up");
            break;
        case 62:
            displayed_img = sprites[33][6];
            $("#live-btn").prop('disabled', true);
            $("#live-btn").css("cursor", "not-allowed");
            break;
        case 63:
            cancelAnimationFrame(rasterEffect);
            $("#live-btn").css("cursor", "");
            tvCounter = 2;
            fRate = 6;
            $("#fps-txt").html((fRate / 12).toFixed(3));
            $("#single-light-path .light-path").css('opacity', '1');
            activate_round_btn("#live-btn");
            $("#close-conf-scenarios").trigger("click");
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            $("#live-btn").toggleClass("controls-btn-active", true);
            deactivate_round_btn("#capture-btn");
            $("#capture-btn").toggleClass("btn-disabled", false);
            raster_it();
            break;
        case 64:
            break;
        case 65:
            $("#single-light-path .light-path").css('opacity', '0');
            reset_dd("#image-size", 3, 2);
            cancelAnimationFrame(rasterEffect);
            displayed_img = sprites[26][4];
            draw_single();
            deactivate_round_btn("#live-btn");
            deactivate_round_btn("#capture-btn");
            $("#modal-planes").toggleClass("totally-hidden", false);
            deactivate_sqr_btn("#confocal-back-btn");
            deactivate_dd("#look-up");
            break;
        case 66:
            displayed_img = sprites[26][3];
            reset_dd("#look-up", 3, 3);
            $("#live-btn").prop('disabled', true);
            $("#live-btn").css("cursor", "not-allowed");
            break;
        case 67:
            if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            tvCounter = 2;
            fRate = 6;
            $("#fps-txt").html((fRate / 12).toFixed(3));
            $("#single-light-path .light-path").css('opacity', '1');
            $("#live-btn").css("cursor", "");
            activate_round_btn("#live-btn");
            $("#live-btn").toggleClass("controls-btn-active", true);
            deactivate_round_btn("#capture-btn");
            raster_it();
            break;
        case 68:
            reset_dd("#pinhole-size", 4, 4);
            $("#label-r").html("");
            tvCounter = 2;
            ctx_r.clearRect(0, 0, w_h, w_h);
            break;
        case 69:
            tvCounter = 2;
            $("#ost-txt").html("1.45&#181;m");
            if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
            displayed_img = sprites[34][0];
            draw_single();
            draw_single(ctx_r, sprites[34][0]);
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            tvCounter = 2;
            fRate = 6;
            $("#fps-txt").html((fRate / 12).toFixed(3));
            deactivate_round_btn("#capture-btn");
            reset_dd("#pinhole-size", 8);
            break;
        case 70:
            tvCounter = 2;
            $("#label-r").html("PINHOLE = 1.0 AU");
            draw_single(ctx_r, sprites[34][0]);
            break;
        case 71:
            LFM_step_num = 70;
            $("#label-r").html("PINHOLE = 1.0 AU");
            $("#pinhole01-modal").toggleClass("totally-hidden", true);
            draw_single(ctx_r, sprites[34][0]);
            break;
        case 72:
            tvCounter = 2;
            $("#ost-txt").html("8.43&#181;m");
            displayed_img = sprites[34][1];
            if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            deactivate_round_btn("#capture-btn");
            reset_dd("#pinhole-size", 8);
            draw_single(ctx_l, sprites[34][1]);
            draw_single(ctx_r, sprites[34][1]);
            break;
        case 73:
            tvCounter = 2;
            $("#label-r").html("PINHOLE = OPEN");
            draw_single();
            draw_single(ctx_r, sprites[34][1]);
            reset_dd("#look-up", 2, 2);
            deactivate_dd("#look-up");
            $("#pinhole02-modal").toggleClass("totally-hidden", true);
            break;
        case 74:
            reset_dd("#pinhole-size", 4, 1);
            break;
        case 75:
            $("#ost-txt").html("1.12&#181;m");
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
            $("#single-light-path .light-path").css('opacity', '0');
            deactivate_round_btn("#capture-btn");
            draw_single(ctx_l, sprites[34][3]);
            break;
        case 76:
            draw_single(ctx_l, sprites[34][3]);
            break;
        case 77:
            draw_single(ctx_l, sprites[35][0]);
            deactivate_dd("#look-up");
            break;
        case 78:
            draw_single(ctx_l, sprites[35][0]);
            deactivate_round_btn("#live-btn");
            break;
        case 79:
            $("#live-btn").css("cursor", "");
            cancelAnimationFrame(rasterEffect);
            $("#single-light-path .light-path").css('opacity', '0');
            draw_single(ctx_l, sprites[35][1]);
            break;
        case 80:
            cancelAnimationFrame(rasterEffect);
            tvCounter = 2;
            $("#single-light-path .light-path").css('opacity', '1');
            activate_round_btn("#live-btn");
            $("#live-btn").toggleClass("controls-btn-active", true);
            $("#close-conf-scenarios").trigger("click");
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            deactivate_round_btn("#capture-btn");
            $("#capture-btn").toggleClass("btn-disabled", false);
            raster_it();
            fRate = 12;
            $("#fps-txt").html((fRate / 12).toFixed(3));
            break;
        case 81:
            tvCounter = 2;
            draw_single();
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            break;
        case 82:
            deactivate_round_btn("#live-btn");
            displayed_img = sprites[35][2];
            draw_single();
            break;
        case 83:
            $("#live-btn").css("cursor", "");
            cancelAnimationFrame(rasterEffect);
            $("#single-light-path .light-path").css('opacity', '0');
            draw_single(ctx_l, sprites[35][2]);

            break;
        case 84:
            cancelAnimationFrame(rasterEffect);
            tvCounter = 2;
            activate_round_btn("#live-btn");
            $("#live-btn").toggleClass("controls-btn-active", true);
            $("#close-conf-scenarios").trigger("click");
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            deactivate_round_btn("#capture-btn");
            $("#capture-btn").toggleClass("btn-disabled", false);
            $("#single-light-path .light-path").css('opacity', '1');
            raster_it();
            fRate = 2;
            $("#fps-txt").html((fRate / 12).toFixed(3));
            break;
        case 85:
            draw_single();
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            reset_dd("#look-up", 3, 2);
            deactivate_dd("#look-up");
            $("#dwell-modal").toggleClass("totally-hidden", true);
            break;
        case 86:

            break;
        case 87:
            deactivate_round_btn("#live-btn");
            break;
        case 88:
            cancelAnimationFrame(rasterEffect);
            displayed_img = sprites[35][4];
            draw_single();
            $("#single-light-path .light-path").css('opacity', '0');
            $("#live-btn").css("cursor", "");
            reset_dd("#image-size", 2, 3);
            deactivate_dd("#image-size");

            break;
        case 89:
            fRate = 6;
            $("#fps-txt").html((fRate / 12).toFixed(3));
            displayed_img = sprites[36][1];
            $("#live-btn").prop('disabled', true);
            $("#live-btn").css("cursor", "not-allowed");
            break;
        case 90:
            parrays_bool = false;
            if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
            if (rasterZoomEffect != undefined) cancelAnimationFrame(rasterZoomEffect);
            tvCounter = 2;
            fRate = 1.5;
            $("#fps-txt").html((fRate / 12).toFixed(3));
            $("#single-light-path .light-path").css('opacity', '1');
            save_w_h = 1024;
            displayed_img = sprites[36][5];
            $("#live-btn").css("cursor", "");
            activate_round_btn("#live-btn");
            $("#live-btn").toggleClass("controls-btn-active", true);
            $("#image-size-button .ui-selectmenu-text").html("1024 x 1024");
            deactivate_dd("#image-size");
            $("#zoom").slider("disable");
            $("#zoom").slider("value", 0);
            deactivate_slider("#zoom");
            raster_it();
            $("#close-conf-scenarios").trigger("click");
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            break;
        case 91:
            alert("nothing here");
            break;
        case 92:
            deactivate_dd("#scan-mode");
            break;
        case 93:

            break;
        case 94:
            deactivate_round_btn("#live-btn");
            break;
        case 95:
            $("#live-btn").css("cursor", "");
            cancelAnimationFrame(rasterEffect);
            $("#single-light-path .light-path").css('opacity', '0');
            draw_single(ctx_l, sprites[36][5]);
            break;
        case 96:
            cancelAnimationFrame(rasterEffect);
            tvCounter = 2;
            fRate = 6;
            $("#fps-txt").html((fRate / 12).toFixed(3));
            $("#single-light-path .light-path").css('opacity', '1');
            activate_round_btn("#live-btn");
            $("#live-btn").toggleClass("controls-btn-active", true);
            $("#channel-4-checkbox").css("cursor", "");
            $("#channel-4-checkbox").prop('checked', false);
            $("#channel-4-checkbox").prop('disabled', true);
            raster_it();
            break;
        case 97:
            $("#ost-txt").html("1.45&#181;m");
            $("#channel-4-checkbox").prop('checked', false);
            $("#channel-4-checkbox").prop('disabled', true);
            reset_slider("#laser4", 0);
            reset_slider("#gain4", 0);
            draw_single(ctx_l, sprites[37][0]);
            deactivate_round_btn("#live-btn");
            break;
        case 98:
            $("#simultaneous-light-path .light-path").css('opacity', '0');
            $("#single-light-path .light-path").css('opacity', '0');
            $("#live-btn").css("cursor", "");
            $("#label-r").html("");
            if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
            if (rasterEffect_r != undefined) cancelAnimationFrame(rasterEffect_r);
            draw_single(ctx_l, sprites[37][0]);
            ctx_r.clearRect(0, 0, w_h, w_h);
            break;
        case 99:
            if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
            if (rasterEffect_r != undefined) cancelAnimationFrame(rasterEffect_r);
            tvCounter = 2;
            fRate = 3;
            $("#fps-txt").html((fRate / 12).toFixed(3));
            $("#simultaneous-light-path .light-path").css('opacity', '1');
            activate_round_btn("#live-btn");
            $("#live-btn").toggleClass("controls-btn-active", true);
            deactivate_round_btn("#capture-btn");
            $("#capture-btn").toggleClass("btn-disabled", false);
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            raster_it();
            raster_it_r();
            break;
        case 100:
            tvCounter = 2;
            //            draw_single();
            draw_single(ctx_l, sprites[37][0]);
            draw_single(ctx_r, sprites[37][1]);
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            reset_dd("#scan-mode", 1, 1);
            deactivate_dd("#scan-mode");
            break;
        case 101:
            deactivate_round_btn("#capture-btn");
            draw_single(ctx_l, sprites[37][0]);
            draw_single(ctx_r, sprites[37][1]);
            $("#single-light-path .light-path").css('opacity', '0');
            $("#capture-btn").toggleClass("btn-disabled", false);
            if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
            if (rasterEffect_r != undefined) cancelAnimationFrame(rasterEffect_r);
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            break;
        case 102:
            ctx_l.clearRect(0, 0, w_h, w_h);
            ctx_r.clearRect(0, 0, w_h, w_h);
            $("#multich03-modal").toggleClass("totally-hidden", true);
            break;
        case 103:
            draw_single(ctx_l, sprites[37][3]);
            draw_single(ctx_r, sprites[37][4]);
            deactivate_round_btn("#live-btn");
            $("#channel-2-checkbox").prop('checked', false);
            $("#channel-2-checkbox").prop('disabled', true);
            $("#canvasf-modal").toggleClass("totally-hidden", true);
            reset_slider("#laser2", 0);
            reset_slider("#gain2", 0);
            totally_deactivate_channel("channel-2");
            break;
        case 104:
            $("#live-btn").css("cursor", "");
            $("#label-l").html("CHANNEL 3");
            $("#label-r").html("CHANNEL 4");
            $("#single-light-path .light-path").css('opacity', '0');
            if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
            if (rasterEffect_r != undefined) cancelAnimationFrame(rasterEffect_r);
            if (rasterEffect_f != undefined) cancelAnimationFrame(rasterEffect_f);
            draw_single(ctx_l, sprites[37][3]);
            draw_single(ctx_r, sprites[37][4]);
            break;
        case 105:
            if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
            if (rasterEffect_r != undefined) cancelAnimationFrame(rasterEffect_r);
            if (rasterEffect_f != undefined) cancelAnimationFrame(rasterEffect_f);
            tvCounter = 2;
            fRate = 6;
            $("#fps-txt").html((fRate / 12).toFixed(3));
            ch2_lightpath_fn();
            $("#close-conf-scenarios").trigger("click");
            activate_round_btn("#live-btn");
            $("#live-btn").toggleClass("controls-btn-active", true);
            deactivate_round_btn("#capture-btn");
            $("#capture-btn").toggleClass("btn-disabled", false);
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            raster_it(true, true);
            $("#multich04-modal").toggleClass("totally-hidden", true);
            break;
        case 106:
            break;
        case 107:
            $("#ost-txt").html("1.63&#181;m");
            $("#label-l").html("");
            $("#label-r").html("");
            if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
            ctx_l.clearRect(0, 0, w_h, w_h);
            deactivate_round_btn("#live-btn");
            $("#live-btn").css("cursor", "");
            $('#channel-2-checkbox').css('cursor', '');
            $("#channel-2-checkbox").prop('checked', true);
            $("#channel-2-checkbox").prop('disabled', false);
            activate_channel("channel-2");
            $("#channel-2 .ui-slider-vertical").slider("disable");
            $('#channel-4-checkbox').css('cursor', '');
            $("#channel-4-checkbox").prop('checked', true);
            $("#channel-4-checkbox").prop('disabled', false);
            activate_channel("channel-4");
            $("#channel-4 .ui-slider-vertical").slider("disable");
            reset_slider("#zpos", 114);
            $("#zpos").slider("disable");
            $("#zpos-div p").toggleClass("label-disabled", true);
            $("#zpinhole-title").toggleClass("pinhole-title-disabled", true);
            deactivate_sqr_btn("#bottomz-btn");
            $("#bottomz-label").css('opacity', '1');
            $("#bottomz-label").toggleClass("label-disabled", true);
            $("#single-light-path .light-path").css('opacity', '0');
            break;
        case 108:
            $("#live-btn").prop('disabled', true);
            $("#live-btn").css("cursor", "not-allowed");
            reset_slider("#zpos", 114);
            displayed_img = sprites[38][96];
            deactivate_sqr_btn("#topz-btn");
            $("#bottomz-label").css('opacity', '1');
            $("#bottomz-label").toggleClass("label-disabled", true);
            deactivate_sqr_btn("#bottomz-btn");
            $("#topz-label").css('opacity', '1');
            $("#topz-label").toggleClass("label-disabled", true);
            break;
        case 109:
            displayed_img = sprites[38][0];
            $("#topz-label").css('opacity', '1');
            reset_slider("#zpos", 0);
            deactivate_sqr_btn("#topz-btn");
            $("#zpos").slider("enable");
            reset_dd("#step-size");
            deactivate_dd("#step-size");
            break;
        case 110:
            $("#zstacks-modal").toggleClass("totally-hidden", true);
            activate_dd("#step-size");
            $("#live-btn").prop('disabled', true);
            $("#live-btn").css("cursor", "not-allowed");
            break;
        case 111:
            fRate = 6;
            $("#fps-txt").html((fRate / 12).toFixed(3));
            if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
            if (rasterEffect_r != undefined) cancelAnimationFrame(rasterEffect_r);
            if (rasterEffect_f != undefined) cancelAnimationFrame(rasterEffect_f);
            displayed_img = sprites[38][($("#zpos").slider("value"))];
            $("#live-btn").css("cursor", "");
            activate_round_btn("#live-btn");
            $("#live-btn").toggleClass("controls-btn-active", true);
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            raster_it();
            ch3_lightpath_fn();
            break;
        case 112:
            tvCounter = 2;
            draw_single(ctx_r, displayed_img_r);
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            $("#videoz-modal").toggleClass("totally-hidden", true);
            $("#single-light-path .light-path").css('opacity', '0');
            break;
        case 113:
            reset_dd("#step-size", 7, 1);
            deactivate_dd("#step-size");
            break;
        case 114:
            $('#zstacks-video').attr('src', zstack_video_1.src);
            $("#videoz-txt").html("Channel 3 3D image projection and rotation.");
            if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
            draw_single(ctx_l, sprites[38][200]);
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            $("#single-light-path .light-path").css('opacity', '0');
            break;
        case 115:
            draw_single(ctx_l, sprites[38][200]);
            $("#videoz-modal").toggleClass("totally-hidden", true);
            break;
        case 116:
            $("#channel-2-checkbox").prop('checked', false);
            $("#channel-2-checkbox").prop('disabled', true);
            break;
        case 117:
            $("#label-l").html("");
            $("#label-r").html("");
            $("#channel-2-checkbox").prop('checked', false);
            $("#channel-2-checkbox").prop('disabled', true);
            $("#channel-4-checkbox").prop('checked', false);
            $("#channel-4-checkbox").prop('disabled', true);
            break;
        case 118:
            ctx_l.clearRect(0, 0, w_h, w_h);
            ctx_f.clearRect(0, 0, w_h, w_h);
            $("#single-light-path .light-path").css('opacity', '0');
            draw_single(ctx_l, sprites[38][200]);
            if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
            if (rasterEffect_r != undefined) cancelAnimationFrame(rasterEffect_r);
            if (rasterEffect_f != undefined) cancelAnimationFrame(rasterEffect_f);
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            $("#videoz-txt").html("Channel 3 3D image projection and rotation.");
            $('#zstacks-video').attr('src', zstack_video_2.src);
            $("#canvasf-modal").toggleClass("totally-hidden", true);
            $("#channel-4-checkbox").prop('checked', false);
            $("#channel-4-checkbox").prop('disabled', true);
            break;
        case 119:
            $("#close-conf-scenarios").trigger("click");
            $("#conf-txt-modal").toggleClass("totally-hidden", true);
            $("#videoz-modal").toggleClass("totally-hidden", true);
            if (rasterEffect != undefined) cancelAnimationFrame(rasterEffect);
            if (rasterEffect_r != undefined) cancelAnimationFrame(rasterEffect_r);
            if (rasterEffect_f != undefined) cancelAnimationFrame(rasterEffect_f);
            break;
    }
}
// ======================= END ======================== //
