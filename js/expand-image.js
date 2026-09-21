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

  // Brush Controls
  btnToggleBrush: $("btnToggleBrush"),
  brushSize: $("brushSize"),
  valBrushSize: $("valBrushSize"),
  btnClearBrush: $("btnClearBrush"),
  brushCanvas: $("brushCanvasLayer"),

  // Stats Pill
  origDimsText: $("origDimsText"),
  targetDimsText: $("targetDimsText"),
  expandBadge: $("expandBadge"),

  // Action Buttons
  btnRunExpand: $("btnRunExpand"),
  btnCancelExpand: $("btnCancelExpand"),

  // Progress
  progressShell: $("expandProgressShell"),
  progressFill: $("expandProgressFill"),
  progressStageText: $("expandProgressStageText"),
  progressPercentText: $("expandProgressPercentText"),

  // Stage Area & Tabs
  btnTabEditor: $("btnTabEditor"),
  btnTabCompare: $("btnTabCompare"),
  editorStage: $("expandEditorStage"),
  sliderContainer: $("expandSliderContainer"),
  previewImg: $("expandedCanvasPreview"),
  sliderFrame: $("expandSliderFrame"),
  sliderRange: $("expandSliderRange"),
  imgBefore: $("imgSliderBefore"),
  imgAfter: $("imgSliderAfter"),
  sliderBadgeLeft: $("sliderBadgeLeft"),
  sliderBadgeRight: $("sliderBadgeRight"),

  // Export
  exportFormat: $("exportFormat"),
  exportQuality: $("exportQuality"),
  qualityRow: $("qualityRow"),
  btnDownload: $("btnDownload"),
  btnClear: $("btnClear"),
  btnShare: $("btnShare"),
  statusAlert: $("expandStatusAlert"),
};

// Internal State
let currentFile = null;
let currentImage = null;
let currentAspect = "16:9";
let currentAlign = "center";
let activeJobId = 0;
let isProcessing = false;
let isBrushActive = false;
let isDrawing = false;
let lastX = 0;
let lastY = 0;

let beforeObjectUrl = null;
let afterObjectUrl = null;
let userMaskCanvas = null;
let finalResultCanvas = null;

// Initialize Inpaint Service
const inpaint = new InpaintService({ onStatus: handleInpaintStatus });

function initEvents() {
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
      elements.aspectBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
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

  // Brush Controls
  elements.btnToggleBrush?.addEventListener("click", toggleBrush);
  elements.brushSize?.addEventListener("input", (e) => {
    if (elements.valBrushSize) elements.valBrushSize.textContent = `${e.target.value}px`;
  });
  elements.btnClearBrush?.addEventListener("click", clearBrush);

  // Brush Canvas Drawing Handlers
  setupBrushDrawing();

  // Action Buttons
  elements.btnRunExpand?.addEventListener("click", startExpanding);
  elements.btnCancelExpand?.addEventListener("click", cancelExpanding);
  elements.btnClear?.addEventListener("click", resetAll);
  elements.btnDownload?.addEventListener("click", downloadResult);

  // Stage Tabs
  elements.btnTabEditor?.addEventListener("click", () => switchTab("editor"));
  elements.btnTabCompare?.addEventListener("click", () => switchTab("compare"));

  // Slider Input
  elements.sliderRange?.addEventListener("input", (e) => {
    elements.sliderFrame?.style.setProperty("--slider-pos", `${e.target.value}%`);
  });

  // Export format & quality
  elements.exportFormat?.addEventListener("change", (e) => {
    const isLossy = ["jpeg", "webp"].includes(e.target.value);
    if (elements.qualityRow) elements.qualityRow.hidden = !isLossy;
  });

  // Share tool
  elements.btnShare?.addEventListener("click", () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showStatus("Tool link copied to clipboard! Share with your friends.", "success");
    }
  });

  window.addEventListener("beforeunload", () => {
    inpaint.dispose();
    if (beforeObjectUrl) URL.revokeObjectURL(beforeObjectUrl);
    if (afterObjectUrl) URL.revokeObjectURL(afterObjectUrl);
  });
}

/**
 * Handle image file selection
 */
async function handleFileSelected(file) {
  if (!file.type.startsWith("image/")) {
    showStatus("Please upload a valid image file (JPG, PNG, WebP).", "error");
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

    // Reset user brush canvas
    userMaskCanvas = document.createElement("canvas");
    userMaskCanvas.width = img.naturalWidth;
    userMaskCanvas.height = img.naturalHeight;

    if (elements.imgBefore) elements.imgBefore.src = beforeObjectUrl;
    if (elements.workspace) elements.workspace.hidden = false;

    updatePreviewLayout();
    elements.workspace?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error("Failed to load image:", err);
    showStatus("Could not decode image file.", "error");
  }
}

/**
 * Load sample image
 */
async function loadSampleImage(url) {
  try {
    showStatus("Loading sample image...", "info");
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not fetch sample.");
    const blob = await res.blob();
    const file = new File([blob], "sample-expand.jpg", { type: "image/jpeg" });
    await handleFileSelected(file);
    showStatus("Sample image loaded. Select aspect ratio and click 'Expand & Generative Fill'!", "success");
  } catch (err) {
    console.error(err);
    showStatus("Could not load sample image.", "error");
  }
}

/**
 * Update the visual preview of the expanded canvas layout
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
  if (elements.expandBadge) elements.expandBadge.textContent = `+${dims.expansionPercent}% Expanded (${dims.aspectKey})`;

  // Render visual canvas preview showing expanded layout frame
  renderVisualPreview(dims);
}

/**
 * Render preview canvas showing the padded bounds and original photo
 */
function renderVisualPreview(dims) {
  const canvas = document.createElement("canvas");
  canvas.width = dims.targetWidth;
  canvas.height = dims.targetHeight;
  const ctx = canvas.getContext("2d");

  // Draw extrapolated background texture
  ctx.save();
  ctx.filter = "blur(14px) brightness(0.7)";
  ctx.drawImage(currentImage, 0, 0, dims.targetWidth, dims.targetHeight);
  ctx.restore();

  // Darken expanded area slightly to indicate outpaint border
  ctx.fillStyle = "rgba(10, 12, 18, 0.4)";
  ctx.fillRect(0, 0, dims.targetWidth, dims.targetHeight);

  // Draw original image crisp in its position
  ctx.drawImage(currentImage, dims.offsetX, dims.offsetY, dims.sourceWidth, dims.sourceHeight);

  // Draw dashed outline around original image to guide the user
  ctx.strokeStyle = "rgba(194, 248, 52, 0.9)";
  ctx.lineWidth = Math.max(2, Math.round(dims.targetWidth / 400));
  ctx.setLineDash([8, 8]);
  ctx.strokeRect(dims.offsetX, dims.offsetY, dims.sourceWidth, dims.sourceHeight);

  // Draw user brush mask if any
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
 * Setup brush drawing on the brush canvas layer
 */
function setupBrushDrawing() {
  const canvas = elements.brushCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const startDraw = (e) => {
    if (!isBrushActive || !currentImage) return;
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    lastX = (e.clientX - rect.left) * scaleX;
    lastY = (e.clientY - rect.top) * scaleY;
    drawStroke(lastX, lastY);
  };

  const moveDraw = (e) => {
    if (!isDrawing || !isBrushActive) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    drawStroke(x, y);
    lastX = x;
    lastY = y;
  };

  const endDraw = () => {
    if (isDrawing) {
      isDrawing = false;
      syncBrushToUserMask();
    }
  };

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", moveDraw);
  window.addEventListener("mouseup", endDraw);

  canvas.addEventListener("touchstart", (e) => {
    if (e.touches[0]) startDraw(e.touches[0]);
  }, { passive: true });
  canvas.addEventListener("touchmove", (e) => {
    if (e.touches[0]) moveDraw(e.touches[0]);
  }, { passive: true });
  window.addEventListener("touchend", endDraw);

  function drawStroke(x, y) {
    const radius = Number(elements.brushSize?.value) || 30;
    ctx.strokeStyle = "rgba(255, 60, 60, 0.85)";
    ctx.fillStyle = "rgba(255, 60, 60, 0.85)";
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
  }
}

/**
 * Transfer strokes drawn on stage canvas into userMaskCanvas (at source coordinates)
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
  // Copy region corresponding to original photo from brushCanvas
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
 * Toggle brush mode
 */
function toggleBrush() {
  isBrushActive = !isBrushActive;
  elements.btnToggleBrush?.classList.toggle("is-active", isBrushActive);
  if (elements.brushCanvas) {
    elements.brushCanvas.style.pointerEvents = isBrushActive ? "auto" : "none";
    elements.brushCanvas.style.cursor = isBrushActive ? "crosshair" : "default";
  }
  showStatus(
    isBrushActive
      ? "Brush Mode On: Paint on unwanted objects or areas to fill them with AI."
      : "Brush Mode Off.",
    "info"
  );
}

/**
 * Clear brush mask
 */
function clearBrush() {
  if (userMaskCanvas) {
    const ctx = userMaskCanvas.getContext("2d");
    ctx.clearRect(0, 0, userMaskCanvas.width, userMaskCanvas.height);
  }
  if (elements.brushCanvas) {
    const ctx = elements.brushCanvas.getContext("2d");
    ctx.clearRect(0, 0, elements.brushCanvas.width, elements.brushCanvas.height);
  }
  updatePreviewLayout();
  showStatus("Brush mask cleared.", "info");
}

/**
 * Start Expanding & Generative Inpainting
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

  // UI state
  if (elements.btnRunExpand) elements.btnRunExpand.disabled = true;
  if (elements.btnCancelExpand) elements.btnCancelExpand.hidden = false;
  if (elements.progressShell) elements.progressShell.hidden = false;
  updateProgress(10, "Building expanded canvas and neural mask...");

  try {
    // Step 1: Build expanded source canvas
    const expandedCanvas = buildExpandedSourceCanvas(
      currentImage,
      dims.targetWidth,
      dims.targetHeight,
      dims.offsetX,
      dims.offsetY,
      w,
      h
    );

    // Step 2: Build outpaint mask canvas
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

    // Step 3: Resample to 512x512 for LaMa neural model
    updateProgress(25, "Scaling tensor for LaMa Fourier neural model...");
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

    updateProgress(45, "Executing on-device AI outpainting neural network...");

    // Step 4: Run LaMa Inpaint Service
    const resultMessage = await inpaint.process({
      jobId,
      image: planarImage,
      mask: floatMask,
      width: modelSize,
      height: modelSize,
    });

    if (activeJobId !== jobId) return;

    updateProgress(90, "Blending seamless AI generative composite...");

    // Step 5: Unpack result Float32Array into 512x512 canvas
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

    // Step 6: Final seamless composite
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

      // Update comparison slider badges
      if (elements.sliderBadgeLeft) elements.sliderBadgeLeft.textContent = `Original (${w}×${h})`;
      if (elements.sliderBadgeRight) elements.sliderBadgeRight.textContent = `Expanded (${dims.targetWidth}×${dims.targetHeight})`;

      resetProcessingState();
      switchTab("compare");
      showStatus(`Image expanded successfully to ${dims.targetWidth}×${dims.targetHeight}px!`, "success");

      if (elements.btnDownload) elements.btnDownload.disabled = false;
    }, "image/png");
  } catch (err) {
    console.error("Expand failed:", err);
    showStatus(
      err?.name === "AbortError"
        ? "Expansion cancelled."
        : "Local neural expansion failed. Try a smaller aspect ratio or another browser.",
      err?.name === "AbortError" ? "info" : "error"
    );
    resetProcessingState();
  }
}

/**
 * Cancel expanding
 */
function cancelExpanding() {
  if (!isProcessing) return;
  inpaint.cancel(activeJobId);
  showStatus("Expansion process cancelled.", "info");
  resetProcessingState();
}

/**
 * Handle inpaint service status
 */
function handleInpaintStatus(message) {
  const labels = {
    "model-download": "Downloading neural network weights (92.6 MB)...",
    "model-initialize": "Initializing on-device WebGPU/WASM model...",
    processing: "Synthesizing AI background extensions...",
  };
  updateProgress(message.progress ?? 50, labels[message.stage] || "Processing on your device...");
}

/**
 * Update progress bar
 */
function updateProgress(percent, message) {
  if (elements.progressFill) elements.progressFill.style.width = `${percent}%`;
  if (elements.progressPercentText) elements.progressPercentText.textContent = `${percent}%`;
  if (elements.progressStageText) elements.progressStageText.textContent = message || "Processing...";
}

/**
 * Reset processing UI state
 */
function resetProcessingState() {
  isProcessing = false;
  if (elements.btnRunExpand) elements.btnRunExpand.disabled = false;
  if (elements.btnCancelExpand) elements.btnCancelExpand.hidden = true;
  if (elements.progressShell) elements.progressShell.hidden = true;
}

/**
 * Switch Tab (Editor vs Compare)
 */
function switchTab(tab) {
  if (tab === "editor") {
    elements.btnTabEditor?.classList.add("is-active");
    elements.btnTabCompare?.classList.remove("is-active");
    if (elements.editorStage) elements.editorStage.hidden = false;
    if (elements.sliderContainer) elements.sliderContainer.hidden = true;
  } else {
    elements.btnTabEditor?.classList.remove("is-active");
    elements.btnTabCompare?.classList.add("is-active");
    if (elements.editorStage) elements.editorStage.hidden = true;
    if (elements.sliderContainer) elements.sliderContainer.hidden = false;
  }
}

/**
 * Download Result
 */
function downloadResult() {
  if (!finalResultCanvas) {
    showStatus("Please expand an image first.", "error");
    return;
  }

  const format = elements.exportFormat?.value || "png";
  const mimeType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
  const quality = (Number(elements.exportQuality?.value) || 92) / 100;

  const baseName = currentFile?.name?.replace(/\.[^/.]+$/, "") || "image";
  const fileName = `${baseName}-expanded-${currentAspect.replace(":", "x")}.${format === "jpeg" ? "jpg" : format}`;

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
      showStatus(`Downloaded ${fileName} successfully!`, "success");
    },
    mimeType,
    quality
  );
}

/**
 * Reset everything
 */
function resetAll() {
  currentFile = null;
  currentImage = null;
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

  resetProcessingState();
  switchTab("editor");
  clearStatus();
}

/**
 * Status message display helper
 */
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

// Initialize on DOMContentLoaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initEvents);
} else {
  initEvents();
}
