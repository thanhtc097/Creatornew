import { compressFileToTarget } from '../../js/target-compressor-engine.js'

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const fileInput = document.getElementById('fileInput')
const chooseBtn = document.getElementById('chooseBtn')
const addMoreBtn = document.getElementById('addMoreBtn')
const clearAllBtn = document.getElementById('clearAllBtn')
const dropZone = document.getElementById('dropZone')
const workspace = document.getElementById('workspace')
const filesEl = document.getElementById('files')
const fileCount = document.getElementById('fileCount')
const formatSelect = document.getElementById('outputFormat')
const convertBtn = document.getElementById('convertBtn')
const downloadAllBtn = document.getElementById('downloadAllBtn')
const statusEl = document.getElementById('status')
const presetBtns = Array.from(document.querySelectorAll('.target-preset-btn'))
const customInput = document.getElementById('customTargetKb')

let currentTargetBytes = 200 * 1024 // default 200 KB
let selectedFiles = []
let objectUrls = []
const compressedResults = new Map() // fileName -> { blob, finalSize, originalSize, width, height }

function updateTargetBytes(bytes) {
  currentTargetBytes = bytes
  const kbVal = Math.round(bytes / 1024)
  if (convertBtn) {
    convertBtn.textContent = `⚡ Nén Tất Cả Ảnh Dưới ${kbVal} KB`
  }
}

// Preset button handlers
presetBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    presetBtns.forEach((b) => b.classList.remove('is-active'))
    btn.classList.add('is-active')
    if (customInput) customInput.value = ''
    const bytes = Number(btn.dataset.bytes) || 200 * 1024
    updateTargetBytes(bytes)
  })
})

if (customInput) {
  customInput.addEventListener('input', () => {
    const val = parseInt(customInput.value, 10)
    if (!isNaN(val) && val > 0) {
      presetBtns.forEach((b) => b.classList.remove('is-active'))
      updateTargetBytes(val * 1024)
    }
  })
}

function openPicker() {
  fileInput.click()
}

if (chooseBtn) chooseBtn.addEventListener('click', (e) => { e.stopPropagation(); openPicker() })
if (addMoreBtn) addMoreBtn.addEventListener('click', openPicker)
if (clearAllBtn) clearAllBtn.addEventListener('click', clearAll)
if (dropZone) {
  dropZone.addEventListener('click', openPicker)
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openPicker()
    }
  })
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    dropZone.classList.add('drag-active')
  })
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-active')
  })
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault()
    dropZone.classList.remove('drag-active')
    if (e.dataTransfer?.files?.length) {
      addFiles(e.dataTransfer.files)
    }
  })
}

if (fileInput) {
  fileInput.addEventListener('change', () => {
    if (fileInput.files?.length) {
      addFiles(fileInput.files)
      fileInput.value = ''
    }
  })
}

function clearAll() {
  selectedFiles = []
  compressedResults.clear()
  objectUrls.forEach(URL.revokeObjectURL)
  objectUrls = []
  if (filesEl) filesEl.innerHTML = ''
  if (workspace) workspace.style.display = 'none'
  if (dropZone) dropZone.style.display = 'flex'
  if (statusEl) statusEl.textContent = ''
  if (downloadAllBtn) downloadAllBtn.style.display = 'none'
  if (convertBtn) convertBtn.style.display = 'inline-flex'
}

function addFiles(fileList) {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  const incoming = Array.from(fileList).filter((f) => validTypes.includes(f.type))

  if (!incoming.length) {
    showStatus('Vui lòng chọn file ảnh JPG, PNG hoặc WebP.', 'error')
    return
  }

  const unique = incoming.filter(
    (file) => !selectedFiles.some((item) => item.name === file.name && item.size === file.size)
  )

  selectedFiles = [...selectedFiles, ...unique].slice(0, 20)
  renderFiles()
}

function showStatus(message, type = 'info') {
  if (!statusEl) return
  statusEl.textContent = message
  statusEl.className = 'status status-' + type
}

function fileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function renderFiles() {
  objectUrls.forEach(URL.revokeObjectURL)
  objectUrls = []
  if (!filesEl) return

  filesEl.innerHTML = ''

  if (selectedFiles.length === 0) {
    clearAll()
    return
  }

  if (dropZone) dropZone.style.display = 'none'
  if (workspace) workspace.style.display = 'block'
  if (fileCount) fileCount.textContent = selectedFiles.length

  selectedFiles.forEach((file, index) => {
    const url = URL.createObjectURL(file)
    objectUrls.push(url)

    const row = document.createElement('div')
    row.className = 'file-row'

    const img = document.createElement('img')
    img.className = 'thumb'
    img.src = url
    img.alt = file.name

    const info = document.createElement('div')
    info.className = 'file-info'

    const name = document.createElement('div')
    name.className = 'file-name'
    name.textContent = file.name

    const size = document.createElement('div')
    size.className = 'file-size'

    const res = compressedResults.get(fileKey(file))
    if (res) {
      const kbLimit = Math.round(currentTargetBytes / 1024)
      const isCompliant = res.finalSize <= currentTargetBytes
      const pct = Math.max(0, Math.round((1 - res.finalSize / file.size) * 100))

      size.innerHTML = `
        <span class="size-change">${formatBytes(file.size)} → <strong>${formatBytes(res.finalSize)}</strong> (Giảm ${pct}%)</span>
        <span class="compliance-badge ${isCompliant ? 'badge-ok' : 'badge-warn'}">
          ${isCompliant ? `✓ Đạt chuẩn ≤ ${kbLimit} KB` : `⚠ Vượt ${kbLimit} KB`}
        </span>
      `
    } else {
      size.textContent = `Dung lượng gốc: ${formatBytes(file.size)}`
    }

    info.append(name, size)

    const actions = document.createElement('div')
    actions.className = 'file-actions'

    const downloadBtn = document.createElement('button')
    downloadBtn.className = 'primary-btn action-btn'
    downloadBtn.type = 'button'

    if (res) {
      downloadBtn.textContent = 'Tải xuống'
      downloadBtn.addEventListener('click', () => downloadSingle(file, res))
    } else {
      downloadBtn.textContent = 'Nén ngay'
      downloadBtn.addEventListener('click', () => compressSingle(file, downloadBtn))
    }

    const removeBtn = document.createElement('button')
    removeBtn.className = 'remove-btn'
    removeBtn.type = 'button'
    removeBtn.setAttribute('aria-label', `Xóa ${file.name}`)
    removeBtn.textContent = '×'
    removeBtn.addEventListener('click', () => {
      compressedResults.delete(fileKey(file))
      selectedFiles.splice(index, 1)
      renderFiles()
    })

    actions.append(downloadBtn, removeBtn)
    row.append(img, info, actions)
    filesEl.append(row)
  })

  // Check if all processed
  const allProcessed = selectedFiles.length > 0 && selectedFiles.every((f) => compressedResults.has(fileKey(f)))
  if (downloadAllBtn) downloadAllBtn.style.display = allProcessed ? 'inline-flex' : 'none'
  if (convertBtn) convertBtn.style.display = allProcessed ? 'none' : 'inline-flex'
}

async function compressSingle(file, buttonElement) {
  if (buttonElement) {
    buttonElement.disabled = true
    buttonElement.textContent = 'Đang nén...'
  }
  showStatus(`Đang nén ${file.name} đạt mục tiêu ≤ ${Math.round(currentTargetBytes / 1024)} KB...`, 'info')

  try {
    const mime = formatSelect ? formatSelect.value : 'image/jpeg'
    const result = await compressFileToTarget(file, currentTargetBytes, mime)
    compressedResults.set(fileKey(file), result)
    renderFiles()
    showStatus(`Đã nén thành công ${file.name} còn ${formatBytes(result.finalSize)}!`, 'success')
  } catch (err) {
    showStatus(`Lỗi khi nén ${file.name}: ${err.message}`, 'error')
    if (buttonElement) {
      buttonElement.disabled = false
      buttonElement.textContent = 'Thử lại'
    }
  }
}

function downloadSingle(file, res) {
  const ext = (formatSelect ? formatSelect.value : 'image/jpeg') === 'image/webp' ? '.webp' : '.jpg'
  const baseName = file.name.replace(/\.[^/.]+$/, '')
  const fileName = `${baseName}-under-${Math.round(currentTargetBytes / 1024)}kb${ext}`

  const a = document.createElement('a')
  const url = URL.createObjectURL(res.blob)
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

if (convertBtn) {
  convertBtn.addEventListener('click', async () => {
    convertBtn.disabled = true
    convertBtn.textContent = 'Đang xử lý hàng loạt...'
    showStatus('Đang nén toàn bộ danh sách ảnh...', 'info')

    for (const file of selectedFiles) {
      if (!compressedResults.has(fileKey(file))) {
        try {
          const mime = formatSelect ? formatSelect.value : 'image/jpeg'
          const res = await compressFileToTarget(file, currentTargetBytes, mime)
          compressedResults.set(fileKey(file), res)
          renderFiles()
        } catch (err) {
          console.error(err)
        }
      }
    }

    convertBtn.disabled = false
    showStatus('Hoàn tất! Tất cả ảnh đã được nén đúng quy chuẩn dung lượng.', 'success')
  })
}

if (downloadAllBtn) {
  downloadAllBtn.addEventListener('click', () => {
    selectedFiles.forEach((file) => {
      const res = compressedResults.get(fileKey(file))
      if (res) {
        downloadSingle(file, res)
      }
    })
  })
}

// Initial setup
updateTargetBytes(200 * 1024)
