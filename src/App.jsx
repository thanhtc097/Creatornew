import { useEffect, useRef, useState } from 'react'
import './App.css'

const API = 'https://api.openverse.org/v1/audio/'
const PAGE_SIZE = 12

const licenseOptions = [
  { value: '', label: 'All licenses' },
  { value: 'cc0,pdm', label: 'Free use (CC0 / Public Domain)' },
  { value: 'by', label: 'CC BY — attribution required' },
  { value: 'by-sa', label: 'CC BY-SA — share alike' },
  { value: 'by-nc,by-nc-sa', label: 'Noncommercial use' },
]

const suggestions = ['Rain sounds', 'Relaxing piano', 'Nature sounds', 'Whoosh', 'Podcast intro']

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
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function formatDuration(milliseconds) {
  if (!milliseconds) return '—'
  const seconds = Math.round(milliseconds / 1000)
  const mins = Math.floor(seconds / 60)
  return `${mins}:${String(seconds % 60).padStart(2, '0')}`
}

function licenseName(item) {
  const key = item.license?.toLowerCase()
  const names = { cc0: 'CC0', pdm: 'Public Domain', by: 'CC BY', 'by-sa': 'CC BY-SA', 'by-nc': 'CC BY-NC', 'by-nc-sa': 'CC BY-NC-SA', 'by-nd': 'CC BY-ND', 'by-nc-nd': 'CC BY-NC-ND' }
  return `${names[key] || item.license?.toUpperCase() || 'CC'}${item.license_version ? ` ${item.license_version}` : ''}`
}

function safeFilename(item) {
  const clean = (item.title || 'creative-commons-audio').replace(/[<>:"/\\|?*]+/g, '').trim().slice(0, 80)
  return `${clean}.${item.filetype || 'mp3'}`
}

function Waveform({ seed = '' }) {
  const bars = Array.from({ length: 44 }, (_, i) => 18 + ((seed.charCodeAt(i % Math.max(seed.length, 1)) || i * 7) * (i + 3)) % 72)
  return <div className="waveform" aria-hidden="true">{bars.map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}</div>
}

function TrackCard({ track, active, onPlay, onDownload, downloading }) {
  const attribution = track.attribution || `“${track.title}” — ${track.creator || 'Unknown creator'}, ${licenseName(track)}`
  const copyAttribution = async () => {
    await navigator.clipboard?.writeText(attribution)
  }

  return (
    <article className={`track-card ${active ? 'is-playing' : ''}`}>
      <div className="track-top">
        <button className="play-button" onClick={() => onPlay(track)} aria-label={active ? 'Pause' : `Play ${track.title}`}><Icon name={active ? 'pause' : 'play'} size={18}/></button>
        <div className="track-heading">
          <h3 title={track.title}>{track.title || 'Untitled audio'}</h3>
          <p>{track.creator || 'Unknown creator'}</p>
        </div>
        <a className="source-link" href={track.foreign_landing_url || track.url} target="_blank" rel="noreferrer" aria-label="Open source page"><Icon name="external" size={17}/></a>
      </div>
      <button className="wave-button" onClick={() => onPlay(track)} aria-label={active ? 'Pause audio' : 'Preview audio'}>
        <Waveform seed={track.id}/>
        <span>{formatDuration(track.duration)}</span>
      </button>
      <div className="track-meta">
        <a className="license" href={track.license_url || '#'} target="_blank" rel="noreferrer"><Icon name="shield" size={14}/>{licenseName(track)}</a>
        <span>{track.filetype?.toUpperCase() || 'AUDIO'}</span>
        {track.bit_rate && <span>{Math.round(track.bit_rate / 1000)} kbps</span>}
      </div>
      <div className="track-actions">
        <button className="attribution" onClick={copyAttribution} title="Copy attribution"><Icon name="copy" size={16}/> Copy attribution</button>
        <button className="download-button" onClick={() => onDownload(track)} disabled={downloading}>
          <Icon name="download" size={17}/>{downloading ? 'Downloading...' : 'Download'}
        </button>
      </div>
    </article>
  )
}

function App() {
  const [query, setQuery] = useState('')
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
  const audioRef = useRef(new Audio())

  useEffect(() => {
    const controller = new AbortController()
    const audio = audioRef.current
    const params = new URLSearchParams({ q: 'background music', page_size: '6', license: 'cc0,pdm,by,by-sa' })
    fetch(`${API}?${params}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setPopularTracks((data.results || []).filter((item) => item.url && !item.mature).slice(0, 6)))
      .catch(() => {})
      .finally(() => setPopularLoading(false))
    return () => { controller.abort(); audio.pause() }
  }, [])

  async function search(term = query, nextPage = 1) {
    if (!term.trim()) return
    setLoading(true); setError(''); setSearched(true); setActiveId(null)
    audioRef.current.pause()
    try {
      const params = new URLSearchParams({ q: term.trim(), page: nextPage, page_size: PAGE_SIZE })
      if (license) params.set('license', license)
      const response = await fetch(`${API}?${params}`)
      if (!response.ok) throw new Error(response.status === 429 ? 'Too many searches. Please try again in a minute.' : 'Unable to connect to the audio library.')
      const data = await response.json()
      setTracks((data.results || []).filter((item) => item.url && !item.mature))
      setPage(data.page || nextPage); setPageCount(data.page_count || 1); setResultCount(data.result_count || 0)
    } catch (err) { setError(err.message || 'Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  function handleSubmit(event) { event.preventDefault(); search(query, 1) }

  function playTrack(track) {
    const audio = audioRef.current
    if (activeId === track.id && !audio.paused) { audio.pause(); setActiveId(null); return }
    audio.src = track.url; audio.play().then(() => setActiveId(track.id)).catch(() => window.open(track.foreign_landing_url || track.url, '_blank'))
    audio.onended = () => setActiveId(null)
  }

  async function downloadTrack(track) {
    setDownloadingId(track.id)
    try {
      const response = await fetch(track.url)
      if (!response.ok) throw new Error()
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = safeFilename(track); document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url)
    } catch { window.open(track.url, '_blank', 'noopener,noreferrer') }
    finally { setDownloadingId(null) }
  }

  const pickSuggestion = (term) => { setQuery(term); search(term, 1) }

  return (
    <div className="app-shell">
      <header className="nav">
        <a className="brand" href="/" aria-label="CreatorNew home"><picture><source srcSet="/creatornew-logo.webp" type="image/webp"/><img className="creatornew-audio-logo" src="/creatornew-logo.png" alt="CreatorNew" width="2075" height="758" fetchPriority="high" decoding="async"/></picture></a>
        <div className="nav-note"><span></span> Open audio library</div>
        <a className="about-link" href="https://creativecommons.org/share-your-work/cclicenses/" target="_blank" rel="noreferrer">About CC licenses <Icon name="external" size={15}/></a>
      </header>

      <main>
        <section className="hero-section">
          <div className="ambient ambient-one"></div><div className="ambient ambient-two"></div>
          <div className="eyebrow"><Icon name="spark" size={17}/> Free sounds for creators</div>
          <h1>Free sound effects.<br/><em>Music for every project.</em></h1>
          <p className="hero-copy">Explore Creative Commons music and sound effects for your next project.<br/>Preview audio, check the license and download in seconds.</p>
          <form className="search-panel" onSubmit={handleSubmit}>
            <div className="search-field"><Icon name="search" size={22}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search rain, piano, whoosh, podcast intro..." autoFocus/><button type="button" className={`clear ${query ? 'visible' : ''}`} onClick={() => setQuery('')} aria-label="Clear search"><Icon name="close" size={17}/></button></div>
            <select value={license} onChange={(e) => setLicense(e.target.value)} aria-label="Filter by license">{licenseOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            <button className="search-button" type="submit" disabled={!query.trim() || loading}>{loading ? <span className="spinner"/> : <Icon name="search" size={19}/>} Search</button>
          </form>
          <div className="suggestions"><span>Try:</span>{suggestions.map((item) => <button key={item} onClick={() => pickSuggestion(item)}>{item}</button>)}</div>
          <div className="trust-row"><span><b>✓</b> Verified open sources</span><span><b>✓</b> Clear license details</span><span><b>✓</b> No registration</span></div>
        </section>

        {!searched && <section className="popular-section" aria-labelledby="popular-audio-title">
          <div className="popular-heading"><div><p>POPULAR AUDIO</p><h2 id="popular-audio-title">Popular music for creator projects</h2></div><button onClick={() => pickSuggestion('background music')}>View all results</button></div>
          {popularLoading && <div className="card-grid">{Array.from({ length: 3 }, (_, i) => <div className="track-card skeleton" key={i}><i/><i/><i/><i/></div>)}</div>}
          {!popularLoading && popularTracks.length > 0 && <div className="card-grid">{popularTracks.map((track) => <TrackCard key={track.id} track={track} active={activeId === track.id} onPlay={playTrack} onDownload={downloadTrack} downloading={downloadingId === track.id}/>)}</div>}
        </section>}

        {!searched && <section className="how-it-works"><div><span>01</span><Icon name="search"/><h3>Search</h3><p>Enter the music or sound effect you need.</p></div><div><span>02</span><Icon name="play"/><h3>Preview and choose</h3><p>Preview tracks and filter by usage rights.</p></div><div><span>03</span><Icon name="download"/><h3>Download and attribute</h3><p>Download the original and copy attribution details.</p></div></section>}

        {searched && <section className="results-section">
          <div className="results-head"><div><p>SEARCH RESULTS</p><h2>{loading ? 'Searching the audio library...' : <>{resultCount.toLocaleString('en-US')} audio results for “{query}”</>}</h2></div><span>Data source: <a href="https://openverse.org" target="_blank" rel="noreferrer">Openverse</a></span></div>
          {error && <div className="message error"><Icon name="shield"/> <div><b>Unable to load results</b><p>{error}</p></div><button onClick={() => search(query, page)}>Try again</button></div>}
          {loading && <div className="card-grid">{Array.from({ length: 6 }, (_, i) => <div className="track-card skeleton" key={i}><i/><i/><i/><i/></div>)}</div>}
          {!loading && !error && tracks.length > 0 && <div className="card-grid">{tracks.map((track) => <TrackCard key={track.id} track={track} active={activeId === track.id} onPlay={playTrack} onDownload={downloadTrack} downloading={downloadingId === track.id}/>)}</div>}
          {!loading && !error && tracks.length === 0 && <div className="empty"><span><Icon name="music" size={28}/></span><h3>No matching audio found</h3><p>Try a broader keyword or another license.</p></div>}
          {!loading && pageCount > 1 && <div className="pagination"><button disabled={page <= 1} onClick={() => search(query, page - 1)}>← Previous</button><span>Page {page} / {Math.min(pageCount, Math.ceil(10000 / PAGE_SIZE))}</span><button disabled={page >= pageCount} onClick={() => search(query, page + 1)}>Next page →</button></div>}
        </section>}
      </main>
      <footer><a className="brand small" href="/" aria-label="CreatorNew home"><picture><source srcSet="/creatornew-logo.webp" type="image/webp"/><img className="creatornew-audio-logo" src="/creatornew-logo.png" alt="CreatorNew" width="2075" height="758" loading="lazy" decoding="async"/></picture></a><p>Audio belongs to its respective creators. Always verify the source license before publishing.</p></footer>
    </div>
  )
}

export default App
