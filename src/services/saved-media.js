/**
 * Saved Media (Bookmarks & Project Collection) Service for CreatorNew
 * Stores saved video clips and audio tracks locally in browser localStorage.
 * Generates ready-to-paste YouTube / TikTok description credit blocks in 1 click.
 */

const STORAGE_KEY_PREFIX = 'creatornew_saved_'

export function getSavedMedia(type = 'video') {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${type}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function isMediaSaved(id, type = 'video') {
  if (!id) return false
  const items = getSavedMedia(type)
  return items.some((item) => item.id === id)
}

export function toggleSaveMedia(item, type = 'video') {
  if (typeof window === 'undefined' || !window.localStorage || !item?.id) {
    return { saved: false, count: 0 }
  }

  const items = getSavedMedia(type)
  const index = items.findIndex((i) => i.id === item.id)
  let nextItems = []
  let isSaved = false

  if (index >= 0) {
    nextItems = items.filter((i) => i.id !== item.id)
    isSaved = false
  } else {
    // Save lightweight serializable object
    const cleanItem = {
      id: item.id,
      title: item.title,
      creator: item.creator,
      thumb: item.thumb || '',
      url: item.url || item.videoUrl || '',
      landing_url: item.landing_url || item.foreign_landing_url || '',
      license: item.license || '',
      license_label: item.license_label || item.license || '',
      requires_attribution: Boolean(item.requires_attribution),
      source: item.source || '',
      source_name: item.source_name || '',
      attribution: item.attribution || '',
      filetype: item.filetype || '',
      duration: item.duration || 0,
      savedAt: Date.now(),
    }
    nextItems = [cleanItem, ...items]
    isSaved = true
  }

  try {
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${type}`, JSON.stringify(nextItems))
  } catch {
    // ignore quota errors
  }

  return { saved: isSaved, count: nextItems.length }
}

export function removeSavedMedia(id, type = 'video') {
  if (typeof window === 'undefined' || !window.localStorage) return []
  const items = getSavedMedia(type).filter((item) => item.id !== id)
  try {
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${type}`, JSON.stringify(items))
  } catch {}
  return items
}

export function clearSavedMedia(type = 'video') {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}${type}`)
  } catch {}
}

/**
 * Generate a beautifully formatted, YouTube/TikTok-compliant description credits block
 */
export function generateBatchAttribution(items = []) {
  if (!items.length) return ''

  const header = `======================================================
MUSIC & FOOTAGE CREDITS (YouTube / Commercial Safe)
======================================================\n`

  const lines = items.map((item, idx) => {
    const num = idx + 1
    if (item.attribution) {
      return `${num}. ${item.attribution}`
    }
    const sourceLink = item.landing_url || item.url || ''
    const licenseText = item.requires_attribution
      ? `Licensed under ${item.license_label || item.license}`
      : `${item.license_label || item.license} (No attribution required)`
    return `${num}. “${item.title}” by ${item.creator || 'Creator'} — ${licenseText}${sourceLink ? `\n   Source: ${sourceLink}` : ''}`
  })

  const footer = `\n======================================================
Verified royalty-free & copyright strike safe via CreatorNew
https://creatornew.com/
======================================================`

  return `${header}\n${lines.join('\n\n')}\n${footer}`
}
