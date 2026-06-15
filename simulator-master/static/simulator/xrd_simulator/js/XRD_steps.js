var XRD_step_num = 2;

// 步骤控制函数：根据当前步骤号调用对应的 XRD_step_x 函数
function next_step() {
    let callback = 'XRD_step_' + XRD_step_num;
    if (typeof window[callback] === 'function') {
        window[callback]();
    }
}

//function XRD_step_1 () {
//display_instruction();
//XRD_step_num = 2;
//next
//}

function XRD_step_2() {
    specimen_reset_fn();
    XRD_step_num = 2;
    display_instruction();
    activate_sqr_btn("#btn-doors", "#doors-label");
    deactivate_dd("#specimen");
    XRD_step_num = 3;
    //next
}

function XRD_step_3() {
    display_instruction();
    activate_sqr_btn("#btn-doors");
    XRD_step_num = 4;
    //next
}

function XRD_step_4() {
    display_instruction();
    deactivate_sqr_btn("#btn-doors");
    activate_sqr_btn("#btn-standby", "#standby-label");
    XRD_step_num = 5;
    //next
}

function XRD_step_5() {
    display_instruction();
    deactivate_sqr_btn("#btn-doors");
    activate_angles("#stats-start button", "#start-div");
    activate_angles("#stats-end button", "#end-div");
    activate_dd("#step");
    $("#start-angle-line").css("opacity", "1");
    $("#end-angle-group").css("opacity", "1");
    $("#scantime-label").toggleClass("label-disabled", false);
    $("#scantime-div").toggleClass("div-disabled", false);
    XRD_step_num = 6;
    //next
}

function XRD_step_6() {
    display_instruction();
    activate_dd("#time-step");
    XRD_step_num = 7;
    //next
}

function XRD_step_7() {
    display_instruction();
    XRD_step_num = 8;
    //next
}

function XRD_step_8() {
    display_instruction();
    //next
}