import { calculateUpscaleDimensions, ENHANCER_PRESETS } from "./image-upscaler/engine.js";

const $ = (id) => document.getElementById(id);

// UI Element References
const elements = {
  dropzone: $("upscalerDropzone"),
  fileInput: $("upscalerFileInput"),
  chooseBtn: $("upscalerChooseBtn"),
  samplesTray: $("upscalerSamplesTray"),
  workspace: $("upscalerWorkspace"),
  uploadSection: $("upscalerUploadSection"),

  // Stats & Info
  originalStatsText: $("originalStatsText"),
  targetStatsText: $("targetStatsText"),
  pixelIncreaseBadge: $("pixelIncreaseBadge"),

  // Controls
  factorBtns: document.querySelectorAll(".factor-btn"),
  presetCards: document.querySelectorAll(".preset-card"),
  sliderDeblur: $("sliderDeblur"),
  valDeblur: $("valDeblur"),
  sliderDenoise: $("sliderDenoise"),
  valDenoise: $("valDenoise"),
  sliderContrast: $("sliderContrast"),
  valContrast: $("valContrast"),
  sliderEdges: $("sliderEdges"),
  valEdges: $("valEdges"),

  btnRunUpscale: $("btnRunUpscale"),
  btnCancelUpscale: $("btnCancelUpscale"),

  // Progress
  progressShell: $("upscalerProgressShell"),
  progressFill: $("upscalerProgressFill"),
  progressStageText: $("upscalerProgressStageText"),
  progressPercentText: $("upscalerProgressPercentText"),

  // Stage & View Mode
  btnTabSlider: $("btnTabSlider"),
  btnTabSide: $("btnTabSide"),
  sliderContainer: $("upscalerSliderContainer"),
  sideContainer: $("upscalerSideContainer"),
  sliderFrame: $("upscalerSliderFrame"),
  sliderRange: $("upscalerSliderRange"),
  imgBefore: $("imgSliderBefore"),
  imgAfter: $("imgSliderAfter"),
  sliderBadgeLeft: $("sliderBadgeLeft"),
  sliderBadgeRight: $("sliderBadgeRight"),

  imgSideBefore: $("imgSideBefore"),
  imgSideAfter: $("imgSideAfter"),
  sideLabelBefore: $("sideLabelBefore"),
  sideLabelAfter: $("sideLabelAfter"),

  btnZoomFit: $("btnZoomFit"),
  btnZoom100: $("btnZoom100"),
  btnZoom200: $("btnZoom200"),

  // Export
  exportFormat: $("exportFormat"),
  exportQuality: $("exportQuality"),
  qualityRow: $("qualityRow"),
  btnDownload: $("btnDownload"),
  btnClear: $("btnClear"),
  btnShare: $("btnShare"),
  statusAlert: $("upscalerStatusAlert"),
};

// Internal State
let currentFile = null;
let currentImage = null;
let originalImageData = null;
let upscaledCanvas = null;
let currentFactor = 2;
let currentPreset = "clarity";
let _currentZoom = "fit";
let activeJobId = 0;
let isProcessing = false;
let beforeObjectUrl = null;
let afterObjectUrl = null;

// Initialize Web Worker
let worker = null;
function initWorker() {
  if (worker) return;
  worker = new Worker(new URL("./image-upscaler/upscaler.worker.js", import.meta.url), {
    type: "module",
  });
  worker.onmessage = handleWorkerMessage;
  worker.onerror = (err) => {
    console.error("Upscaler worker error:", err);
    showStatus("Processing failed in background worker.", "error");
    resetProcessingState();
  };
}

// Attach Event Listeners
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
  ["dragenter", "dragover"].forEach((event) => {
    elements.dropzone?.addEventListener(event, (e) => {
      e.preventDefault();
      elements.dropzone?.classList.add("is-dragging");
    });
  });
  ["dragleave", "drop"].forEach((event) => {
    elements.dropzone?.addEventListener(event, (e) => {
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

  // Sample Buttons
  document.querySelectorAll(".upscaler-sample-item").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const sampleUrl = btn.dataset.sample;
      if (sampleUrl) loadSampleImage(sampleUrl);
    });
  });

  // Factor Selection (2X, 4X, 8X)
  elements.factorBtns?.forEach((btn) => {
    btn.addEventListener("click", () => {
      elements.factorBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      currentFactor = Number(btn.dataset.factor) || 2;
      updateStatsDisplay();
    });
  });

  // Preset Selection
  elements.presetCards?.forEach((card) => {
    card.addEventListener("click", () => {
      elements.presetCards.forEach((c) => c.classList.remove("is-active"));
      card.classList.add("is-active");
      currentPreset = card.dataset.preset || "clarity";
      applyPresetDefaults(currentPreset);
    });
  });

  // Fine Tuning Sliders
  elements.sliderDeblur?.addEventListener("input", (e) => {
    if (elements.valDeblur) elements.valDeblur.textContent = `${e.target.value}%`;
  });
  elements.sliderDenoise?.addEventListener("input", (e) => {
    if (elements.valDenoise) elements.valDenoise.textContent = `${e.target.value}%`;
  });
  elements.sliderContrast?.addEventListener("input", (e) => {
    if (elements.valContrast) elements.valContrast.textContent = `${e.target.value}%`;
  });
  elements.sliderEdges?.addEventListener("input", (e) => {
    if (elements.valEdges) elements.valEdges.textContent = `${e.target.value}%`;
  });

  // Action Buttons
  elements.btnRunUpscale?.addEventListener("click", startUpscaling);
  elements.btnCancelUpscale?.addEventListener("click", cancelUpscaling);
  elements.btnClear?.addEventListener("click", resetAll);
  elements.btnDownload?.addEventListener("click", downloadResult);

  // View Mode Tabs
  elements.btnTabSlider?.addEventListener("click", () => switchViewMode("slider"));
  elements.btnTabSide?.addEventListener("click", () => switchViewMode("side"));

  // Before/After Slider Input
  elements.sliderRange?.addEventListener("input", (e) => {
    elements.sliderFrame?.style.setProperty("--slider-pos", `${e.target.value}%`);
  });

  // Zoom Controls
  elements.btnZoomFit?.addEventListener("click", () => setZoom("fit"));
  elements.btnZoom100?.addEventListener("click", () => setZoom("100%"));
  elements.btnZoom200?.addEventListener("click", () => setZoom("200%"));

  // Format Selection
  elements.exportFormat?.addEventListener("change", (e) => {
    const isJpegOrWebp = ["jpeg", "webp"].includes(e.target.value);
    if (elements.qualityRow) elements.qualityRow.hidden = !isJpegOrWebp;
  });

  // Share Tool
  elements.btnShare?.addEventListener("click", () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showStatus("Tool link copied to clipboard! Share with friends.", "success");
    }
  });

  window.addEventListener("beforeunload", () => {
    worker?.terminate();
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

    // Extract raw RGBA ImageData from image
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    originalImageData = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);

    // Update previews
    if (elements.imgBefore) elements.imgBefore.src = beforeObjectUrl;
    if (elements.imgSideBefore) elements.imgSideBefore.src = beforeObjectUrl;
    // Before processing, preview shows original
    if (elements.imgAfter) elements.imgAfter.src = beforeObjectUrl;
    if (elements.imgSideAfter) elements.imgSideAfter.src = beforeObjectUrl;

    // Show workspace
    if (elements.workspace) elements.workspace.hidden = false;
    updateStatsDisplay();

    // Scroll smoothly to workspace
    elements.workspace?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error("Failed to load image:", err);
    showStatus("Failed to decode image. Please try another file.", "error");
  }
}

/**
 * Load built-in sample image
 */
async function loadSampleImage(url) {
  try {
    showStatus("Loading sample image...", "info");
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not fetch sample.");
    const blob = await res.blob();
    const file = new File([blob], "sample-photo.jpg", { type: "image/jpeg" });
    await handleFileSelected(file);
    showStatus("Sample image loaded. Choose a factor and click 'Upscale & Enhance'!", "success");
  } catch (err) {
    console.error(err);
    showStatus("Could not load sample image.", "error");
  }
}

/**
 * Apply preset defaults to sliders
 */
function applyPresetDefaults(presetId) {
  const config = ENHANCER_PRESETS[presetId];
  if (!config) return;
  // Map preset configs to sliders (1.0 = 100%)
  if (elements.sliderDeblur) {
    const val = Math.round((config.deblurAmount / 1.1) * 100);
    elements.sliderDeblur.value = val;
    if (elements.valDeblur) elements.valDeblur.textContent = `${val}%`;
  }
  if (elements.sliderDenoise) {
    const val = Math.round((config.denoiseSigma / 1.5) * 100);
    elements.sliderDenoise.value = val;
    if (elements.valDenoise) elements.valDenoise.textContent = `${val}%`;
  }
  if (elements.sliderEdges) {
    const val = Math.round((config.edgeStrength / 0.6) * 100);
    elements.sliderEdges.value = val;
    if (elements.valEdges) elements.valEdges.textContent = `${val}%`;
  }
  if (elements.sliderContrast) {
    const val = Math.round((config.contrast / 0.15) * 100);
    elements.sliderContrast.value = val;
    if (elements.valContrast) elements.valContrast.textContent = `${val}%`;
  }
}

/**
 * Update stats pill (megapixels, dimensions, percentage increase)
 */
function updateStatsDisplay() {
  if (!currentImage) return;
  const w = currentImage.naturalWidth;
  const h = currentImage.naturalHeight;

  try {
    const stats = calculateUpscaleDimensions(w, h, currentFactor);

    if (elements.originalStatsText) {
      elements.originalStatsText.textContent = `${stats.originalWidth} × ${stats.originalHeight} (${stats.originalMegapixels} MP)`;
    }
    if (elements.targetStatsText) {
      elements.targetStatsText.textContent = `${stats.targetWidth} × ${stats.targetHeight} (${stats.targetMegapixels} MP)`;
    }
    if (elements.pixelIncreaseBadge) {
      elements.pixelIncreaseBadge.textContent = `+${stats.pixelIncreasePercent}% Pixels (${stats.factor}X AI Resolution)`;
    }

    if (elements.sliderBadgeLeft) {
      elements.sliderBadgeLeft.textContent = `Original: ${stats.originalWidth}×${stats.originalHeight}`;
    }
    if (elements.sliderBadgeRight) {
      elements.sliderBadgeRight.textContent = `AI ${stats.factor}X: ${stats.targetWidth}×${stats.targetHeight}`;
    }
    if (elements.sideLabelBefore) {
      elements.sideLabelBefore.textContent = `Original (${stats.originalWidth}×${stats.originalHeight})`;
    }
    if (elements.sideLabelAfter) {
      elements.sideLabelAfter.textContent = `Enhanced AI (${stats.targetWidth}×${stats.targetHeight})`;
    }
  } catch (err) {
    console.error("Stats calculation error:", err);
  }
}

/**
 * Run Upscaling Pipeline
 */
function startUpscaling() {
  if (!originalImageData || isProcessing) return;
  initWorker();

  const w = originalImageData.width;
  const h = originalImageData.height;
  const stats = calculateUpscaleDimensions(w, h, currentFactor);

  isProcessing = true;
  activeJobId++;
  const jobId = activeJobId;

  // UI state
  if (elements.btnRunUpscale) elements.btnRunUpscale.disabled = true;
  if (elements.btnCancelUpscale) elements.btnCancelUpscale.hidden = false;
  if (elements.progressShell) elements.progressShell.hidden = false;
  updateProgress(5, "Preparing image and starting AI pipeline...");

  // Collect slider multiplier options
  const deblurMultiplier = (Number(elements.sliderDeblur?.value) || 100) / 100;
  const denoiseMultiplier = (Number(elements.sliderDenoise?.value) || 100) / 100;
  const edgeMultiplier = (Number(elements.sliderEdges?.value) || 100) / 100;
  const contrastMultiplier = (Number(elements.sliderContrast?.value) || 100) / 100;

  // Clone buffer so original remains available
  const sourceBuffer = originalImageData.data.slice().buffer;

  worker.postMessage(
    {
      type: "process",
      jobId,
      sourceBuffer,
      srcW: w,
      srcH: h,
      destW: stats.targetWidth,
      destH: stats.targetHeight,
      options: {
        preset: currentPreset,
        deblurMultiplier,
        denoiseMultiplier,
        edgeMultiplier,
        contrastMultiplier,
      },
    },
    [sourceBuffer]
  );
}

/**
 * Cancel ongoing upscaling job
 */
function cancelUpscaling() {
  if (!isProcessing) return;
  worker?.postMessage({ type: "cancel", jobId: activeJobId });
  showStatus("Upscaling process cancelled.", "info");
  resetProcessingState();
}

/**
 * Handle worker communication
 */
function handleWorkerMessage(event) {
  const { type, jobId, progress, message, resultBuffer, width, height } = event.data;
  if (jobId !== activeJobId) return;

  if (type === "progress") {
    updateProgress(progress, message);
  } else if (type === "result") {
    onUpscaleSuccess(resultBuffer, width, height);
  } else if (type === "cancelled") {
    resetProcessingState();
  } else if (type === "error") {
    showStatus(message || "Upscaling failed.", "error");
    resetProcessingState();
  }
}

/**
 * Render upscaled result
 */
function onUpscaleSuccess(resultBuffer, width, height) {
  try {
    updateProgress(100, "Rendering final image...");

    upscaledCanvas = document.createElement("canvas");
    upscaledCanvas.width = width;
    upscaledCanvas.height = height;
    const ctx = upscaledCanvas.getContext("2d");

    const resultPixels = new Uint8ClampedArray(resultBuffer);
    const imgData = new ImageData(resultPixels, width, height);
    ctx.putImageData(imgData, 0, 0);

    upscaledCanvas.toBlob((blob) => {
      if (afterObjectUrl) URL.revokeObjectURL(afterObjectUrl);
      afterObjectUrl = URL.createObjectURL(blob);

      if (elements.imgAfter) elements.imgAfter.src = afterObjectUrl;
      if (elements.imgSideAfter) elements.imgSideAfter.src = afterObjectUrl;

      resetProcessingState();
      showStatus(`Enhanced successfully! Resolution boosted to ${width}×${height}px.`, "success");

      // Enable download
      if (elements.btnDownload) elements.btnDownload.disabled = false;
    }, "image/png");
  } catch (err) {
    console.error("Failed to render upscaled canvas:", err);
    showStatus("Rendering error occurred.", "error");
    resetProcessingState();
  }
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
  if (elements.btnRunUpscale) elements.btnRunUpscale.disabled = false;
  if (elements.btnCancelUpscale) elements.btnCancelUpscale.hidden = true;
  if (elements.progressShell) elements.progressShell.hidden = true;
}

/**
 * Switch View Mode (Slider vs Side by Side)
 */
function switchViewMode(mode) {
  if (mode === "slider") {
    if (elements.btnTabSlider) elements.btnTabSlider.classList.add("is-active");
    if (elements.btnTabSide) elements.btnTabSide.classList.remove("is-active");
    if (elements.sliderContainer) elements.sliderContainer.hidden = false;
    if (elements.sideContainer) elements.sideContainer.hidden = true;
  } else {
    if (elements.btnTabSlider) elements.btnTabSlider.classList.remove("is-active");
    if (elements.btnTabSide) elements.btnTabSide.classList.add("is-active");
    if (elements.sliderContainer) elements.sliderContainer.hidden = true;
    if (elements.sideContainer) elements.sideContainer.hidden = false;
  }
}

/**
 * Set Zoom Mode (fit, 100%, 200%)
 */
function setZoom(zoom) {
  _currentZoom = zoom;
  [elements.btnZoomFit, elements.btnZoom100, elements.btnZoom200].forEach((btn) => {
    btn?.classList.remove("is-active");
  });

  const targetImgs = [elements.imgBefore, elements.imgAfter, elements.imgSideBefore, elements.imgSideAfter];

  if (zoom === "fit") {
    elements.btnZoomFit?.classList.add("is-active");
    targetImgs.forEach((img) => {
      if (img) img.style.objectFit = "contain";
    });
  } else if (zoom === "100%") {
    elements.btnZoom100?.classList.add("is-active");
    targetImgs.forEach((img) => {
      if (img) img.style.objectFit = "none";
    });
  } else if (zoom === "200%") {
    elements.btnZoom200?.classList.add("is-active");
    targetImgs.forEach((img) => {
      if (img) {
        img.style.objectFit = "none";
        img.style.transform = "scale(2)";
      }
    });
  }
}

/**
 * Download Enhanced Result
 */
function downloadResult() {
  if (!upscaledCanvas) {
    showStatus("Please upscale an image first.", "error");
    return;
  }

  const format = elements.exportFormat?.value || "png";
  const mimeType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
  const quality = (Number(elements.exportQuality?.value) || 92) / 100;

  const baseName = currentFile?.name?.replace(/\.[^/.]+$/, "") || "image";
  const fileName = `${baseName}-upscaled-${currentFactor}x.${format === "jpeg" ? "jpg" : format}`;

  upscaledCanvas.toBlob(
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
  originalImageData = null;
  upscaledCanvas = null;
  if (beforeObjectUrl) URL.revokeObjectURL(beforeObjectUrl);
  if (afterObjectUrl) URL.revokeObjectURL(afterObjectUrl);
  beforeObjectUrl = null;
  afterObjectUrl = null;

  if (elements.imgBefore) elements.imgBefore.src = "";
  if (elements.imgAfter) elements.imgAfter.src = "";
  if (elements.imgSideBefore) elements.imgSideBefore.src = "";
  if (elements.imgSideAfter) elements.imgSideAfter.src = "";
  if (elements.workspace) elements.workspace.hidden = true;
  if (elements.btnDownload) elements.btnDownload.disabled = true;
  resetProcessingState();
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
