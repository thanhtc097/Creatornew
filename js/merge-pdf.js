const PDF_LIB_URL = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";
const PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";
const PDFJS_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
const maxFiles = 20;
const maxFileSize = 100 * 1024 * 1024;

const dropZone = document.getElementById("mergeDropZone");
const fileInput = document.getElementById("mergeFileInput");
const chooseButton = document.getElementById("mergeChooseBtn");
const addMoreButton = document.getElementById("mergeAddMoreBtn");
const clearButton = document.getElementById("mergeClearBtn");
const workspace = document.getElementById("mergeWorkspace");
const fileList = document.getElementById("mergeFiles");
const fileCount = document.getElementById("mergeFileCount");
const mergeButton = document.getElementById("mergePdfBtn");
const status = document.getElementById("mergeStatus");
const result = document.getElementById("mergeResult");
const preview = document.getElementById("mergedPreview");
const resultMeta = document.getElementById("mergeResultMeta");
const downloadButton = document.getElementById("downloadMergedPdfBtn");

let files = [];
let mergedBlob = null;
let mergedUrl = "";
const pdfPreviewCache = new WeakMap();

const openPicker = () => fileInput.click();
chooseButton.addEventListener("click", (event) => { event.stopPropagation(); openPicker(); });
addMoreButton.addEventListener("click", openPicker);
clearButton.addEventListener("click", clearFiles);
dropZone.addEventListener("click", openPicker);
dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openPicker(); }
});
["dragenter", "dragover"].forEach((name) => dropZone.addEventListener(name, (event) => {
  event.preventDefault(); dropZone.classList.add("is-dragging");
}));
["dragleave", "drop"].forEach((name) => dropZone.addEventListener(name, (event) => {
  event.preventDefault(); dropZone.classList.remove("is-dragging");
}));
dropZone.addEventListener("drop", (event) => addFiles(event.dataTransfer.files));
fileInput.addEventListener("change", () => { addFiles(fileInput.files); fileInput.value = ""; });
mergeButton.addEventListener("click", mergePdfs);
downloadButton.addEventListener("click", () => {
  if (mergedBlob) downloadBlob(mergedBlob, "creatornew-mpdf-merged.pdf");
});

function addFiles(fileCollection) {
  clearMergeResult();
  clearStatus();
  const incoming = Array.from(fileCollection);
  const invalid = incoming.filter((file) => file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"));
  const oversized = incoming.filter((file) => file.size > maxFileSize);
  const valid = incoming.filter((file) => (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) && file.size <= maxFileSize);
  if (invalid.length) showStatus("Only PDF files are supported.", "error");
  if (oversized.length) showStatus("Each PDF must be smaller than 100 MB.", "error");
  const unique = valid.filter((file) => !files.some((item) => fileKey(item) === fileKey(file)));
  files = [...files, ...unique].slice(0, maxFiles);
  if (files.length === maxFiles && unique.length) showStatus("You can merge up to 20 PDF files.", "warning");
  renderFiles();
}

function renderFiles() {
  fileList.innerHTML = "";
  files.forEach((file, index) => {
    const row = document.createElement("div");
    row.className = "pdf-file-row merge-file-row";
    row.innerHTML = `<span class="pdf-page-number">${index + 1}</span><span class="merge-pdf-thumb" aria-hidden="true"><canvas hidden></canvas><b>PDF</b></span><span class="pdf-file-info"><strong></strong><small>Loading preview · ${formatBytes(file.size)}</small></span>`;
    row.querySelector("strong").textContent = file.name;
    renderPdfCover(file, row.querySelector("canvas"), row.querySelector(".merge-pdf-thumb b"), row.querySelector("small"));
    const actions = document.createElement("div");
    actions.className = "pdf-row-actions";
    actions.append(
      actionButton("↑", "Move " + file.name + " up", () => moveFile(index, -1), index === 0),
      actionButton("↓", "Move " + file.name + " down", () => moveFile(index, 1), index === files.length - 1),
      actionButton("×", "Remove " + file.name, () => removeFile(index), false)
    );
    row.appendChild(actions);
    fileList.appendChild(row);
  });
  const hasFiles = files.length > 0;
  fileCount.textContent = files.length;
  workspace.hidden = !hasFiles;
  workspace.classList.toggle("is-active", hasFiles);
  dropZone.hidden = hasFiles;
  document.body.classList.toggle("merge-has-files", hasFiles);
  mergeButton.disabled = files.length < 2;
}

async function renderPdfCover(file, canvas, fallback, meta) {
  try {
    let previewData = pdfPreviewCache.get(file);
    if (!previewData) {
      const pdfjs = await import(/* @vite-ignore */ PDFJS_URL);
      pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const page = await pdf.getPage(1);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(1.4, 210 / baseViewport.width);
      const viewport = page.getViewport({ scale });
      const renderCanvas = document.createElement("canvas");
      renderCanvas.width = Math.ceil(viewport.width);
      renderCanvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: renderCanvas.getContext("2d"), viewport }).promise;
      previewData = { dataUrl: renderCanvas.toDataURL("image/jpeg", .82), pages: pdf.numPages };
      pdfPreviewCache.set(file, previewData);
    }
    if (!canvas.isConnected) return;
    const image = new Image();
    image.onload = () => {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d").drawImage(image, 0, 0);
      canvas.hidden = false;
      fallback.hidden = true;
    };
    image.src = previewData.dataUrl;
    meta.textContent = `${previewData.pages} page${previewData.pages === 1 ? "" : "s"} · ${formatBytes(file.size)}`;
  } catch (error) {
    console.error(error);
    meta.textContent = `Preview unavailable · ${formatBytes(file.size)}`;
  }
}

function actionButton(text, label, action, disabled) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.setAttribute("aria-label", label);
  button.disabled = disabled;
  button.addEventListener("click", action);
  return button;
}

function moveFile(index, offset) {
  const target = index + offset;
  if (target < 0 || target >= files.length) return;
  [files[index], files[target]] = [files[target], files[index]];
  clearMergeResult();
  renderFiles();
}

function removeFile(index) { files.splice(index, 1); clearMergeResult(); renderFiles(); clearStatus(); }
function clearFiles() { files = []; clearMergeResult(); renderFiles(); clearStatus(); }

async function mergePdfs() {
  if (files.length < 2) { showStatus("Add at least two PDF files to merge.", "error"); return; }
  mergeButton.disabled = true;
  mergeButton.textContent = "Merging PDFs...";
  try {
    showStatus("Loading the PDF engine...", "");
    const { PDFDocument } = await import(/* @vite-ignore */ PDF_LIB_URL);
    const merged = await PDFDocument.create();
    let totalPages = 0;
    for (let index = 0; index < files.length; index += 1) {
      showStatus(`Adding PDF ${index + 1} of ${files.length}...`, "");
      const source = await PDFDocument.load(await files[index].arrayBuffer(), { ignoreEncryption: false });
      const pageIndices = source.getPageIndices();
      const pages = await merged.copyPages(source, pageIndices);
      pages.forEach((page) => merged.addPage(page));
      totalPages += pages.length;
    }
    const bytes = await merged.save({ useObjectStreams: true });
    clearMergeResult();
    mergedBlob = new Blob([bytes], { type: "application/pdf" });
    mergedUrl = URL.createObjectURL(mergedBlob);
    preview.src = mergedUrl + "#page=1&zoom=100&toolbar=1&navpanes=0";
    resultMeta.textContent = `${files.length} files · ${totalPages} pages · ${formatBytes(mergedBlob.size)}`;
    result.hidden = false;
    showStatus(`Merged ${files.length} PDFs into ${totalPages} pages. Review the result below, then download it.`, "success");
  } catch (error) {
    console.error(error);
    const encrypted = /encrypt|password/i.test(String(error));
    showStatus(encrypted ? "Password-protected PDFs cannot be merged. Unlock the file and try again." : "One PDF is damaged or unsupported. Remove it and try again.", "error");
  } finally {
    mergeButton.disabled = files.length < 2;
    mergeButton.textContent = "Merge PDF Files";
  }
}

function clearMergeResult() {
  if (mergedUrl) URL.revokeObjectURL(mergedUrl);
  mergedBlob = null;
  mergedUrl = "";
  preview.removeAttribute("src");
  resultMeta.textContent = "";
  result.hidden = true;
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fileKey(file) { return [file.name, file.size, file.lastModified].join("::"); }
function formatBytes(bytes) { if (!bytes) return "0 B"; const units = ["B", "KB", "MB", "GB"]; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); return (bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0) + " " + units[index]; }
function showStatus(message, type) { status.textContent = message; status.className = "status" + (type ? " " + type : ""); }
function clearStatus() { showStatus("", ""); }

renderFiles();
