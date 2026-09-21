/**
 * Unified Audio Sources Service for CreatorNew
 * Combines Kevin MacLeod (Incompetech CC-BY 4.0), Kenney Audio (CC0 SFX), and Openverse API
 */

import { searchIncompetechTracks } from '../data/incompetech.js'
import { searchKenneyTracks } from '../data/kenney-sfx.js'

const OPENVERSE_API = 'https://api.openverse.org/v1/audio/'

/**
 * Format Openverse item to standardized Track schema
 */
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

/**
 * Check if a local track satisfies the license filter
 */
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

/**
 * Search audio across Incompetech, Kenney Audio, and Openverse
 */
export async function searchAudio({
  query = '',
  source = 'all',
  license = '',
  page = 1,
  pageSize = 12,
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

  // 3. Source: Openverse only
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

  // 4. Source: All (Curated Incompetech + Kenney + Openverse)
  // Gather local matches first
  const incompetechMatches = searchIncompetechTracks(cleanQuery).filter((t) =>
    matchesLicenseFilter(t, license),
  )
  const kenneyMatches = searchKenneyTracks(cleanQuery).filter((t) =>
    matchesLicenseFilter(t, license),
  )
  const localMatches = [...incompetechMatches, ...kenneyMatches]

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

  // If on first page, prioritize local high-relevance matches
  let combinedResults = []
  if (page === 1) {
    // Show top local matches followed by Openverse tracks
    combinedResults = [...localMatches, ...openverseTracks]
  } else {
    combinedResults = openverseTracks
  }

  // If Openverse failed but we have local matches, return them smoothly without error!
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
