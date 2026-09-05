import {
  DEFAULT_MAX_FILES,
  DEFAULT_MAX_FILE_SIZE,
  DEFAULT_SUPPORTED_TYPES,
  convertImage,
  downloadBlob,
  fileKey,
  formatBytes,
  outputFileName,
  pause,
} from "./image-engine.js";

const MAX_FILES = DEFAULT_MAX_FILES;
const MAX_FILE_SIZE = DEFAULT_MAX_FILE_SIZE;
const configuredTypes = document.body.dataset.acceptedTypes?.split(",").filter(Boolean);
const supportedTypes = configuredTypes?.length ? configuredTypes : DEFAULT_SUPPORTED_TYPES;
const defaultOutput = document.body.dataset.defaultOutput || "image/webp";
const toolCode = document.body.dataset.toolCode || "tool";
const actionLabel = document.body.dataset.actionLabel || "Convert";
const progressLabel = document.body.dataset.progressLabel || "Converting";
const pastLabel = document.body.dataset.pastLabel || "converted";
const showSizeResults = document.body.dataset.showSizeResults === "true";
const resizeEnabled = document.body.dataset.resizeEnabled === "true";

const fileInput = document.getElementById("fileInput");
const chooseBtn = document.getElementById("chooseBtn");
const addMoreBtn = document.getElementById("addMoreBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const dropZone = document.getElementById("dropZone");
const workspace = document.getElementById("workspace");
const filesEl = document.getElementById("files");
const fileCount = document.getElementById("fileCount");
const format = document.getElementById("format");
const quality = document.getElementById("quality");
const qualityValue = document.getElementById("qualityValue");
const qualityField = document.getElementById("qualityField");
const compressionLevel = document.getElementById("compressionLevel");
const compressionNote = document.getElementById("compressionNote");
const convertBtn = document.getElementById("convertBtn");
const downloadAllBtn = document.getElementById("downloadAllBtn");
const statusEl = document.getElementById("status");
const resizeWidth = document.getElementById("resizeWidth");
const resizeHeight = document.getElementById("resizeHeight");
const maintainAspect = document.getElementById("maintainAspect");
const sizePresetButtons = Array.from(document.querySelectorAll(".size-preset[data-width]"));
const clearPresetBtn = document.getElementById("clearPresetBtn");
const sizePresetDropdown = document.getElementById("sizePresetDropdown");
const selectedPresetValue = document.getElementById("selectedPresetValue");

fileInput.accept = supportedTypes.join(",");
format.value = defaultOutput;
syncQualityControl();

let selectedFiles = [];
let objectUrls = [];
const convertedFiles = new Map();

const openPicker = () => fileInput.click();

chooseBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  openPicker();
});
addMoreBtn.addEventListener("click", openPicker);
clearAllBtn.addEventListener("click", clearAll);
dropZone.addEventListener("click", openPicker);
dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openPicker();
  }
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
  });
});

dropZone.addEventListener("drop", (event) => addFiles(event.dataTransfer.files));
fileInput.addEventListener("change", () => {
  addFiles(fileInput.files);
  fileInput.value = "";
});

quality.addEventListener("input", () => {
  qualityValue.textContent = quality.value + "%";
});

format.addEventListener("change", () => {
  syncQualityControl();
  resetConversions();
});

quality.addEventListener("change", resetConversions);

if (compressionLevel) {
  compressionLevel.addEventListener("change", () => {
    applyCompressionLevel();
    resetConversions();
  });
  applyCompressionLevel();
}

[resizeWidth, resizeHeight, maintainAspect].filter(Boolean).forEach((control) => {
  control.addEventListener("change", resetConversions);
});

sizePresetButtons.forEach((button) => {
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => {
    resizeWidth.value = button.dataset.width;
    resizeHeight.value = button.dataset.height;
    selectSizePreset(button);
    if (sizePresetDropdown) sizePresetDropdown.open = false;
    resetConversions();
    showStatus(button.innerText.replace(/\s+/g, " ").trim() + " selected.", "success");
  });
});

[resizeWidth, resizeHeight].filter(Boolean).forEach((input) => {
  input.addEventListener("input", () => selectSizePreset(null));
});

if (clearPresetBtn) {
  clearPresetBtn.addEventListener("click", () => {
    resizeWidth.value = "";
    resizeHeight.value = "";
    selectSizePreset(null);
    if (sizePresetDropdown) sizePresetDropdown.open = false;
    resetConversions();
    clearStatus();
    resizeWidth.focus();
  });
}

function addFiles(fileList) {
  clearStatus();
  const incoming = Array.from(fileList);
  const invalid = incoming.filter((file) => !supportedTypes.includes(file.type));
  const oversized = incoming.filter((file) => file.size > MAX_FILE_SIZE);
  const valid = incoming.filter(
    (file) => supportedTypes.includes(file.type) && file.size <= MAX_FILE_SIZE
  );

  if (invalid.length) showStatus("Some files are not JPG, PNG or WebP images.", "error");
  if (oversized.length) showStatus("Each image must be smaller than 50 MB.", "error");

  const unique = valid.filter((file) =>
    !selectedFiles.some((item) =>
      item.name === file.name && item.size === file.size && item.lastModified === file.lastModified
    )
  );

  selectedFiles = [...selectedFiles, ...unique].slice(0, MAX_FILES);
  if (selectedFiles.length === MAX_FILES && unique.length) {
    showStatus("You can process up to 20 images at a time.", "error");
  }
  renderFiles();
}

function renderFiles() {
  objectUrls.forEach(URL.revokeObjectURL);
  objectUrls = [];
  filesEl.innerHTML = "";

  selectedFiles.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    objectUrls.push(url);

    const row = document.createElement("div");
    row.className = "file-row";

    const img = document.createElement("img");
    img.className = "thumb";
    img.src = url;
    img.alt = "";

    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "file-name";
    name.textContent = file.name;
    const size = document.createElement("div");
    size.className = "file-size";
    const result = convertedFiles.get(fileKey(file));
    if (showSizeResults && result) {
      const comparison = sizeComparison(file.size, result.size);
      size.textContent = formatBytes(file.size) + " → " + formatBytes(result.size) + " • " + comparison.label;
      size.classList.add(comparison.isSmaller ? "result-success" : "result-warning");
    } else {
      size.textContent = formatBytes(file.size);
    }
    info.append(name, size);

    const remove = document.createElement("button");
    remove.className = "remove-btn";
    remove.type = "button";
    remove.setAttribute("aria-label", "Remove " + file.name);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      convertedFiles.delete(fileKey(file));
      selectedFiles.splice(index, 1);
      renderFiles();
    });

    const download = document.createElement("button");
    download.className = "download-btn";
    download.type = "button";
    download.textContent = convertedFiles.has(fileKey(file)) ? "Download" : actionLabel;
    download.addEventListener("click", () => convertOrDownload(file, download));

    const actions = document.createElement("div");
    actions.className = "file-actions";
    actions.append(download, remove);

    row.append(img, info, actions);
    filesEl.appendChild(row);
  });

  fileCount.textContent = selectedFiles.length;
  const hasFiles = selectedFiles.length > 0;
  workspace.classList.toggle("is-active", hasFiles);
  dropZone.classList.toggle("is-hidden", hasFiles);
  downloadAllBtn.classList.toggle("is-visible", hasFiles && convertedFiles.size === selectedFiles.length);
}

convertBtn.addEventListener("click", async () => {
  if (!selectedFiles.length) return;
  if (!validateResizeOptions()) return;

  convertBtn.disabled = true;
  convertBtn.textContent = progressLabel + "...";
  showStatus("Please keep this page open while your images are processed.", "");

  let completed = 0;
  for (const file of selectedFiles) {
    try {
      const blob = await convertImage(
        file,
        outputTypeFor(file),
        Number(quality.value) / 100,
        currentResizeOptions()
      );
      convertedFiles.set(fileKey(file), blob);
      completed += 1;
    } catch (error) {
      console.error(error);
    }
  }

  convertBtn.disabled = false;
  convertBtn.textContent = actionLabel + " All Images";
  renderFiles();
  if (showSizeResults && completed) {
    showCompressionSummary(completed);
  } else {
    showStatus(
      completed === selectedFiles.length
        ? "Successfully " + pastLabel + " " + completed + " images."
        : completed + "/" + selectedFiles.length + " images " + pastLabel + ".",
      completed ? "success" : "error"
    );
  }
});

downloadAllBtn.addEventListener("click", async () => {
  downloadAllBtn.disabled = true;
  for (const file of selectedFiles) {
    const blob = convertedFiles.get(fileKey(file));
    if (blob) {
      downloadBlob(blob, outputName(file));
      await pause(180);
    }
  }
  downloadAllBtn.disabled = false;
  showStatus("Your converted images are downloading.", "success");
});

async function convertOrDownload(file, button) {
  const key = fileKey(file);
  if (!convertedFiles.has(key)) {
    if (!validateResizeOptions()) return;
    button.disabled = true;
    button.textContent = progressLabel + "...";
    try {
      convertedFiles.set(
        key,
        await convertImage(
          file,
          outputTypeFor(file),
          Number(quality.value) / 100,
          currentResizeOptions()
        )
      );
      renderFiles();
      if (showSizeResults) {
        const result = convertedFiles.get(key);
        const comparison = sizeComparison(file.size, result.size);
        showStatus(
          file.name + ": " + formatBytes(file.size) + " → " + formatBytes(result.size) + " (" + comparison.label + ").",
          comparison.isSmaller ? "success" : "warning"
        );
      } else {
        showStatus(file.name + " is ready to download.", "success");
      }
    } catch (error) {
      console.error(error);
      button.disabled = false;
      button.textContent = "Try Again";
      showStatus("Could not convert " + file.name + ". The image may be damaged.", "error");
    }
    return;
  }
  downloadBlob(convertedFiles.get(key), outputName(file));
}

function clearAll() {
  selectedFiles = [];
  resetConversions();
  clearStatus();
  renderFiles();
}

function resetConversions() {
  convertedFiles.clear();
  if (selectedFiles.length) renderFiles();
}

function outputName(file) {
  return outputFileName(file.name, outputTypeFor(file), toolCode);
}

function outputTypeFor(file) {
  return format.value === "original" ? file.type : format.value;
}

function currentResizeOptions() {
  if (!resizeEnabled) return {};
  return {
    width: Number(resizeWidth.value) || 0,
    height: Number(resizeHeight.value) || 0,
    maintainAspect: maintainAspect.checked,
  };
}

function validateResizeOptions() {
  if (!resizeEnabled) return true;
  const options = currentResizeOptions();
  if (!options.width && !options.height) {
    showStatus("Enter a target width, height, or both before resizing.", "error");
    return false;
  }
  return true;
}

function selectSizePreset(selectedButton) {
  sizePresetButtons.forEach((button) => {
    const isSelected = button === selectedButton;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  if (sizePresetDropdown) {
    sizePresetDropdown.classList.toggle("is-custom", !selectedButton);
  }
  if (selectedPresetValue) {
    selectedPresetValue.textContent = selectedButton
      ? selectedButton.querySelector("strong").textContent + " — " + selectedButton.dataset.width + " × " + selectedButton.dataset.height
      : "Custom size";
  }
}

function syncQualityControl() {
  const supportsQuality = format.value !== "image/png";
  qualityField.style.opacity = supportsQuality ? "1" : ".48";
  quality.disabled = !supportsQuality;
  if (compressionLevel) compressionLevel.disabled = !supportsQuality;
  updateCompressionNote();
}

function applyCompressionLevel() {
  const qualityByLevel = { light: 90, balanced: 75, strong: 55 };
  quality.value = qualityByLevel[compressionLevel.value];
  qualityValue.textContent = quality.value + "%";
  updateCompressionNote();
}

function updateCompressionNote() {
  if (!compressionNote || !compressionLevel) return;
  if (format.value === "image/png") {
    compressionNote.dataset.level = "png";
    compressionNote.textContent = "PNG compression is lossless, so file-size reduction may be limited.";
    return;
  }

  const notes = {
    light: "High quality: subtle compression with a smaller file-size reduction.",
    balanced: "Good balance: some fine detail may be softened.",
    strong: "Quality warning: visible detail loss or artifacts may appear.",
  };
  compressionNote.dataset.level = compressionLevel.value;
  compressionNote.textContent = notes[compressionLevel.value];
}

function sizeComparison(originalSize, resultSize) {
  if (!originalSize) return { isSmaller: false, label: "size unavailable" };
  const difference = Math.abs(1 - resultSize / originalSize) * 100;
  const isSmaller = resultSize <= originalSize;
  return {
    isSmaller,
    label: difference.toFixed(1) + "% " + (isSmaller ? "smaller" : "larger"),
  };
}

function showCompressionSummary(completed) {
  let originalTotal = 0;
  let resultTotal = 0;

  selectedFiles.forEach((file) => {
    const result = convertedFiles.get(fileKey(file));
    if (result) {
      originalTotal += file.size;
      resultTotal += result.size;
    }
  });

  const comparison = sizeComparison(originalTotal, resultTotal);
  showStatus(
    completed + " images: " + formatBytes(originalTotal) + " → " + formatBytes(resultTotal) + " (" + comparison.label + ").",
    comparison.isSmaller ? "success" : "warning"
  );
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "status" + (type ? " " + type : "");
}

function clearStatus() {
  showStatus("", "");
}
