import { useState } from 'react'
import './SourceSettingsModal.css'
import { getApiKeys, setApiKey, validateApiKey } from '../services/api-keys.js'

export default function SourceSettingsModal({ isOpen, onClose, defaultTab = 'video', onKeysUpdated }) {
  const [keys, setKeys] = useState(getApiKeys())
  const [statusMsg, setStatusMsg] = useState({})
  const [testing, setTesting] = useState({})
  const [tab, setTab] = useState(defaultTab) // 'video' | 'audio'

  if (!isOpen) return null

  function handleChange(service, value) {
    setKeys((prev) => ({ ...prev, [service]: value }))
  }

  async function handleTest(service) {
    setTesting((prev) => ({ ...prev, [service]: true }))
    setStatusMsg((prev) => ({ ...prev, [service]: null }))
    const res = await validateApiKey(service, keys[service])
    setStatusMsg((prev) => ({ ...prev, [service]: res }))
    setTesting((prev) => ({ ...prev, [service]: false }))
  }

  function handleSave() {
    Object.entries(keys).forEach(([service, val]) => {
      setApiKey(service, val)
    })
    if (onKeysUpdated) onKeysUpdated(keys)
    onClose()
  }

  return (
    <div
      className="sources-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Media Sources and API Keys Settings"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="sources-modal">
        <div className="sources-modal-head">
          <div>
            <span className="sources-modal-tag">CONFIG &amp; CREDENTIALS</span>
            <h2>Media Sources &amp; API Keys</h2>
          </div>
          <button className="sources-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className="sources-modal-desc">
          CreatorNew comes with <strong>5 active sources out-of-the-box</strong> with zero registration.
          Optionally add free developer API keys to unlock live search across millions of additional clips.
          Keys are stored <strong>strictly on your device (localStorage)</strong> and never leave your browser.
        </p>

        <div className="sources-modal-tabs">
          <button
            className={`tab-btn ${tab === 'video' ? 'is-active' : ''}`}
            onClick={() => setTab('video')}
          >
            Video Sources (Pexels, Pixabay, NASA, Wikimedia)
          </button>
          <button
            className={`tab-btn ${tab === 'audio' ? 'is-active' : ''}`}
            onClick={() => setTab('audio')}
          >
            Audio Sources (Freesound, Kenney, Incompetech, Openverse)
          </button>
        </div>

        <div className="sources-modal-body">
          {tab === 'video' && (
            <div className="sources-list">
              {/* Default Active Sources */}
              <div className="source-item is-builtin">
                <div className="source-item-info">
                  <div className="source-title-row">
                    <h3>NASA Image &amp; Video Library</h3>
                    <span className="badge-active">● Active (No key needed)</span>
                  </div>
                  <p>100% US Government Public Domain videos. Safe for commercial YouTube &amp; broadcast.</p>
                </div>
              </div>

              <div className="source-item is-builtin">
                <div className="source-item-info">
                  <div className="source-title-row">
                    <h3>Wikimedia Commons Video</h3>
                    <span className="badge-active">● Active (No key needed)</span>
                  </div>
                  <p>Global Creative Commons community video library with direct stream previews.</p>
                </div>
              </div>

              {/* Extended Sources */}
              <div className="source-item">
                <div className="source-item-info">
                  <div className="source-title-row">
                    <h3>Pexels Video API</h3>
                    <span className={keys.pexels ? 'badge-active' : 'badge-showcase'}>
                      {keys.pexels ? '● Live API Connected' : 'Curated Showcase Active'}
                    </span>
                  </div>
                  <p>
                    Over 150,000+ high quality free stock videos. Free for commercial use, no attribution required.
                  </p>
                  <div className="source-key-row">
                    <input
                      type="password"
                      placeholder="Paste free Pexels API Key..."
                      value={keys.pexels || ''}
                      onChange={(e) => handleChange('pexels', e.target.value)}
                    />
                    <button
                      type="button"
                      className="test-btn"
                      onClick={() => handleTest('pexels')}
                      disabled={!keys.pexels || testing.pexels}
                    >
                      {testing.pexels ? 'Testing...' : 'Test Key'}
                    </button>
                  </div>
                  {statusMsg.pexels && (
                    <div className={`status-note ${statusMsg.pexels.valid ? 'is-success' : 'is-error'}`}>
                      {statusMsg.pexels.message}
                    </div>
                  )}
                  <a
                    href="https://www.pexels.com/api/"
                    target="_blank"
                    rel="noreferrer"
                    className="get-key-link"
                  >
                    Get free Pexels API Key (Instant) ↗
                  </a>
                </div>
              </div>

              <div className="source-item">
                <div className="source-item-info">
                  <div className="source-title-row">
                    <h3>Pixabay Video API</h3>
                    <span className={keys.pixabay ? 'badge-active' : 'badge-showcase'}>
                      {keys.pixabay ? '● Live API Connected' : 'Curated Showcase Active'}
                    </span>
                  </div>
                  <p>
                    Over 1,000,000+ stock video clips. Free Pixabay license for commercial and personal projects.
                  </p>
                  <div className="source-key-row">
                    <input
                      type="password"
                      placeholder="Paste free Pixabay API Key..."
                      value={keys.pixabay || ''}
                      onChange={(e) => handleChange('pixabay', e.target.value)}
                    />
                    <button
                      type="button"
                      className="test-btn"
                      onClick={() => handleTest('pixabay')}
                      disabled={!keys.pixabay || testing.pixabay}
                    >
                      {testing.pixabay ? 'Testing...' : 'Test Key'}
                    </button>
                  </div>
                  {statusMsg.pixabay && (
                    <div className={`status-note ${statusMsg.pixabay.valid ? 'is-success' : 'is-error'}`}>
                      {statusMsg.pixabay.message}
                    </div>
                  )}
                  <a
                    href="https://pixabay.com/api/docs/"
                    target="_blank"
                    rel="noreferrer"
                    className="get-key-link"
                  >
                    Get free Pixabay API Key ↗
                  </a>
                </div>
              </div>
            </div>
          )}

          {tab === 'audio' && (
            <div className="sources-list">
              {/* Default Active Sources */}
              <div className="source-item is-builtin">
                <div className="source-item-info">
                  <div className="source-title-row">
                    <h3>Kenney Audio SFX</h3>
                    <span className="badge-active">● Active (No key needed)</span>
                  </div>
                  <p>100% CC0 1.0 Universal UI &amp; Digital SFX (clicks, switches, lasers, powerups).</p>
                </div>
              </div>

              <div className="source-item is-builtin">
                <div className="source-item-info">
                  <div className="source-title-row">
                    <h3>Incompetech (Kevin MacLeod)</h3>
                    <span className="badge-active">● Active (No key needed)</span>
                  </div>
                  <p>Iconic YouTube background music with instant 1-click CC-BY 4.0 attribution copy.</p>
                </div>
              </div>

              <div className="source-item is-builtin">
                <div className="source-item-info">
                  <div className="source-title-row">
                    <h3>Openverse Audio</h3>
                    <span className="badge-active">● Active (No key needed)</span>
                  </div>
                  <p>Global Creative Commons audio index across Wikimedia, Jamendo, and freesound.</p>
                </div>
              </div>

              {/* Extended Source: Freesound */}
              <div className="source-item">
                <div className="source-item-info">
                  <div className="source-title-row">
                    <h3>Freesound.org API</h3>
                    <span className={keys.freesound ? 'badge-active' : 'badge-showcase'}>
                      {keys.freesound ? '● Live API Connected' : 'Curated Showcase Active'}
                    </span>
                  </div>
                  <p>
                    World&apos;s largest sound effects library (700,000+ files). Filtered by Creative Commons 0.
                  </p>
                  <div className="source-key-row">
                    <input
                      type="password"
                      placeholder="Paste free Freesound API Token / Key..."
                      value={keys.freesound || ''}
                      onChange={(e) => handleChange('freesound', e.target.value)}
                    />
                    <button
                      type="button"
                      className="test-btn"
                      onClick={() => handleTest('freesound')}
                      disabled={!keys.freesound || testing.freesound}
                    >
                      {testing.freesound ? 'Testing...' : 'Test Key'}
                    </button>
                  </div>
                  {statusMsg.freesound && (
                    <div className={`status-note ${statusMsg.freesound.valid ? 'is-success' : 'is-error'}`}>
                      {statusMsg.freesound.message}
                    </div>
                  )}
                  <a
                    href="https://freesound.org/help/developers/"
                    target="_blank"
                    rel="noreferrer"
                    className="get-key-link"
                  >
                    Get free Freesound API Key ↗
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sources-modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSave}>
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  )
}
