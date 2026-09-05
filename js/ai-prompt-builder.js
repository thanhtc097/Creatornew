const form = document.querySelector('#promptForm')
const goal = document.querySelector('#promptGoal')
const goalCount = document.querySelector('#goalCount')
const empty = document.querySelector('#promptEmpty')
const result = document.querySelector('#promptResult')
const output = document.querySelector('#promptOutput')
const wordCount = document.querySelector('#promptWordCount')
const copyButton = document.querySelector('#copyPromptBtn')

function value(id) { return document.querySelector(`#${id}`).value.trim() }
function line(label, content) { return content ? `${label}: ${content}` : '' }

function buildPrompt() {
  const tool = value('aiTool')
  const type = value('contentType')
  const audience = value('audience') || 'the most relevant audience for this task'
  const tone = value('tone')
  const language = value('outputLanguage')
  const length = value('outputLength')
  const context = value('context')
  const include = value('mustInclude')
  const avoid = value('avoid')
  const format = value('format') || 'Use a clear structure that is easy to scan and apply.'

  const role = type === 'Code' ? 'an experienced software engineer' : type === 'Image prompt' ? 'an expert visual prompt designer and art director' : 'an expert content strategist and creator'
  return [
    `You are ${role}.`,
    '',
    'TASK',
    value('promptGoal'),
    '',
    'REQUIREMENTS',
    line('- Intended AI tool', tool),
    line('- Content type', type),
    line('- Target audience', audience),
    line('- Tone', tone),
    line('- Output language', language),
    line('- Desired length', length),
    context ? `- Background and context: ${context}` : '',
    include ? `- Must include: ${include}` : '',
    avoid ? `- Avoid: ${avoid}` : '',
    `- Output format: ${format}`,
    '',
    'QUALITY CHECK',
    'Before answering, verify that the result directly addresses the task, matches the audience and tone, follows every requirement, and does not invent unsupported facts. If essential information is missing, ask concise clarification questions first.'
  ].filter((item, index, array) => item || array[index - 1]).join('\n').trim()
}

function updateCount() { goalCount.textContent = goal.value.length }
function updateWords() { const count = output.value.trim() ? output.value.trim().split(/\s+/).length : 0; wordCount.textContent = `${count} words` }

goal.addEventListener('input', updateCount)
output.addEventListener('input', updateWords)
form.addEventListener('submit', (event) => {
  event.preventDefault()
  if (!goal.value.trim()) { goal.focus(); return }
  output.value = buildPrompt()
  empty.hidden = true
  result.hidden = false
  updateWords()
  output.focus()
})

document.querySelector('#clearPromptBtn').addEventListener('click', () => {
  form.reset(); output.value = ''; result.hidden = true; empty.hidden = false; updateCount(); goal.focus()
})

copyButton.addEventListener('click', async () => {
  await navigator.clipboard.writeText(output.value)
  const original = copyButton.textContent
  copyButton.textContent = 'Copied!'
  setTimeout(() => { copyButton.textContent = original }, 1400)
})

document.querySelector('#downloadPromptBtn').addEventListener('click', () => {
  const blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = 'creatornew-ai-prompt.txt'; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url)
})

updateCount()

let promptLibrary = []

const promptGrid = document.querySelector('#promptGrid')
const librarySearch = document.querySelector('#librarySearch')
const libraryModel = document.querySelector('#libraryModel')
const libraryCount = document.querySelector('#libraryCount')
const libraryEmpty = document.querySelector('#libraryEmpty')
const promptModal = document.querySelector('#promptModal')
let activeCategory = 'all'
let activeLibraryPrompt = null

function renderLibrary() {
  const term = librarySearch.value.trim().toLowerCase()
  const filtered = promptLibrary.filter((item) => (activeCategory === 'all' || item.category === activeCategory) && (libraryModel.value === 'all' || item.model === libraryModel.value) && (!term || `${item.title} ${item.description} ${item.category} ${item.model}`.toLowerCase().includes(term))).sort((a, b) => (b.likes + b.downloads) - (a.likes + a.downloads) || b.likes - a.likes || a.title.localeCompare(b.title))
  libraryCount.textContent = `${filtered.length} prompts`
  libraryEmpty.hidden = filtered.length > 0
  promptGrid.innerHTML = filtered.map((item) => `<button class="library-card" type="button" data-title="${item.title.replaceAll('"','&quot;')}"><div class="library-card-visual" style="background-image:url('../assets/prompt-library-sprite.png');background-position:${spritePosition(item.category)}"><span>${item.category.toUpperCase()}</span></div><div class="library-card-body"><div class="library-card-tags"><span>${item.model}</span><span>${item.category}</span></div><h3>${item.title}</h3><p>${item.description}</p><div class="library-card-footer"><span class="prompt-popularity"><span title="Likes">♥ ${formatMetric(item.likes)}</span><span title="Downloads or uses">↓ ${formatMetric(item.downloads)}</span></span><b>View prompt &rarr;</b></div></div></button>`).join('')
}

function formatMetric(value) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0)
}

function promptId(item) {
  return String(item.id || item.title || 'prompt').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 120)
}

function spritePosition(category) {
  return ({ writing: '0% 0%', marketing: '50% 0%', image: '100% 0%', video: '0% 100%', social: '50% 100%' })[category] || '100% 100%'
}

function openLibraryPrompt(item) {
  activeLibraryPrompt = item
  document.querySelector('#modalTitle').textContent = item.title
  document.querySelector('#modalDescription').textContent = item.description
  document.querySelector('#modalCategory').textContent = item.category
  document.querySelector('#modalModel').textContent = item.model
  document.querySelector('#modalPopularity').innerHTML = `<span>♥ ${formatMetric(item.likes)} likes</span><span>↓ ${formatMetric(item.downloads)} downloads/uses</span>`
  document.querySelector('#modalPrompt').value = item.prompt
  const sourceLink = document.querySelector('#modalSource')
  sourceLink.hidden = !item.sourceUrl
  if (item.sourceUrl) {
    sourceLink.href = item.sourceUrl
    sourceLink.textContent = `View source: ${item.sourceName} · ${item.license} ↗`
  }
  const modalVisual = document.querySelector('#modalVisual')
  modalVisual.style.backgroundImage = "url('../assets/prompt-library-sprite.png')"
  modalVisual.style.backgroundPosition = spritePosition(item.category)
  promptModal.hidden = false
  document.body.style.overflow = 'hidden'
}

promptGrid.addEventListener('click', (event) => { const card = event.target.closest('.library-card'); if (card) openLibraryPrompt(promptLibrary.find((item) => item.title === card.dataset.title)) })
librarySearch.addEventListener('input', renderLibrary)
libraryModel.addEventListener('change', renderLibrary)
document.querySelector('#libraryCategories').addEventListener('click', (event) => { const button = event.target.closest('button[data-category]'); if (!button) return; activeCategory = button.dataset.category; document.querySelectorAll('#libraryCategories button').forEach((item) => item.classList.toggle('is-active', item === button)); renderLibrary() })
document.querySelector('#closePromptModal').addEventListener('click', () => { promptModal.hidden = true; document.body.style.overflow = '' })
promptModal.addEventListener('click', (event) => { if (event.target === promptModal) { promptModal.hidden = true; document.body.style.overflow = '' } })
document.querySelector('#copyLibraryPromptBtn').addEventListener('click', async (event) => { await navigator.clipboard.writeText(document.querySelector('#modalPrompt').value); event.currentTarget.textContent = 'Copied!'; setTimeout(() => { event.currentTarget.textContent = 'Copy Prompt' }, 1300) })
document.querySelector('#useInBuilderBtn').addEventListener('click', () => { goal.value = activeLibraryPrompt.prompt; updateCount(); promptModal.hidden = true; document.body.style.overflow = ''; document.querySelector('#prompt-builder').scrollIntoView({ behavior: 'smooth' }) })
renderLibrary()

function communityCategory(item) {
  const text = `${item.title || ''} ${item.content || item.prompt || ''} ${item.type || ''} ${item.category || ''} ${(item.tags || []).join(' ')}`.toLowerCase()
  if (text.includes('image') || text.includes('midjourney') || text.includes('dall-e')) return 'image'
  if (text.includes('video')) return 'video'
  if (text.includes('social') || text.includes('instagram') || text.includes('youtube')) return 'social'
  if (text.includes('marketing') || text.includes('sales') || text.includes('seo')) return 'marketing'
  return 'writing'
}

function normalizeCommunityPrompts(payload) {
  const items = Array.isArray(payload) ? payload : payload.prompts || payload.data?.prompts || payload.data || payload.items || []
  const gradients = ['linear-gradient(135deg,#312e81,#8b5cf6)','linear-gradient(135deg,#064e3b,#34d399)','linear-gradient(135deg,#075985,#38bdf8)','linear-gradient(135deg,#7c2d12,#fb923c)','linear-gradient(135deg,#881337,#fb7185)']
  return items.filter((item) => item && item.title && (item.content || item.prompt)).slice(0, 72).map((item, index) => ({
    id: promptId(item),
    title: item.title,
    category: communityCategory(item),
    model: item.model || item.tags?.find((tag) => /chatgpt|claude|gemini|midjourney|dall-e/i.test(tag)) || 'General AI',
    description: item.description || `Community prompt by ${item.author || 'prompts.chat'}`,
    prompt: item.content || item.prompt,
    gradient: gradients[index % gradients.length],
    sourceName: item.sourceName || 'prompts.chat',
    license: item.license || 'CC0',
    sourceLikes: Number(item.votes ?? item.likes ?? item.upvotes ?? item.favorites ?? 0) || 0,
    sourceDownloads: Number(item.downloads ?? item.uses ?? item.copies ?? item.useCount ?? 0) || 0,
    likes: Number(item.votes ?? item.likes ?? item.upvotes ?? item.favorites ?? 0) || 0,
    downloads: Number(item.downloads ?? item.uses ?? item.copies ?? item.useCount ?? 0) || 0,
    sourceUrl: item.sourceUrl || item.url || `https://prompts.chat/prompts/${item.id || ''}`
  }))
}

async function loadCommunityPrompts() {
  const status = document.querySelector('#librarySourceStatus')
  try {
    status.textContent = 'Loading community prompts...'
    const response = await fetch('../data/prompts-chat.json', { cache: 'no-cache' })
    if (!response.ok) throw new Error('Prompt data unavailable')
    const payload = await response.json()
    const community = normalizeCommunityPrompts(payload)
    if (community?.length) {
      const existing = new Set(promptLibrary.map((item) => item.title.toLowerCase()))
      promptLibrary = [...promptLibrary, ...community.filter((item) => !existing.has(item.title.toLowerCase()))]
      const updated = payload.updatedAt ? ` Â· Updated ${new Date(payload.updatedAt).toLocaleDateString()}` : ''
      status.textContent = `${community.length} prompts from open libraries${updated}`
      renderLibrary()
    } else status.textContent = 'No community prompts available'
  } catch {
    status.textContent = 'No community prompts available'
  }
}

loadCommunityPrompts()
