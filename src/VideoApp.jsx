import { useState } from 'react'
import './VideoApp.css'

const API = 'https://commons.wikimedia.org/w/api.php'
const PAGE_SIZE = 12
const suggestions = ['nature', 'city', 'space', 'animals', 'drone landscape']

const licenseFilters = [
  { value: 'all', label: 'All Creative Commons licenses' },
  { value: 'commercial', label: 'Commercial use allowed' },
  { value: 'modify', label: 'Modifications allowed' },
]

function stripHtml(value = '') {
  const node = document.createElement('div')
  node.innerHTML = value
  return node.textContent || ''
}

function meta(item, key) {
  return stripHtml(item.imageinfo?.[0]?.extmetadata?.[key]?.value || '')
}

function licenseName(item) {
  return meta(item, 'LicenseShortName') || 'Creative Commons'
}

function authorName(item) {
  return meta(item, 'Artist') || 'Wikimedia Commons creator'
}

function canUse(item, filter) {
  if (filter === 'all') return true
  const restrictions = meta(item, 'Restrictions').toLowerCase()
  const license = licenseName(item).toLowerCase()
  if (filter === 'commercial') return !license.includes('nc') && !restrictions.includes('noncommercial')
  return !license.includes('nd') && !restrictions.includes('no derivative')
}

function cleanTitle(title = '') {
  return title.replace(/^File:/i, '').replace(/\.[^.]+$/, '').replaceAll('_', ' ')
}

function attribution(item) {
  const title = cleanTitle(item.title)
  const author = authorName(item)
  const license = licenseName(item)
  const source = item.imageinfo?.[0]?.descriptionurl || ''
  return `“${title}” — ${author}, ${license}. Source: ${source}`
}

function VideoCard({ item, onPreview, onCopy, copied }) {
  const info = item.imageinfo?.[0] || {}
  return <article className="video-card">
    <button className="video-thumb" onClick={() => onPreview(item)} aria-label={`Preview ${cleanTitle(item.title)}`}>
      {info.thumburl ? <img src={info.thumburl} alt="" loading="lazy" /> : <span>VIDEO</span>}
      <i aria-hidden="true">▶</i>
    </button>
    <div className="video-body">
      <div className="video-tags"><span>{licenseName(item)}</span><span>{info.mime?.split('/')[1]?.toUpperCase() || 'VIDEO'}</span></div>
      <h3>{cleanTitle(item.title)}</h3>
      <p>{authorName(item)}</p>
      <div className="video-actions">
        <button onClick={() => onCopy(item)}>{copied ? '✓ Copied' : 'Copy attribution'}</button>
        <a href={info.descriptionurl} target="_blank" rel="noreferrer">View source ↗</a>
      </div>
    </div>
  </article>
}

export default function VideoApp() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [continueToken, setContinueToken] = useState(null)
  const [preview, setPreview] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  async function search(term = query, append = false) {
    if (!term.trim()) return
    setLoading(true); setError(''); setSearched(true)
    try {
      const params = new URLSearchParams({
        action: 'query', format: 'json', formatversion: '2', origin: '*',
        generator: 'search', gsrnamespace: '6', gsrlimit: String(PAGE_SIZE),
        gsrsearch: `${term.trim()} filetype:video`, prop: 'imageinfo',
        iiprop: 'url|mime|size|extmetadata', iiurlwidth: '640',
      })
      if (append && continueToken) Object.entries(continueToken).forEach(([key, value]) => params.set(key, value))
      const response = await fetch(`${API}?${params}`)
      if (!response.ok) throw new Error('Unable to connect to the video library.')
      const data = await response.json()
      const results = (data.query?.pages || []).filter((item) => canUse(item, filter))
      setItems((current) => append ? [...current, ...results] : results)
      setContinueToken(data.continue || null)
    } catch (err) { setError(err.message || 'Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  function submit(event) { event.preventDefault(); search(query, false) }
  function choose(term) { setQuery(term); setTimeout(() => search(term, false), 0) }
  async function copy(item) {
    await navigator.clipboard.writeText(attribution(item))
    setCopiedId(item.pageid); setTimeout(() => setCopiedId(null), 1800)
  }

  return <div className="video-app">
    <header className="video-nav">
      <a href="/" aria-label="CreatorNew home"><picture><source srcSet="/creatornew-logo.webp" type="image/webp"/><img src="/creatornew-logo.png" alt="CreatorNew" width="2075" height="758" fetchPriority="high" decoding="async"/></picture></a>
      <span><b></b> Open video library</span>
      <a href="https://creativecommons.org/share-your-work/cclicenses/" target="_blank" rel="noreferrer">About CC licenses ↗</a>
    </header>

    <main>
      <section className="video-hero">
        <div className="video-eyebrow">FREE STOCK VIDEO SEARCH</div>
        <h1>Free stock videos.<br/><em>Footage for every project.</em></h1>
        <p>Search Creative Commons videos from Wikimedia Commons, check license details<br/>and copy attribution in one click.</p>
        <form onSubmit={submit} className="video-search">
          <label><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="What video are you looking for?" autoFocus /></label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter usage rights">{licenseFilters.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          <button disabled={!query.trim() || loading}>{loading ? 'Searching...' : 'Search videos'}</button>
        </form>
        <div className="video-suggestions"><span>Try:</span>{suggestions.map((term) => <button key={term} onClick={() => choose(term)}>{term}</button>)}</div>
        <div className="video-trust"><span>✓ No registration</span><span>✓ Clear license details</span><span>✓ Original source links</span></div>
      </section>

      {!searched && <section className="video-steps">
        <article><i>01</i><b>⌕</b><h2>Search content</h2><p>Search in English for the broadest results.</p></article>
        <article><i>02</i><b>▷</b><h2>Preview and verify</h2><p>Review the video, creator and license terms directly on each result card.</p></article>
        <article><i>03</i><b>CC</b><h2>Attribute correctly</h2><p>Copy ready-to-use attribution before publishing.</p></article>
      </section>}

      {searched && <section className="video-results">
        <div className="video-results-head"><div><small>SEARCH RESULTS</small><h2>{loading && !items.length ? 'Searching the video library...' : `${items.length} videos for “${query}”`}</h2></div><span>Source: Wikimedia Commons</span></div>
        {error && <div className="video-message"><b>Unable to load results.</b> {error} <button onClick={() => search(query, false)}>Try again</button></div>}
        {!loading && !error && !items.length && <div className="video-empty"><b>No matching videos found</b><p>Try a broader English keyword or license filter.</p></div>}
        <div className="video-grid">{items.map((item) => <VideoCard key={item.pageid} item={item} onPreview={setPreview} onCopy={copy} copied={copiedId === item.pageid} />)}</div>
        {continueToken && <button className="load-more" disabled={loading} onClick={() => search(query, true)}>{loading ? 'Loading...' : 'Load more videos'}</button>}
      </section>}
    </main>

    <footer className="video-footer"><picture><source srcSet="/creatornew-logo.webp" type="image/webp"/><img src="/creatornew-logo.png" alt="CreatorNew" width="2075" height="758" loading="lazy" decoding="async"/></picture><p>License details are provided by uploaders. Always verify the source page before publishing.</p></footer>

    {preview && <div className="preview-backdrop" role="dialog" aria-modal="true" aria-label="Video preview" onMouseDown={(e) => e.target === e.currentTarget && setPreview(null)}>
      <div className="preview-modal"><button className="preview-close" onClick={() => setPreview(null)} aria-label="Close">×</button><video src={preview.imageinfo?.[0]?.url} poster={preview.imageinfo?.[0]?.thumburl} controls autoPlay /><div><h2>{cleanTitle(preview.title)}</h2><p>{authorName(preview)} · {licenseName(preview)}</p><a href={preview.imageinfo?.[0]?.descriptionurl} target="_blank" rel="noreferrer">Open source page ↗</a></div></div>
    </div>}
  </div>
}
