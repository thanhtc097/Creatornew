const PDF_LIB_URL = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";
const PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";
const PDFJS_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
const DELETE_MODE = document.body.dataset.mode === "delete";
const maxFileSize = 100 * 1024 * 1024;

const dropZone = document.getElementById("splitDropZone");
const fileInput = document.getElementById("splitFileInput");
const chooseButton = document.getElementById("splitChooseBtn");
const replaceButton = document.getElementById("splitReplaceBtn");
const clearButton = document.getElementById("splitClearBtn");
const workspace = document.getElementById("splitWorkspace");
const fileName = document.getElementById("splitFileName");
const fileMeta = document.getElementById("splitFileMeta");
const pageRange = document.getElementById("splitPageRange");
const rangeHelp = document.getElementById("splitRangeHelp");
const allPagesButton = document.getElementById("splitAllPagesBtn");
const clearSelectionButton = document.getElementById("splitClearSelectionBtn");
const thumbnailGrid = document.getElementById("splitThumbnailGrid");
const splitButton = document.getElementById("splitPdfBtn");
const status = document.getElementById("splitStatus");
const sourcePreview = document.getElementById("splitSourcePreview");
const result = document.getElementById("splitResult");
const resultPreview = document.getElementById("splitResultPreview");
const resultMeta = document.getElementById("splitResultMeta");
const downloadButton = document.getElementById("downloadSplitPdfBtn");

let sourceFile = null;
let sourceBytes = null;
let pageCount = 0;
let sourceUrl = "";
let resultBlob = null;
let resultUrl = "";

const openPicker = () => fileInput.click();
chooseButton.addEventListener("click", (event) => { event.stopPropagation(); openPicker(); });
replaceButton.addEventListener("click", openPicker);
clearButton.addEventListener("click", clearFile);
dropZone.addEventListener("click", openPicker);
dropZone.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openPicker(); } });
["dragenter", "dragover"].forEach((name) => dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.add("is-dragging"); }));
["dragleave", "drop"].forEach((name) => dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.remove("is-dragging"); }));
dropZone.addEventListener("drop", (event) => addFile(event.dataTransfer.files[0]));
fileInput.addEventListener("change", () => { addFile(fileInput.files[0]); fileInput.value = ""; });
pageRange.addEventListener("input", () => { clearResult(); validateRange(); });
allPagesButton.addEventListener("click", () => { pageRange.value = `1-${pageCount}`; clearResult(); validateRange(); });
clearSelectionButton.addEventListener("click", () => { pageRange.value = ""; clearResult(); validateRange(); });
splitButton.addEventListener("click", splitPdf);
downloadButton.addEventListener("click", () => { if (resultBlob) downloadBlob(resultBlob, DELETE_MODE ? "creatornew-dpdf-pages-removed.pdf" : "creatornew-spdf-selected-pages.pdf"); });

async function addFile(file) {
  clearStatus();
  clearResult();
  if (!file) return;
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) { showStatus("Only PDF files are supported.", "error"); return; }
  if (file.size > maxFileSize) { showStatus("The PDF must be smaller than 100 MB.", "error"); return; }
  splitButton.disabled = true;
  showStatus("Reading your PDF...", "");
  try {
    const { PDFDocument } = await import(/* @vite-ignore */ PDF_LIB_URL);
    const bytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false });
    sourceFile = file;
    sourceBytes = bytes;
    pageCount = pdf.getPageCount();
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = URL.createObjectURL(file);
    sourcePreview.src = sourceUrl + "#page=1&zoom=100&toolbar=1&navpanes=0";
    fileName.textContent = file.name;
    fileMeta.textContent = `${pageCount} pages · ${formatBytes(file.size)}`;
    pageRange.value = DELETE_MODE ? "" : `1-${pageCount}`;
    rangeHelp.textContent = `Enter pages from 1 to ${pageCount}. Example: 1-3, 5, 8-10.`;
    workspace.hidden = false;
    workspace.classList.add("is-active");
    dropZone.hidden = true;
    document.body.classList.add("split-has-file");
    validateRange();
    await renderThumbnails(bytes);
    showStatus(DELETE_MODE ? "PDF ready. Select the pages you want to remove." : "PDF ready. Choose the pages you want to extract.", "success");
  } catch (error) {
    console.error(error);
    showStatus(/encrypt|password/i.test(String(error)) ? "Password-protected PDFs are not supported." : "This PDF is damaged or unsupported.", "error");
  }
}

function parseRange(value) {
  const clean = value.replace(/\s+/g, "");
  if (!clean) { if (DELETE_MODE) return []; throw new Error("Enter at least one page."); }
  const pages = new Set();
  clean.split(",").forEach((part) => {
    if (/^\d+$/.test(part)) pages.add(Number(part));
    else if (/^\d+-\d+$/.test(part)) {
      const [start, end] = part.split("-").map(Number);
      if (start > end) throw new Error("Page ranges must go from low to high.");
      for (let page = start; page <= end; page += 1) pages.add(page);
    } else throw new Error("Use a format like 1-3, 5, 8-10.");
  });
  const selected = [...pages].sort((a, b) => a - b);
  if (selected.some((page) => page < 1 || page > pageCount)) throw new Error(`Pages must be between 1 and ${pageCount}.`);
  return selected;
}

function validateRange() {
  try {
    const pages = parseRange(pageRange.value);
    const invalidDelete = DELETE_MODE && (!pages.length || pages.length >= pageCount);
    splitButton.disabled = !sourceFile || (!DELETE_MODE && !pages.length) || invalidDelete;
    rangeHelp.classList.remove("error");
    rangeHelp.textContent = invalidDelete ? (pages.length >= pageCount ? "Keep at least one page in the PDF." : "Select one or more pages to delete.") : `${pages.length} page${pages.length === 1 ? "" : "s"} selected from ${pageCount}.`;
    updateThumbnailSelection(pages);
    return pages;
  } catch (error) {
    splitButton.disabled = true;
    rangeHelp.classList.add("error");
    rangeHelp.textContent = error.message;
    updateThumbnailSelection([]);
    return null;
  }
}

async function renderThumbnails(bytes) {
  thumbnailGrid.innerHTML = '<p class="thumbnail-loading">Creating page previews...</p>';
  try {
    const pdfjs = await import(/* @vite-ignore */ PDFJS_URL);
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    const documentTask = pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)) });
    const pdf = await documentTask.promise;
    thumbnailGrid.innerHTML = "";
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(1.25, 190 / baseViewport.width);
      const viewport = page.getViewport({ scale });
      const card = document.createElement("button");
      card.type = "button";
      card.className = "split-page-card is-selected";
      card.dataset.page = String(pageNumber);
      card.setAttribute("aria-label", `Page ${pageNumber}, selected`);
      card.innerHTML = `<span class="split-page-check" aria-hidden="true">✓</span><canvas></canvas><strong>Page ${pageNumber}</strong>`;
      const canvas = card.querySelector("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      card.addEventListener("click", () => toggleThumbnailPage(pageNumber));
      thumbnailGrid.appendChild(card);
    }
    updateThumbnailSelection(validateRange() || []);
  } catch (error) {
    console.error(error);
    thumbnailGrid.innerHTML = '<p class="thumbnail-loading error">Page thumbnails could not be created. You can still use the page range field.</p>';
  }
}

function toggleThumbnailPage(pageNumber) {
  let selected = [];
  try { selected = parseRange(pageRange.value); } catch { selected = []; }
  const pages = new Set(selected);
  if (pages.has(pageNumber)) pages.delete(pageNumber); else pages.add(pageNumber);
  pageRange.value = compressPages([...pages].sort((a, b) => a - b));
  clearResult();
  validateRange();
}

function compressPages(pages) {
  if (!pages.length) return "";
  const parts = [];
  let start = pages[0];
  let end = pages[0];
  for (let index = 1; index <= pages.length; index += 1) {
    if (pages[index] === end + 1) { end = pages[index]; continue; }
    parts.push(start === end ? String(start) : `${start}-${end}`);
    start = pages[index];
    end = pages[index];
  }
  return parts.join(", ");
}

function updateThumbnailSelection(selectedPages) {
  const selected = new Set(selectedPages);
  thumbnailGrid.querySelectorAll(".split-page-card").forEach((card) => {
    const page = Number(card.dataset.page);
    const isSelected = selected.has(page);
    card.classList.toggle("is-selected", isSelected);
    card.setAttribute("aria-label", `Page ${page}, ${isSelected ? "selected" : "not selected"}`);
  });
}

async function splitPdf() {
  const selected = validateRange();
  if (!selected || (DELETE_MODE && (!selected.length || selected.length >= pageCount))) return;
  splitButton.disabled = true;
  splitButton.textContent = "Extracting Pages...";
  try {
    const { PDFDocument } = await import(/* @vite-ignore */ PDF_LIB_URL);
    const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: false });
    const output = await PDFDocument.create();
    const outputPages = DELETE_MODE ? Array.from({length: pageCount}, (_, index) => index + 1).filter((page) => !selected.includes(page)) : selected;
    const pages = await output.copyPages(source, outputPages.map((page) => page - 1));
    pages.forEach((page) => output.addPage(page));
    const bytes = await output.save({ useObjectStreams: true });
    clearResult();
    resultBlob = new Blob([bytes], { type: "application/pdf" });
    resultUrl = URL.createObjectURL(resultBlob);
    resultPreview.src = resultUrl + "#page=1&zoom=100&toolbar=1&navpanes=0";
    resultMeta.textContent = `${outputPages.length} pages · ${formatBytes(resultBlob.size)}`;
    result.hidden = false;
    showStatus(DELETE_MODE ? "Selected pages removed. Review and download below." : "Selected pages extracted successfully. Review and download below.", "success");
  } catch (error) {
    console.error(error);
    showStatus("Unable to extract these pages. Try another PDF.", "error");
  } finally {
    splitButton.textContent = "Extract Selected Pages";
    validateRange();
  }
}

function clearResult() { if (resultUrl) URL.revokeObjectURL(resultUrl); resultUrl = ""; resultBlob = null; resultPreview.removeAttribute("src"); result.hidden = true; resultMeta.textContent = ""; }
function clearFile() { if (sourceUrl) URL.revokeObjectURL(sourceUrl); sourceUrl = ""; sourceFile = null; sourceBytes = null; pageCount = 0; sourcePreview.removeAttribute("src"); thumbnailGrid.innerHTML = ""; workspace.hidden = true; workspace.classList.remove("is-active"); dropZone.hidden = false; document.body.classList.remove("split-has-file"); clearResult(); clearStatus(); }
function downloadBlob(blob, name) { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function formatBytes(bytes) { if (!bytes) return "0 B"; const units = ["B", "KB", "MB", "GB"]; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); return (bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0) + " " + units[index]; }
function showStatus(message, type) { status.textContent = message; status.className = "status" + (type ? " " + type : ""); }
function clearStatus() { showStatus("", ""); }

clearFile();
