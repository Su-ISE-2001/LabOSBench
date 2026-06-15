/**
 * SEM 单步任务测试 API
 * 用于将 SEM 模拟器跳转到指定子任务的前置状态，或执行完全复位。
 * 本脚本独立于 benchmark_sem.js，不修改原有逻辑。
 *
 * 使用方式：
 *   window.SEM_SINGLE_STEP_API.gotoState('S7')  // 跳转到 S7 前置状态
 *   window.SEM_SINGLE_STEP_API.reset()         // 完全复位（刷新页面）
 *
 * 加载顺序：必须在 SEM_simulator.js 之后加载（依赖其全局变量）。
 */
(function () {
  if (typeof window === "undefined") return;
  const path = window.location.pathname || "";
  if (!path.includes("SEM_simulator")) return;

  function toogle_fn(element, className, bool) {
    if (typeof $ !== "undefined" && $(element).length) {
      if ($(element).hasClass(className) === bool) {
        $(element).toggleClass(className);
      }
    }
  }

  /** 平移方向键中间的「居中」(#sem-pan-center)，S12 下关闭以免一键复位视场 */
  function setSemPanCenterEnabled(on) {
    if (typeof $ === "undefined") return;
    var $b = $("#sem-pan-center");
    if (!$b.length) return;
    $b.prop("disabled", !on);
    $b.attr("aria-disabled", on ? "false" : "true");
    if (on) {
      $b.removeClass("sem-pan-btn-disabled");
    } else {
      $b.addClass("sem-pan-btn-disabled");
    }
  }

  function enableSliders() {
    if (typeof $ === "undefined" || !$.fn.slider) return;
    $("#acc-volt").slider("enable");
    $("#acc-volt").removeClass("acc-volt-disabled").removeAttr("disabled");
    $("#spot-size").slider("enable");
    $("#spot-size").removeClass("spot-size-disabled").removeAttr("disabled");
    $("#z-pos").slider("enable");
    $("#z-pos").removeClass("z-pos-disabled").removeAttr("disabled");
  }

  function enableAllControls() {
    if (typeof $ === "undefined") return;
    var controls = [
      "btn-vent", "btn-chamber", "btn-evacuate", "btn-tvrate", "btn-scan1", "btn-scan2",
      "btn-save", "btn-print", "btn-se", "ht-btn", "acc-volt", "spot-size", "z-pos",
      "brightness", "contrast", "magnification", "focus-c", "focus-f", "astigmatism-x", "astigmatism-y"
    ];
    controls.forEach(function (val) {
      $("#" + val).removeClass(val + "-disabled").removeAttr("disabled");
      if (typeof setKnobOrSliderInteractive === "function" &&
          ($("#" + val).hasClass("knob") || (typeof SEM_KNOB_TO_SLIDER !== "undefined" && SEM_KNOB_TO_SLIDER[val]))) {
        setKnobOrSliderInteractive(val, true);
      } else if ($("#" + val).hasClass("knob")) {
        $("#" + val).css("display", "block");
        $("#" + val).parent().css({ opacity: "1", cursor: "pointer" });
      }
    });
    enableSliders();
  }

  /**
   * 将模拟器设置为指定子任务的前置状态。
   * @param {string} sid - 子任务 ID，如 'S1', 'S7'
   * @returns {boolean} 是否成功
   */
  function gotoState(sid) {
    if (typeof chamberOpen === "undefined" || typeof sprite === "undefined") {
      console.warn("[SEM_SINGLE_STEP_API] SEM_simulator.js 未加载或变量不可用");
      return false;
    }

    try {
      if (typeof stopLoop === "function") stopLoop();
      if (typeof startChamber !== "undefined" && startChamber) {
        cancelAnimationFrame(startChamber);
        startChamber = 0;
      }
      if (typeof evac !== "undefined" && evac) {
        cancelAnimationFrame(evac);
        evac = 0;
      }
      if (typeof doTheNoise !== "undefined" && doTheNoise) {
        cancelAnimationFrame(doTheNoise);
        doTheNoise = 0;
      }
      if (typeof dotvNoise !== "undefined" && dotvNoise) {
        cancelAnimationFrame(dotvNoise);
        dotvNoise = 0;
      }

      setSemPanCenterEnabled(true);

      switch (sid) {
        case "S1":
          applyStateS1();
          break;
        case "S2":
          applyStateS2();
          break;
        case "S3":
          applyStateS3();
          break;
        case "S4":
          applyStateS4();
          break;
        case "S5":
          applyStateS5();
          break;
        case "S6":
          applyStateS6();
          break;
        case "S7":
          applyStateS7();
          break;
        case "S8":
          applyStateS8();
          break;
        case "S9":
          applyStateS9();
          break;
        case "S10":
          applyStateS10();
          break;
        case "S11":
          applyStateS11();
          break;
        case "S12":
          applyStateS12();
          break;
        default:
          console.warn("[SEM_SINGLE_STEP_API] 未知子任务:", sid);
          return false;
      }

      if (sid !== "S12" && typeof drawIt === "function") drawIt();
      return true;
    } catch (e) {
      console.error("[SEM_SINGLE_STEP_API] gotoState 失败:", e);
      return false;
    }
  }

  function resetChamberDisplay(spriteFrame) {
    if (typeof img_loaded !== "undefined") img_loaded = false;
    if (typeof bufferCanvas !== "undefined" && bufferCanvas && typeof bufferCanvasCtx !== "undefined" && bufferCanvasCtx && canvas) {
      bufferCanvas.width = canvas.width;
      bufferCanvas.height = canvas.height;
      if (spriteFrame > 0 && sprite && sprite[spriteFrame]) {
        bufferCanvasCtx.drawImage(sprite[spriteFrame], 0, 0, canvas.width, canvas.height);
      } else {
        bufferCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      if (spriteFrame > 0 && sprite && sprite[spriteFrame]) {
        ctx.drawImage(sprite[spriteFrame], 0, 0, canvas.width, canvas.height);
      }
    }
    var cb = document.getElementById("focus-blur");
    if (cb) cb.setStdDeviation(0, 0);
    var c = document.querySelector("#micrograph");
    if (c) c.style.filter = "url('#myblurfilter') contrast(1) brightness(1)";
    if ($) {
      $("#btn-vent, #btn-chamber, #btn-evacuate").removeClass("btn-active");
      $("#scalebar-div").addClass("totally-hidden");
    }
  }

  function applyStateS1() {
    chamberOpen = false;
    samplePlaced = false;
    htOn = false;
    stageRotation = false;
    volt_bool = false;
    counter = 0;
    if (typeof alpha !== "undefined") alpha = 1;
    kVs = volt_values ? volt_values[0] : 0;
    brightNms = 0;
    brightnessIncrement = 0;
    brightnessValue = 0;
    spot_bright = spot_valuesBright ? spot_valuesBright[0] : 0.1;
    spotSlider_blur = spot_valuesBlur ? spot_valuesBlur[0] : 0.5;
    zBlur = z_values ? z_values[0] : 5;
    coarseKnob = 0;
    fineKnob = 0;
    astig_X = 0;
    astig_Y = 0;
    trim = trim_values ? trim_values[0] : 1;
    noise = "tv_rate";
    fromScanModes = false;
    lastScanUsed = "";
    scaleBar_size = 5.4;
    scaleBar_unit = 20;
    if (currentSEsample) image.src = currentSEsample;
    if (example_img && currentSEsample) example_img.src = currentSEsample;
    enableAllControls();
    if ($ && $("#btn-chamber").length) $("#btn-chamber").html("OPEN").removeAttr("disabled");
    if ($ && $(".choose-sample").length) $(".choose-sample").addClass("totally-hidden");
    toogle_fn(".top-btns", "totally-hidden", true);
    resetChamberDisplay(0);
    if (typeof whiteNoise === "function") whiteNoise();
  }

  function applyStateS2() {
    applyStateS1();
    counter = 10;
    resetChamberDisplay(10);
  }

  function applyStateS3() {
    chamberOpen = true;
    samplePlaced = false;
    htOn = false;
    stageRotation = false;
    counter = 43;
    if (typeof img_loaded !== "undefined") img_loaded = false;
    enableAllControls();
    if ($ && $("#btn-chamber").length) $("#btn-chamber").html("CLOSE").removeAttr("disabled");
    if ($ && $(".choose-sample").length) $(".choose-sample").addClass("totally-hidden");
    toogle_fn(".top-btns", "totally-hidden", true);
    if (currentSEsample) image.src = currentSEsample;
    if ($) { $("#btn-vent, #btn-chamber, #btn-evacuate").removeClass("btn-active"); $("#scalebar-div").addClass("totally-hidden"); }
    resetChamberDisplay(43);
  }

  function applyStateS4() {
    chamberOpen = true;
    samplePlaced = true;
    htOn = false;
    stageRotation = true;
    counter = 66;
    if (typeof img_loaded !== "undefined") img_loaded = false;
    if (currentSEsample) image.src = currentSEsample;
    enableAllControls();
    if ($ && $("#btn-chamber").length) $("#btn-chamber").html("CLOSE").removeAttr("disabled");
    if ($ && $(".choose-sample").length) $(".choose-sample").addClass("totally-hidden");
    toogle_fn(".top-btns", "totally-hidden", true);
    if ($) { $("#btn-vent, #btn-chamber, #btn-evacuate").removeClass("btn-active"); $("#scalebar-div").addClass("totally-hidden"); }
    resetChamberDisplay(66);
  }

  function applyStateS5() {
    chamberOpen = false;
    samplePlaced = true;
    htOn = false;
    stageRotation = true;
    counter = 66;
    if (typeof img_loaded !== "undefined") img_loaded = false;
    enableAllControls();
    if ($ && $("#btn-chamber").length) $("#btn-chamber").html("CLOSE").attr("disabled", true).addClass("btn-chamber-disabled");
    if ($ && $(".choose-sample").length) $(".choose-sample").addClass("totally-hidden");
    toogle_fn(".top-btns", "totally-hidden", true);
    if ($) { $("#btn-vent, #btn-chamber, #btn-evacuate").removeClass("btn-active"); $("#scalebar-div").addClass("totally-hidden"); }
    resetChamberDisplay(66);
  }

  function applyStateS6() {
    chamberOpen = false;
    samplePlaced = true;
    htOn = false;
    stageRotation = true;
    volt_bool = false;
    counter = 72;
    kVs = volt_values ? volt_values[0] : 0;
    brightNms = 0;
    currentSEsample = typeof SE_sample1 !== "undefined" ? SE_sample1 : currentSEsample;
    currentBSEsample = typeof BSE_sample1 !== "undefined" ? BSE_sample1 : currentBSEsample;
    scaleBar_size = 5.4;
    scaleBar_unit = 20;
    if (typeof applyTuningForSample === "function" && typeof resolveSemSampleByImageUrl === "function") {
      applyTuningForSample(resolveSemSampleByImageUrl(currentSEsample));
    }
    if (typeof img_loaded !== "undefined") img_loaded = false;
    if (image && currentSEsample) image.src = currentSEsample;
    if (example_img && currentSEsample) example_img.src = currentSEsample;
    enableAllControls();
    if ($ && $("#acc-volt").length) $("#acc-volt").slider("value", 0);
    if ($ && $("#spot-size").length) $("#spot-size").slider("value", 0);
    if ($ && $("#z-pos").length) $("#z-pos").slider("value", 0);
    if ($ && $("#ht-btn").length) $("#ht-btn").removeClass("ht-btn-active");
    if ($ && $(".choose-sample").length) $(".choose-sample").addClass("totally-hidden");
    toogle_fn(".top-btns", "totally-hidden", true);
    if ($) { $("#btn-vent, #btn-chamber, #btn-evacuate").removeClass("btn-active"); $("#scalebar-div").addClass("totally-hidden"); }
    resetChamberDisplay(72);
  }

  function applyStateS7() {
    chamberOpen = false;
    samplePlaced = true;
    htOn = true;
    stageRotation = true;
    volt_bool = false;
    counter = 72;
    kVs = volt_values ? volt_values[0] : 0;
    brightNms = 0;
    spot_bright = spot_valuesBright ? spot_valuesBright[0] : 0.1;
    spotSlider_blur = spot_valuesBlur ? spot_valuesBlur[0] : 0.5;
    zBlur = z_values ? z_values[0] : 5;
    currentSEsample = typeof SE_sample1 !== "undefined" ? SE_sample1 : currentSEsample;
    currentBSEsample = typeof BSE_sample1 !== "undefined" ? BSE_sample1 : currentBSEsample;
    scaleBar_size = 5.4;
    scaleBar_unit = 20;
    if (typeof applyTuningForSample === "function" && typeof resolveSemSampleByImageUrl === "function") {
      applyTuningForSample(resolveSemSampleByImageUrl(currentSEsample));
    }
    if (image && currentSEsample) image.src = currentSEsample;
    if (example_img && currentSEsample) example_img.src = currentSEsample;
    if (image && image.complete && image.naturalWidth > 0) img_loaded = true;
    else if (typeof initSimulator === "function") initSimulator();
    enableAllControls();
    if ($ && $("#acc-volt").length) $("#acc-volt").slider("value", 0);
    if ($ && $("#spot-size").length) $("#spot-size").slider("value", 0);
    if ($ && $("#z-pos").length) $("#z-pos").slider("value", 0);
    if ($ && $("#ht-btn").length) $("#ht-btn").addClass("ht-btn-active");
    if ($ && $(".choose-sample").length) $(".choose-sample").addClass("totally-hidden");
    toogle_fn(".top-btns", "totally-hidden", false);
    if ($ && $("#scalebar-div").length) $("#scalebar-div").removeClass("totally-hidden");
    if ($) $("#btn-vent, #btn-chamber, #btn-evacuate").removeClass("btn-active");
  }

  function applyStateS8() {
    applyStateS7();
    kVs = volt_values && volt_values[4] !== undefined ? volt_values[4] : 1.9;
    brightNms = kVs + (spot_valuesBright ? spot_valuesBright[0] : 0.1);
    if ($ && $("#acc-volt").length) $("#acc-volt").slider("value", 4);
    if ($ && $("#spot-size").length) $("#spot-size").slider("value", 0);
  }

  function applyStateS9() {
    applyStateS8();
    if ($ && $("#spot-size").length) $("#spot-size").slider("value", 2);
    spot_bright = spot_valuesBright && spot_valuesBright[2] !== undefined ? spot_valuesBright[2] : 0.2;
    brightNms = kVs + spot_bright;
  }

  function applyStateS10() {
    applyStateS9();
    lastScanUsed = "scan1";
    fromScanModes = true;
  }

  function applyStateS11() {
    applyStateS10();
    lastScanUsed = "scan1";
    fromScanModes = true;
  }

  /** S12：CONTRAST / BRIGHTNESS 在全量程 0–270（与 #slider-contrast / #slider-brightness）上的目标占比 */
  var SEM_S12_CONTRAST_PCT = 33.7;
  var SEM_S12_BRIGHTNESS_PCT = 60;

  /**
   * 2×2 拼图 ROI 子任务：快进至装样/选样/调焦/扫描完成后，仅通过平移/倍率框选 ROI，保存需与参考导出一致。
   * 依赖 sem_mosaic_roi.js；异步完成后 SEM_S12_READY === true。
   */
  function applyStateS12() {
    applyStateS11();
    if (typeof syncDraggableRotationFromSlider === "function") {
      var cRot = Math.round((SEM_S12_CONTRAST_PCT / 100) * 270);
      var bRot = Math.round((SEM_S12_BRIGHTNESS_PCT / 100) * 270);
      syncDraggableRotationFromSlider("contrast", cRot);
      syncDraggableRotationFromSlider("brightness", bRot);
    }
    setSemPanCenterEnabled(false);
    // applyStateS7 链会用 toogle_fn(..., false) 给 .top-btns 加上 totally-hidden，整行（含 SAVE IMAGE）被 clip 掉
    if (typeof $ !== "undefined" && $(".top-btns").length) {
      $(".top-btns").removeClass("totally-hidden");
    }
    window.SEM_S12_READY = false;
    if (typeof window.semMosaicRoiPrepare !== "function") {
      console.warn("[SEM_SINGLE_STEP_API] semMosaicRoiPrepare 未加载，S12 跳过拼图");
      window.SEM_S12_READY = true;
      return;
    }
    try {
      if (typeof document !== "undefined" && document.getElementById("focus-blur")) {
        document.getElementById("focus-blur").setStdDeviation(0, 0);
      }
    } catch (e0) {}
    if (typeof zBlur !== "undefined") zBlur = typeof z_values !== "undefined" && z_values.length ? z_values[z_values.length - 1] : 0;
    if (typeof coarseKnob !== "undefined") coarseKnob = 0;
    if (typeof fineKnob !== "undefined") fineKnob = 0;
    if (typeof spotSlider_blur !== "undefined" && typeof spot_valuesBlur !== "undefined") {
      spotSlider_blur = spot_valuesBlur[0];
    }
    window.semMosaicRoiPrepare(function (err) {
      if (err) {
        console.error("[SEM_SINGLE_STEP_API] S12 拼图准备失败:", err);
      }
      window.SEM_S12_READY = !err;
      if (typeof drawIt === "function") drawIt();
    });
  }

  function reset() {
    if (typeof location !== "undefined" && location.reload) {
      location.reload();
    }
  }

  /**
   * 重置 benchmark 中指定子任务的状态，便于下一次尝试时正确统计。
   * 每次任务尝试后调用 gotoState 复原页面，再调用此函数重置 benchmark 计数。
   */
  function resetBenchmarkSubtask(sid) {
    try {
      if (typeof window.SEM_BENCHMARK !== "undefined" && window.SEM_BENCHMARK.episode && window.SEM_BENCHMARK.episode._subtask_map) {
        var st = window.SEM_BENCHMARK.episode._subtask_map[sid];
        if (st) {
          st.success = false;
          st.attempts = 0;
          delete st.notes;
        }
      }
      return true;
    } catch (e) {
      console.warn("[SEM_SINGLE_STEP_API] resetBenchmarkSubtask 失败:", e);
      return false;
    }
  }

  window.SEM_SINGLE_STEP_API = {
    gotoState: gotoState,
    reset: reset,
    resetBenchmarkSubtask: resetBenchmarkSubtask,
  };

  console.log("[SEM_SINGLE_STEP_API] 已加载，支持 gotoState(sid)、resetBenchmarkSubtask(sid) 与 reset()");
})();
