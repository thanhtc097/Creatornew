const PDF_MODULE_URL = "https://cdn.jsdelivr.net/npm/jspdf@3.0.1/+esm";
const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFiles = 30;
const maxFileSize = 25 * 1024 * 1024;

const dropZone = document.getElementById("pdfDropZone");
const fileInput = document.getElementById("pdfFileInput");
const chooseButton = document.getElementById("pdfChooseBtn");
const addMoreButton = document.getElementById("pdfAddMoreBtn");
const clearButton = document.getElementById("pdfClearBtn");
const workspace = document.getElementById("pdfWorkspace");
const fileList = document.getElementById("pdfFiles");
const fileCount = document.getElementById("pdfFileCount");
const createButton = document.getElementById("createPdfBtn");
const pageSize = document.getElementById("pdfPageSize");
const orientation = document.getElementById("pdfOrientation");
const margin = document.getElementById("pdfMargin");
const status = document.getElementById("pdfStatus");

let files = [];
let previewUrls = [];

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
createButton.addEventListener("click", createPdf);

function addFiles(fileCollection) {
  clearStatus();
  const incoming = Array.from(fileCollection);
  const invalid = incoming.filter((file) => !supportedTypes.includes(file.type));
  const oversized = incoming.filter((file) => file.size > maxFileSize);
  const valid = incoming.filter((file) => supportedTypes.includes(file.type) && file.size <= maxFileSize);
  if (invalid.length) showStatus("Some files are not JPG, PNG or WebP images.", "error");
  if (oversized.length) showStatus("Each image must be smaller than 25 MB.", "error");
  const unique = valid.filter((file) => !files.some((item) => fileKey(item) === fileKey(file)));
  files = [...files, ...unique].slice(0, maxFiles);
  if (files.length === maxFiles && unique.length) showStatus("You can add up to 30 images.", "warning");
  renderFiles();
}

function renderFiles() {
  previewUrls.forEach(URL.revokeObjectURL);
  previewUrls = [];
  fileList.innerHTML = "";
  files.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    previewUrls.push(url);
    const row = document.createElement("div");
    row.className = "pdf-file-row";
    row.innerHTML = `<span class="pdf-page-number">${index + 1}</span><img src="${url}" alt=""><span class="pdf-file-info"><strong></strong><small>${formatBytes(file.size)}</small></span>`;
    row.querySelector("strong").textContent = file.name;
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
  document.body.classList.toggle("images-pdf-has-files", hasFiles);
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
  renderFiles();
}

function removeFile(index) {
  files.splice(index, 1);
  renderFiles();
}

function clearFiles() {
  files = [];
  renderFiles();
  clearStatus();
}

async function createPdf() {
  if (!files.length) return;
  createButton.disabled = true;
  createButton.textContent = "Creating PDF...";
  showStatus("Loading the PDF engine...", "");
  try {
    const { jsPDF } = await import(/* @vite-ignore */ PDF_MODULE_URL);
    let pdf = null;
    for (let index = 0; index < files.length; index += 1) {
      showStatus("Preparing page " + (index + 1) + " of " + files.length + "...", "");
      const image = await prepareImage(files[index]);
      const options = pageOptions(image.width, image.height);
      if (!pdf) pdf = new jsPDF(options);
      else pdf.addPage(options.format, options.orientation);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageMargin = Number(margin.value);
      const fitted = fitInside(image.width, image.height, pageWidth - pageMargin * 2, pageHeight - pageMargin * 2);
      pdf.addImage(image.dataUrl, "JPEG", (pageWidth - fitted.width) / 2, (pageHeight - fitted.height) / 2, fitted.width, fitted.height, undefined, "FAST");
    }
    pdf.save("creatornew-i2pdf-images.pdf");
    showStatus("PDF created successfully with " + files.length + " pages.", "success");
  } catch (error) {
    console.error(error);
    showStatus("Unable to create the PDF. Check your connection and try again.", "error");
  } finally {
    createButton.disabled = false;
    createButton.textContent = "Create PDF";
  }
}

function prepareImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      URL.revokeObjectURL(url);
      resolve({ dataUrl, width: canvas.width, height: canvas.height });
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Unable to read " + file.name)); };
    image.src = url;
  });
}

function pageOptions(width, height) {
  const selectedOrientation = orientation.value === "auto" ? (width >= height ? "landscape" : "portrait") : orientation.value;
  return { unit: "pt", format: pageSize.value, orientation: selectedOrientation, compress: true };
}

function fitInside(width, height, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / width, maxHeight / height);
  return { width: width * scale, height: height * scale };
}

function fileKey(file) { return [file.name, file.size, file.lastModified].join("::"); }
function formatBytes(bytes) { if (!bytes) return "0 B"; const units = ["B", "KB", "MB", "GB"]; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); return (bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0) + " " + units[index]; }
function showStatus(message, type) { status.textContent = message; status.className = "status" + (type ? " " + type : ""); }
function clearStatus() { showStatus("", ""); }

// Always restore the correct initial view after a normal load or a Vite hot update.
renderFiles();
