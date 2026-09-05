import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const API_URL = 'https://prompts.chat/api/prompts?perPage=48'
const CSV_URL = 'https://raw.githubusercontent.com/f/prompts.chat/main/prompts.csv'
const OUTPUT_FILE = resolve('public/data/prompts-chat.json')

function getItems(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.prompts)) return payload.prompts
  if (Array.isArray(payload?.data?.prompts)) return payload.data.prompts
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

async function keepExistingFile(reason) {
  try {
    const current = JSON.parse(await readFile(OUTPUT_FILE, 'utf8'))
    console.warn(`[prompts.chat] ${reason}. Keeping ${current.prompts?.length || 0} cached prompts.`)
  } catch {
    await mkdir(dirname(OUTPUT_FILE), { recursive: true })
    await writeFile(OUTPUT_FILE, JSON.stringify({ updatedAt: null, source: API_URL, prompts: [] }, null, 2))
    console.warn(`[prompts.chat] ${reason}. Created an empty fallback file.`)
  }
}

function parseCsv(text) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1 }
      else quoted = !quoted
    } else if (character === ',' && !quoted) { row.push(value); value = '' }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(value); value = ''
      if (row.some(Boolean)) rows.push(row)
      row = []
    } else value += character
  }
  if (value || row.length) { row.push(value); rows.push(row) }
  const headers = (rows.shift() || []).map((item) => item.trim().toLowerCase())
  return rows.map((columns) => Object.fromEntries(headers.map((header, index) => [header, columns[index] || ''])))
}

async function fetchOfficialPrompts() {
  try {
    const response = await fetch(API_URL, { headers: { Accept: 'application/json', 'User-Agent': 'CreatorNew prompt library sync' } })
    if (!response.ok) throw new Error(`API HTTP ${response.status}`)
    const prompts = getItems(await response.json())
    if (!prompts.length) throw new Error('API returned no prompts')
    return { prompts, source: API_URL }
  } catch (apiError) {
    console.warn(`[prompts.chat] API unavailable (${apiError instanceof Error ? apiError.message : 'unknown error'}). Trying official CSV.`)
    const response = await fetch(CSV_URL, { headers: { Accept: 'text/csv', 'User-Agent': 'CreatorNew prompt library sync' } })
    if (!response.ok) throw new Error(`CSV HTTP ${response.status}`)
    const prompts = parseCsv(await response.text()).map((item, index) => ({
      id: `csv-${index + 1}`,
      title: item.act || item.title || `Community Prompt ${index + 1}`,
      content: item.prompt || item.content || '',
      description: 'Official community prompt from prompts.chat',
      sourceUrl: 'https://prompts.chat/'
    })).filter((item) => item.content).slice(0, 48)
    if (!prompts.length) throw new Error('CSV returned no prompts')
    return { prompts, source: CSV_URL }
  }
}

try {
  const { prompts, source } = await fetchOfficialPrompts()

  await mkdir(dirname(OUTPUT_FILE), { recursive: true })
  await writeFile(OUTPUT_FILE, JSON.stringify({ updatedAt: new Date().toISOString(), source, license: 'CC0', prompts }, null, 2))
  console.log(`[prompts.chat] Synced ${prompts.length} prompts.`)
} catch (error) {
  await keepExistingFile(error instanceof Error ? error.message : 'Sync failed')
}
