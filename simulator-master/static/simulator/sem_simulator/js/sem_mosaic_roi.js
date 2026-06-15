/**
 * SEM 2×2 拼图（接缝羽化）+ ROI 保存判定（与导出 1024×726 参考图比对）
 * 依赖 SEM_simulator.js 中的 drawIt、createExportCanvasWithDisplayEffects、semComputeQualityMetrics、syncDraggableRotationFromSlider 等。
 */
(function () {
  if (typeof window === "undefined") return;

  function defaultTileUrls() {
    var SC = window.SEM_SAMPLE_CONFIG || [];
    var out = [];
    for (var i = 0; i < 4; i++) {
      var s = SC[i] || SC[0];
      out.push(s ? s.seImage : "");
    }
    return out;
  }

  window.SEM_MOSAIC_ROI_CONFIG = window.SEM_MOSAIC_ROI_CONFIG || {
    tileUrls: null,
    featherPx: 18,
    /** 放大镜旋钮 slider 值 0–270，对应 stretch */
    gtMagSlider: 88,
    gtPanX: 0,
    gtPanY: 0,
    startPanX: -220,
    startPanY: 140,
    minMatchScore: 80,
    /**
     * 可选：你拍摄的 GT 图（建议与 SAVE 导出同尺寸 1024×726；否则会拉伸到该尺寸再比对）。
     * 有值时不再用「gt 平移 + 当前画布导出」生成 GT，只用于判分；拼图仍由 tileUrls 生成。
     */
    gtExportImageUrl: "/static/simulator/sem_simulator/images/simulator/SEM/sem_gt_01.jpg"
  };

  function loadImage(url, cb) {
    var im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = function () {
      cb(null, im);
    };
    im.onerror = function () {
      cb(new Error("failed to load " + url));
    };
    im.src = url;
  }

  function imageToCanvas(im) {
    var c = document.createElement("canvas");
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    c.getContext("2d").drawImage(im, 0, 0);
    return c;
  }

  /** 将已解码的位图缩放到与 SAVE 导出一致，供 semComputeQualityMetrics 逐像素比对 */
  function rasterToExportImageData(im, ow, oh) {
    var c = document.createElement("canvas");
    c.width = ow;
    c.height = oh;
    var x = c.getContext("2d");
    x.imageSmoothingEnabled = true;
    x.drawImage(im, 0, 0, ow, oh);
    return x.getImageData(0, 0, ow, oh);
  }

  function getPx(cnv, x, y) {
    var x0 = Math.max(0, Math.min(cnv.width - 1, Math.floor(x)));
    var y0 = Math.max(0, Math.min(cnv.height - 1, Math.floor(y)));
    var d = cnv.getContext("2d").getImageData(x0, y0, 1, 1).data;
    return [d[0], d[1], d[2], 255];
  }

  /**
   * 将四张同尺寸图拼成 2×2，在垂直中线与水平中线处做宽度 2*feather 的线性羽化。
   */
  function buildFeatheredMosaicDataUrl(imgs, featherPx, cb) {
    if (!imgs || imgs.length !== 4) {
      cb(new Error("need 4 images"));
      return;
    }
    var w0 = imgs[0].naturalWidth;
    var h0 = imgs[0].naturalHeight;
    var tw = w0 * 2;
    var th = h0 * 2;
    var feather = Math.max(0, Math.min(featherPx || 0, Math.floor(Math.min(w0, h0) * 0.35)));
    var c0 = imageToCanvas(imgs[0]);
    var c1 = imageToCanvas(imgs[1]);
    var c2 = imageToCanvas(imgs[2]);
    var c3 = imageToCanvas(imgs[3]);
    var out = document.createElement("canvas");
    out.width = tw;
    out.height = th;
    var ctx = out.getContext("2d");
    ctx.drawImage(c0, 0, 0, w0, h0);
    ctx.drawImage(c1, w0, 0, w0, h0);
    ctx.drawImage(c2, 0, h0, w0, h0);
    ctx.drawImage(c3, w0, h0, w0, h0);
    if (feather < 2) {
      cb(null, out.toDataURL("image/png"));
      return;
    }
    var xMid = w0;
    var yMid = h0;
    var d = ctx.getImageData(0, 0, tw, th);
    var D = d.data;
    function blendAt(x, y, t, ca, xa, ya, cbn, xb, yb) {
      var a = getPx(ca, xa, ya);
      var b = getPx(cbn, xb, yb);
      var u = Math.max(0, Math.min(1, t));
      var o = (y * tw + x) * 4;
      D[o] = Math.round(a[0] * (1 - u) + b[0] * u);
      D[o + 1] = Math.round(a[1] * (1 - u) + b[1] * u);
      D[o + 2] = Math.round(a[2] * (1 - u) + b[2] * u);
      D[o + 3] = 255;
    }
    var y;
    var x;
    for (y = 0; y < th; y++) {
      var topHalf = y < h0;
      var yy = topHalf ? y : y - h0;
      for (x = xMid - feather; x < xMid + feather; x++) {
        if (x < 0 || x >= tw) continue;
        var t = (x - (xMid - feather)) / (2 * feather);
        var ca = topHalf ? c0 : c2;
        var cbn = topHalf ? c1 : c3;
        blendAt(x, y, t, ca, w0 - 1, yy, cbn, 0, yy);
      }
    }
    for (y = yMid - feather; y < yMid + feather; y++) {
      if (y < 0 || y >= th) continue;
      var t2 = (y - (yMid - feather)) / (2 * feather);
      for (x = 0; x < tw; x++) {
        if (x < xMid) {
          blendAt(x, y, t2, c0, x, h0 - 1, c2, x, 0);
        } else {
          blendAt(x, y, t2, c1, x - w0, h0 - 1, c3, x - w0, 0);
        }
      }
    }
    ctx.putImageData(d, 0, 0);
    cb(null, out.toDataURL("image/png"));
  }

  function semMosaicLoadTiles(urls, cb) {
    var imgs = [];
    var pending = urls.length;
    var err = null;
    if (pending !== 4) {
      cb(new Error("need 4 urls"));
      return;
    }
    for (var i = 0; i < 4; i++) {
      (function (idx) {
        loadImage(urls[idx], function (e, im) {
          if (e) err = e;
          imgs[idx] = im;
          pending--;
          if (pending === 0) {
            cb(err, imgs);
          }
        });
      })(i);
    }
  }

  /**
   * 在 applyStateS11 之后调用：替换 image 为拼图、生成 GT 导出、将视口移到起始偏移。
   */
  window.semMosaicRoiPrepare = function (done) {
    var cfg = window.SEM_MOSAIC_ROI_CONFIG || {};
    var urls = cfg.tileUrls && cfg.tileUrls.length === 4 ? cfg.tileUrls : defaultTileUrls();
    var feather = typeof cfg.featherPx === "number" ? cfg.featherPx : 18;
    semMosaicLoadTiles(urls, function (err, imgs) {
      if (err) {
        done(err);
        return;
      }
      buildFeatheredMosaicDataUrl(imgs, feather, function (e2, dataUrl) {
        if (e2) {
          done(e2);
          return;
        }
        var semImg = window.SEM_SOURCE_IMAGE || window.image;
        if (!semImg) {
          done(new Error("SEM image object missing (SEM_SOURCE_IMAGE)"));
          return;
        }
        var mosaicPostLoadRan = false;
        function runMosaicPostLoad() {
          if (mosaicPostLoadRan) return;
          mosaicPostLoadRan = true;
          var ow =
            typeof window.SEM_EXPORT_WIDTH === "function" ? window.SEM_EXPORT_WIDTH() : 1024;
          var oh =
            typeof window.SEM_EXPORT_HEIGHT === "function" ? window.SEM_EXPORT_HEIGHT() : 726;

          function clearSemImgHandlers() {
            try {
              semImg.onload = null;
              semImg.onerror = null;
            } catch (eH) {}
          }

          function applyStartViewAndDraw() {
            window.imgPanX = typeof cfg.startPanX === "number" ? cfg.startPanX : -220;
            window.imgPanY = typeof cfg.startPanY === "number" ? cfg.startPanY : 140;
            if (typeof window.semClampPanForSize === "function" && window.canvas) {
              window.semClampPanForSize(window.canvas.width, window.canvas.height);
            }
            if (typeof window.drawIt === "function") window.drawIt();
          }

          try {
            // fromScanModes===true 时 drawIt 只写 imgData_forScan，须 tvNoise() 才会刷到 ctx；S12 未开 tv 则屏为空白
            try {
              if (typeof dotvNoise !== "undefined" && dotvNoise) {
                cancelAnimationFrame(dotvNoise);
                dotvNoise = 0;
              }
            } catch (eTv) {}
            if (typeof window.fromScanModes !== "undefined") window.fromScanModes = false;
            if (typeof window.img_loaded !== "undefined") window.img_loaded = true;
            if (typeof $ !== "undefined" && $(".top-btns").length) {
              $(".top-btns").removeClass("totally-hidden");
            }
            var mag = typeof cfg.gtMagSlider === "number" ? cfg.gtMagSlider : 88;
            if (typeof window.syncDraggableRotationFromSlider === "function") {
              window.syncDraggableRotationFromSlider("magnification", mag);
            }
            if (typeof cfg.gtTrim === "number" && typeof window.trim !== "undefined") {
              window.trim = cfg.gtTrim;
            }

            var gtUrl = (cfg.gtExportImageUrl || "").trim();
            if (gtUrl) {
              loadImage(gtUrl, function (gErr, gIm) {
                try {
                  if (gErr) {
                    done(gErr);
                    return;
                  }
                  window.SEM_ROI_GT_IMAGE_DATA = rasterToExportImageData(gIm, ow, oh);
                  applyStartViewAndDraw();
                  done(null);
                } catch (exg) {
                  done(exg);
                } finally {
                  clearSemImgHandlers();
                }
              });
              return;
            }

            window.imgPanX = typeof cfg.gtPanX === "number" ? cfg.gtPanX : 0;
            window.imgPanY = typeof cfg.gtPanY === "number" ? cfg.gtPanY : 0;
            if (typeof window.semClampPanForSize === "function" && window.canvas) {
              window.semClampPanForSize(window.canvas.width, window.canvas.height);
            }
            if (typeof window.drawIt === "function") window.drawIt();
            var cvs = window.canvas;
            if (!cvs || typeof window.createExportCanvasWithDisplayEffects !== "function") {
              done(new Error("canvas or export API missing"));
              return;
            }
            var ex = window.createExportCanvasWithDisplayEffects(cvs, ow, oh);
            if (!ex) {
              done(new Error("export canvas null"));
              return;
            }
            window.SEM_ROI_GT_IMAGE_DATA = ex.getContext("2d").getImageData(0, 0, ex.width, ex.height);
            applyStartViewAndDraw();
            done(null);
          } catch (ex) {
            done(ex);
          } finally {
            if (!(cfg.gtExportImageUrl || "").trim()) {
              clearSemImgHandlers();
            }
          }
        }
        semImg.onload = runMosaicPostLoad;
        semImg.onerror = function () {
          semImg.onload = null;
          semImg.onerror = null;
          done(new Error("mosaic data URL failed to decode (onerror)"));
        };
        semImg.src = dataUrl;
        // data: URL 在部分浏览器会同步解码，onload 可能不触发 — 须兜底
        if (semImg.complete && semImg.naturalWidth > 0) {
          setTimeout(runMosaicPostLoad, 0);
        }
      });
    });
  };

  window.semMosaicRoiEvaluateSaveSuccess = function () {
    try {
      var ref = window.SEM_ROI_GT_IMAGE_DATA;
      if (!ref || !window.canvas || typeof window.createExportCanvasWithDisplayEffects !== "function") {
        return { ok: false, score: 0, reason: "no_gt_or_canvas" };
      }
      var ex = window.createExportCanvasWithDisplayEffects(
        window.canvas,
        typeof window.SEM_EXPORT_WIDTH === "function" ? window.SEM_EXPORT_WIDTH() : 1024,
        typeof window.SEM_EXPORT_HEIGHT === "function" ? window.SEM_EXPORT_HEIGHT() : 726
      );
      if (!ex) return { ok: false, score: 0, reason: "export_null" };
      var cur = ex.getContext("2d").getImageData(0, 0, ex.width, ex.height);
      if (cur.width !== ref.width || cur.height !== ref.height) {
        return { ok: false, score: 0, reason: "size_mismatch" };
      }
      if (typeof window.semComputeQualityMetrics !== "function") {
        return { ok: false, score: 0, reason: "no_semComputeQualityMetrics" };
      }
      var m = window.semComputeQualityMetrics(cur, ref, cur.width, cur.height);
      var cfg = window.SEM_MOSAIC_ROI_CONFIG || {};
      var minS = typeof cfg.minMatchScore === "number" ? cfg.minMatchScore : 80;
      var ok = m && typeof m.score === "number" && m.score >= minS;
      window.SEM_LAST_ROI_COMPARE = m;
      return { ok: !!ok, score: m ? m.score : 0, metrics: m, minMatchScore: minS };
    } catch (e) {
      return { ok: false, score: 0, reason: String(e && e.message ? e.message : e) };
    }
  };
})();
