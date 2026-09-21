import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KENNEY_TRACKS, searchKenneyTracks } from '../../src/data/kenney-sfx.js'
import { INCOMPETECH_TRACKS, searchIncompetechTracks } from '../../src/data/incompetech.js'
import { PEXELS_SHOWCASE, searchPexelsShowcase } from '../../src/data/pexels-showcase.js'
import { PIXABAY_SHOWCASE, searchPixabayShowcase } from '../../src/data/pixabay-showcase.js'
import { FREESOUND_SHOWCASE, searchFreesoundShowcase } from '../../src/data/freesound-showcase.js'
import { COVERR_SHOWCASE, searchCoverrShowcase } from '../../src/data/coverr-showcase.js'
import {
  getApiKeys,
  setApiKey,
  clearApiKey,
  hasApiKey,
  validateApiKey,
} from '../../src/services/api-keys.js'
import {
  formatNasaItem,
  formatWikimediaItem,
  formatPexelsVideoItem,
  formatPixabayVideoItem,
  fetchNasaVideoStream,
  filterVideoByLicense,
  searchVideos,
  searchPexelsVideos,
  searchPixabayVideos,
  searchCoverrVideos,
} from '../../src/services/video-sources.js'
import {
  formatOpenverseTrack,
  formatFreesoundHit,
  matchesLicenseFilter,
  searchAudio,
  searchFreesoundAudio,
} from '../../src/services/audio-sources.js'
import {
  getSavedMedia,
  isMediaSaved,
  toggleSaveMedia,
  removeSavedMedia,
  clearSavedMedia,
  generateBatchAttribution,
} from '../../src/services/saved-media.js'

describe('API Keys Service', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('stores, retrieves, and clears API keys in localStorage', () => {
    expect(getApiKeys()).toEqual({ pexels: '', pixabay: '', freesound: '', coverr: '' })
    expect(hasApiKey('pexels')).toBe(false)

    setApiKey('pexels', 'test-pexels-key-123')
    expect(hasApiKey('pexels')).toBe(true)
    expect(getApiKeys().pexels).toBe('test-pexels-key-123')

    clearApiKey('pexels')
    expect(hasApiKey('pexels')).toBe(false)
  })

  it('validates API key with test queries', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 200 })
    const res = await validateApiKey('pexels', 'valid-key')
    expect(res.valid).toBe(true)

    globalThis.fetch = vi.fn().mockResolvedValue({ status: 401 })
    const failRes = await validateApiKey('pexels', 'invalid-key')
    expect(failRes.valid).toBe(false)

    const emptyRes = await validateApiKey('pexels', '')
    expect(emptyRes.valid).toBe(false)
  })
})

describe('Kenney Audio SFX Catalog', () => {
  it('contains valid CC0 audio tracks with required metadata', () => {
    expect(KENNEY_TRACKS.length).toBeGreaterThanOrEqual(25)
    for (const track of KENNEY_TRACKS) {
      expect(track.id).toMatch(/^kenney-/)
      expect(track.title).toBeTruthy()
      expect(track.creator).toBe('Kenney')
      expect(track.license).toBe('cc0')
      expect(track.requires_attribution).toBe(false)
      expect(track.url).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/gh\/.+\.(wav|ogg)$/)
      expect(track.attribution).toContain('CC0 1.0 Universal')
    }
  })

  it('searches Kenney tracks by keyword and tags', () => {
    const all = searchKenneyTracks('')
    expect(all.length).toBe(KENNEY_TRACKS.length)

    const clicks = searchKenneyTracks('click')
    expect(clicks.length).toBeGreaterThan(0)
    expect(clicks.every((t) => t.title.toLowerCase().includes('click') || t.tags.includes('click'))).toBe(true)

    const lasers = searchKenneyTracks('laser')
    expect(lasers.length).toBeGreaterThan(0)
    expect(lasers.every((t) => t.title.toLowerCase().includes('laser') || t.tags.includes('laser'))).toBe(true)

    const nonExistent = searchKenneyTracks('xyznonexistent123')
    expect(nonExistent).toEqual([])
  })
})

describe('Incompetech Kevin MacLeod Music Catalog', () => {
  it('contains valid CC-BY 4.0 tracks with attribution blocks', () => {
    expect(INCOMPETECH_TRACKS.length).toBeGreaterThanOrEqual(20)
    for (const track of INCOMPETECH_TRACKS) {
      expect(track.id).toMatch(/^incompetech-/)
      expect(track.title).toBeTruthy()
      expect(track.creator).toBe('Kevin MacLeod')
      expect(track.license).toBe('by')
      expect(track.license_version).toBe('4.0')
      expect(track.requires_attribution).toBe(true)
      expect(track.url).toMatch(/^https:\/\/incompetech\.com\/.+\.mp3$/)
      expect(track.attribution).toContain('Kevin MacLeod (incompetech.com)')
      expect(track.attribution).toContain('Creative Commons: By Attribution 4.0 License')
    }
  })

  it('searches Incompetech tracks by title, genre, and mood', () => {
    const snitch = searchIncompetechTracks('sneaky snitch')
    expect(snitch.length).toBe(1)
    expect(snitch[0].title).toBe('Sneaky Snitch')

    const monkeys = searchIncompetechTracks('monkeys spinning')
    expect(monkeys.length).toBe(1)
    expect(monkeys[0].title).toBe('Monkeys Spinning Monkeys')

    const comedy = searchIncompetechTracks('comedy')
    expect(comedy.length).toBeGreaterThanOrEqual(3)

    const empty = searchIncompetechTracks('qwerty12345notfound')
    expect(empty).toEqual([])
  })
})

describe('Pexels and Pixabay Showcases', () => {
  it('contains valid Pexels showcase video clips', () => {
    expect(PEXELS_SHOWCASE.length).toBeGreaterThanOrEqual(10)
    for (const item of PEXELS_SHOWCASE) {
      expect(item.id).toMatch(/^pexels-/)
      expect(item.source).toBe('pexels')
      expect(item.license).toBe('Pexels License')
      expect(item.requires_attribution).toBe(false)
      expect(item.videoUrl).toMatch(/^https:\/\/videos\.pexels\.com\/.+\.mp4$/)
    }

    const waterfall = searchPexelsShowcase('waterfall')
    expect(waterfall.length).toBeGreaterThanOrEqual(1)
  })

  it('contains valid Pixabay showcase video clips', () => {
    expect(PIXABAY_SHOWCASE.length).toBeGreaterThanOrEqual(5)
    for (const item of PIXABAY_SHOWCASE) {
      expect(item.id).toMatch(/^pixabay-/)
      expect(item.source).toBe('pixabay')
      expect(item.license).toBe('Pixabay License')
      expect(item.requires_attribution).toBe(false)
    }

    const water = searchPixabayShowcase('water')
    expect(water.length).toBeGreaterThanOrEqual(1)
  })

  it('formats raw Pexels video items correctly', () => {
    const rawPexels = {
      id: 999123,
      image: 'https://images.pexels.com/test.jpg',
      url: 'https://www.pexels.com/video/999123/',
      user: { name: 'Pexels Videographer' },
      video_files: [{ quality: 'hd', width: 1920, link: 'https://videos.pexels.com/test.mp4' }],
    }
    const item = formatPexelsVideoItem(rawPexels)
    expect(item.id).toBe('pexels-999123')
    expect(item.creator).toBe('Pexels Videographer')
    expect(item.videoUrl).toBe('https://videos.pexels.com/test.mp4')
    expect(item.requires_attribution).toBe(false)
  })

  it('formats raw Pixabay video items correctly', () => {
    const rawPixabay = {
      id: 888777,
      tags: 'nature, forest, trees',
      user: 'NatureFilm',
      picture_id: '555',
      pageURL: 'https://pixabay.com/videos/888777/',
      videos: { medium: { url: 'https://pixabay.com/test.mp4' } },
    }
    const item = formatPixabayVideoItem(rawPixabay)
    expect(item.id).toBe('pixabay-888777')
    expect(item.creator).toBe('NatureFilm')
    expect(item.title).toBe('nature, forest, trees')
    expect(item.videoUrl).toBe('https://pixabay.com/test.mp4')
  })
})

describe('Freesound Showcase and Audio Service', () => {
  it('contains valid Freesound showcase audio tracks', () => {
    expect(FREESOUND_SHOWCASE.length).toBeGreaterThanOrEqual(5)
    for (const track of FREESOUND_SHOWCASE) {
      expect(track.id).toMatch(/^freesound-/)
      expect(track.source).toBe('freesound')
      expect(track.license).toBe('cc0')
      expect(track.requires_attribution).toBe(false)
      expect(track.url).toMatch(/^https:\/\/cdn\.freesound\.org\/.+\.mp3$/)
    }

    const whoosh = searchFreesoundShowcase('whoosh')
    expect(whoosh.length).toBeGreaterThanOrEqual(1)
  })

  it('formats raw Freesound hits correctly', () => {
    const rawHit = {
      id: 444333,
      name: 'Cinematic_Sub_Hit.wav',
      username: 'AudioCraft',
      duration: 3.5,
      license: 'https://creativecommons.org/publicdomain/zero/1.0/',
      previews: { 'preview-hq-mp3': 'https://cdn.freesound.org/test.mp3' },
    }
    const track = formatFreesoundHit(rawHit)
    expect(track.id).toBe('freesound-444333')
    expect(track.title).toBe('Cinematic_Sub_Hit')
    expect(track.creator).toBe('AudioCraft')
    expect(track.license).toBe('cc0')
    expect(track.requires_attribution).toBe(false)
    expect(track.url).toBe('https://cdn.freesound.org/test.mp3')
  })

  it('searches Freesound audio with showcase fallback when no API key is provided', async () => {
    const res = await searchFreesoundAudio({ query: 'whoosh', apiKey: '' })
    expect(res.source).toBe('freesound')
    expect(res.isLive).toBe(false)
    expect(res.results.length).toBeGreaterThanOrEqual(1)
    expect(res.results[0].title).toContain('Whoosh')
  })
})

describe('NASA & Wikimedia Video Sources Service', () => {
  const sampleNasaRaw = {
    href: 'http://images-assets.nasa.gov/video/GSFC_Earth/collection.json',
    data: [
      {
        nasa_id: 'GSFC_Earth',
        title: 'Earth from Orbit',
        secondary_creator: 'Goddard Space Flight Center',
        center: 'GSFC',
        description: 'A highlight reel of Earth.',
        date_created: '2024-01-01T00:00:00Z',
      },
    ],
    links: [
      {
        href: 'http://images-assets.nasa.gov/video/GSFC_Earth/GSFC_Earth~thumb.jpg',
        rel: 'preview',
        render: 'image',
      },
    ],
  }

  it('formats raw NASA items with 100% Public Domain licensing and safe HTTPS', () => {
    const item = formatNasaItem(sampleNasaRaw)
    expect(item.id).toBe('nasa-GSFC_Earth')
    expect(item.title).toBe('Earth from Orbit')
    expect(item.creator).toContain('Goddard Space Flight Center')
    expect(item.source).toBe('nasa')
    expect(item.license).toBe('Public Domain')
    expect(item.requires_attribution).toBe(false)
    expect(item.thumb).toBe('https://images-assets.nasa.gov/video/GSFC_Earth/GSFC_Earth~thumb.jpg')
    expect(item.collectionUrl).toBe('https://images-assets.nasa.gov/video/GSFC_Earth/collection.json')
    expect(item.attribution).toContain('Courtesy of NASA')
    expect(item.attribution).toContain('Public Domain')
  })

  it('formats raw Wikimedia items with Creative Commons licensing', () => {
    const sampleWikiRaw = {
      pageid: 12345,
      title: 'File:Drone_over_city.webm',
      imageinfo: [
        {
          thumburl: 'https://upload.wikimedia.org/thumb.jpg',
          url: 'https://upload.wikimedia.org/Drone_over_city.webm',
          mime: 'video/webm',
          descriptionurl: 'https://commons.wikimedia.org/wiki/File:Drone_over_city.webm',
          extmetadata: {
            Artist: { value: 'John Doe' },
            LicenseShortName: { value: 'CC BY 4.0' },
            Restrictions: { value: '' },
          },
        },
      ],
    }

    const item = formatWikimediaItem(sampleWikiRaw)
    expect(item.id).toBe('wiki-12345')
    expect(item.title).toBe('Drone over city')
    expect(item.creator).toBe('John Doe')
    expect(item.source).toBe('wikimedia')
    expect(item.license).toBe('CC BY 4.0')
    expect(item.requires_attribution).toBe(true)
    expect(item.attribution).toContain('“Drone over city” — John Doe, CC BY 4.0')
  })

  it('fetches and resolves streamable MP4 from NASA collection URL', async () => {
    const mockFiles = [
      'http://images-assets.nasa.gov/video/test/test~orig.mov',
      'http://images-assets.nasa.gov/video/test/test~medium.mp4',
      'http://images-assets.nasa.gov/video/test/test~small.mp4',
    ]

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockFiles,
    })

    const stream = await fetchNasaVideoStream('http://images-assets.nasa.gov/video/test/collection.json')
    expect(stream).toBe('https://images-assets.nasa.gov/video/test/test~medium.mp4')
  })

  it('filters video items correctly by license mode', () => {
    const nasaItem = formatNasaItem(sampleNasaRaw)
    const pexelsItem = PEXELS_SHOWCASE[0]
    const ccByItem = {
      source: 'wikimedia',
      requires_attribution: true,
      license: 'CC BY 4.0',
      raw: { imageinfo: [{ extmetadata: { LicenseShortName: { value: 'CC BY 4.0' }, Restrictions: { value: '' } } }] },
    }

    // All licenses
    expect(filterVideoByLicense(nasaItem, 'all')).toBe(true)
    expect(filterVideoByLicense(pexelsItem, 'all')).toBe(true)
    expect(filterVideoByLicense(ccByItem, 'all')).toBe(true)

    // No attribution
    expect(filterVideoByLicense(nasaItem, 'no-attribution')).toBe(true)
    expect(filterVideoByLicense(pexelsItem, 'no-attribution')).toBe(true)
    expect(filterVideoByLicense(ccByItem, 'no-attribution')).toBe(false)

    // Attribution required
    expect(filterVideoByLicense(nasaItem, 'attribution')).toBe(false)
    expect(filterVideoByLicense(pexelsItem, 'attribution')).toBe(false)
    expect(filterVideoByLicense(ccByItem, 'attribution')).toBe(true)

    // Commercial allowed
    expect(filterVideoByLicense(nasaItem, 'commercial')).toBe(true)
    expect(filterVideoByLicense(pexelsItem, 'commercial')).toBe(true)
  })

  it('searches Pexels and Pixabay with showcase fallback', async () => {
    const pexRes = await searchPexelsVideos({ query: 'waterfall', apiKey: '' })
    expect(pexRes.items.length).toBeGreaterThan(0)
    expect(pexRes.isLive).toBe(false)

    const pixRes = await searchPixabayVideos({ query: 'water', apiKey: '' })
    expect(pixRes.items.length).toBeGreaterThan(0)
    expect(pixRes.isLive).toBe(false)
  })

  it('searches multiple sources concurrently when source="all"', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url) => {
      const urlStr = String(url)
      if (urlStr.includes('images-api.nasa.gov')) {
        return {
          ok: true,
          json: async () => ({
            collection: {
              items: [sampleNasaRaw],
              metadata: { total_hits: 1 },
            },
          }),
        }
      }
      return {
        ok: true,
        json: async () => ({
          query: {
            pages: [
              {
                pageid: 888,
                title: 'File:Space_walk.webm',
                imageinfo: [{ thumburl: 'https://example.com/thumb.jpg', url: 'https://example.com/walk.webm' }],
              },
            ],
          },
        }),
      }
    })

    const res = await searchVideos({ query: 'waterfall', source: 'all' })
    expect(res.items.length).toBeGreaterThan(0)
    expect(res.items.some((i) => i.source === 'pexels' || i.source === 'nasa' || i.source === 'wikimedia')).toBe(true)
  })
})

describe('Audio Sources Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('matches local tracks against license filters properly', () => {
    const cc0Track = KENNEY_TRACKS[0]
    const ccByTrack = INCOMPETECH_TRACKS[0]

    expect(matchesLicenseFilter(cc0Track, '')).toBe(true)
    expect(matchesLicenseFilter(cc0Track, 'cc0,pdm')).toBe(true)
    expect(matchesLicenseFilter(cc0Track, 'by')).toBe(false)

    expect(matchesLicenseFilter(ccByTrack, '')).toBe(true)
    expect(matchesLicenseFilter(ccByTrack, 'cc0,pdm')).toBe(false)
    expect(matchesLicenseFilter(ccByTrack, 'by')).toBe(true)
  })

  it('formats Openverse track to unified Track schema', () => {
    const rawOpenverse = {
      id: 'ov-999',
      title: 'Peaceful Guitar',
      creator: 'Jane Musician',
      license: 'by',
      license_version: '4.0',
      license_url: 'https://creativecommons.org/licenses/by/4.0/',
      filetype: 'mp3',
      duration: 180000,
      url: 'https://example.com/guitar.mp3',
      foreign_landing_url: 'https://example.com/landing',
    }

    const track = formatOpenverseTrack(rawOpenverse)
    expect(track.id).toBe('openverse-ov-999')
    expect(track.title).toBe('Peaceful Guitar')
    expect(track.source).toBe('openverse')
    expect(track.requires_attribution).toBe(true)
    expect(track.attribution).toContain('Jane Musician')
  })

  it('searches Incompetech source exclusively when source="incompetech"', async () => {
    const res = await searchAudio({
      query: 'sneaky',
      source: 'incompetech',
    })

    expect(res.source).toBe('incompetech')
    expect(res.results.length).toBeGreaterThan(0)
    expect(res.results.every((r) => r.source === 'incompetech')).toBe(true)
  })

  it('searches Kenney source exclusively when source="kenney"', async () => {
    const res = await searchAudio({
      query: 'click',
      source: 'kenney',
    })

    expect(res.source).toBe('kenney')
    expect(res.results.length).toBeGreaterThan(0)
    expect(res.results.every((r) => r.source === 'kenney')).toBe(true)
  })

  it('searches Freesound source exclusively when source="freesound"', async () => {
    const res = await searchAudio({
      query: 'whoosh',
      source: 'freesound',
    })

    expect(res.source).toBe('freesound')
    expect(res.results.length).toBeGreaterThan(0)
    expect(res.results.every((r) => r.source === 'freesound')).toBe(true)
  })

  it('combines local matches gracefully when source="all"', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 'mock-1',
            title: 'Mock Openverse Rain',
            creator: 'Tester',
            license: 'cc0',
            url: 'https://example.com/rain.mp3',
          },
        ],
        result_count: 1,
        page: 1,
        page_count: 1,
      }),
    })

    const res = await searchAudio({
      query: 'sneaky',
      source: 'all',
    })

    expect(res.results.length).toBeGreaterThan(0)
    expect(res.results[0].title).toBe('Sneaky Snitch')
  })
})

describe('Coverr Video Showcase & Search', () => {
  it('contains valid curated Coverr video items with commercial license', () => {
    expect(COVERR_SHOWCASE.length).toBeGreaterThanOrEqual(5)
    for (const item of COVERR_SHOWCASE) {
      expect(item.id).toMatch(/^coverr-/)
      expect(item.title).toBeTruthy()
      expect(item.creator).toBeTruthy()
      expect(item.source).toBe('coverr')
      expect(item.source_name).toBe('Coverr Video')
      expect(item.license).toBe('Coverr License')
      expect(item.requires_attribution).toBe(false)
      expect(item.videoUrl).toMatch(/^https:\/\/.+\.(webm|mp4)$/)
      expect(item.thumb).toMatch(/^https:\/\/.+/)
      expect(item.landing_url).toMatch(/^https:\/\/coverr\.co/)
      expect(item.attribution).toContain('Coverr License')
    }
  })

  it('filters Coverr showcase by query keyword', () => {
    const drone = searchCoverrShowcase('drone')
    expect(drone.length).toBeGreaterThan(0)
    expect(drone.some((d) => d.title.toLowerCase().includes('drone') || d.tags.includes('drone'))).toBe(true)

    const city = searchCoverrShowcase('city')
    expect(city.length).toBeGreaterThan(0)

    const nonexistent = searchCoverrShowcase('nonexistentxyz123')
    expect(nonexistent).toEqual([])
  })

  it('uses showcase fallback when searching Coverr without API key', async () => {
    const res = await searchCoverrVideos({
      query: 'drone',
      apiKey: '',
    })

    expect(res.items.length).toBeGreaterThan(0)
    expect(res.items.every((r) => r.source === 'coverr')).toBe(true)
    expect(res.requiresKeyForLive).toBe(true)
  })

  it('fetches live Coverr API results when valid API key is present', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        hits: [
          {
            id: 'mock-coverr-101',
            title: 'Mock Ocean Aerial',
            author: { name: 'AerialPro' },
            thumbnail: 'https://example.com/ocean.jpg',
            urls: { mp4: 'https://example.com/ocean.mp4' },
            duration: 18,
          },
        ],
        total: 1,
      }),
    })

    const res = await searchCoverrVideos({
      query: 'ocean',
      apiKey: 'valid-coverr-token',
    })

    expect(res.items.length).toBe(1)
    expect(res.items[0].id).toBe('coverr-mock-coverr-101')
    expect(res.items[0].title).toBe('Mock Ocean Aerial')
    expect(res.items[0].creator).toBe('Coverr Filmmaker')
    expect(res.requiresKeyForLive).toBe(false)
  })

  it('searches Coverr exclusively through searchVideos when source="coverr"', async () => {
    const res = await searchVideos({
      query: 'drone',
      source: 'coverr',
    })

    expect(res.items.length).toBeGreaterThan(0)
    expect(res.items.every((r) => r.source === 'coverr')).toBe(true)
  })
})

describe('Saved Media (Project Bookmarks) & Batch Attribution', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('toggles saving and removing media items', () => {
    const sampleVideo = {
      id: 'coverr-1',
      title: 'Cinematic Mountain Drone',
      creator: 'DronePilot',
      source: 'coverr',
      source_name: 'Coverr',
      license: 'Coverr License',
      requires_attribution: false,
      landing_url: 'https://coverr.co/videos/sample',
      attribution: '“Cinematic Mountain Drone” by DronePilot, Coverr License',
    }

    expect(isMediaSaved('coverr-1', 'video')).toBe(false)
    expect(getSavedMedia('video')).toEqual([])

    // Save
    const res1 = toggleSaveMedia(sampleVideo, 'video')
    expect(res1.saved).toBe(true)
    expect(res1.count).toBe(1)
    expect(isMediaSaved('coverr-1', 'video')).toBe(true)
    expect(getSavedMedia('video').length).toBe(1)

    // Toggle off (remove)
    const res2 = toggleSaveMedia(sampleVideo, 'video')
    expect(res2.saved).toBe(false)
    expect(res2.count).toBe(0)
    expect(isMediaSaved('coverr-1', 'video')).toBe(false)
  })

  it('isolates saved audio and video collections independently', () => {
    const sampleAudio = {
      id: 'kenney-click',
      title: 'UI Click 1',
      creator: 'Kenney',
      source: 'kenney',
      source_name: 'Kenney SFX',
      license: 'cc0',
      requires_attribution: false,
    }

    const sampleVideo = {
      id: 'pexels-123',
      title: 'Forest Creek',
      creator: 'NatureCam',
      source: 'pexels',
      source_name: 'Pexels',
      license: 'Pexels License',
      requires_attribution: false,
    }

    toggleSaveMedia(sampleAudio, 'audio')
    toggleSaveMedia(sampleVideo, 'video')

    expect(isMediaSaved('kenney-click', 'audio')).toBe(true)
    expect(isMediaSaved('kenney-click', 'video')).toBe(false)
    expect(isMediaSaved('pexels-123', 'video')).toBe(true)
    expect(isMediaSaved('pexels-123', 'audio')).toBe(false)

    expect(getSavedMedia('audio').length).toBe(1)
    expect(getSavedMedia('video').length).toBe(1)

    clearSavedMedia('audio')
    expect(getSavedMedia('audio')).toEqual([])
    expect(getSavedMedia('video').length).toBe(1)

    removeSavedMedia('pexels-123', 'video')
    expect(getSavedMedia('video')).toEqual([])
  })

  it('generates 1-click batch attribution blocks for YouTube/TikTok descriptions', () => {
    const items = [
      {
        id: 'incompetech-1',
        title: 'Sneaky Snitch',
        creator: 'Kevin MacLeod',
        license: 'CC BY 4.0',
        requires_attribution: true,
        attribution: '“Sneaky Snitch” Kevin MacLeod (incompetech.com)\nLicensed under Creative Commons: By Attribution 4.0 License',
      },
      {
        id: 'coverr-2',
        title: 'Sunset Beach Flight',
        creator: 'CoastalVisuals',
        license: 'Coverr License',
        requires_attribution: false,
        landing_url: 'https://coverr.co/videos/beach',
        attribution: '',
      },
    ]

    const text = generateBatchAttribution(items)
    expect(text).toContain('MUSIC & FOOTAGE CREDITS (YouTube / Commercial Safe)')
    expect(text).toContain('1. “Sneaky Snitch” Kevin MacLeod')
    expect(text).toContain('2. “Sunset Beach Flight” by CoastalVisuals')
    expect(text).toContain('Coverr License (No attribution required)')
    expect(text).toContain('Source: https://coverr.co/videos/beach')
    expect(text).toContain('Verified royalty-free & copyright strike safe via CreatorNew')

    // Empty list returns empty string
    expect(generateBatchAttribution([])).toBe('')
  })
})
