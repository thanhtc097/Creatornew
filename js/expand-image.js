import {
  calculateExpandedDimensions,
  buildExpandedSourceCanvas,
  buildOutpaintMaskCanvas,
  rgbaToPlanarRgb,
  maskToFloatArray,
  compositeExpandedResult,
} from "./expand-image/expand-engine.js";
import { InpaintService } from "./background-remover/inpaint-service.js";

const $ = (id) => document.getElementById(id);

// UI Element References
const elements = {
  dropzone: $("expandDropzone"),
  fileInput: $("expandFileInput"),
  chooseBtn: $("expandChooseBtn"),
  workspace: $("expandWorkspace"),

  // Model Preload & Status Card
  modelDownloadCard: $("modelDownloadCard"),
  modelDownloadFill: $("modelDownloadFill"),
  modelDownloadMetaText: $("modelDownloadMetaText"),
  btnPauseModelDownload: $("btnPauseModelDownload"),
  modelReadyBadge: $("modelReadyBadge"),

  // Aspect & Alignment Controls
  aspectBtns: document.querySelectorAll(".aspect-btn"),
  alignBtns: document.querySelectorAll(".align-btn"),
  customMarginsDetails: $("customMarginsDetails"),
  marginL: $("marginL"),
  valMarginL: $("valMarginL"),
  marginR: $("marginR"),
  valMarginR: $("valMarginR"),
  marginT: $("marginT"),
  valMarginT: $("valMarginT"),
  marginB: $("marginB"),
  valMarginB: $("valMarginB"),

  // Brush & Eraser Controls
  btnToggleBrush: $("btnToggleBrush"),
  btnModePaint: $("btnModePaint"),
  btnModeEraser: $("btnModeEraser"),
  btnUndoBrush: $("btnUndoBrush"),
  btnRedoBrush: $("btnRedoBrush"),
  brushSize: $("brushSize"),
  valBrushSize: $("valBrushSize"),
  btnClearBrush: $("btnClearBrush"),
  brushCanvas: $("brushCanvasLayer"),

  // Stats Pill, 3-color Level & Warning
  origDimsText: $("origDimsText"),
  targetDimsText: $("targetDimsText"),
  expandBadge: $("expandBadge"),
  expansionWarning: $("expansionWarning"),
  hardwareBadge: $("hardwareBadge"),

  // Action Buttons
  btnRunExpand: $("btnRunExpand"),
  btnCancelExpand: $("btnCancelExpand"),
  btnReExpand: $("btnReExpand"),
  btnContinueEdit: $("btnContinueEdit"),
  btnUndoResult: $("btnUndoResult"),

  // Progress
  progressShell: $("expandProgressShell"),
  progressFill: $("expandProgressFill"),
  progressStageText: $("expandProgressStageText"),
  progressPercentText: $("expandProgressPercentText"),

  // Stage Area, Tabs & Zoom
  btnTabEditor: $("btnTabEditor"),
  btnTabCompare: $("btnTabCompare"),
  btnZoomToggle: $("btnZoomToggle"),
  editorStage: $("expandEditorStage"),
  sliderContainer: $("expandSliderContainer"),
  previewImg: $("expandedCanvasPreview"),
  sliderFrame: $("expandSliderFrame"),
  sliderRange: $("expandSliderRange"),
  imgBefore: $("imgSliderBefore"),
  imgAfter: $("imgSliderAfter"),
  sliderBadgeLeft: $("sliderBadgeLeft"),
  sliderBadgeRight: $("sliderBadgeRight"),
  resultMetaText: $("resultMetaText"),

  // Feedback buttons
  btnFeedbackGood: $("btnFeedbackGood"),
  btnFeedbackBad: $("btnFeedbackBad"),

  // Export
  exportFormat: $("exportFormat"),
  exportQuality: $("exportQuality"),
  qualityRow: $("qualityRow"),
  btnDownload: $("btnDownload"),
  btnClear: $("btnClear"),
  btnShare: $("btnShare"),
  statusAlert: $("expandStatusAlert"),

  // Trust & Verification Modal
  btnOpenVerifyModal: $("btnOpenVerifyModal"),
  btnCloseVerifyModal: $("btnCloseVerifyModal"),
  verifyModalOverlay: $("verifyModalOverlay"),
};

const isVi = document.documentElement.lang === "vi";

const I18N = {
  validImageError: isVi
    ? "Vui lòng tải lên tệp hình ảnh hợp lệ (JPG, PNG, WebP, AVIF)."
    : "Please upload a valid image file (JPG, PNG, WebP, AVIF).",
  decodeError: isVi
    ? "Không thể đọc tệp ảnh. Vui lòng thử lại với ảnh khác."
    : "Could not decode image file.",
  loadingSample: isVi
    ? "Đang tải ảnh mẫu..."
    : "Loading sample image...",
  sampleLoaded: isVi
    ? "Đã tải ảnh mẫu. Hãy chọn tỉ lệ mong muốn và nhấn 'Mở Rộng & Điền Bằng AI'!"
    : "Sample image loaded. Select aspect ratio and click 'Expand & Generative Fill'!",
  sampleError: isVi
    ? "Không thể tải ảnh mẫu. Vui lòng thử lại."
    : "Could not load sample image.",
  brushOn: isVi
    ? "✦ Chế độ Cọ Vẽ BẬT: Quét ngón tay hoặc chuột lên vật thể thừa để AI tự động vẽ bù."
    : "Brush Mode On: Paint on unwanted objects or areas to fill them with AI.",
  brushOff: isVi
    ? "Chế độ Cọ Vẽ TẮT."
    : "Brush Mode Off.",
  eraserOn: isVi
    ? "✦ Đã chuyển sang Cọ Tẩy (Eraser): Quét lên nét cọ đã vẽ để tẩy bớt."
    : "Eraser Mode On: Erase existing painted brush strokes.",
  brushCleared: isVi
    ? "Đã xóa toàn bộ nét vẽ cọ."
    : "Brush mask cleared.",
  undoSuccess: isVi ? "Đã hoàn tác nét vẽ (Undo)." : "Undo brush stroke.",
  redoSuccess: isVi ? "Đã làm lại nét vẽ (Redo)." : "Redo brush stroke.",
  step1: isVi ? "1/3 Chuẩn bị ảnh & cấu trúc Tensor..." : "1/3 Building canvas & neural tensor...",
  step2: isVi ? "2/3 Chạy mạng nơ-ron Fourier LaMa on-device..." : "2/3 Executing LaMa Fourier neural network on-device...",
  step3: isVi ? "3/3 Hòa trộn viền & Ghép lớp phân giải cao..." : "3/3 Blending seamless full-res composite...",
  expandSuccess: (w, h) =>
    isVi
      ? `Đã mở rộng ảnh thành công sang kích thước ${w} × ${h}px!`
      : `Image expanded successfully to ${w}×${h}px!`,
  expandCancel: isVi
    ? "Đã hủy tiến trình mở rộng ảnh."
    : "Expansion cancelled.",
  expandError: isVi
    ? "Xử lý mở rộng AI cục bộ gặp lỗi. Vui lòng thử tỉ lệ khác hoặc dùng trình duyệt hiện đại hơn."
    : "Local neural expansion failed. Try a smaller aspect ratio or another browser.",
  linkCopied: isVi
    ? "Đã sao chép link công cụ vào clipboard! (Lưu ý: Ảnh của bạn được bảo mật tuyệt đối trên thiết bị, không bị chia sẻ)."
    : "Tool link copied to clipboard! (Note: Your photos remain 100% private on your device).",
  downloadSuccess: (name) =>
    isVi
      ? `Đã tải về ${name} thành công!`
      : `Downloaded ${name} successfully!`,
  noImageError: isVi
    ? "Vui lòng mở rộng ảnh trước khi tải về."
    : "Please expand an image first.",
  modelDownloading: (loadedMB, totalMB, pct, speed) =>
    isVi
      ? `Đang tải AI (một lần duy nhất): ${loadedMB} / ${totalMB} MB (${pct}%) • ${speed} MB/s`
      : `Downloading on-device AI model: ${loadedMB} / ${totalMB} MB (${pct}%) • ${speed} MB/s`,
  modelReady: isVi ? "🟢 AI Sẵn Sàng (Offline)" : "🟢 AI Ready (Offline)",
  feedbackThanks: isVi ? "Cảm ơn bạn đã gửi phản hồi!" : "Thank you for your feedback!",
  pasteDetected: isVi ? "Đã nhận diện ảnh từ clipboard!" : "Image pasted from clipboard!",
  continueEditReady: isVi
    ? "Đã chuyển ảnh kết quả sang bảng vẽ để bạn tiếp tục mở rộng hoặc xóa vật thể!"
    : "Result set as new input image. You can continue expanding or inpainting!",
  undoResultSuccess: isVi ? "Đã quay lại ảnh trước đó." : "Reverted to previous image state.",
};

// Internal State
let currentFile = null;
let currentImage = null;
let previousImage = null; // for Undo Result
let currentAspect = "16:9";
let currentAlign = "center";
let activeJobId = 0;
let isProcessing = false;
let isBrushActive = false;
let brushToolMode = "paint"; // 'paint' | 'eraser'
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let isZoomed = false;

let beforeObjectUrl = null;
let afterObjectUrl = null;
let userMaskCanvas = null;
let finalResultCanvas = null;

// Brush Undo/Redo Stack
let brushHistory = [];
let brushHistoryStep = -1;
const MAX_BRUSH_HISTORY = 20;

// Initialize Inpaint Service
const inpaint = new InpaintService({
  onStatus: handleInpaintStatus,
  onDownloadProgress: handleModelDownloadProgress,
});

function initEvents() {
  detectHardwareAcceleration();
  checkAndPreloadModel();

  // Clipboard Paste Support (Ctrl+V)
  window.addEventListener("paste", handlePasteEvent);

  // File Picker
  elements.chooseBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    elements.fileInput?.click();
  });
  elements.dropzone?.addEventListener("click", () => elements.fileInput?.click());
  elements.dropzone?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      elements.fileInput?.click();
    }
  });

  // Drag & Drop
  ["dragenter", "dragover"].forEach((evt) => {
    elements.dropzone?.addEventListener(evt, (e) => {
      e.preventDefault();
      elements.dropzone?.classList.add("is-dragging");
    });
  });
  ["dragleave", "drop"].forEach((evt) => {
    elements.dropzone?.addEventListener(evt, (e) => {
      e.preventDefault();
      elements.dropzone?.classList.remove("is-dragging");
    });
  });
  elements.dropzone?.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileSelected(file);
  });
  elements.fileInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    elements.fileInput.value = "";
  });

  // Sample Photos
  document.querySelectorAll(".expand-sample-item").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const sampleUrl = btn.dataset.sample;
      if (sampleUrl) loadSampleImage(sampleUrl);
    });
  });

  // Aspect Ratio Buttons
  elements.aspectBtns?.forEach((btn) => {
    btn.addEventListener("click", () => {
      elements.aspectBtns.forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-checked", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-checked", "true");
      currentAspect = btn.dataset.aspect || "16:9";
      if (elements.customMarginsDetails) {
        elements.customMarginsDetails.hidden = currentAspect !== "custom";
        if (currentAspect === "custom") elements.customMarginsDetails.open = true;
      }
      updatePreviewLayout();
    });
  });

  // Alignment Buttons
  elements.alignBtns?.forEach((btn) => {
    btn.addEventListener("click", () => {
      elements.alignBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      currentAlign = btn.dataset.align || "center";
      updatePreviewLayout();
    });
  });

  // Custom Margin Sliders
  [
    [elements.marginL, elements.valMarginL],
    [elements.marginR, elements.valMarginR],
    [elements.marginT, elements.valMarginT],
    [elements.marginB, elements.valMarginB],
  ].forEach(([slider, valSpan]) => {
    slider?.addEventListener("input", (e) => {
      if (valSpan) valSpan.textContent = `${e.target.value}px`;
      if (currentAspect === "custom") updatePreviewLayout();
    });
  });

  // Brush & Eraser Mode Toggles
  elements.btnToggleBrush?.addEventListener("click", toggleBrush);
  elements.btnModePaint?.addEventListener("click", () => setBrushMode("paint"));
  elements.btnModeEraser?.addEventListener("click", () => setBrushMode("eraser"));
  elements.btnUndoBrush?.addEventListener("click", undoBrush);
  elements.btnRedoBrush?.addEventListener("click", redoBrush);

  elements.brushSize?.addEventListener("input", (e) => {
    if (elements.valBrushSize) elements.valBrushSize.textContent = `${e.target.value}px`;
  });
  elements.btnClearBrush?.addEventListener("click", clearBrush);

  // Brush Canvas Drawing Handlers
  setupBrushDrawing();

  // Action Buttons
  elements.btnRunExpand?.addEventListener("click", startExpanding);
  elements.btnReExpand?.addEventListener("click", startExpanding);
  elements.btnCancelExpand?.addEventListener("click", cancelExpanding);
  elements.btnContinueEdit?.addEventListener("click", continueEditingWithResult);
  elements.btnUndoResult?.addEventListener("click", undoResultToPrevious);
  elements.btnClear?.addEventListener("click", resetAll);
  elements.btnDownload?.addEventListener("click", downloadResult);

  // Model Download Pause / Resume
  elements.btnPauseModelDownload?.addEventListener("click", () => {
    inpaint.cancelDownload();
    if (elements.modelDownloadCard) elements.modelDownloadCard.hidden = true;
  });

  // Stage Tabs & Zoom 100%
  elements.btnTabEditor?.addEventListener("click", () => switchTab("editor"));
  elements.btnTabCompare?.addEventListener("click", () => switchTab("compare"));
  elements.btnZoomToggle?.addEventListener("click", toggleZoom100);

  // Split Slider Input
  elements.sliderRange?.addEventListener("input", (e) => {
    elements.sliderFrame?.style.setProperty("--slider-pos", `${e.target.value}%`);
  });

  // Feedback Buttons
  elements.btnFeedbackGood?.addEventListener("click", () => submitFeedback("good"));
  elements.btnFeedbackBad?.addEventListener("click", () => submitFeedback("bad"));

  // Export format & quality
  elements.exportFormat?.addEventListener("change", (e) => {
    const isLossy = ["jpeg", "webp"].includes(e.target.value);
    if (elements.qualityRow) elements.qualityRow.hidden = !isLossy;
  });

  // Share tool
  elements.btnShare?.addEventListener("click", () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showStatus(I18N.linkCopied, "success");
    }
  });

  // Trust & Verification Modal
  elements.btnOpenVerifyModal?.addEventListener("click", () => {
    if (elements.verifyModalOverlay) elements.verifyModalOverlay.hidden = false;
  });
  elements.btnCloseVerifyModal?.addEventListener("click", () => {
    if (elements.verifyModalOverlay) elements.verifyModalOverlay.hidden = true;
  });
  elements.verifyModalOverlay?.addEventListener("click", (e) => {
    if (e.target === elements.verifyModalOverlay) elements.verifyModalOverlay.hidden = true;
  });

  window.addEventListener("beforeunload", () => {
    inpaint.dispose();
    if (beforeObjectUrl) URL.revokeObjectURL(beforeObjectUrl);
    if (afterObjectUrl) URL.revokeObjectURL(afterObjectUrl);
  });
}

/**
 * Check connection and start background preloading if on Wi-Fi / fast connection
 */
function checkAndPreloadModel() {
  const conn = navigator.connection;
  if (conn?.saveData || conn?.effectiveType === "2g" || conn?.effectiveType === "3g") {
    // Mobile Data saver on -> do not background preload automatically
    return;
  }

  const startPreload = () => {
    inpaint.initialize().then((res) => {
      if (res?.fromCache || res?.cached) {
        showModelReady();
      }
    }).catch((e) => {
      console.warn("Background model preload non-blocking note:", e);
    });
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(startPreload, { timeout: 2500 });
  } else {
    setTimeout(startPreload, 1500);
  }
}

/**
 * Handle Paste Event (Ctrl+V)
 */
function handlePasteEvent(e) {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith("image/")) {
      const file = items[i].getAsFile();
      if (file) {
        handleFileSelected(file);
        showStatus(I18N.pasteDetected, "success");
        break;
      }
    }
  }
}

/**
 * Detect WebGPU hardware acceleration vs WebAssembly fallback
 */
async function detectHardwareAcceleration() {
  let isWebGPU = false;
  try {
    if (navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) isWebGPU = true;
    }
  } catch {
    isWebGPU = false;
  }

  if (elements.hardwareBadge) {
    if (isWebGPU) {
      elements.hardwareBadge.innerHTML = isVi
        ? `⚡ <strong>WebGPU GPU</strong> &bull; Tốc độ: ~1-2s`
        : `⚡ <strong>WebGPU GPU</strong> &bull; Speed: ~1-2s`;
      elements.hardwareBadge.className = "hardware-badge is-gpu";
    } else {
      elements.hardwareBadge.innerHTML = isVi
        ? `⚙️ <strong>WASM SIMD</strong> &bull; Tốc độ: ~3-5s`
        : `⚙️ <strong>WASM SIMD Fallback</strong> &bull; Speed: ~3-5s`;
      elements.hardwareBadge.className = "hardware-badge is-cpu";
    }
    elements.hardwareBadge.hidden = false;
  }
}

/**
 * Handle image file selection
 */
async function handleFileSelected(file) {
  if (!file.type.startsWith("image/")) {
    showStatus(I18N.validImageError, "error");
    return;
  }
  clearStatus();
  currentFile = file;

  try {
    const img = new Image();
    if (beforeObjectUrl) URL.revokeObjectURL(beforeObjectUrl);
    beforeObjectUrl = URL.createObjectURL(file);

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = beforeObjectUrl;
    });

    currentImage = img;

    // Reset user brush canvas & history
    userMaskCanvas = document.createElement("canvas");
    userMaskCanvas.width = img.naturalWidth;
    userMaskCanvas.height = img.naturalHeight;

    brushHistory = [];
    brushHistoryStep = -1;
    updateUndoRedoButtons();

    if (elements.imgBefore) elements.imgBefore.src = beforeObjectUrl;
    if (elements.workspace) elements.workspace.hidden = false;

    updatePreviewLayout();
    elements.workspace?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error("Failed to load image:", err);
    showStatus(I18N.decodeError, "error");
  }
}

/**
 * Load sample image
 */
async function loadSampleImage(url) {
  try {
    showStatus(I18N.loadingSample, "info");
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not fetch sample.");
    const blob = await res.blob();
    const file = new File([blob], "sample-expand.jpg", { type: "image/jpeg" });
    await handleFileSelected(file);
    showStatus(I18N.sampleLoaded, "success");
  } catch (err) {
    console.error(err);
    showStatus(I18N.sampleError, "error");
  }
}

/**
 * Update the visual preview of the expanded canvas layout with 3-color traffic light and striped overlay
 */
function updatePreviewLayout() {
  if (!currentImage) return;

  const w = currentImage.naturalWidth;
  const h = currentImage.naturalHeight;

  const customPadding = {
    top: Number(elements.marginT?.value) || 0,
    bottom: Number(elements.marginB?.value) || 0,
    left: Number(elements.marginL?.value) || 0,
    right: Number(elements.marginR?.value) || 0,
  };

  const dims = calculateExpandedDimensions(w, h, currentAspect, currentAlign, customPadding);

  // Update Stats text
  if (elements.origDimsText) elements.origDimsText.textContent = `${dims.sourceWidth} × ${dims.sourceHeight}px`;
  if (elements.targetDimsText) elements.targetDimsText.textContent = `${dims.targetWidth} × ${dims.targetHeight}px`;
  
  // 3-Color Expansion Level Indicator: Green (<30%), Yellow (30-60%), Red (>60%)
  if (elements.expandBadge) {
    const pct = dims.expansionPercent;
    let levelClass = "level-low";
    let levelLabel = isVi ? "Lý tưởng" : "Ideal";

    if (pct > 60) {
      levelClass = "level-high";
      levelLabel = isVi ? "Mở rộng lớn" : "Heavy expand";
    } else if (pct >= 30) {
      levelClass = "level-mid";
      levelLabel = isVi ? "Trung bình" : "Moderate";
    }

    elements.expandBadge.className = `expand-diff-badge ${levelClass}`;
    elements.expandBadge.textContent = `+${pct}% (${levelLabel} • ${dims.aspectKey})`;
  }

  // Expansion warning / suggestion
  if (elements.expansionWarning) {
    if (dims.expansionPercent >= 60) {
      elements.expansionWarning.textContent = isVi
        ? `💡 Mẹo: Mở rộng trên 60% diện tích cho kết quả đẹp nhất với ảnh phong cảnh, bầu trời, phòng ốc hoặc phông nền đơn giản.`
        : `💡 Pro-tip: Expanding over 60% works best with landscape scenery, sky, rooms, or simple studio backdrops.`;
      elements.expansionWarning.hidden = false;
    } else if (dims.expansionPercent >= 30) {
      elements.expansionWarning.textContent = isVi
        ? `✨ Tỉ lệ mở rộng tối ưu: AI sẽ vẽ nối tiếp liền lạc màu sắc và kết cấu nền xung quanh.`
        : `✨ Optimal expansion ratio: AI will extrapolate textures and lighting seamlessly.`;
      elements.expansionWarning.hidden = false;
    } else {
      elements.expansionWarning.hidden = true;
    }
  }

  // Render visual canvas preview showing expanded layout frame & striped outpaint pattern
  renderVisualPreview(dims);
}

/**
 * Render preview canvas with diagonal striped pattern on outpaint region
 */
function renderVisualPreview(dims) {
  const canvas = document.createElement("canvas");
  canvas.width = dims.targetWidth;
  canvas.height = dims.targetHeight;
  const ctx = canvas.getContext("2d");

  // 1. Draw extrapolated blurred background
  ctx.save();
  ctx.filter = "blur(14px) brightness(0.65)";
  ctx.drawImage(currentImage, 0, 0, dims.targetWidth, dims.targetHeight);
  ctx.restore();

  // 2. Draw subtle diagonal stripes on outpaint margin
  const stripeCanvas = document.createElement("canvas");
  stripeCanvas.width = 16;
  stripeCanvas.height = 16;
  const sCtx = stripeCanvas.getContext("2d");
  sCtx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  sCtx.lineWidth = 2;
  sCtx.beginPath();
  sCtx.moveTo(0, 16);
  sCtx.lineTo(16, 0);
  sCtx.stroke();
  const pattern = ctx.createPattern(stripeCanvas, "repeat");
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, dims.targetWidth, dims.targetHeight);
  }

  // 3. Draw original crisp image in position
  ctx.drawImage(currentImage, dims.offsetX, dims.offsetY, dims.sourceWidth, dims.sourceHeight);

  // 4. Draw dashed outline to clearly delineate source vs outpainted boundary
  ctx.strokeStyle = "rgba(194, 248, 52, 0.9)";
  ctx.lineWidth = Math.max(2, Math.round(dims.targetWidth / 400));
  ctx.setLineDash([8, 8]);
  ctx.strokeRect(dims.offsetX, dims.offsetY, dims.sourceWidth, dims.sourceHeight);

  // 5. Draw user inpaint brush mask if any
  if (userMaskCanvas) {
    ctx.drawImage(userMaskCanvas, dims.offsetX, dims.offsetY);
  }

  // Update image element
  if (elements.previewImg) {
    elements.previewImg.src = canvas.toDataURL("image/jpeg", 0.85);
  }

  // Align brush canvas dimensions with preview bounds
  if (elements.brushCanvas) {
    elements.brushCanvas.width = dims.targetWidth;
    elements.brushCanvas.height = dims.targetHeight;
  }
}

/**
 * Setup brush drawing on the brush canvas layer (mouse & touch offset + eraser + history)
 */
function setupBrushDrawing() {
  const canvas = elements.brushCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const getCanvasPos = (clientX, clientY, isTouch = false) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    // Apply -30px touch Y-offset on mobile so fingertip doesn't obstruct drawing
    const touchOffsetY = isTouch ? -28 : 0;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY + touchOffsetY - rect.top) * scaleY,
    };
  };

  const startDraw = (pt, isTouch = false) => {
    if (!isBrushActive || !currentImage) return;
    isDrawing = true;
    const pos = getCanvasPos(pt.clientX, pt.clientY, isTouch);
    lastX = pos.x;
    lastY = pos.y;
    drawStroke(lastX, lastY);
  };

  const moveDraw = (pt, isTouch = false) => {
    if (!isDrawing || !isBrushActive) return;
    const pos = getCanvasPos(pt.clientX, pt.clientY, isTouch);
    drawStroke(pos.x, pos.y);
    lastX = pos.x;
    lastY = pos.y;
  };

  const endDraw = () => {
    if (isDrawing) {
      isDrawing = false;
      syncBrushToUserMask();
      pushBrushHistory();
    }
  };

  canvas.addEventListener("mousedown", (e) => startDraw(e, false));
  canvas.addEventListener("mousemove", (e) => moveDraw(e, false));
  window.addEventListener("mouseup", endDraw);

  canvas.addEventListener(
    "touchstart",
    (e) => {
      if (isBrushActive && e.touches[0]) {
        e.preventDefault();
        startDraw(e.touches[0], true);
      }
    },
    { passive: false }
  );

  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (isBrushActive && e.touches[0]) {
        e.preventDefault();
        moveDraw(e.touches[0], true);
      }
    },
    { passive: false }
  );

  window.addEventListener("touchend", endDraw);
  window.addEventListener("touchcancel", endDraw);

  function drawStroke(x, y) {
    const radius = Number(elements.brushSize?.value) || 30;

    if (brushToolMode === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0, 0, 0, 1)";
      ctx.fillStyle = "rgba(0, 0, 0, 1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(255, 60, 60, 0.65)";
      ctx.fillStyle = "rgba(255, 60, 60, 0.65)";
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = radius * 2;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";
  }
}

/**
 * Transfer strokes drawn on stage canvas into userMaskCanvas
 */
function syncBrushToUserMask() {
  if (!currentImage || !userMaskCanvas || !elements.brushCanvas) return;
  const w = currentImage.naturalWidth;
  const h = currentImage.naturalHeight;
  const customPadding = {
    top: Number(elements.marginT?.value) || 0,
    bottom: Number(elements.marginB?.value) || 0,
    left: Number(elements.marginL?.value) || 0,
    right: Number(elements.marginR?.value) || 0,
  };
  const dims = calculateExpandedDimensions(w, h, currentAspect, currentAlign, customPadding);

  const uCtx = userMaskCanvas.getContext("2d");
  uCtx.clearRect(0, 0, w, h);
  uCtx.drawImage(
    elements.brushCanvas,
    dims.offsetX,
    dims.offsetY,
    w,
    h,
    0,
    0,
    w,
    h
  );
}

/**
 * Push current mask state to history for Undo/Redo
 */
function pushBrushHistory() {
  if (!userMaskCanvas) return;
  brushHistory = brushHistory.slice(0, brushHistoryStep + 1);
  const uCtx = userMaskCanvas.getContext("2d");
  const imgData = uCtx.getImageData(0, 0, userMaskCanvas.width, userMaskCanvas.height);
  brushHistory.push(imgData);
  if (brushHistory.length > MAX_BRUSH_HISTORY) {
    brushHistory.shift();
  }
  brushHistoryStep = brushHistory.length - 1;
  updateUndoRedoButtons();
}

function undoBrush() {
  if (!userMaskCanvas || brushHistoryStep < 0) return;
  if (brushHistoryStep > 0) {
    brushHistoryStep--;
    restoreBrushState(brushHistory[brushHistoryStep]);
  } else if (brushHistoryStep === 0) {
    brushHistoryStep = -1;
    clearBrushMaskOnly();
  }
  updateUndoRedoButtons();
  showStatus(I18N.undoSuccess, "info");
}

function redoBrush() {
  if (!userMaskCanvas || brushHistoryStep >= brushHistory.length - 1) return;
  brushHistoryStep++;
  restoreBrushState(brushHistory[brushHistoryStep]);
  updateUndoRedoButtons();
  showStatus(I18N.redoSuccess, "info");
}

function restoreBrushState(imgData) {
  if (!userMaskCanvas || !imgData) return;
  const uCtx = userMaskCanvas.getContext("2d");
  uCtx.clearRect(0, 0, userMaskCanvas.width, userMaskCanvas.height);
  uCtx.putImageData(imgData, 0, 0);

  syncUserMaskToBrushCanvas();
  updatePreviewLayout();
}

function syncUserMaskToBrushCanvas() {
  if (!currentImage || !userMaskCanvas || !elements.brushCanvas) return;
  const w = currentImage.naturalWidth;
  const h = currentImage.naturalHeight;
  const customPadding = {
    top: Number(elements.marginT?.value) || 0,
    bottom: Number(elements.marginB?.value) || 0,
    left: Number(elements.marginL?.value) || 0,
    right: Number(elements.marginR?.value) || 0,
  };
  const dims = calculateExpandedDimensions(w, h, currentAspect, currentAlign, customPadding);

  const bCtx = elements.brushCanvas.getContext("2d");
  bCtx.clearRect(0, 0, elements.brushCanvas.width, elements.brushCanvas.height);
  bCtx.drawImage(userMaskCanvas, dims.offsetX, dims.offsetY);
}

function updateUndoRedoButtons() {
  if (elements.btnUndoBrush) {
    elements.btnUndoBrush.disabled = brushHistoryStep < 0;
  }
  if (elements.btnRedoBrush) {
    elements.btnRedoBrush.disabled = brushHistoryStep >= brushHistory.length - 1;
  }
}

function toggleBrush() {
  isBrushActive = !isBrushActive;
  elements.btnToggleBrush?.classList.toggle("is-active", isBrushActive);
  if (elements.btnToggleBrush) {
    elements.btnToggleBrush.textContent = isBrushActive
      ? (isVi ? "Tắt Cọ Vẽ" : "Disable Brush")
      : (isVi ? "Bật Cọ Vẽ" : "Enable Brush");
  }
  if (elements.brushCanvas) {
    elements.brushCanvas.style.pointerEvents = isBrushActive ? "auto" : "none";
    elements.brushCanvas.style.cursor = isBrushActive
      ? brushToolMode === "eraser" ? "cell" : "crosshair"
      : "default";
  }
  showStatus(isBrushActive ? I18N.brushOn : I18N.brushOff, "info");
}

function setBrushMode(mode) {
  brushToolMode = mode;
  if (!isBrushActive) toggleBrush();

  if (elements.btnModePaint) {
    elements.btnModePaint.classList.toggle("is-active", mode === "paint");
  }
  if (elements.btnModeEraser) {
    elements.btnModeEraser.classList.toggle("is-active", mode === "eraser");
  }
  if (elements.brushCanvas) {
    elements.brushCanvas.style.cursor = mode === "eraser" ? "cell" : "crosshair";
  }
  showStatus(mode === "eraser" ? I18N.eraserOn : I18N.brushOn, "info");
}

function clearBrushMaskOnly() {
  if (userMaskCanvas) {
    const ctx = userMaskCanvas.getContext("2d");
    ctx.clearRect(0, 0, userMaskCanvas.width, userMaskCanvas.height);
  }
  if (elements.brushCanvas) {
    const ctx = elements.brushCanvas.getContext("2d");
    ctx.clearRect(0, 0, elements.brushCanvas.width, elements.brushCanvas.height);
  }
  updatePreviewLayout();
}

function clearBrush() {
  clearBrushMaskOnly();
  brushHistory = [];
  brushHistoryStep = -1;
  updateUndoRedoButtons();
  showStatus(I18N.brushCleared, "info");
}

/**
 * Start Expanding & Generative Inpainting with Transparent Steps
 */
async function startExpanding() {
  if (!currentImage || isProcessing) return;

  const w = currentImage.naturalWidth;
  const h = currentImage.naturalHeight;
  const customPadding = {
    top: Number(elements.marginT?.value) || 0,
    bottom: Number(elements.marginB?.value) || 0,
    left: Number(elements.marginL?.value) || 0,
    right: Number(elements.marginR?.value) || 0,
  };
  const dims = calculateExpandedDimensions(w, h, currentAspect, currentAlign, customPadding);

  isProcessing = true;
  activeJobId++;
  const jobId = activeJobId;

  // Save previous image state for Undo Result
  previousImage = currentImage;
  if (elements.btnUndoResult) elements.btnUndoResult.hidden = false;

  // UI state
  if (elements.btnRunExpand) elements.btnRunExpand.disabled = true;
  if (elements.btnCancelExpand) elements.btnCancelExpand.hidden = false;
  if (elements.progressShell) elements.progressShell.hidden = false;
  updateProgress(15, I18N.step1);

  try {
    // Step 1: Build expanded source canvas & neural mask
    const expandedCanvas = buildExpandedSourceCanvas(
      currentImage,
      dims.targetWidth,
      dims.targetHeight,
      dims.offsetX,
      dims.offsetY,
      w,
      h
    );

    const maskCanvas = buildOutpaintMaskCanvas(
      dims.targetWidth,
      dims.targetHeight,
      dims.offsetX,
      dims.offsetY,
      w,
      h,
      userMaskCanvas,
      6
    );

    // Step 2: Resample tensor for LaMa Fourier Model
    updateProgress(35, I18N.step2);
    const modelSize = 512;

    const scaledImageCanvas = document.createElement("canvas");
    scaledImageCanvas.width = modelSize;
    scaledImageCanvas.height = modelSize;
    scaledImageCanvas.getContext("2d").drawImage(expandedCanvas, 0, 0, modelSize, modelSize);

    const scaledMaskCanvas = document.createElement("canvas");
    scaledMaskCanvas.width = modelSize;
    scaledMaskCanvas.height = modelSize;
    scaledMaskCanvas.getContext("2d").drawImage(maskCanvas, 0, 0, modelSize, modelSize);

    const scaledImgData = scaledImageCanvas.getContext("2d").getImageData(0, 0, modelSize, modelSize);
    const scaledMaskData = scaledMaskCanvas.getContext("2d").getImageData(0, 0, modelSize, modelSize);

    const planarImage = rgbaToPlanarRgb(scaledImgData, modelSize);
    const floatMask = maskToFloatArray(scaledMaskData, modelSize);

    // Step 3: Run Inpaint Service inference
    const resultMessage = await inpaint.process({
      jobId,
      image: planarImage,
      mask: floatMask,
      width: modelSize,
      height: modelSize,
    });

    if (activeJobId !== jobId) return;

    updateProgress(85, I18N.step3);

    // Step 4: Unpack result Float32Array into 512x512 canvas
    const inpaintCanvas512 = document.createElement("canvas");
    inpaintCanvas512.width = modelSize;
    inpaintCanvas512.height = modelSize;
    const ipCtx = inpaintCanvas512.getContext("2d");
    const outImgData = ipCtx.createImageData(modelSize, modelSize);

    const pixels = modelSize * modelSize;
    for (let i = 0; i < pixels; i++) {
      for (let ch = 0; ch < 3; ch++) {
        const val = resultMessage.pixels[ch * pixels + i];
        outImgData.data[i * 4 + ch] = Math.max(0, Math.min(255, Math.round(val <= 1 ? val * 255 : val)));
      }
      outImgData.data[i * 4 + 3] = 255;
    }
    ipCtx.putImageData(outImgData, 0, 0);

    // Step 5: Final seamless composite (Full-resolution preserved)
    finalResultCanvas = compositeExpandedResult(
      currentImage,
      inpaintCanvas512,
      dims.targetWidth,
      dims.targetHeight,
      dims.offsetX,
      dims.offsetY,
      w,
      h,
      userMaskCanvas
    );

    finalResultCanvas.toBlob((blob) => {
      if (!blob) throw new Error("Could not create result blob.");
      if (afterObjectUrl) URL.revokeObjectURL(afterObjectUrl);
      afterObjectUrl = URL.createObjectURL(blob);

      if (elements.imgAfter) elements.imgAfter.src = afterObjectUrl;
      if (elements.previewImg) elements.previewImg.src = afterObjectUrl;

      // Update comparison slider badges & metadata
      if (elements.sliderBadgeLeft) {
        elements.sliderBadgeLeft.textContent = `${isVi ? "Ảnh gốc" : "Original"} (${w}×${h})`;
      }
      if (elements.sliderBadgeRight) {
        elements.sliderBadgeRight.textContent = `${isVi ? "AI Mở Rộng" : "Expanded"} (${dims.targetWidth}×${dims.targetHeight})`;
      }

      // Display estimated file size & resolution
      if (elements.resultMetaText) {
        const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
        elements.resultMetaText.innerHTML = `${dims.targetWidth} × ${dims.targetHeight} px &bull; <strong>~${sizeMB} MB</strong>`;
      }

      resetProcessingState();
      switchTab("compare");
      showStatus(I18N.expandSuccess(dims.targetWidth, dims.targetHeight), "success");

      if (elements.btnDownload) elements.btnDownload.disabled = false;
      if (elements.btnContinueEdit) elements.btnContinueEdit.hidden = false;
    }, "image/png");
  } catch (err) {
    console.error("Expand failed:", err);
    showStatus(
      err?.name === "AbortError" ? I18N.expandCancel : I18N.expandError,
      err?.name === "AbortError" ? "info" : "error"
    );
    resetProcessingState();
  }
}

/**
 * Use current expanded result as new input image for continuous editing
 */
async function continueEditingWithResult() {
  if (!finalResultCanvas) return;
  try {
    finalResultCanvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "continued-expanded.png", { type: "image/png" });
      await handleFileSelected(file);
      switchTab("editor");
      showStatus(I18N.continueEditReady, "success");
    }, "image/png");
  } catch (e) {
    console.error("Continue editing error:", e);
  }
}

/**
 * Undo result to previous image state
 */
function undoResultToPrevious() {
  if (!previousImage) return;
  currentImage = previousImage;
  finalResultCanvas = null;
  updatePreviewLayout();
  switchTab("editor");
  if (elements.btnUndoResult) elements.btnUndoResult.hidden = true;
  showStatus(I18N.undoResultSuccess, "info");
}

/**
 * Toggle Zoom 100% vs Fit for inspecting seams
 */
function toggleZoom100() {
  isZoomed = !isZoomed;
  elements.btnZoomToggle?.classList.toggle("is-active", isZoomed);
  elements.sliderContainer?.classList.toggle("is-zoomed-100", isZoomed);
  elements.editorStage?.classList.toggle("is-zoomed-100", isZoomed);
  if (elements.btnZoomToggle) {
    elements.btnZoomToggle.innerHTML = isZoomed
      ? `🔍 ${isVi ? "Thu vừa khung (Fit)" : "Fit View"}`
      : `🔍 ${isVi ? "Soi 100% (Zoom)" : "Zoom 100%"}`;
  }
}

/**
 * Handle quick feedback (thumbs up / down)
 */
function submitFeedback(type) {
  try {
    localStorage.setItem(`expand_feedback_${Date.now()}`, type);
    if (elements.btnFeedbackGood) elements.btnFeedbackGood.classList.toggle("is-voted", type === "good");
    if (elements.btnFeedbackBad) elements.btnFeedbackBad.classList.toggle("is-voted", type === "bad");
    showStatus(I18N.feedbackThanks, "success");
  } catch (e) {
    console.warn("Feedback save note:", e);
  }
}

function cancelExpanding() {
  if (!isProcessing) return;
  inpaint.cancel(activeJobId);
  showStatus(I18N.expandCancel, "info");
  resetProcessingState();
}

function handleModelDownloadProgress(data) {
  if (elements.modelDownloadCard) elements.modelDownloadCard.hidden = false;
  if (elements.modelDownloadFill) elements.modelDownloadFill.style.width = `${data.percent}%`;
  if (elements.modelDownloadMetaText) {
    const loadedMB = (data.loaded / (1024 * 1024)).toFixed(1);
    const totalMB = (data.total / (1024 * 1024)).toFixed(1);
    elements.modelDownloadMetaText.textContent = I18N.modelDownloading(loadedMB, totalMB, data.percent, data.speedMBps);
  }
  if (data.percent >= 99) {
    showModelReady();
  }
}

function showModelReady() {
  if (elements.modelDownloadCard) elements.modelDownloadCard.hidden = true;
  if (elements.modelReadyBadge) {
    elements.modelReadyBadge.textContent = I18N.modelReady;
    elements.modelReadyBadge.hidden = false;
  }
}

function handleInpaintStatus(message) {
  if (message.stage === "model-initialize") {
    updateProgress(message.progress ?? 50, isVi ? "Khởi tạo mô hình AI trên thiết bị..." : "Initializing on-device AI model...");
  }
}

function updateProgress(percent, message) {
  if (elements.progressFill) elements.progressFill.style.width = `${percent}%`;
  if (elements.progressPercentText) elements.progressPercentText.textContent = `${percent}%`;
  if (elements.progressStageText) elements.progressStageText.textContent = message || I18N.step1;
}

function resetProcessingState() {
  isProcessing = false;
  if (elements.btnRunExpand) elements.btnRunExpand.disabled = false;
  if (elements.btnCancelExpand) elements.btnCancelExpand.hidden = true;
  if (elements.progressShell) elements.progressShell.hidden = true;
}

function switchTab(tab) {
  if (tab === "editor") {
    elements.btnTabEditor?.classList.add("is-active");
    elements.btnTabEditor?.setAttribute("aria-selected", "true");
    elements.btnTabCompare?.classList.remove("is-active");
    elements.btnTabCompare?.setAttribute("aria-selected", "false");
    if (elements.editorStage) elements.editorStage.hidden = false;
    if (elements.sliderContainer) elements.sliderContainer.hidden = true;
  } else {
    elements.btnTabEditor?.classList.remove("is-active");
    elements.btnTabEditor?.setAttribute("aria-selected", "false");
    elements.btnTabCompare?.classList.add("is-active");
    elements.btnTabCompare?.setAttribute("aria-selected", "true");
    if (elements.editorStage) elements.editorStage.hidden = true;
    if (elements.sliderContainer) elements.sliderContainer.hidden = false;
  }
}

function downloadResult() {
  if (!finalResultCanvas) {
    showStatus(I18N.noImageError, "error");
    return;
  }

  const format = elements.exportFormat?.value || "png";
  const mimeType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
  const quality = (Number(elements.exportQuality?.value) || 95) / 100;

  const baseName = currentFile?.name?.replace(/\.[^/.]+$/, "") || "image";
  const prefix = isVi ? "mo-rong" : "expanded";
  const fileName = `${baseName}-${prefix}-${currentAspect.replace(":", "x")}.${format === "jpeg" ? "jpg" : format}`;

  finalResultCanvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showStatus(I18N.downloadSuccess(fileName), "success");
    },
    mimeType,
    quality
  );
}

function resetAll() {
  currentFile = null;
  currentImage = null;
  previousImage = null;
  finalResultCanvas = null;
  if (beforeObjectUrl) URL.revokeObjectURL(beforeObjectUrl);
  if (afterObjectUrl) URL.revokeObjectURL(afterObjectUrl);
  beforeObjectUrl = null;
  afterObjectUrl = null;

  clearBrush();
  if (elements.imgBefore) elements.imgBefore.src = "";
  if (elements.imgAfter) elements.imgAfter.src = "";
  if (elements.previewImg) elements.previewImg.src = "";
  if (elements.workspace) elements.workspace.hidden = true;
  if (elements.btnDownload) elements.btnDownload.disabled = true;
  if (elements.btnContinueEdit) elements.btnContinueEdit.hidden = true;
  if (elements.btnUndoResult) elements.btnUndoResult.hidden = true;

  resetProcessingState();
  switchTab("editor");
  clearStatus();
}

function showStatus(message, type = "info") {
  if (!elements.statusAlert) return;
  elements.statusAlert.textContent = message;
  elements.statusAlert.className = `status-alert is-${type}`;
  elements.statusAlert.hidden = false;
}

function clearStatus() {
  if (!elements.statusAlert) return;
  elements.statusAlert.textContent = "";
  elements.statusAlert.hidden = true;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initEvents);
} else {
  initEvents();
}


