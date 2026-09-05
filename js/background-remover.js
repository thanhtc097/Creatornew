import { outputFileName } from "./image-engine.js";
import { removeImageBackground, backgroundErrorMessage } from "./background-remover/background-service.js";
import { decodeAndValidate } from "./background-remover/validation.js";
import { createSession, nextJob, commitResult, cancelCurrentJob, pushHistory, undoHistory, redoHistory, resetSession } from "./background-remover/state.js";
import { createMaskState, addStroke, attachMaskEditor, maskBounds, renderMask } from "./background-remover/mask-editor.js";
import { rgbaToPlanarRgb, alphaToMask, canvasToBlob } from "./background-remover/compositor.js";
import { InpaintService } from "./background-remover/inpaint-service.js";

const $ = (id) => document.getElementById(id);
const elements = {
  dropZone: $("backgroundDropZone"), fileInput: $("backgroundFileInput"), choose: $("backgroundChooseBtn"),
  workspace: $("backgroundWorkspace"), original: $("originalPreview"), result: $("resultPreview"),
  fileName: $("backgroundFileName"), fileSize: $("backgroundFileSize"), removeBackground: $("removeBackgroundBtn"),
  download: $("downloadBackgroundBtn"), clear: $("clearBackgroundBtn"), progressBar: $("backgroundProgressBar"),
  progressText: $("backgroundProgressText"), status: $("backgroundStatus"), backgroundMode: $("backgroundModeBtn"),
  objectMode: $("objectModeBtn"), backgroundPanel: $("backgroundModePanel"), objectPanel: $("objectModePanel"),
  policy: $("objectPolicy"), ownership: $("ownershipConfirm"), prohibited: $("prohibitedPurpose"), policyStatus: $("policyStatus"),
  objectSource: $("objectSourcePreview"), maskCanvas: $("maskCanvas"), maskStatus: $("maskA11yStatus"),
  maskAdd: $("maskAddBtn"), maskErase: $("maskEraseBtn"), brush: $("maskBrushSize"), maskUndo: $("maskUndoBtn"),
  maskRedo: $("maskRedoBtn"), maskClear: $("maskClearBtn"), maskWarning: $("maskWarning"), removeObject: $("removeObjectBtn"),
  cancelObject: $("cancelObjectBtn"), oversize: $("oversizePrompt"), acceptReduced: $("acceptReducedBtn"), cancelReduced: $("cancelReducedBtn"),
};

const session = createSession();
let decoded = null;
let mask = createMaskState();
let maskOperation = "add";
let backgroundAbort = null;
let currentFile = null;
let pendingDecoded = null;
let keyboardCursor = { x: .5, y: .5 };
const inpaint = new InpaintService({ onStatus: handleInpaintStatus });

elements.choose.addEventListener("click", (event) => { event.stopPropagation(); elements.fileInput.click(); });
elements.dropZone.addEventListener("click", () => elements.fileInput.click());
elements.dropZone.addEventListener("keydown", (event) => {
  if (["Enter", " "].includes(event.key)) { event.preventDefault(); elements.fileInput.click(); }
});
for (const name of ["dragenter", "dragover", "dragleave", "drop"]) {
  elements.dropZone.addEventListener(name, (event) => { event.preventDefault(); elements.dropZone.classList.toggle("is-dragging", ["dragenter", "dragover"].includes(name)); });
}
elements.dropZone.addEventListener("drop", (event) => selectFile(event.dataTransfer.files[0]));
elements.fileInput.addEventListener("change", () => { selectFile(elements.fileInput.files[0]); elements.fileInput.value = ""; });
elements.clear.addEventListener("click", clearAll);
elements.removeBackground.addEventListener("click", runBackgroundRemoval);
elements.download.addEventListener("click", downloadResult);
elements.backgroundMode.addEventListener("click", () => setMode("background"));
elements.objectMode.addEventListener("click", () => setMode("object"));
elements.maskAdd.addEventListener("click", () => setMaskOperation("add"));
elements.maskErase.addEventListener("click", () => setMaskOperation("erase"));
elements.maskClear.addEventListener("click", () => { replaceMask(createMaskState()); pushMaskHistory(); updateMask(); });
elements.maskUndo.addEventListener("click", () => restoreMask(undoHistory(session)));
elements.maskRedo.addEventListener("click", () => restoreMask(redoHistory(session)));
elements.removeObject.addEventListener("click", runObjectRemoval);
elements.cancelObject.addEventListener("click", cancelObjectRemoval);
elements.acceptReduced.addEventListener("click", () => { elements.oversize.hidden = true; acceptDecoded(pendingDecoded); pendingDecoded = null; });
elements.cancelReduced.addEventListener("click", () => { pendingDecoded?.bitmap.close?.(); pendingDecoded = null; elements.oversize.hidden = true; clearStatus(); });
elements.ownership.addEventListener("change", () => { session.authorizationConfirmed = elements.ownership.checked; });
elements.prohibited.addEventListener("change", () => { session.prohibitedPurpose = elements.prohibited.checked; enforcePolicy(); });
elements.maskCanvas.addEventListener("keydown", handleMaskKeyboard);
window.addEventListener("beforeunload", () => { inpaint.dispose(); resetSession(session); decoded?.bitmap.close?.(); });

attachMaskEditor(elements.maskCanvas, mask, {
  getOperation: () => maskOperation,
  getRadius: () => Number(elements.brush.value) / 100,
  onChange: () => { pushMaskHistory(); updateMask(); },
});

async function selectFile(file) {
  clearStatus();
  try {
    const result = await decodeAndValidate(file);
    currentFile = file;
    if (result.working.reduced) {
      pendingDecoded = result;
      elements.oversize.hidden = false;
      elements.acceptReduced.focus();
      return;
    }
    acceptDecoded(result);
  } catch (error) {
    showStatus(error.message || "Unable to read this image.", "error");
  }
}

function acceptDecoded(result) {
  decoded?.bitmap.close?.();
  decoded = result;
  if (session.source?.objectUrl) URL.revokeObjectURL(session.source.objectUrl);
  const objectUrl = URL.createObjectURL(currentFile);
  session.source = { file: currentFile, objectUrl, width: result.width, height: result.height };
  session.status = "ready";
  elements.original.src = objectUrl;
  elements.objectSource.src = objectUrl;
  elements.fileName.textContent = currentFile.name;
  elements.fileSize.textContent = formatBytes(currentFile.size);
  elements.workspace.hidden = false;
  elements.dropZone.hidden = true;
  elements.download.hidden = true;
  elements.removeBackground.hidden = false;
  clearResultPreview();
  replaceMask(createMaskState());
  session.history = []; session.historyIndex = -1;
  pushMaskHistory();
  elements.objectSource.onload = resizeMaskCanvas;
  setProgress(0, result.working.reduced ? "Ready with a reduced working copy; the original is preserved." : "Ready to process on your device.");
}

function setMode(mode) {
  cancelCurrentJob(session);
  backgroundAbort?.abort();
  session.mode = mode;
  const object = mode === "object";
  elements.backgroundMode.classList.toggle("is-active", !object);
  elements.objectMode.classList.toggle("is-active", object);
  elements.backgroundMode.setAttribute("aria-selected", String(!object));
  elements.objectMode.setAttribute("aria-selected", String(object));
  elements.backgroundPanel.hidden = object;
  elements.objectPanel.hidden = !object;
  elements.policy.hidden = !object;
  if (object && session.source) requestAnimationFrame(resizeMaskCanvas);
  setProgress(0, object ? "Mark the owned logo or object you want to erase." : "Ready to remove the background.");
}

async function runBackgroundRemoval() {
  if (!session.source) return;
  const jobId = nextJob(session);
  backgroundAbort = new AbortController();
  toggleBusy(true);
  setProgress(3, "Loading the background-removal model...");
  try {
    const blob = await removeImageBackground(session.source.file, {
      signal: backgroundAbort.signal,
      onProgress: ({ key, percent }) => setProgress(percent, humanizeProgress(key)),
    });
    const objectUrl = URL.createObjectURL(blob);
    if (!commitResult(session, jobId, { blob, objectUrl, mode: "background" })) return URL.revokeObjectURL(objectUrl);
    showResult(objectUrl, "Background removed preview");
    setProgress(100, "Background removed successfully.");
    showStatus("Your transparent PNG is ready to download.", "success");
  } catch (error) {
    const mapped = backgroundErrorMessage(error);
    setProgress(0, mapped.message);
    showStatus(mapped.message, mapped.code === "cancelled" ? "" : "error");
  } finally { toggleBusy(false); }
}

async function runObjectRemoval() {
  if (!session.source || !enforcePolicy()) return;
  const bounds = maskBounds(mask);
  if (!bounds) return showMaskWarning("Select the logo or object first.", true);
  const coverage = (bounds.right - bounds.left) * (bounds.bottom - bounds.top);
  if (coverage > .35) showMaskWarning("Large selections can produce unreliable results. A smaller mask is recommended.");
  const jobId = nextJob(session);
  toggleBusy(true, true);
  try {
    const prepared = prepareInpaintInput();
    const message = await inpaint.process({ jobId, maskVersion: mask.version, ...prepared });
    if (session.currentJobId !== jobId || message.maskVersion !== mask.version) return;
    const blob = await buildObjectResult(message, prepared.maskImageData);
    const objectUrl = URL.createObjectURL(blob);
    if (!commitResult(session, jobId, { blob, objectUrl, mode: "object", maskVersion: mask.version })) return URL.revokeObjectURL(objectUrl);
    showResult(objectUrl, "Object removed preview");
    setProgress(100, "Selected object erased on your device.");
    showStatus("Review the result, refine the mask if needed, or download it.", "success");
  } catch (error) {
    console.error("Object removal failed", error);
    const cancelled = error?.name === "AbortError";
    showStatus(cancelled ? "Object removal cancelled." : "Local AI processing failed. Try a smaller image or another browser.", cancelled ? "" : "error");
    setProgress(0, cancelled ? "Cancelled." : "Processing failed.");
  } finally { toggleBusy(false, true); }
}

function prepareInpaintInput() {
  const size = 512;
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = size; sourceCanvas.height = size;
  sourceCanvas.getContext("2d").drawImage(decoded.bitmap, 0, 0, size, size);
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = size; maskCanvas.height = size;
  renderMask(mask, maskCanvas);
  const sourceData = sourceCanvas.getContext("2d").getImageData(0, 0, size, size);
  const maskImageData = maskCanvas.getContext("2d").getImageData(0, 0, size, size);
  return { image: rgbaToPlanarRgb(sourceData, size), mask: alphaToMask(maskImageData, size), width: size, height: size, maskImageData };
}

async function buildObjectResult(message, maskImageData) {
  const size = message.width;
  const resultCanvas = document.createElement("canvas");
  resultCanvas.width = size; resultCanvas.height = size;
  const context = resultCanvas.getContext("2d");
  const output = context.createImageData(size, size);
  const pixels = size * size;
  for (let i = 0; i < pixels; i += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      const value = message.pixels[channel * pixels + i];
      output.data[i * 4 + channel] = Math.max(0, Math.min(255, value <= 1 ? value * 255 : value));
    }
    output.data[i * 4 + 3] = maskImageData.data[i * 4 + 3];
  }
  context.putImageData(output, 0, 0);
  const clipCanvas = document.createElement("canvas");
  clipCanvas.width = size; clipCanvas.height = size;
  clipCanvas.getContext("2d").putImageData(maskImageData, 0, 0);
  context.globalCompositeOperation = "destination-in";
  context.drawImage(clipCanvas, 0, 0);
  context.globalCompositeOperation = "source-over";
  const full = document.createElement("canvas");
  full.width = decoded.width; full.height = decoded.height;
  const fullContext = full.getContext("2d");
  fullContext.drawImage(decoded.bitmap, 0, 0, full.width, full.height);
  fullContext.drawImage(resultCanvas, 0, 0, full.width, full.height);
  return await canvasToBlob(full);
}

function handleInpaintStatus(message) {
  const labels = { "model-download": "Downloading the 92.6 MB AI model...", "model-initialize": "Preparing the local AI model...", processing: "Erasing the selected object on your device..." };
  setProgress(message.progress ?? 12, labels[message.stage] || "Processing on your device...");
}

function cancelObjectRemoval() { const jobId = session.currentJobId; cancelCurrentJob(session); inpaint.cancel(jobId); }

function enforcePolicy() {
  if (elements.prohibited.checked) {
    elements.policyStatus.textContent = "This tool cannot remove third-party watermarks or rights-management marks.";
    elements.policyStatus.focus();
    return false;
  }
  if (!elements.ownership.checked) {
    elements.policyStatus.textContent = "Confirm that you own the image or have permission to edit it.";
    elements.policyStatus.focus();
    return false;
  }
  elements.policyStatus.textContent = "";
  return true;
}

function pushMaskHistory() { pushHistory(session, { maskSnapshot: mask, action: "stroke" }); updateHistoryButtons(); }
function restoreMask(entry) { if (!entry?.maskSnapshot) return; replaceMask(entry.maskSnapshot); updateMask(); updateHistoryButtons(); }
function replaceMask(next) { mask.strokes.splice(0, mask.strokes.length, ...(next.strokes || [])); mask.version = next.version || 0; }
function updateHistoryButtons() { elements.maskUndo.disabled = session.historyIndex <= 0; elements.maskRedo.disabled = session.historyIndex >= session.history.length - 1; }
function updateMask() { renderMask(mask, elements.maskCanvas); const bounds = maskBounds(mask); elements.maskStatus.textContent = bounds ? `Mask updated. ${mask.strokes.length} strokes.` : "Mask is empty."; showMaskWarning(""); }
function setMaskOperation(operation) { maskOperation = operation; elements.maskAdd.classList.toggle("is-active", operation === "add"); elements.maskErase.classList.toggle("is-active", operation === "erase"); elements.maskAdd.setAttribute("aria-pressed", String(operation === "add")); elements.maskErase.setAttribute("aria-pressed", String(operation === "erase")); }

function handleMaskKeyboard(event) {
  const step = event.shiftKey ? .05 : .015;
  if (event.key === "ArrowLeft") keyboardCursor.x -= step;
  else if (event.key === "ArrowRight") keyboardCursor.x += step;
  else if (event.key === "ArrowUp") keyboardCursor.y -= step;
  else if (event.key === "ArrowDown") keyboardCursor.y += step;
  else if (["Enter", " "].includes(event.key)) {
    addStroke(mask, { operation: maskOperation, radius: Number(elements.brush.value) / 100, points: [keyboardCursor, { x: keyboardCursor.x + .0001, y: keyboardCursor.y }] });
    pushMaskHistory(); updateMask(); event.preventDefault(); return;
  } else return;
  keyboardCursor.x = Math.max(0, Math.min(1, keyboardCursor.x)); keyboardCursor.y = Math.max(0, Math.min(1, keyboardCursor.y));
  elements.maskStatus.textContent = `Keyboard cursor ${Math.round(keyboardCursor.x * 100)}%, ${Math.round(keyboardCursor.y * 100)}%. Press Enter to apply.`;
  event.preventDefault();
}

function resizeMaskCanvas() { const rect = $("maskStage").getBoundingClientRect(); elements.maskCanvas.width = Math.max(1, Math.round(rect.width)); elements.maskCanvas.height = Math.max(1, Math.round(rect.height)); updateMask(); }
function showResult(url, alt) { elements.result.src = url; elements.result.alt = alt; elements.result.parentElement.classList.remove("is-empty"); elements.download.hidden = false; }
function clearResultPreview() { elements.result.removeAttribute("src"); elements.result.parentElement.classList.add("is-empty"); }
function downloadResult() { if (!session.activeResult) return; const link = document.createElement("a"); link.href = session.activeResult.objectUrl; link.download = outputFileName(currentFile.name, "image/png", session.activeResult.mode === "object" ? "clean" : "br"); document.body.appendChild(link); link.click(); link.remove(); }
function clearAll() { backgroundAbort?.abort(); inpaint.dispose(); decoded?.bitmap.close?.(); decoded = null; currentFile = null; replaceMask(createMaskState()); resetSession(session); elements.workspace.hidden = true; elements.dropZone.hidden = false; elements.policy.hidden = true; clearStatus(); }
function toggleBusy(busy, object = false) { elements.clear.disabled = busy; elements.removeBackground.disabled = busy; elements.removeObject.disabled = busy; elements.cancelObject.hidden = !(busy && object); }
function setProgress(value, message) { elements.progressBar.style.width = `${value}%`; elements.progressBar.parentElement.setAttribute("aria-valuenow", String(value)); elements.progressText.textContent = message; }
function showStatus(message, type = "") { elements.status.textContent = message; elements.status.className = `status${type ? ` ${type}` : ""}`; }
function clearStatus() { showStatus(""); }
function showMaskWarning(message, error = false) { elements.maskWarning.textContent = message; elements.maskWarning.className = `status${error ? " error" : ""}`; }
function humanizeProgress(key = "") { if (key.includes("fetch")) return "Downloading the background-removal model..."; if (key.includes("compute")) return "Separating the subject from the background..."; return "Processing image on your device..."; }
function formatBytes(bytes) { const units = ["B", "KB", "MB", "GB"]; const index = bytes ? Math.floor(Math.log(bytes) / Math.log(1024)) : 0; return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`; }
