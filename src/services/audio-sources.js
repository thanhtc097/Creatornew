/**
 * Unified Audio Sources Service for CreatorNew
 * Combines:
 * - Kevin MacLeod (Incompetech CC-BY 4.0 BGM)
 * - Kenney Audio (100% CC0 UI/Game SFX)
 * - Freesound.org API (700k+ sounds with CC0/CC filter, supports API key or curated showcase)
 * - Openverse API (Creative Commons audio)
 */

import { searchIncompetechTracks } from '../data/incompetech.js'
import { searchKenneyTracks } from '../data/kenney-sfx.js'
import { searchFreesoundShowcase } from '../data/freesound-showcase.js'

const OPENVERSE_API = 'https://api.openverse.org/v1/audio/'
const FREESOUND_API = 'https://freesound.org/apiv2/search/text/'

export function formatOpenverseTrack(item) {
  const licenseKey = (item.license || '').toLowerCase()
  const isCC0 = licenseKey === 'cc0' || licenseKey === 'pdm'
  const licenseNames = {
    cc0: 'CC0',
    pdm: 'Public Domain',
    by: 'CC BY',
    'by-sa': 'CC BY-SA',
    'by-nc': 'CC BY-NC',
    'by-nc-sa': 'CC BY-NC-SA',
    'by-nd': 'CC BY-ND',
    'by-nc-nd': 'CC BY-NC-ND',
  }
  const licenseLabel = `${licenseNames[licenseKey] || item.license?.toUpperCase() || 'CC'}${item.license_version ? ` ${item.license_version}` : ''}`
  const creator = item.creator || 'Unknown creator'
  const sourceUrl = item.foreign_landing_url || item.url || ''
  
  const attribution = isCC0
    ? `“${item.title}” — ${creator}. Public Domain / CC0. Source: ${sourceUrl}`
    : item.attribution || `“${item.title}” — ${creator}, ${licenseLabel}. Source: ${sourceUrl}`

  return {
    id: `openverse-${item.id}`,
    original_id: item.id,
    title: item.title || 'Untitled audio',
    creator,
    license: item.license || 'cc-by',
    license_version: item.license_version || '',
    license_url: item.license_url || 'https://creativecommons.org/licenses/',
    license_label: licenseLabel,
    requires_attribution: !isCC0,
    filetype: item.filetype || 'mp3',
    duration: item.duration || 0,
    bit_rate: item.bit_rate || null,
    source: 'openverse',
    source_name: 'Openverse',
    url: item.url,
    foreign_landing_url: sourceUrl,
    attribution,
    tags: item.tags?.map((t) => t.name) || [],
  }
}

export function formatFreesoundHit(hit) {
  const isCC0 = (hit.license || '').toLowerCase().includes('0') || (hit.license || '').toLowerCase().includes('zero')
  const streamUrl = hit.previews?.['preview-hq-mp3'] || hit.previews?.['preview-lq-mp3'] || ''
  const creator = hit.username || 'Freesound User'
  const title = (hit.name || 'Freesound Clip').replace(/\.[^.]+$/, '').trim()
  const sourceUrl = hit.url || `https://freesound.org/people/${creator}/sounds/${hit.id}/`

  return {
    id: `freesound-${hit.id}`,
    original_id: hit.id,
    title,
    creator,
    license: isCC0 ? 'cc0' : 'by',
    license_version: '1.0',
    license_url: isCC0 ? 'https://creativecommons.org/publicdomain/zero/1.0/' : 'https://creativecommons.org/licenses/by/4.0/',
    license_label: isCC0 ? 'CC0 1.0' : 'CC BY',
    requires_attribution: !isCC0,
    filetype: 'mp3',
    duration: Math.round((hit.duration || 0) * 1000),
    source: 'freesound',
    source_name: 'Freesound.org',
    url: streamUrl,
    foreign_landing_url: sourceUrl,
    attribution: isCC0
      ? `“${title}” by ${creator} via Freesound.org. CC0 1.0 Universal (Public Domain). Attribution not required.`
      : `“${title}” by ${creator} via Freesound.org. Licensed under Creative Commons Attribution. Source: ${sourceUrl}`,
    tags: hit.tags || [],
  }
}

export async function searchFreesoundAudio({
  query = '',
  page = 1,
  pageSize = 12,
  license = '',
  apiKey = '',
}) {
  const cleanQuery = query.trim() || 'sound effect'

  if (apiKey) {
    try {
      const params = new URLSearchParams({
        query: cleanQuery,
        page: String(page),
        page_size: String(pageSize),
        fields: 'id,name,tags,description,url,license,previews,username,duration',
        token: apiKey,
      })

      if (license.includes('cc0') || license.includes('pdm')) {
        params.set('filter', 'license:"Creative Commons 0"')
      }

      const response = await fetch(`${FREESOUND_API}?${params}`)
      if (response.ok) {
        const data = await response.json()
        const items = (data.results || []).map(formatFreesoundHit)
        return {
          results: items,
          page,
          page_count: Math.ceil((data.count || items.length) / pageSize),
          result_count: data.count || items.length,
          source: 'freesound',
          isLive: true,
        }
      }
    } catch {
      // fallback to showcase
    }
  }

  // Fallback to Curated Freesound Showcase
  const matches = searchFreesoundShowcase(query).filter((t) => matchesLicenseFilter(t, license))
  const start = (page - 1) * pageSize
  return {
    results: matches.slice(start, start + pageSize),
    page,
    page_count: Math.ceil(matches.length / pageSize) || 1,
    result_count: matches.length,
    source: 'freesound',
    isLive: false,
    requiresKeyForLive: !apiKey,
  }
}

export function matchesLicenseFilter(track, licenseFilter) {
  if (!licenseFilter) return true
  const filterTokens = licenseFilter.toLowerCase().split(',')
  const trackLicense = (track.license || '').toLowerCase()

  if (filterTokens.includes('cc0') || filterTokens.includes('pdm')) {
    return trackLicense === 'cc0' || trackLicense === 'pdm'
  }
  if (filterTokens.includes('by')) {
    return trackLicense === 'by'
  }
  if (filterTokens.includes('by-sa')) {
    return trackLicense === 'by-sa'
  }
  if (filterTokens.includes('by-nc') || filterTokens.includes('by-nc-sa')) {
    return trackLicense.includes('nc')
  }
  return true
}

export async function searchAudio({
  query = '',
  source = 'all',
  license = '',
  page = 1,
  pageSize = 12,
  apiKeys = {},
  signal,
}) {
  const cleanQuery = query.trim()

  // 1. Source: Incompetech only
  if (source === 'incompetech') {
    let matches = searchIncompetechTracks(cleanQuery)
    matches = matches.filter((t) => matchesLicenseFilter(t, license))
    const start = (page - 1) * pageSize
    const paged = matches.slice(start, start + pageSize)
    return {
      results: paged,
      page,
      page_count: Math.ceil(matches.length / pageSize) || 1,
      result_count: matches.length,
      source: 'incompetech',
    }
  }

  // 2. Source: Kenney Audio only
  if (source === 'kenney') {
    let matches = searchKenneyTracks(cleanQuery)
    matches = matches.filter((t) => matchesLicenseFilter(t, license))
    const start = (page - 1) * pageSize
    const paged = matches.slice(start, start + pageSize)
    return {
      results: paged,
      page,
      page_count: Math.ceil(matches.length / pageSize) || 1,
      result_count: matches.length,
      source: 'kenney',
    }
  }

  // 3. Source: Freesound only
  if (source === 'freesound') {
    return searchFreesoundAudio({
      query: cleanQuery,
      page,
      pageSize,
      license,
      apiKey: apiKeys.freesound,
    })
  }

  // 4. Source: Openverse only
  if (source === 'openverse') {
    const params = new URLSearchParams({
      q: cleanQuery,
      page: String(page),
      page_size: String(pageSize),
    })
    if (license) params.set('license', license)

    const response = await fetch(`${OPENVERSE_API}?${params}`, { signal })
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Too many searches on Openverse. Please try again in a moment.')
      }
      throw new Error('Unable to connect to Openverse audio library.')
    }
    const data = await response.json()
    const rawResults = (data.results || []).filter((item) => item.url && !item.mature)
    return {
      results: rawResults.map(formatOpenverseTrack),
      page: data.page || page,
      page_count: data.page_count || 1,
      result_count: data.result_count || rawResults.length,
      source: 'openverse',
    }
  }

  // 5. Source: All (Incompetech + Kenney + Freesound + Openverse)
  const incompetechMatches = searchIncompetechTracks(cleanQuery).filter((t) =>
    matchesLicenseFilter(t, license),
  )
  const kenneyMatches = searchKenneyTracks(cleanQuery).filter((t) =>
    matchesLicenseFilter(t, license),
  )
  const freesoundMatches = searchFreesoundShowcase(cleanQuery).filter((t) =>
    matchesLicenseFilter(t, license),
  )
  const localMatches = [...incompetechMatches, ...kenneyMatches, ...freesoundMatches]

  let openverseTracks = []
  let openverseError = null
  let openverseTotal = 0
  let openversePages = 1

  try {
    const params = new URLSearchParams({
      q: cleanQuery,
      page: String(page),
      page_size: String(pageSize),
    })
    if (license) params.set('license', license)

    const response = await fetch(`${OPENVERSE_API}?${params}`, { signal })
    if (response.ok) {
      const data = await response.json()
      const rawResults = (data.results || []).filter((item) => item.url && !item.mature)
      openverseTracks = rawResults.map(formatOpenverseTrack)
      openverseTotal = data.result_count || 0
      openversePages = data.page_count || 1
    } else if (response.status === 429) {
      openverseError = 'Openverse rate limit reached.'
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      openverseError = err.message
    }
  }

  let combinedResults = []
  if (page === 1) {
    combinedResults = [...localMatches, ...openverseTracks]
  } else {
    combinedResults = openverseTracks
  }

  if (combinedResults.length === 0 && openverseError) {
    throw new Error(openverseError)
  }

  const totalHits = localMatches.length + openverseTotal
  return {
    results: combinedResults.slice(0, pageSize),
    page,
    page_count: Math.max(openversePages, Math.ceil(totalHits / pageSize)),
    result_count: totalHits,
    source: 'all',
  }
}
