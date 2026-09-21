import { useState, useEffect } from 'react'
import './VideoApp.css'
import { searchVideos, fetchNasaVideoStream } from './services/video-sources.js'
import { getApiKeys } from './services/api-keys.js'
import { getSavedMedia, isMediaSaved, toggleSaveMedia } from './services/saved-media.js'
import SourceSettingsModal from './components/SourceSettingsModal.jsx'
import SavedMediaDrawer from './components/SavedMediaDrawer.jsx'

const PAGE_SIZE = 12

const categories = [
  { id: 'all', label: 'All Categories', query: '' },
  { id: 'aerial', label: '🚁 Drone & Aerial', query: 'aerial drone' },
  { id: 'nature', label: '🌲 Nature & Waterfalls', query: 'nature landscape' },
  { id: 'space', label: '🚀 Space & Astronomy', query: 'space galaxy' },
  { id: 'city', label: '🏙️ City & Architecture', query: 'city urban' },
  { id: 'tech', label: '⚡ Cyber & Tech', query: 'cyberpunk neon' },
  { id: 'animals', label: '🦁 Wildlife', query: 'wildlife animals' },
]

const suggestions = ['waterfall', 'beach drone', 'space station', 'city timelapse', 'forest sunlight', 'clouds', 'fire', 'mars']

const sourceOptions = [
  { value: 'all', label: 'All Video Sources' },
  { value: 'pexels', label: 'Pexels Video (Free Commercial)' },
  { value: 'pixabay', label: 'Pixabay Video (Free Commercial)' },
  { value: 'coverr', label: 'Coverr (Cinematic & Aerial)' },
  { value: 'nasa', label: 'NASA Video (100% Public Domain)' },
  { value: 'wikimedia', label: 'Wikimedia Commons (CC)' },
]

const licenseFilters = [
  { value: 'all', label: 'All Free Licenses' },
  { value: 'no-attribution', label: '✓ No Attribution Required (Public Domain / CC0 / Pexels)' },
  { value: 'attribution', label: 'ℹ️ Attribution Required (CC BY)' },
  { value: 'commercial', label: 'Commercial Use Allowed' },
]

function VideoCard({ item, onPreview, onCopy, copied, isSaved, onToggleSave }) {
  const isNoAttr = !item.requires_attribution
  return (
    <article className="video-card">
      <button
        className="video-thumb"
        onClick={() => onPreview(item)}
        aria-label={`Preview ${item.title}`}
      >
        {item.thumb ? (
          <img src={item.thumb} alt={item.title} loading="lazy" />
        ) : (
          <div className="thumb-placeholder">VIDEO</div>
        )}
        <i aria-hidden="true">▶</i>
        <span className={`source-badge source-${item.source}`}>{item.source_name}</span>
        <button
          type="button"
          className={`bookmark-btn ${isSaved ? 'is-bookmarked' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleSave(item)
          }}
          title={isSaved ? 'Remove from project collection' : 'Save to project collection'}
          aria-label={isSaved ? 'Remove from saved' : 'Save video'}
        >
          {isSaved ? '♥' : '♡'}
        </button>
      </button>
      <div className="video-body">
        <div className="video-tags">
          <span className={`license-tag ${isNoAttr ? 'license-free' : 'license-attr'}`}>
            {item.license}
          </span>
          <span className="filetype-tag">{item.filetype || 'VIDEO'}</span>
          <span className={`attr-notice ${isNoAttr ? 'attr-none' : 'attr-req'}`}>
            {isNoAttr ? '✓ No credit needed' : 'Credit required'}
          </span>
        </div>
        <h3 title={item.title}>{item.title}</h3>
        <p title={item.creator}>{item.creator}</p>
        <div className="video-actions">
          <button
            className={`copy-btn ${copied ? 'is-copied' : ''}`}
            onClick={() => onCopy(item)}
            title="Copy ready-to-use attribution"
          >
            {copied ? '✓ Copied' : 'Copy attribution'}
          </button>
          <a
            className="source-link"
            href={item.landing_url}
            target="_blank"
            rel="noreferrer"
          >
            View source ↗
          </a>
        </div>
      </div>
    </article>
  )
}

export default function VideoApp() {
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('all')
  const [filter, setFilter] = useState('all')
  const [activeCategory, setActiveCategory] = useState('all')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [page, setPage] = useState(1)
  const [continueToken, setContinueToken] = useState(null)
  const [preview, setPreview] = useState(null)
  const [previewStreamUrl, setPreviewStreamUrl] = useState(null)
  const [resolvingStream, setResolvingStream] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false)
  const [apiKeys, setApiKeys] = useState(getApiKeys())
  const [sourceNotice, setSourceNotice] = useState('')
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    setApiKeys(getApiKeys())
    setSavedCount(getSavedMedia('video').length)
  }, [])

  async function search(term = query, append = false, newPage = 1) {
    const q = term.trim()
    if (!q) return
    setLoading(true)
    setError('')
    setSearched(true)
    setSourceNotice('')

    try {
      const res = await searchVideos({
        query: q,
        source,
        licenseFilter: filter,
        page: newPage,
        pageSize: PAGE_SIZE,
        continueToken: append ? continueToken : null,
        apiKeys,
      })

      if (res.requiresKeyForLive) {
        setSourceNotice(`Showing curated showcase for ${source.toUpperCase()}. To unlock live search across millions of clips, add your free API key in Settings.`)
      }

      setItems((current) => (append ? [...current, ...res.items] : res.items))
      setContinueToken(res.continueToken || null)
      setPage(newPage)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function submit(event) {
    event.preventDefault()
    search(query, false, 1)
  }

  function choose(term) {
    setQuery(term)
    search(term, false, 1)
  }

  function handleCategoryClick(cat) {
    setActiveCategory(cat.id)
    if (cat.query) {
      setQuery(cat.query)
      search(cat.query, false, 1)
    } else {
      choose('waterfall')
    }
  }

  async function copy(item) {
    await navigator.clipboard.writeText(item.attribution)
    setCopiedId(item.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleToggleSave(item) {
    const res = toggleSaveMedia(item, 'video')
    setSavedCount(res.count)
  }

  async function handlePreview(item) {
    setPreview(item)
    setPreviewStreamUrl(item.videoUrl || null)

    if (item.source === 'nasa' && item.collectionUrl && !item.videoUrl) {
      setResolvingStream(true)
      const stream = await fetchNasaVideoStream(item.collectionUrl)
      setPreviewStreamUrl(stream)
      setResolvingStream(false)
    }
  }

  function closePreview() {
    setPreview(null)
    setPreviewStreamUrl(null)
    setResolvingStream(false)
  }

  return (
    <div className="video-app">
      <header className="video-nav">
        <a href="/" aria-label="CreatorNew home">
          <picture>
            <source srcSet="/creatornew-logo.webp" type="image/webp" />
            <img
              src="/creatornew-logo.png"
              alt="CreatorNew"
              width="2075"
              height="758"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
        </a>
        <span>
          <b></b> Open video library
        </span>

        <button
          type="button"
          className="video-nav-saved"
          onClick={() => setIsSavedDrawerOpen(true)}
        >
          ♥ Saved {savedCount > 0 && <span className="nav-saved-badge">{savedCount}</span>}
        </button>

        <button
          type="button"
          className="video-nav-config"
          onClick={() => setIsSettingsOpen(true)}
        >
          ⚙️ Sources &amp; API Keys
        </button>

        <a
          href="https://creativecommons.org/share-your-work/cclicenses/"
          target="_blank"
          rel="noreferrer"
        >
          About Licenses ↗
        </a>
      </header>

      <main>
        <section className="video-hero">
          <div className="video-eyebrow">PEXELS, PIXABAY, COVERR, NASA &amp; WIKIMEDIA VIDEO SEARCH</div>
          <h1>
            Free stock videos.
            <br />
            <em>Footage for every creator project.</em>
          </h1>
          <p>
            Search 100% commercial-safe stock videos from Pexels, Pixabay, Coverr, NASA Public Domain &amp; Wikimedia.
            <br />
            Collect clips for your edit and export all YouTube description credits in 1 click.
          </p>

          <form onSubmit={submit} className="video-search">
            <label>
              <span aria-hidden="true">⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search waterfall, beach drone, city timelapse, clouds, space, forest..."
                autoFocus
              />
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              aria-label="Filter by video source"
              className="video-select-source"
            >
              {sourceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter usage rights"
              className="video-select-license"
            >
              {licenseFilters.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button disabled={!query.trim() || loading}>
              {loading ? 'Searching...' : 'Search videos'}
            </button>
          </form>

          {/* Quick Category Pills */}
          <div className="video-category-pills">
            {categories.map((cat) => (
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

          <div className="video-suggestions">
            <span>Popular:</span>
            {suggestions.map((term) => (
              <button key={term} onClick={() => choose(term)}>
                {term}
              </button>
            ))}
          </div>

          <div className="video-trust">
            <span>✓ Pexels, Pixabay &amp; Coverr Commercial Free</span>
            <span>✓ NASA 100% Public Domain</span>
            <span>✓ Project Bookmark &amp; Batch Credits</span>
            <span>✓ 5 Active Sources Free</span>
          </div>
        </section>

        {!searched && (
          <section className="video-steps">
            <article>
              <i>01</i>
              <b>⌕</b>
              <h2>Multi-source search</h2>
              <p>Search Pexels, Pixabay, Coverr, NASA, and Wikimedia Commons footage in one place.</p>
            </article>
            <article>
              <i>02</i>
              <b>♥</b>
              <h2>Bookmark project clips</h2>
              <p>Click the heart on clips you like to build your video editing collection.</p>
            </article>
            <article>
              <i>03</i>
              <b>📋</b>
              <h2>1-click batch credits</h2>
              <p>Export all YouTube credits for your entire video project in a single click.</p>
            </article>
          </section>
        )}

        {searched && (
          <section className="video-results">
            <div className="video-results-head">
              <div>
                <small>SEARCH RESULTS</small>
                <h2>
                  {loading && !items.length
                    ? 'Searching video libraries...'
                    : `${items.length} videos for “${query}”`}
                </h2>
              </div>
              <div className="source-indicators">
                <span>Sources: Pexels, Pixabay, Coverr, NASA Video &amp; Wikimedia Commons</span>
              </div>
            </div>

            {sourceNotice && (
              <div className="showcase-notice-banner">
                <span>ℹ️ {sourceNotice}</span>
                <button type="button" onClick={() => setIsSettingsOpen(true)}>
                  Open Settings ⚙️
                </button>
              </div>
            )}

            {error && (
              <div className="video-message">
                <b>Unable to load results.</b> {error}{' '}
                <button onClick={() => search(query, false, 1)}>Try again</button>
              </div>
            )}
            {!loading && !error && !items.length && (
              <div className="video-empty">
                <b>No matching videos found</b>
                <p>Try searching in English (e.g. &quot;waterfall&quot;, &quot;ocean&quot;, &quot;clouds&quot;) or changing the license filter.</p>
              </div>
            )}
            <div className="video-grid">
              {items.map((item) => (
                <VideoCard
                  key={item.id}
                  item={item}
                  onPreview={handlePreview}
                  onCopy={copy}
                  copied={copiedId === item.id}
                  isSaved={isMediaSaved(item.id, 'video')}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>
            {continueToken && (
              <button
                className="load-more"
                disabled={loading}
                onClick={() => search(query, true, page + 1)}
              >
                {loading ? 'Loading...' : 'Load more videos'}
              </button>
            )}
          </section>
        )}
      </main>

      <footer className="video-footer">
        <picture>
          <source srcSet="/creatornew-logo.webp" type="image/webp" />
          <img
            src="/creatornew-logo.png"
            alt="CreatorNew"
            width="2075"
            height="758"
            loading="lazy"
            decoding="async"
          />
        </picture>
        <p>
          Video footage belongs to their respective creators. Pexels, Pixabay and Coverr licenses permit commercial use. NASA imagery is US Public Domain. Always verify licenses before publishing.
        </p>
      </footer>

      {preview && (
        <div
          className="preview-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Video preview"
          onMouseDown={(e) => e.target === e.currentTarget && closePreview()}
        >
          <div className="preview-modal">
            <button className="preview-close" onClick={closePreview} aria-label="Close">
              ×
            </button>
            <div className="preview-player-wrap">
              {resolvingStream && (
                <div className="preview-resolving">
                  <span>Loading stream from source...</span>
                </div>
              )}
              {previewStreamUrl ? (
                <video src={previewStreamUrl} poster={preview.thumb} controls autoPlay />
              ) : !resolvingStream ? (
                <div className="preview-fallback">
                  <p>Stream preview not directly embeddable.</p>
                  <a
                    href={preview.landing_url}
                    target="_blank"
                    rel="noreferrer"
                    className="preview-direct-btn"
                  >
                    Open video on {preview.source_name} ↗
                  </a>
                </div>
              ) : null}
            </div>
            <div className="preview-info">
              <div className="preview-badge-row">
                <span className={`source-badge-inline source-${preview.source}`}>{preview.source_name}</span>
                <span className="license-tag">{preview.license}</span>
                <span className={`attr-notice ${!preview.requires_attribution ? 'attr-none' : 'attr-req'}`}>
                  {!preview.requires_attribution ? '✓ No attribution required' : 'ℹ️ Attribution required'}
                </span>
                <button
                  type="button"
                  className={`preview-save-btn ${isMediaSaved(preview.id, 'video') ? 'is-saved' : ''}`}
                  onClick={() => handleToggleSave(preview)}
                >
                  {isMediaSaved(preview.id, 'video') ? '♥ Saved' : '♡ Save to project'}
                </button>
              </div>
              <h2>{preview.title}</h2>
              <p className="preview-author">{preview.creator}</p>
              {preview.description && (
                <p className="preview-description">{preview.description.slice(0, 240)}...</p>
              )}
              <div className="preview-footer-actions">
                <div className="preview-attribution-box">
                  <code>{preview.attribution}</code>
                  <button
                    className="copy-btn"
                    onClick={() => copy(preview)}
                  >
                    {copiedId === preview.id ? '✓ Copied' : 'Copy attribution'}
                  </button>
                </div>
                <a
                  href={preview.landing_url}
                  target="_blank"
                  rel="noreferrer"
                  className="preview-source-link"
                >
                  View original source page ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <SourceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        defaultTab="video"
        onKeysUpdated={(newKeys) => setApiKeys(newKeys)}
      />

      <SavedMediaDrawer
        isOpen={isSavedDrawerOpen}
        onClose={() => setIsSavedDrawerOpen(false)}
        type="video"
        onPlay={handlePreview}
        activeId={preview?.id}
        onItemChange={(count) => setSavedCount(count)}
      />
    </div>
  )
}
