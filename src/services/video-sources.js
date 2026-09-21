/**
 * Unified Video Sources Service for CreatorNew
 * Integrates:
 * - NASA Image and Video Library (100% US Public Domain, no key required)
 * - Pexels Video API (Free commercial license, supports API key or curated showcase)
 * - Pixabay Video API (Free Pixabay license, supports API key or curated showcase)
 * - Coverr Video API (Cinematic/aerial footage, supports API key or curated showcase)
 * - Wikimedia Commons (Creative Commons, no key required)
 */

import { searchPexelsShowcase } from '../data/pexels-showcase.js'
import { searchPixabayShowcase } from '../data/pixabay-showcase.js'
import { searchCoverrShowcase } from '../data/coverr-showcase.js'

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

export async function fetchNasaVideoStream(collectionUrl) {
  if (!collectionUrl) return null
  const safeUrl = encodeURI(collectionUrl.replace(/^http:/, 'https:'))
  try {
    const response = await fetch(safeUrl)
    if (!response.ok) return null
    const files = await response.json()
    if (!Array.isArray(files)) return null

    const httpsFiles = files.map((f) => String(f).replace(/^http:/, 'https:'))
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
    videoUrl: null,
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

export async function searchNasaVideos({ query, page = 1, pageSize = 12 }) {
  if (!query?.trim()) return { items: [], total: 0 }
  const url = `${NASA_API}?q=${encodeURIComponent(query.trim())}&media_type=video&page=${page}`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Unable to connect to NASA Video Library.')
  const data = await response.json()
  const rawItems = data.collection?.items || []
  const total = data.collection?.metadata?.total_hits || rawItems.length
  const items = rawItems.slice(0, pageSize).map(formatNasaItem)
  return { items, total }
}

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
  if (!response.ok) throw new Error('Unable to connect to Wikimedia Commons.')
  const data = await response.json()
  const rawPages = data.query?.pages || []
  const items = rawPages.map(formatWikimediaItem)
  return { items, continueToken: data.continue || null }
}

export function formatPexelsVideoItem(v) {
  const files = v.video_files || []
  const bestFile =
    files.find((f) => f.quality === 'hd' && f.width >= 1280) ||
    files.find((f) => f.quality === 'sd') ||
    files[0] ||
    {}
  const creator = v.user?.name || 'Pexels Creator'
  const title = `Pexels Footage #${v.id} by ${creator}`

  return {
    id: `pexels-${v.id}`,
    pexels_id: v.id,
    title,
    creator,
    thumb: v.image || '',
    videoUrl: bestFile.link || null,
    landing_url: v.url || `https://www.pexels.com/video/${v.id}/`,
    source: 'pexels',
    source_name: 'Pexels Video',
    license: 'Pexels License',
    license_type: 'free',
    requires_attribution: false,
    filetype: 'MP4',
    attribution: `“${title}” by ${creator} via Pexels. Pexels License (Free to use commercially, no attribution required).`,
  }
}

export async function searchPexelsVideos({ query = '', page = 1, pageSize = 12, apiKey = '' }) {
  if (apiKey) {
    try {
      const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query.trim() || 'nature')}&page=${page}&per_page=${pageSize}`
      const response = await fetch(url, { headers: { Authorization: apiKey } })
      if (response.ok) {
        const data = await response.json()
        const items = (data.videos || []).map(formatPexelsVideoItem)
        return { items, total: data.total_results || items.length, isLive: true }
      }
    } catch {
      // fallback
    }
  }

  const matches = searchPexelsShowcase(query)
  const start = (page - 1) * pageSize
  return {
    items: matches.slice(start, start + pageSize),
    total: matches.length,
    isLive: false,
    requiresKeyForLive: !apiKey,
  }
}

export function formatPixabayVideoItem(hit) {
  const v = hit.videos || {}
  const bestUrl = v.medium?.url || v.large?.url || v.small?.url || v.tiny?.url || ''
  const tagList = (hit.tags || '').split(',').map((s) => s.trim()).filter(Boolean)
  const title = tagList.slice(0, 3).join(', ') || `Pixabay Video #${hit.id}`
  const creator = hit.user || 'Pixabay Contributor'

  return {
    id: `pixabay-${hit.id}`,
    pixabay_id: hit.id,
    title,
    creator,
    thumb: hit.picture_id ? `https://i.vimeocdn.com/video/${hit.picture_id}_640x360.jpg` : '',
    videoUrl: bestUrl,
    landing_url: hit.pageURL || 'https://pixabay.com/',
    source: 'pixabay',
    source_name: 'Pixabay Video',
    license: 'Pixabay License',
    license_type: 'free',
    requires_attribution: false,
    filetype: 'MP4',
    attribution: `“${title}” by ${creator} via Pixabay. Pixabay License (Free commercial use, no attribution required).`,
  }
}

export async function searchPixabayVideos({ query = '', page = 1, pageSize = 12, apiKey = '' }) {
  if (apiKey) {
    try {
      const url = `https://pixabay.com/api/videos/?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query.trim() || 'nature')}&page=${page}&per_page=${pageSize}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        const items = (data.hits || []).map(formatPixabayVideoItem)
        return { items, total: data.totalHits || items.length, isLive: true }
      }
    } catch {
      // fallback
    }
  }

  const matches = searchPixabayShowcase(query)
  const start = (page - 1) * pageSize
  return {
    items: matches.slice(start, start + pageSize),
    total: matches.length,
    isLive: false,
    requiresKeyForLive: !apiKey,
  }
}

export async function searchCoverrVideos({ query = '', page = 1, pageSize = 12, apiKey = '' }) {
  if (apiKey) {
    try {
      const url = `https://api.coverr.co/videos?query=${encodeURIComponent(query.trim() || 'cinematic')}&api_key=${encodeURIComponent(apiKey)}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        const rawHits = data.hits || data.videos || []
        const items = rawHits.map((h) => ({
          id: `coverr-${h.id}`,
          title: h.title || 'Coverr Footage',
          creator: 'Coverr Filmmaker',
          thumb: h.poster || h.thumbnail || '',
          videoUrl: h.urls?.mp4 || h.urls?.mp4_download || '',
          landing_url: h.urls?.landing || 'https://coverr.co/',
          source: 'coverr',
          source_name: 'Coverr Video',
          license: 'Coverr License',
          license_type: 'free',
          requires_attribution: false,
          filetype: 'MP4',
          attribution: `“${h.title || 'Footage'}” via Coverr.co. Coverr License (Free commercial use, no attribution required).`,
        }))
        return { items, total: items.length, isLive: true, requiresKeyForLive: false }
      }
    } catch {
      // fallback
    }
  }

  const matches = searchCoverrShowcase(query)
  const start = (page - 1) * pageSize
  return {
    items: matches.slice(start, start + pageSize),
    total: matches.length,
    isLive: false,
    requiresKeyForLive: !apiKey,
  }
}

export function filterVideoByLicense(item, filter) {
  if (filter === 'all') return true
  if (filter === 'no-attribution') {
    return !item.requires_attribution
  }
  if (filter === 'attribution') {
    return item.requires_attribution
  }
  if (filter === 'commercial') {
    if (item.source === 'nasa' || item.source === 'pexels' || item.source === 'pixabay' || item.source === 'coverr') {
      return true
    }
    if (item.raw) return isWikimediaCommercial(item.raw)
    return true
  }
  if (filter === 'modify') {
    if (item.source === 'nasa' || item.source === 'pexels' || item.source === 'pixabay' || item.source === 'coverr') {
      return true
    }
    if (item.raw) return isWikimediaModifiable(item.raw)
    return true
  }
  return true
}

export async function searchVideos({
  query,
  source = 'all',
  licenseFilter = 'all',
  page = 1,
  pageSize = 12,
  continueToken = null,
  apiKeys = {},
}) {
  if (!query?.trim()) return { items: [], continueToken: null, total: 0 }

  if (source === 'nasa') {
    const nasaRes = await searchNasaVideos({ query, page, pageSize })
    const filtered = nasaRes.items.filter((item) => filterVideoByLicense(item, licenseFilter))
    return { items: filtered, continueToken: null, total: nasaRes.total }
  }

  if (source === 'pexels') {
    const pexRes = await searchPexelsVideos({ query, page, pageSize, apiKey: apiKeys.pexels })
    const filtered = pexRes.items.filter((item) => filterVideoByLicense(item, licenseFilter))
    return {
      items: filtered,
      continueToken: null,
      total: pexRes.total,
      isLive: pexRes.isLive,
      requiresKeyForLive: pexRes.requiresKeyForLive,
    }
  }

  if (source === 'pixabay') {
    const pixRes = await searchPixabayVideos({ query, page, pageSize, apiKey: apiKeys.pixabay })
    const filtered = pixRes.items.filter((item) => filterVideoByLicense(item, licenseFilter))
    return {
      items: filtered,
      continueToken: null,
      total: pixRes.total,
      isLive: pixRes.isLive,
      requiresKeyForLive: pixRes.requiresKeyForLive,
    }
  }

  if (source === 'coverr') {
    const covRes = await searchCoverrVideos({ query, page, pageSize, apiKey: apiKeys.coverr })
    const filtered = covRes.items.filter((item) => filterVideoByLicense(item, licenseFilter))
    return {
      items: filtered,
      continueToken: null,
      total: covRes.total,
      isLive: covRes.isLive,
      requiresKeyForLive: covRes.requiresKeyForLive,
    }
  }

  if (source === 'wikimedia') {
    const wikiRes = await searchWikimediaVideos({ query, pageSize, continueToken })
    const filtered = wikiRes.items.filter((item) => filterVideoByLicense(item, licenseFilter))
    return { items: filtered, continueToken: wikiRes.continueToken, total: filtered.length }
  }

  // source === 'all': combine NASA, Pexels, Pixabay, Coverr, Wikimedia
  const segmentSize = Math.max(Math.floor(pageSize / 5), 3)
  const [nasaResult, pexResult, pixResult, covResult, wikiResult] = await Promise.allSettled([
    searchNasaVideos({ query, page, pageSize: segmentSize }),
    searchPexelsVideos({ query, page, pageSize: segmentSize, apiKey: apiKeys.pexels }),
    searchPixabayVideos({ query, page, pageSize: segmentSize, apiKey: apiKeys.pixabay }),
    searchCoverrVideos({ query, page, pageSize: segmentSize, apiKey: apiKeys.coverr }),
    searchWikimediaVideos({ query, pageSize: segmentSize, continueToken }),
  ])

  const nasaItems = nasaResult.status === 'fulfilled' ? nasaResult.value.items : []
  const pexItems = pexResult.status === 'fulfilled' ? pexResult.value.items : []
  const pixItems = pixResult.status === 'fulfilled' ? pixResult.value.items : []
  const covItems = covResult.status === 'fulfilled' ? covResult.value.items : []
  const wikiItems = wikiResult.status === 'fulfilled' ? wikiResult.value.items : []
  const newContinueToken = wikiResult.status === 'fulfilled' ? wikiResult.value.continueToken : null

  const results = []
  const maxLen = Math.max(nasaItems.length, pexItems.length, pixItems.length, covItems.length, wikiItems.length)
  for (let i = 0; i < maxLen; i++) {
    if (i < pexItems.length) results.push(pexItems[i])
    if (i < nasaItems.length) results.push(nasaItems[i])
    if (i < pixItems.length) results.push(pixItems[i])
    if (i < covItems.length) results.push(covItems[i])
    if (i < wikiItems.length) results.push(wikiItems[i])
  }

  const filtered = results.filter((item) => filterVideoByLicense(item, licenseFilter))
  return {
    items: filtered,
    continueToken: newContinueToken,
    total: filtered.length,
  }
}
