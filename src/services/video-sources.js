/**
 * Unified Video Sources Service for CreatorNew
 * Combines NASA Image and Video Library (100% US Public Domain) & Wikimedia Commons (Creative Commons)
 */

const NASA_API = 'https://images-api.nasa.gov/search'
const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php'

function stripHtml(value = '') {
  if (typeof document === 'undefined') {
    return value.replace(/<[^>]+>/g, '').trim()
  }
  const node = document.createElement('div')
  node.innerHTML = value
  return node.textContent || ''
}

function cleanTitle(title = '') {
  return title.replace(/^File:/i, '').replace(/\.[^.]+$/, '').replaceAll('_', ' ').trim()
}

function meta(item, key) {
  return stripHtml(item.imageinfo?.[0]?.extmetadata?.[key]?.value || '')
}

function getWikimediaLicense(item) {
  return meta(item, 'LicenseShortName') || 'Creative Commons'
}

function getWikimediaAuthor(item) {
  return meta(item, 'Artist') || 'Wikimedia Commons creator'
}

function isWikimediaCommercial(item) {
  const restrictions = meta(item, 'Restrictions').toLowerCase()
  const license = getWikimediaLicense(item).toLowerCase()
  return !license.includes('nc') && !restrictions.includes('noncommercial')
}

function isWikimediaModifiable(item) {
  const restrictions = meta(item, 'Restrictions').toLowerCase()
  const license = getWikimediaLicense(item).toLowerCase()
  return !license.includes('nd') && !restrictions.includes('no derivative')
}

/**
 * Format standard Wikimedia item to unified schema
 */
export function formatWikimediaItem(item) {
  const info = item.imageinfo?.[0] || {}
  const title = cleanTitle(item.title)
  const author = getWikimediaAuthor(item)
  const license = getWikimediaLicense(item)
  const isCC0 = license.toLowerCase().includes('cc0') || license.toLowerCase().includes('public domain')
  const sourceUrl = info.descriptionurl || ''
  
  return {
    id: `wiki-${item.pageid}`,
    pageid: item.pageid,
    title,
    creator: author,
    description: meta(item, 'ImageDescription') || '',
    thumb: info.thumburl || '',
    videoUrl: info.url || '',
    mime: info.mime || 'video/webm',
    filetype: info.mime?.split('/')[1]?.toUpperCase() || 'VIDEO',
    source: 'wikimedia',
    source_name: 'Wikimedia Commons',
    license,
    license_type: isCC0 ? 'cc0' : 'cc-by',
    requires_attribution: !isCC0,
    landing_url: sourceUrl,
    attribution: `“${title}” — ${author}, ${license}. Source: ${sourceUrl}`,
    raw: item,
  }
}

/**
 * Fetch and extract the direct streamable MP4 URL from a NASA collection JSON
 */
export async function fetchNasaVideoStream(collectionUrl) {
  if (!collectionUrl) return null
  const safeUrl = encodeURI(collectionUrl.replace(/^http:/, 'https:'))
  try {
    const response = await fetch(safeUrl)
    if (!response.ok) return null
    const files = await response.json()
    if (!Array.isArray(files)) return null

    const httpsFiles = files.map((f) => String(f).replace(/^http:/, 'https:'))
    
    // Priority order: medium mp4 -> preview mp4 -> small mp4 -> orig mp4 -> any mp4
    const mediumMp4 = httpsFiles.find((f) => f.includes('~medium.mp4'))
    const previewMp4 = httpsFiles.find((f) => f.includes('~preview.mp4'))
    const smallMp4 = httpsFiles.find((f) => f.includes('~small.mp4'))
    const origMp4 = httpsFiles.find((f) => f.endsWith('.mp4') && f.includes('~orig'))
    const anyMp4 = httpsFiles.find((f) => f.endsWith('.mp4'))
    const anyVideo = httpsFiles.find((f) => f.endsWith('.mp4') || f.endsWith('.mov') || f.endsWith('.webm'))

    return mediumMp4 || previewMp4 || smallMp4 || origMp4 || anyMp4 || anyVideo || null
  } catch {
    return null
  }
}

/**
 * Format raw NASA search item to unified schema
 */
export function formatNasaItem(item) {
  const data = item.data?.[0] || {}
  const links = item.links || []
  const thumbLink = links.find((l) => l.rel === 'preview' || l.render === 'image')?.href || links[0]?.href
  const collectionUrl = item.href ? item.href.replace(/^http:/, 'https:') : ''
  const title = data.title || 'NASA Video'
  const creator = data.secondary_creator || data.center || 'NASA'
  const nasaId = data.nasa_id || ''
  const landingUrl = nasaId ? `https://images.nasa.gov/details/${encodeURIComponent(nasaId)}` : 'https://images.nasa.gov/'

  return {
    id: `nasa-${nasaId || Math.random().toString(36).slice(2)}`,
    nasa_id: nasaId,
    title,
    creator: creator.includes('NASA') ? creator : `NASA / ${creator}`,
    description: data.description || '',
    date: data.date_created,
    thumb: thumbLink ? thumbLink.replace(/^http:/, 'https:') : '',
    collectionUrl,
    videoUrl: null, // Fetched lazily via fetchNasaVideoStream when previewing/playing
    mime: 'video/mp4',
    filetype: 'MP4',
    source: 'nasa',
    source_name: 'NASA Video',
    license: 'Public Domain',
    license_type: 'pdm',
    requires_attribution: false,
    landing_url: landingUrl,
    attribution: `“${title}” — Courtesy of NASA${creator && !creator.includes('NASA') ? ` / ${creator}` : ''}. Public Domain (US Government work). Source: ${landingUrl}`,
    raw: item,
  }
}

/**
 * Search NASA Image and Video Library API
 */
export async function searchNasaVideos({ query, page = 1, pageSize = 12 }) {
  if (!query?.trim()) return { items: [], total: 0 }
  const url = `${NASA_API}?q=${encodeURIComponent(query.trim())}&media_type=video&page=${page}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Unable to connect to NASA Video Library.')
  }
  const data = await response.json()
  const rawItems = data.collection?.items || []
  const total = data.collection?.metadata?.total_hits || rawItems.length
  const items = rawItems.slice(0, pageSize).map(formatNasaItem)
  return { items, total }
}

/**
 * Search Wikimedia Commons Video API
 */
export async function searchWikimediaVideos({ query, pageSize = 12, continueToken = null }) {
  if (!query?.trim()) return { items: [], continueToken: null }
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    generator: 'search',
    gsrnamespace: '6',
    gsrlimit: String(pageSize),
    gsrsearch: `${query.trim()} filetype:video`,
    prop: 'imageinfo',
    iiprop: 'url|mime|size|extmetadata',
    iiurlwidth: '640',
  })
  if (continueToken) {
    Object.entries(continueToken).forEach(([k, v]) => params.set(k, v))
  }
  const response = await fetch(`${WIKIMEDIA_API}?${params}`)
  if (!response.ok) {
    throw new Error('Unable to connect to Wikimedia Commons.')
  }
  const data = await response.json()
  const rawPages = data.query?.pages || []
  const items = rawPages.map(formatWikimediaItem)
  return { items, continueToken: data.continue || null }
}

/**
 * Filter items by license criteria
 */
export function filterVideoByLicense(item, filter) {
  if (filter === 'all') return true
  if (filter === 'no-attribution') {
    // NASA is 100% public domain (no attribution required), plus CC0/Public domain Wikimedia
    return !item.requires_attribution
  }
  if (filter === 'attribution') {
    return item.requires_attribution
  }
  if (filter === 'commercial') {
    // NASA is always commercial-use allowed
    if (item.source === 'nasa') return true
    if (item.raw) return isWikimediaCommercial(item.raw)
    return true
  }
  if (filter === 'modify') {
    if (item.source === 'nasa') return true
    if (item.raw) return isWikimediaModifiable(item.raw)
    return true
  }
  return true
}

/**
 * Search videos across selected sources (NASA + Wikimedia) with unified response
 */
export async function searchVideos({
  query,
  source = 'all',
  licenseFilter = 'all',
  page = 1,
  pageSize = 12,
  continueToken = null,
}) {
  if (!query?.trim()) return { items: [], continueToken: null, total: 0 }

  const results = []
  let newContinueToken = null
  let totalCount = 0

  if (source === 'nasa') {
    const nasaRes = await searchNasaVideos({ query, page, pageSize })
    const filtered = nasaRes.items.filter((item) => filterVideoByLicense(item, licenseFilter))
    return { items: filtered, continueToken: null, total: nasaRes.total }
  }

  if (source === 'wikimedia') {
    const wikiRes = await searchWikimediaVideos({ query, pageSize, continueToken })
    const filtered = wikiRes.items.filter((item) => filterVideoByLicense(item, licenseFilter))
    return { items: filtered, continueToken: wikiRes.continueToken, total: filtered.length }
  }

  // source === 'all': fetch both concurrently with graceful fallback
  const halfPage = Math.max(Math.floor(pageSize / 2), 6)
  const [nasaResult, wikiResult] = await Promise.allSettled([
    searchNasaVideos({ query, page, pageSize: halfPage }),
    searchWikimediaVideos({ query, pageSize: halfPage, continueToken }),
  ])

  let nasaItems = []
  if (nasaResult.status === 'fulfilled') {
    nasaItems = nasaResult.value.items
    totalCount += nasaResult.value.total
  }

  let wikiItems = []
  if (wikiResult.status === 'fulfilled') {
    wikiItems = wikiResult.value.items
    newContinueToken = wikiResult.value.continueToken
    totalCount += wikiItems.length
  }

  // Interleave results for balanced variety
  const maxLength = Math.max(nasaItems.length, wikiItems.length)
  for (let i = 0; i < maxLength; i++) {
    if (i < nasaItems.length) results.push(nasaItems[i])
    if (i < wikiItems.length) results.push(wikiItems[i])
  }

  const filtered = results.filter((item) => filterVideoByLicense(item, licenseFilter))
  return {
    items: filtered,
    continueToken: newContinueToken,
    total: totalCount || filtered.length,
  }
}
