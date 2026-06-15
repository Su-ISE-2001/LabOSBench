/* explore javascript functions        

Created  by Andres Vasquez for Microscopy Australia https://www.myscope.training
info@andresvasquez.net  —— https://www.andresvasquez.net ——
copyright:This work is licensed under a Creative Commons Attribution 4.0 International License.

************************************************************************/


var canvas = document.getElementById('micrograph-canvas');
var ctx = canvas.getContext('2d');
let bufferC = document.createElement("canvas");
let bufferCtx = bufferC.getContext("2d");
let BSE_micrograph = "/static/simulator/eds_simulator/images/simulator/microanalysis/micrograph.jpg";
let colour_map = "/static/simulator/eds_simulator/images/simulator/microanalysis/phases_colour.svg";
var image = new Image();
image.src = BSE_micrograph;
var image_colour = new Image();
image_colour.src = colour_map;
let load_images_arr = ['Al-map.jpg', 'bse.jpg', 'Ca-map.jpg', 'composite.jpg', 'elements_6.jpg', 'elements_7.jpg', 'elements_8.jpg', 'elements_9.jpg', 'elements_10.jpg', 'elements_11.jpg', 'elements_13.jpg', 'elements_no_Si.jpg', 'elements_sum.jpg', 'elements.jpg', 'Fe-map.jpg', 'interest.jpg', 'Mg-map.jpg', 'micrograph.jpg', 'minimaps_win.jpg', 'minimaps-composite.jpg', 'minimaps.jpg', 'Na-map.jpg', 'O-map.jpg', 'P-map.jpg', 'S-map.jpg', 'semiquant_6.jpg', 'semiquant_7.jpg', 'semiquant_8.jpg', 'semiquant_9.jpg', 'semiquant_10.jpg', 'semiquant_11.jpg', 'semiquant_13.jpg', 'Ti-map.jpg', 'microanalisys_bkgw_01.svg', 'microanalisys_bkgw_02.svg', 'phases_colour.svg']

let canvas_w = 1816;
let canvas_h = 1270;
bufferC.width = canvas_w;
bufferC.height = canvas_h;

let hex_id;
let spectrum_id;
let analysis_mode;
let spectrum_curve;
let spectrum_flat;
let y_ranges_svg;
let element_labels;
let zoom_map = false;
let clickable_bse_map = false;
// ======================= START ======================== //
const i_promise_jpg = (path_str, id_str) => {
    xy_data = []; //???????????
    data_promises = [];
    for (let index in load_images_arr) {
        var promise = Loader.jpg(`${path_str}${load_images_arr[index]}`, `${id_str}_${index}`);
        data_promises.push(promise);
    }
    Promise.all(data_promises).then(messages => {
        load_finished();
    }).catch(error => {
        console.error("Rejected!", error);
    });
}
i_promise_jpg(`/static/simulator/eds_simulator/images/simulator/microanalysis/`, `img`);
// =======================  END END  ==================== //
$(document).ready(function () {
    $(".modal-reconstruct").draggable();
});
// ======================= START ======================== //
const activateLabel = () => {
    instruction = "The spectrum shows the X-ray energy peaks for the the elements present in the selected area.<br>Click <b>Label</b> to choose elements to map.";
    setTimeout(function () {
        toogle_fn("#btn-label", "btn-disabled", true);
        showInstruction(instruction);
    }, 2500);

};
// =======================  END END  ==================== //
// ======================= START ======================== //
const load_finished = () => {
    toogle_fn("#modal-load", "totally-hidden", false);
    toogle_fn("#modal-init", "totally-hidden", true);
}
// =======================  END END  ==================== //
// ======================= START ======================== //
image.onload = function () {
    ctx.drawImage(image, 0, 0);
}
image_colour.onload = function () {
    bufferCtx.drawImage(image_colour, 0, 0);
}

// ======================= END  ======================== //
//// ======================= START ======================== //
let map_to_clear = "mini-bse";
const select_minimised = (mini_map) => {
    toogle_fn("#" + mini_map, "mini-btn-active", false);
    toogle_fn("#" + mini_map, "mini-btn", true);
    toogle_fn("#" + map_to_clear, "mini-btn-active", true);
    toogle_fn("#" + map_to_clear, "mini-btn", false);
    map_to_clear = mini_map;
}
// ======================= END  ======================== //
//// ======================= START ======================== //
const rgbToHex = (r, g, b) => {
    if (r > 255 || g > 255 || b > 255)
        throw "Invalid color component";
    return ((r << 16) | (g << 8) | b).toString(16);
}

$('#micrograph-canvas').mousedown(function (e) {
    let canvasOffset = $("#micrograph-canvas").offset();
    let cursorX = Math.floor(e.pageX - canvasOffset.left);
    let cursorY = Math.floor(e.pageY - canvasOffset.top);

    let canvasX = Math.floor((canvas_w / canvas.scrollWidth) * cursorX);
    let canvasY = Math.floor((canvas_h / canvas.scrollHeight) * cursorY);

    let imageData = bufferCtx.getImageData(canvasX, canvasY, 1, 1);
    let pixel = imageData.data;
    let pixel_color = "rgba(" + pixel[0] + ", " + pixel[1] + ", " + pixel[2] + ", " + pixel[3] + ")";
    hex_id = ("000000" + rgbToHex(pixel[0], pixel[1], pixel[2])).slice(-6);
    switch (hex_id) {
        case "fe010f":
            spectrum_id = 6;
            element_labels = labels_6;
            spectrum_curve = spectrum_6_curve;
            spectrum_flat = spectrum_6_flat;
            $("#y-ranges").attr("transform", "translate(27.0, 29.0)");
            $("#label").attr("transform", "translate(157.5, 2.0)");
            y_ranges_svg = y_ranges_6;
            break;
        case "00ddfe":
            spectrum_id = 7;
            element_labels = labels_7;
            spectrum_curve = spectrum_7_curve;
            spectrum_flat = spectrum_7_flat;
            $("#y-ranges").attr("transform", "translate(27.0, 16.0)");
            $("#label").attr("transform", "translate(145.5, 5.0)");
            y_ranges_svg = y_ranges_7;
            break;
        case "17fe2b":
            spectrum_id = 8;
            element_labels = labels_8;
            spectrum_curve = spectrum_8_curve;
            spectrum_flat = spectrum_8_flat;
            $("#y-ranges").attr("transform", "translate(27.0, 16.0)");
            $("#label").attr("transform", "translate(147.5, 1.0)");
            y_ranges_svg = y_ranges_8;
            break;
        case "fdfe00":
            spectrum_id = 9;
            element_labels = labels_9;
            spectrum_curve = spectrum_9_curve;
            spectrum_flat = spectrum_9_flat;
            $("#y-ranges").attr("transform", "translate(27.0, 65.0)");
            $("#label").attr("transform", "translate(145.5, -12.0)");
            y_ranges_svg = y_ranges_9;
            break;
        case "0109fe":
            spectrum_id = 10;
            element_labels = labels_10;
            spectrum_curve = spectrum_10_curve;
            spectrum_flat = spectrum_10_flat;
            $("#y-ranges").attr("transform", "translate(53.0, 9.0)");
            $("#label").attr("transform", "translate(143.5, -13.0)");
            y_ranges_svg = y_ranges_10;
            break;
        case "fe8301":
            spectrum_id = 11;
            element_labels = labels_11;
            spectrum_curve = spectrum_11_curve;
            spectrum_flat = spectrum_11_flat;
            $("#y-ranges").attr("transform", "translate(27.0, 71.0)");
            $("#label").attr("transform", "translate(149.5, -11.0)");
            y_ranges_svg = y_ranges_11;
            break;
        case "fe01b8":
            spectrum_id = 13;
            element_labels = labels_13;
            spectrum_curve = spectrum_13_curve;
            spectrum_flat = spectrum_13_flat;
            $("#y-ranges").attr("transform", "translate(27.0, 26.0)");
            $("#label").attr("transform", "translate(144.5, -11.0)");
            y_ranges_svg = y_ranges_13;
            break;
    }
    screen_next();
});

// ======================= END  ======================== //
// ======================= START ======================== //
const screen_next = () => {
    reset_analysis();
    animate_analysis();
    toogle_fn(".screen-1", "totally-hidden", false);
    toogle_fn(".screen-2", "totally-hidden", true);
    //    toogle_fn("#btn-label", "btn-disabled", true);
    $('#btn-label').prop('disabled', false);
    switch (analysis_mode) {
        case "area":
            instruction = "The spectrum shows the X-ray energy peaks for the the elements present in the selected area.<br>Click <b>Label</b> to choose elements to map.";
            break;
        case "point":
            instruction = "The spectrum shows the X-ray energy peaks for the the elements present in the selected point.<br>Click <b>Label</b> to choose elements to map.";
            showInstruction(instruction);
            break;
    }
};
// ======================= END ======================== //
// ======================= START ======================== //
const select_other = () => {
    reset_analysis();
    toogle_fn(".screen-1", "totally-hidden", true);
    toogle_fn(".screen-2", "totally-hidden", false);
};
// ======================= END ======================== //
// ======================= START ======================== //
let curve_svg = document.getElementById('curve');
let y_ranges = document.getElementById('y-ranges');

const reset_analysis = () => {
    curve_svg.setAttribute('d', spectrum_flat);
    y_ranges.innerHTML = y_ranges_svg;
};
// ======================= END ======================== //
//// ======================= START ======================== //
let timeline = anime.timeline({
    autoplay: true,
    direction: 'normal',
    loop: false
});

const animate_analysis = () => {
    anime({
        targets: '#curve',
        d: {
            value: spectrum_curve,
            opacity: 0,
            duration: 2500,
            delay: 100,
            easing: 'easeInQuad',
            complete: function (anim) {
                activateLabel();
            }
        }
    })
}
// ======================= END ======================== //
//// ======================= START ======================== //
const finish_modal_fn = () => {
    toogle_fn("#modal-save", "totally-hidden", true);
}
// ======================= END ======================== //
//// ======================= START ======================== //
let area_animation = 0;
$(".area").bind('oanimationend animationend webkitAnimationEnd', function () {
    area_animation++
    toogle_fn("#area_analysis", "area_selection", true);
    toogle_fn("#area_analysis", "area_selection", true);
    toogle_fn("#area_analysis", "blink", false);
    if (area_animation == 2) screen_next();
});
// ======================= END  ======================== //
//// ======================= START ======================== //
$("#area-btn").click(() => {
    analysis_mode = "area";
    spectrum_curve = spectrum_sum_curve;
    spectrum_flat = spectrum_sum_flat;
    y_ranges_svg = y_ranges_sum;
    toogle_fn("#modal-init", "totally-hidden", false);
    toogle_fn("#modal-area", "totally-hidden", true);
});
$("#point-btn").click(() => {
    analysis_mode = "point";
    instruction = "Choose a point of analytical interest and begin the microanalysis.<br>Click anywhere in the backscattered image."
    showInstruction(instruction);
    $("#micrograph-canvas").css("cursor", "crosshair");
    toogle_fn("#modal-init", "totally-hidden", false);
});
// ======================= END  ======================== //
//// ======================= START ======================== //
let close_area_modal = 0;
$("#close-area").click(() => {
    toogle_fn("#modal-area", "totally-hidden", false);
    switch (close_area_modal) {
        case 0:
            if (analysis_mode == "area") {
                toogle_fn("#area_analysis", "totally-hidden", true);
                toogle_fn("#area_analysis", "area_selection", false);
            }
            if (analysis_mode == "point") {
                instruction = "Click <b>Semi-quant</b> to display how much of each element is present."
                showInstruction(instruction);
            }
            break;
        case 1:
            if (analysis_mode == "area") {
                instruction = "Click <b>Maps</b> to display an intensity map for each selected element. The correct mapping parameters have been set for you (e.g. pixel matrix and dead time)."
            }
            if (analysis_mode == "point") {
                $("#retake-txt").html("Restart the activity or explore an area of analytical interest in the sample.")
                $("#finished-txt").html("Well done! <br>You finished the identification of the elements in a specific point of analytical interest.")
                instruction = "You have now finished this activity. To select a new point of analytical interest, click the BSE Image.<br>When ready, click <a class='finished-activity' onclick='finish_modal_fn()'>HERE</a> to proceed.";
                $("#bottom-right").css("cursor", "pointer");
                clickable_bse_map = true;
            }
            showInstruction(instruction);
            break;
        case 2:
            instruction = "Our research is focused on non-silicate minerals.<br>Click the <b>Elements of Interest</b> checkbox to remove silicon."
            showInstruction(instruction);
            break;
        case 3:
            instruction = "Congratulations! You have now finished this activity. Feel free to keep exploring the other element maps.<br>When ready, click <a class='finished-activity' onclick='finish_modal_fn()'>HERE</a> to proceed."
            showInstruction(instruction);
            break;
    }
    close_area_modal++
});
// ======================= END  ======================== //
//// ======================= START ======================== //
$("#close-zoom").click(() => {
    toogle_fn("#zoom-modal", "totally-hidden", false);
});
// ======================= END  ======================== //
//// ======================= START ======================== //
$("#close-save").click(() => {
    toogle_fn("#modal-save", "totally-hidden", false);
});
// ======================= END  ======================== //
//// ======================= START ======================== //
$("#btn-label").click(() => {
    toogle_fn("#top-instructions", "top-instructions-on", true);
    toogle_fn("#btn-label", "btn-disabled", false);
    $('#btn-label').prop('disabled', true);
    $("#label").html(labels_sum);
    $("#info-area").html("The elements to be mapped can be selected as desired. Here they have been selected for you.");
    toogle_fn("#modal-area", "totally-hidden", true);
    if (analysis_mode == "area") {
        $("#elements-div").css("background-image", "url(/static/simulator/eds_simulator/images/simulator/microanalysis/elements_sum.jpg)");
        toogle_fn("#btn-maps", "btn-disabled", true);
        $('#btn-maps').prop('disabled', false);
    }
    if (analysis_mode == "point") {
        $("#label").html(element_labels);
        $("#elements-div").css("background-image", "url(/static/simulator/eds_simulator/images/simulator/microanalysis/elements_" + spectrum_id + ".jpg)");
        toogle_fn("#btn-semiquant", "btn-disabled", true);
        $('#btn-semiquant').prop('disabled', false);
    }

});
// ======================= END  ======================== //
//// ======================= START ======================== //
$("#btn-maps").click(() => {
    toogle_fn("#top-instructions", "top-instructions-on", true);
    $("#info-area").html("A number of small thumbnail images appear in the Minimised Maps window, including the scanning electron microscope image itself.<br>These maps use a grey scale or colour scale to display element concentrations.");
    toogle_fn("#modal-area", "totally-hidden", true);
    $("#minimaps-div").css("background-image", "url(/static/simulator/eds_simulator/images/simulator/microanalysis/minimaps.jpg)");
    toogle_fn("#inner-minimaps", "totally-hidden", true);
    toogle_fn("#btn-maps", "btn-disabled", false);
    $('#btn-maps').prop('disabled', true);
    toogle_fn("#btn-elements", "btn-disabled", true);
    $('#btn-elements').prop('disabled', false);
});
// ======================= END  ======================== //
//// ======================= START ======================== //
$("#btn-elements").click(() => {
    toogle_fn(".mini-temp-invisible", "mini-btn", false);
    toogle_fn(".mini-btn", "mini-temp-invisible", true);
    if ($('#btn-elements').val() == "off") {
        $('#btn-elements').val("on");
        $('#btn-elements').html("ALL ELEMENTS");
        toogle_fn("#Si", "totally-hidden", false);
        toogle_fn("#top-instructions", "top-instructions-on", true);
        instruction = "Select a thumbnail image to view the map. Click the map to zoom.<br>When ready, click <b>Composite</b> to create a composite map."
        showInstruction(instruction);
        toogle_fn("#mini-si", "map", true);
        toogle_fn("#mini-si", "mini-btn-invisible", false);
        toogle_fn("#mini-si", "mini-btn", true);
        $("#elements-div").css("background-image", "url(/static/simulator/eds_simulator/images/simulator/microanalysis/elements_no_Si.jpg)");
        $("#minimaps-div").css("background-image", "url(/static/simulator/eds_simulator/images/simulator/microanalysis/interest.jpg)");
        toogle_fn("#btn-composite", "btn-disabled", true);
        $('#btn-composite').prop('disabled', false);
    } else {
        $('#btn-elements').val("off");
        $('#btn-elements').html("ELEMENTS OF INTEREST");
        toogle_fn("#Si", "totally-hidden", true);
        toogle_fn("#top-instructions", "top-instructions-on", true);
        toogle_fn("#mini-si", "map", false);
        toogle_fn("#mini-si", "mini-btn", false);
        toogle_fn("#mini-si", "mini-btn-invisible", true);
        $("#elements-div").css("background-image", "url(/static/simulator/eds_simulator/images/simulator/microanalysis/elements_sum.jpg)");
        $("#minimaps-div").css("background-image", "url(/static/simulator/eds_simulator/images/simulator/microanalysis/minimaps.jpg)");
        toogle_fn("#btn-composite", "btn-disabled", false);
        $('#btn-composite').prop('disabled', true);
    }
    zoom_map = true;
    $("#map-div").css("cursor", "zoom-in");
});
// ======================= END  ======================== //
//// ======================= START ======================== //
$("#btn-composite").click(() => {
    toogle_fn("#top-instructions", "top-instructions-on", true);
    $("#info-area").html("A composite map combines the colour values of the maps to show multiple element concentrations in a single image.");
    toogle_fn("#modal-area", "totally-hidden", true);
    $("#minimaps-div").css("background-image", "url(/static/simulator/eds_simulator/images/simulator/microanalysis/minimaps-composite.jpg)");
    $("#map-div").css("background-image", "url(/static/simulator/eds_simulator/images/simulator/microanalysis/composite.jpg)");
    $("#zoomed-img").attr("src", "/static/simulator/eds_simulator/images/simulator/microanalysis/composite.jpg");
    toogle_fn("#mini-composite", "mini-btn-invisible", true);
    toogle_fn("#mini-composite", "mini-btn", false);
    select_minimised("mini-composite");
    $("#map-title").html("Composite");
    toogle_fn("#btn-composite", "btn-disabled", false);
    $('#btn-composite').prop('disabled', true);
    toogle_fn("#btn-elements", "btn-disabled", false);
    $('#btn-elements').prop('disabled', true);
});
// ======================= END  ======================== //
//// ======================= START ======================== //
$("#map-div").click(() => {
    if (zoom_map) {
        toogle_fn("#zoom-modal", "totally-hidden", true);
    }
});
// ======================= END  ======================== //
//// ======================= START ======================== //
$('.map').click(function (e) {
    let my_id = e.target.id;
    if (!$("#" + my_id).hasClass("mini-btn-active")) select_minimised(my_id);
    //    toogle_fn(".map", "mini-btn-active", true);
    let layered_image = "";
    switch (my_id) {
        case "mini-al":
            layered_image = "/static/simulator/eds_simulator/images/simulator/microanalysis/Al-map.jpg";
            $("#map-title").html("Al K&#945;1");
            break;
        case "mini-ca":
            layered_image = "/static/simulator/eds_simulator/images/simulator/microanalysis/Ca-map.jpg";
            $("#map-title").html("Ca K&#945;1");
            break;
        case "mini-fe":
            layered_image = "/static/simulator/eds_simulator/images/simulator/microanalysis/Fe-map.jpg";
            $("#map-title").html("Fe K&#945;1");
            break;
        case "mini-mg":
            layered_image = "/static/simulator/eds_simulator/images/simulator/microanalysis/Mg-map.jpg";
            $("#map-title").html("Mg K&#945;1");
            break;
        case "mini-bse":
            layered_image = "/static/simulator/eds_simulator/images/simulator/microanalysis/bse.jpg";
            $("#map-title").html("BSE Image");
            break;
        case "mini-na":
            layered_image = "/static/simulator/eds_simulator/images/simulator/microanalysis/Na-map.jpg";
            $("#map-title").html("Na K&#945;1");
            break;
        case "mini-o":
            layered_image = "/static/simulator/eds_simulator/images/simulator/microanalysis/O-map.jpg";
            $("#map-title").html("O K&#945;1");
            break;
        case "mini-p":
            layered_image = "/static/simulator/eds_simulator/images/simulator/microanalysis/P-map.jpg";
            $("#map-title").html("P K&#945;1");
            break;
        case "mini-s":
            layered_image = "/static/simulator/eds_simulator/images/simulator/microanalysis/S-map.jpg";
            $("#map-title").html("S K&#945;1");
            break;
        case "mini-si":
            layered_image = "/static/simulator/eds_simulator/images/simulator/microanalysis/Si-map.jpg";
            $("#map-title").html("Si K&#945;1");
            break;
        case "mini-ti":
            layered_image = "/static/simulator/eds_simulator/images/simulator/microanalysis/Ti-map.jpg";
            $("#map-title").html("Ti K&#945;1");
            break;
        case "mini-composite":
            layered_image = "/static/simulator/eds_simulator/images/simulator/microanalysis/composite.jpg";
            $("#map-title").html("Composite");
            break;
        default:
    }
    $("#map-div").css("background-image", "url(" + layered_image + ")");
    $("#zoomed-img").attr("src", layered_image);
});
// ======================= END  ======================== //
//// ======================= START ======================== //
$('#btn-semiquant').click(function (e) {
    toogle_fn("#top-instructions", "top-instructions-on", true);
    $("#info-area").html("The results in the table are from standardless semi-quantitative (semi-quant) analysis that only uses factory-calibrated matrix correction (e.g. ZAF correction).");
    toogle_fn("#modal-area", "totally-hidden", true);
    $("#minimaps-div").css("background-image", "url(/static/simulator/eds_simulator/images/simulator/microanalysis/semiquant_" + spectrum_id + ".jpg)");
    toogle_fn("#btn-semiquant", "btn-disabled", false);
    $('#btn-semiquant').prop('disabled', true);
});
// ======================= END  ======================== //
//// ======================= START ======================== //
$('#bottom-right').click(function (e) {
    if (clickable_bse_map) {
        close_area_modal = 0;
        analysis_mode = "point";
        instruction = "Choose a point of analytical interest and begin the microanalysis.<br>Click anywhere in the backscattered image."
        showInstruction(instruction);
        $("#micrograph-canvas").css("cursor", "crosshair");
        toogle_fn("#modal-init", "totally-hidden", false);
        toogle_fn(".screen-1", "totally-hidden", true);
        toogle_fn(".screen-2", "totally-hidden", false);
        curve_svg.removeAttribute('d');
        y_ranges.innerHTML = "";
        $("#label").html("");
        $("#bottom-right").css("cursor", "default");
        $("#elements-div").css("background-image", "url(/static/simulator/eds_simulator/images/simulator/microanalysis/elements.jpg)");
        $("#minimaps-div").css("background-image", "url(/static/simulator/eds_simulator/images/simulator/microanalysis/minimaps_win.jpg)");
        clickable_bse_map = false;
    }
});
// ======================= END  ======================== //
//// ======================= START ======================== //
// ======================= BENCHMARK: 单子任务快进到指定子任务起点 ======================== //
(function () {
    var SUBTASK_ORDER = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];

    function markPrefixSuccess(subtaskId) {
        var api = window.EDS_BENCHMARK_API;
        if (!api || typeof api.markSubtaskSuccess !== "function") return;
        var idx = SUBTASK_ORDER.indexOf(subtaskId);
        if (idx < 0) return;
        for (var i = 0; i < idx; i++) {
            api.markSubtaskSuccess(SUBTASK_ORDER[i]);
        }
    }

    /** 固定 spectrum_id=8，与拾取特定相位色块等价，便于可重复的快进 */
    function edsApplySpectrum8PointPicked() {
        spectrum_id = 8;
        element_labels = labels_8;
        spectrum_curve = spectrum_8_curve;
        spectrum_flat = spectrum_8_flat;
        $("#y-ranges").attr("transform", "translate(27.0, 16.0)");
        $("#label").attr("transform", "translate(147.5, 1.0)");
        y_ranges_svg = y_ranges_8;
        reset_analysis();
        curve_svg.setAttribute("d", spectrum_curve);
        toogle_fn(".screen-1", "totally-hidden", false);
        toogle_fn(".screen-2", "totally-hidden", true);
        $("#micrograph-canvas").css("cursor", "crosshair");
        $("#btn-label").prop("disabled", false);
        toogle_fn("#btn-label", "btn-disabled", true);
        zoom_map = false;
        clickable_bse_map = false;
        close_area_modal = 0;
    }

    function edsHideTeachingPanels() {
        try {
            toogle_fn("#top-instructions", "top-instructions-on", true);
            toogle_fn("#top-instructions", "top-instructions-on", false);
        } catch (e) {}
        try {
            $("#modal-area").addClass("totally-hidden");
            $("#info-area").html("");
        } catch (e2) {}
    }

    window.EDS_fast_forward_to_subtask = function (subtaskId) {
        if (SUBTASK_ORDER.indexOf(subtaskId) < 0) {
            console.warn("EDS_fast_forward_to_subtask: unknown id", subtaskId);
            return;
        }
        markPrefixSuccess(subtaskId);
        if (typeof window.jQuery === "undefined") return;

        try {
            switch (subtaskId) {
                case "S1":
                    toogle_fn("#modal-load", "totally-hidden", false);
                    toogle_fn("#modal-init", "totally-hidden", true);
                    break;
                case "S2":
                    $("#point-btn").trigger("click");
                    break;
                case "S3":
                    $("#point-btn").trigger("click");
                    edsApplySpectrum8PointPicked();
                    break;
                case "S4":
                    $("#point-btn").trigger("click");
                    edsApplySpectrum8PointPicked();
                    $("#btn-label").trigger("click");
                    break;
                case "S5":
                    $("#point-btn").trigger("click");
                    edsApplySpectrum8PointPicked();
                    $("#btn-label").trigger("click");
                    $("#btn-semiquant").trigger("click");
                    break;
                case "S6":
                    $("#point-btn").trigger("click");
                    edsApplySpectrum8PointPicked();
                    $("#btn-label").trigger("click");
                    $("#btn-semiquant").trigger("click");
                    $("#btn-maps").trigger("click");
                    break;
                case "S7":
                    $("#point-btn").trigger("click");
                    edsApplySpectrum8PointPicked();
                    $("#btn-label").trigger("click");
                    $("#btn-semiquant").trigger("click");
                    $("#btn-maps").trigger("click");
                    $("#btn-elements").trigger("click");
                    break;
                case "S8":
                    $("#point-btn").trigger("click");
                    edsApplySpectrum8PointPicked();
                    $("#btn-label").trigger("click");
                    $("#btn-semiquant").trigger("click");
                    $("#btn-maps").trigger("click");
                    $("#btn-elements").trigger("click");
                    $("#btn-composite").trigger("click");
                    clickable_bse_map = true;
                    $("#bottom-right").css("cursor", "pointer");
                    break;
                default:
                    break;
            }
        } catch (e) {
            console.warn("EDS_fast_forward_to_subtask", subtaskId, e);
        }
        edsHideTeachingPanels();
    };
})();
// ======================= END ======================== //
