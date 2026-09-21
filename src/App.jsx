import { useEffect, useRef, useState } from 'react'
import './App.css'
import { searchAudio } from './services/audio-sources.js'
import { getApiKeys } from './services/api-keys.js'
import { INCOMPETECH_TRACKS } from './data/incompetech.js'
import { KENNEY_TRACKS } from './data/kenney-sfx.js'
import { FREESOUND_SHOWCASE } from './data/freesound-showcase.js'
import SourceSettingsModal from './components/SourceSettingsModal.jsx'
import SavedMediaDrawer from './components/SavedMediaDrawer.jsx'
import {
  getSavedMedia,
  isMediaSaved,
  toggleSaveMedia,
} from './services/saved-media.js'

const PAGE_SIZE = 12

const audioCategories = [
  { id: 'all', label: 'All Audio', query: '' },
  { id: 'bgm', label: '🎵 Background Music', query: 'sneaky' },
  { id: 'ui', label: '🖲️ UI & Buttons', query: 'click' },
  { id: 'whoosh', label: '💨 Whoosh & Transitions', query: 'whoosh' },
  { id: 'nature', label: '🌧️ Rain & Nature', query: 'rain' },
  { id: 'foley', label: '💥 Foley & Impacts', query: 'impact' },
  { id: 'gaming', label: '🎮 Gaming SFX', query: 'laser' },
]

const sourceOptions = [
  { value: 'all', label: 'All Audio Sources' },
  { value: 'incompetech', label: 'Kevin MacLeod (Incompetech)' },
  { value: 'kenney', label: 'Kenney Audio (100% CC0 SFX)' },
  { value: 'freesound', label: 'Freesound.org (700k+ SFX)' },
  { value: 'openverse', label: 'Openverse (Creative Commons)' },
]

const licenseOptions = [
  { value: '', label: 'All licenses' },
  { value: 'cc0,pdm', label: '✓ Free use (CC0 / Public Domain — No Attribution)' },
  { value: 'by', label: 'ℹ️ CC BY — Attribution required' },
  { value: 'by-sa', label: 'CC BY-SA — Share alike' },
  { value: 'by-nc,by-nc-sa', label: 'Noncommercial use' },
]

const suggestions = [
  'Sneaky Snitch',
  'Monkeys Spinning Monkeys',
  'UI Click',
  'Whoosh',
  'Laser SFX',
  'Thunder',
  'Rainforest',
  'Wind chimes',
]

function Icon({ name, size = 20 }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    play: <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none"/>,
    pause: <><path d="M8 5v14M16 5v14"/></>,
    download: <><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14"/></>,
    external: <><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    music: <><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>,
    spark: <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3ZM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    check: <path d="M20 6 9 17l-5-5"/>,
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function formatDuration(milliseconds) {
  if (!milliseconds) return '—'
  const seconds = Math.round(milliseconds / 1000)
  if (seconds < 1) return '<1s'
  const mins = Math.floor(seconds / 60)
  const remainingSecs = seconds % 60
  return `${mins}:${String(remainingSecs).padStart(2, '0')}`
}

function licenseBadgeLabel(item) {
  if (item.source === 'kenney') return 'CC0 1.0'
  if (item.source === 'incompetech') return 'CC BY 4.0'
  if (item.source === 'freesound') return item.license_label || 'CC0'
  const key = (item.license || '').toLowerCase()
  const names = {
    cc0: 'CC0',
    pdm: 'Public Domain',
    by: 'CC BY',
    'by-sa': 'CC BY-SA',
    'by-nc': 'CC BY-NC',
    'by-nc-sa': 'CC BY-NC-SA',
    'by-nd': 'CC BY-ND',
    'by-nc-nd': 'CC BY-NC-ND',
  }
  return `${names[key] || item.license?.toUpperCase() || 'CC'}${item.license_version ? ` ${item.license_version}` : ''}`
}

function safeFilename(item) {
  const clean = (item.title || 'creatornew-audio')
    .replace(/[<>:"/\\|?*]+/g, '')
    .trim()
    .slice(0, 80)
  return `${clean}.${item.filetype || 'mp3'}`
}

function Waveform({ seed = '' }) {
  const bars = Array.from(
    { length: 44 },
    (_, i) => 18 + (((seed.charCodeAt(i % Math.max(seed.length, 1)) || i * 7) * (i + 3)) % 72),
  )
  return (
    <div className="waveform" aria-hidden="true">
      {bars.map((height, i) => (
        <i key={i} style={{ height: `${height}%` }} />
      ))}
    </div>
  )
}

function TrackCard({
  track,
  active,
  onPlay,
  onDownload,
  downloading,
  onCopy,
  copied,
  isSaved,
  onToggleSave,
}) {
  const isCC0 = !track.requires_attribution

  return (
    <article className={`track-card ${active ? 'is-playing' : ''}`}>
      <div className="track-source-bar">
        <span className={`audio-source-pill source-${track.source}`}>{track.source_name}</span>
        <span className={`audio-attr-pill ${isCC0 ? 'is-free' : 'is-req'}`}>
          {isCC0 ? '✓ No credit needed' : 'ℹ️ Credit required'}
        </span>
        <button
          type="button"
          className={`track-bookmark-btn ${isSaved ? 'is-bookmarked' : ''}`}
          onClick={() => onToggleSave(track)}
          title={isSaved ? 'Remove from saved project media' : 'Save to project media'}
          aria-label={isSaved ? 'Remove from saved' : 'Save audio'}
        >
          {isSaved ? '♥' : '♡'}
        </button>
      </div>

      <div className="track-top">
        <button
          className="play-button"
          onClick={() => onPlay(track)}
          aria-label={active ? 'Pause' : `Play ${track.title}`}
        >
          <Icon name={active ? 'pause' : 'play'} size={18} />
        </button>
        <div className="track-heading">
          <h3 title={track.title}>{track.title || 'Untitled audio'}</h3>
          <p>{track.creator || 'Unknown creator'}</p>
        </div>
        <a
          className="source-link"
          href={track.foreign_landing_url || track.url}
          target="_blank"
          rel="noreferrer"
          aria-label="Open source page"
        >
          <Icon name="external" size={17} />
        </a>
      </div>

      <button
        className="wave-button"
        onClick={() => onPlay(track)}
        aria-label={active ? 'Pause audio' : 'Preview audio'}
      >
        <Waveform seed={track.id} />
        <span>{formatDuration(track.duration)}</span>
      </button>

      <div className="track-meta">
        <a
          className="license"
          href={track.license_url || 'https://creativecommons.org/'}
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="shield" size={14} />
          {licenseBadgeLabel(track)}
        </a>
        <span>{track.filetype?.toUpperCase() || 'AUDIO'}</span>
        {track.bit_rate && <span>{Math.round(track.bit_rate / 1000)} kbps</span>}
      </div>

      <div className="track-actions">
        <button
          className={`attribution ${copied ? 'is-copied' : ''}`}
          onClick={() => onCopy(track)}
          title="Copy attribution snippet"
        >
          <Icon name={copied ? 'check' : 'copy'} size={16} />
          {copied ? '✓ Copied' : 'Copy attribution'}
        </button>
        <button
          className="download-button"
          onClick={() => onDownload(track)}
          disabled={downloading}
        >
          <Icon name="download" size={17} />
          {downloading ? 'Downloading...' : 'Download'}
        </button>
      </div>
    </article>
  )
}

export default function App() {
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('all')
  const [license, setLicense] = useState('')
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [resultCount, setResultCount] = useState(0)
  const [popularTracks, setPopularTracks] = useState([])
  const [popularLoading, setPopularLoading] = useState(true)
  const [activeId, setActiveId] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [apiKeys, setApiKeys] = useState(getApiKeys())
  const [sourceNotice, setSourceNotice] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [savedCount, setSavedCount] = useState(() => getSavedMedia('audio').length)
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false)
  const audioRef = useRef(new Audio())

  useEffect(() => {
    setApiKeys(getApiKeys())
  }, [])

  // Preload popular creator showcase (Kevin MacLeod + Kenney SFX + Freesound showcase)
  useEffect(() => {
    const showcase = [
      INCOMPETECH_TRACKS[0], // Sneaky Snitch
      INCOMPETECH_TRACKS[1], // Monkeys Spinning Monkeys
      FREESOUND_SHOWCASE[0], // Deep Cinematic Whoosh
      KENNEY_TRACKS[0], // UI Click
      FREESOUND_SHOWCASE[1], // Thunder
      KENNEY_TRACKS[15], // Digital Power Up 1
    ].filter(Boolean)

    setPopularTracks(showcase)
    setPopularLoading(false)

    const audio = audioRef.current
    return () => {
      audio.pause()
    }
  }, [])

  async function search(term = query, nextPage = 1) {
    const q = term.trim()
    if (!q) return
    setLoading(true)
    setError('')
    setSearched(true)
    setActiveId(null)
    setSourceNotice('')
    audioRef.current.pause()

    try {
      const res = await searchAudio({
        query: q,
        source,
        license,
        page: nextPage,
        pageSize: PAGE_SIZE,
        apiKeys,
      })

      if (res.requiresKeyForLive) {
        setSourceNotice(`Showing curated showcase for Freesound. To unlock live search across 700k+ sounds, add your free API key in Settings.`)
      }

      setTracks(res.results)
      setPage(res.page)
      setPageCount(res.page_count)
      setResultCount(res.result_count)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    search(query, 1)
  }

  function playTrack(track) {
    const audio = audioRef.current
    if (activeId === track.id && !audio.paused) {
      audio.pause()
      setActiveId(null)
      return
    }
    audio.src = track.url
    audio
      .play()
      .then(() => setActiveId(track.id))
      .catch(() => window.open(track.foreign_landing_url || track.url, '_blank'))
    audio.onended = () => setActiveId(null)
  }

  async function downloadTrack(track) {
    setDownloadingId(track.id)
    try {
      const response = await fetch(track.url)
      if (!response.ok) throw new Error()
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = safeFilename(track)
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch {
      window.open(track.url, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloadingId(null)
    }
  }

  async function copyAttribution(track) {
    const text =
      track.attribution ||
      `“${track.title}” — ${track.creator || 'Unknown creator'}, ${licenseBadgeLabel(track)}`
    await navigator.clipboard?.writeText(text)
    setCopiedId(track.id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const pickSuggestion = (term) => {
    setQuery(term)
    search(term, 1)
  }

  function handleCategoryClick(cat) {
    setActiveCategory(cat.id)
    if (cat.query) {
      setQuery(cat.query)
      search(cat.query, 1)
    } else {
      pickSuggestion('comedy')
    }
  }

  function handleToggleSave(track) {
    const res = toggleSaveMedia(track, 'audio')
    setSavedCount(res.count)
  }

  return (
    <div className="app-shell">
      <header className="nav">
        <a className="brand" href="/" aria-label="CreatorNew home">
          <picture>
            <source srcSet="/creatornew-logo.webp" type="image/webp" />
            <img
              className="creatornew-audio-logo"
              src="/creatornew-logo.png"
              alt="CreatorNew"
              width="2075"
              height="758"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
        </a>
        <div className="nav-note">
          <span></span> Open audio library
        </div>

        <button
          type="button"
          className="audio-nav-saved"
          onClick={() => setIsSavedDrawerOpen(true)}
        >
          ♥ Saved {savedCount > 0 && <span className="nav-saved-badge">{savedCount}</span>}
        </button>

        <button
          type="button"
          className="audio-nav-config"
          onClick={() => setIsSettingsOpen(true)}
        >
          ⚙️ Sources &amp; API Keys
        </button>
        <a
          className="about-link"
          href="https://creativecommons.org/share-your-work/cclicenses/"
          target="_blank"
          rel="noreferrer"
        >
          About CC licenses <Icon name="external" size={15} />
        </a>
      </header>

      <main>
        <section className="hero-section">
          <div className="ambient ambient-one"></div>
          <div className="ambient ambient-two"></div>
          <div className="eyebrow">
            <Icon name="spark" size={17} /> Free sound effects &amp; music for creators
          </div>
          <h1>
            Free sound effects.
            <br />
            <em>Music for every project.</em>
          </h1>
          <p className="hero-copy">
            Search Kevin MacLeod iconic YouTube BGM (CC-BY), Kenney Audio SFX (100% CC0), Freesound, and Openverse.
            <br />
            Preview audio, verify monetization rights, and copy ready-to-paste attribution in seconds.
          </p>

          <form className="search-panel" onSubmit={handleSubmit}>
            <div className="search-field">
              <Icon name="search" size={22} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sneaky snitch, monkeys spinning, ui click, whoosh, thunder..."
                autoFocus
              />
              <button
                type="button"
                className={`clear ${query ? 'visible' : ''}`}
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <Icon name="close" size={17} />
              </button>
            </div>

            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              aria-label="Filter by audio source"
              className="audio-source-select"
            >
              {sourceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              aria-label="Filter by license"
              className="audio-license-select"
            >
              {licenseOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              className="search-button"
              type="submit"
              disabled={!query.trim() || loading}
            >
              {loading ? <span className="spinner" /> : <Icon name="search" size={19} />} Search
            </button>
          </form>

          {/* Quick Category Pills */}
          <div className="audio-category-pills">
            {audioCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`cat-pill ${activeCategory === cat.id ? 'is-active' : ''}`}
                onClick={() => handleCategoryClick(cat)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="suggestions">
            <span>Popular:</span>
            {suggestions.map((item) => (
              <button key={item} onClick={() => pickSuggestion(item)}>
                {item}
              </button>
            ))}
          </div>

          <div className="trust-row">
            <span>
              <b>✓</b> Kenney Audio (100% CC0 SFX)
            </span>
            <span>
              <b>✓</b> Kevin MacLeod (CC-BY 4.0 BGM)
            </span>
            <span>
              <b>✓</b> Freesound.org CC0 Integration
            </span>
            <span>
              <b>✓</b> Project Bookmarks &amp; Batch Credits
            </span>
          </div>
        </section>

        {!searched && (
          <section className="popular-section" aria-labelledby="popular-audio-title">
            <div className="popular-heading">
              <div>
                <p>FEATURED CREATOR TRACKS &amp; SFX</p>
                <h2 id="popular-audio-title">Iconic BGM, UI &amp; Cinematic SFX</h2>
              </div>
              <button onClick={() => pickSuggestion('comedy')}>View more music</button>
            </div>
            {popularLoading && (
              <div className="card-grid">
                {Array.from({ length: 3 }, (_, i) => (
                  <div className="track-card skeleton" key={i}>
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                ))}
              </div>
            )}
            {!popularLoading && popularTracks.length > 0 && (
              <div className="card-grid">
                {popularTracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    active={activeId === track.id}
                    onPlay={playTrack}
                    onDownload={downloadTrack}
                    downloading={downloadingId === track.id}
                    onCopy={copyAttribution}
                    copied={copiedId === track.id}
                    isSaved={isMediaSaved(track.id, 'audio')}
                    onToggleSave={handleToggleSave}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {!searched && (
          <section className="how-it-works">
            <div>
              <span>01</span>
              <Icon name="search" />
              <h3>Search verified libraries</h3>
              <p>Find iconic YouTube background music, UI sound effects, and Freesound audio.</p>
            </div>
            <div>
              <span>02</span>
              <Icon name="play" />
              <h3>Preview and filter licenses</h3>
              <p>Filter between 100% CC0 (no attribution) and CC-BY (attribution required).</p>
            </div>
            <div>
              <span>03</span>
              <Icon name="download" />
              <h3>Download &amp; 1-click attribute</h3>
              <p>Copy formatted attribution to paste directly into your YouTube description.</p>
            </div>
          </section>
        )}

        {searched && (
          <section className="results-section">
            <div className="results-head">
              <div>
                <p>SEARCH RESULTS</p>
                <h2>
                  {loading ? (
                    'Searching the audio library...'
                  ) : (
                    <>{resultCount.toLocaleString('en-US')} audio results for “{query}”</>
                  )}
                </h2>
              </div>
              <span>
                Sources: Incompetech, Kenney Audio, Freesound &amp; Openverse
              </span>
            </div>

            {sourceNotice && (
              <div className="showcase-notice-banner audio-notice">
                <span>ℹ️ {sourceNotice}</span>
                <button type="button" onClick={() => setIsSettingsOpen(true)}>
                  Open Settings ⚙️
                </button>
              </div>
            )}

            {error && (
              <div className="message error">
                <Icon name="shield" />
                <div>
                  <b>Unable to load results</b>
                  <p>{error}</p>
                </div>
                <button onClick={() => search(query, page)}>Try again</button>
              </div>
            )}

            {loading && (
              <div className="card-grid">
                {Array.from({ length: 6 }, (_, i) => (
                  <div className="track-card skeleton" key={i}>
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && tracks.length > 0 && (
              <div className="card-grid">
                {tracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    active={activeId === track.id}
                    onPlay={playTrack}
                    onDownload={downloadTrack}
                    downloading={downloadingId === track.id}
                    onCopy={copyAttribution}
                    copied={copiedId === track.id}
                    isSaved={isMediaSaved(track.id, 'audio')}
                    onToggleSave={handleToggleSave}
                  />
                ))}
              </div>
            )}

            {!loading && !error && tracks.length === 0 && (
              <div className="empty">
                <span>
                  <Icon name="music" size={28} />
                </span>
                <h3>No matching audio found</h3>
                <p>Try a broader keyword or switch to &quot;All Sources&quot;.</p>
              </div>
            )}

            {!loading && pageCount > 1 && (
              <div className="pagination">
                <button disabled={page <= 1} onClick={() => search(query, page - 1)}>
                  ← Previous
                </button>
                <span>
                  Page {page} / {Math.min(pageCount, Math.ceil(10000 / PAGE_SIZE))}
                </span>
                <button disabled={page >= pageCount} onClick={() => search(query, page + 1)}>
                  Next page →
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      <footer>
        <a className="brand small" href="/" aria-label="CreatorNew home">
          <picture>
            <source srcSet="/creatornew-logo.webp" type="image/webp" />
            <img
              className="creatornew-audio-logo"
              src="/creatornew-logo.png"
              alt="CreatorNew"
              width="2075"
              height="758"
              loading="lazy"
              decoding="async"
            />
          </picture>
        </a>
        <p>
          Audio tracks belong to their respective creators. Incompetech music is licensed under CC-BY 4.0; Kenney Audio is CC0; Freesound clips are filtered for CC0/CC. Always verify licenses before commercial broadcasting.
        </p>
      </footer>

      <SourceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        defaultTab="audio"
        onKeysUpdated={(newKeys) => setApiKeys(newKeys)}
      />

      <SavedMediaDrawer
        isOpen={isSavedDrawerOpen}
        onClose={() => setIsSavedDrawerOpen(false)}
        type="audio"
        onPlay={playTrack}
        activeId={activeId}
        onItemChange={(count) => setSavedCount(count)}
      />
    </div>
  )
}
