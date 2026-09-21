/**
 * API Key Management Service for CreatorNew Media Sources
 * Stores keys securely in browser localStorage.
 * Keys never leave the user's browser and are sent directly to official APIs.
 */

const STORAGE_KEY = 'creatornew_media_api_keys'

export function getApiKeys() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { pexels: '', pixabay: '', freesound: '', coverr: '' }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { pexels: '', pixabay: '', freesound: '', coverr: '' }
    const parsed = JSON.parse(raw)
    return {
      pexels: parsed.pexels || '',
      pixabay: parsed.pixabay || '',
      freesound: parsed.freesound || '',
      coverr: parsed.coverr || '',
    }
  } catch {
    return { pexels: '', pixabay: '', freesound: '', coverr: '' }
  }
}

export function getApiKey(service) {
  return getApiKeys()[service] || ''
}

export function setApiKey(service, key) {
  if (typeof window === 'undefined' || !window.localStorage) return
  const current = getApiKeys()
  current[service] = (key || '').trim()
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // ignore localStorage quota errors
  }
}

export function clearApiKey(service) {
  setApiKey(service, '')
}

export function hasApiKey(service) {
  return Boolean(getApiKey(service))
}

/**
 * Validate an API key by making a lightweight test query
 */
export async function validateApiKey(service, key) {
  const cleanKey = (key || '').trim()
  if (!cleanKey) {
    return { valid: false, message: 'API key cannot be empty.' }
  }

  try {
    if (service === 'pexels') {
      const res = await fetch('https://api.pexels.com/videos/search?query=ocean&per_page=1', {
        headers: { Authorization: cleanKey },
      })
      if (res.status === 200) {
        return { valid: true, message: 'Pexels API key connected successfully!' }
      }
      return { valid: false, message: res.status === 401 ? 'Invalid Pexels API key.' : `Pexels error (status ${res.status}).` }
    }

    if (service === 'pixabay') {
      const res = await fetch(`https://pixabay.com/api/videos/?key=${encodeURIComponent(cleanKey)}&q=nature&per_page=3`)
      if (res.status === 200) {
        return { valid: true, message: 'Pixabay API key connected successfully!' }
      }
      return { valid: false, message: 'Invalid Pixabay API key.' }
    }

    if (service === 'freesound') {
      const res = await fetch(`https://freesound.org/apiv2/search/text/?query=chime&token=${encodeURIComponent(cleanKey)}&page_size=1`)
      if (res.status === 200) {
        return { valid: true, message: 'Freesound API key connected successfully!' }
      }
      return { valid: false, message: 'Invalid Freesound API key or token.' }
    }

    if (service === 'coverr') {
      const res = await fetch(`https://api.coverr.co/videos?query=nature&api_key=${encodeURIComponent(cleanKey)}`)
      if (res.status === 200) {
        return { valid: true, message: 'Coverr API key connected successfully!' }
      }
      return { valid: false, message: 'Invalid Coverr API key.' }
    }

    return { valid: false, message: 'Unknown service.' }
  } catch (err) {
    return { valid: false, message: err.message || 'Unable to connect to service.' }
  }
}
