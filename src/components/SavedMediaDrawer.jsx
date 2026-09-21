import { useState, useEffect } from 'react'
import './SavedMediaDrawer.css'
import {
  getSavedMedia,
  removeSavedMedia,
  clearSavedMedia,
  generateBatchAttribution,
} from '../services/saved-media.js'

export default function SavedMediaDrawer({
  isOpen,
  onClose,
  type = 'video',
  onPlay,
  activeId,
  onItemChange,
}) {
  const [items, setItems] = useState([])
  const [copiedBatch, setCopiedBatch] = useState(false)
  const [copiedSingleId, setCopiedSingleId] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setItems(getSavedMedia(type))
    }
  }, [isOpen, type])

  if (!isOpen) return null

  function handleRemove(id) {
    const updated = removeSavedMedia(id, type)
    setItems(updated)
    if (onItemChange) onItemChange(updated.length)
  }

  function handleClear() {
    clearSavedMedia(type)
    setItems([])
    if (onItemChange) onItemChange(0)
  }

  async function handleCopyBatch() {
    const text = generateBatchAttribution(items)
    await navigator.clipboard.writeText(text)
    setCopiedBatch(true)
    setTimeout(() => setCopiedBatch(false), 2200)
  }

  async function handleCopySingle(item) {
    const text =
      item.attribution ||
      `“${item.title}” — ${item.creator}, ${item.license_label || item.license}. Source: ${item.landing_url || item.url}`
    await navigator.clipboard.writeText(text)
    setCopiedSingleId(item.id)
    setTimeout(() => setCopiedSingleId(null), 1800)
  }

  const isVideo = type === 'video'

  return (
    <div
      className="saved-drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Saved ${isVideo ? 'Videos' : 'Audio'}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="saved-drawer">
        <div className="saved-drawer-head">
          <div>
            <span className="saved-drawer-tag">PROJECT COLLECTION</span>
            <h2>
              Saved {isVideo ? 'Videos' : 'Audio'}{' '}
              <span className="saved-count-pill">{items.length}</span>
            </h2>
          </div>
          <button className="saved-drawer-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {items.length > 0 && (
          <div className="saved-toolbar">
            <button
              className={`batch-copy-btn ${copiedBatch ? 'is-copied' : ''}`}
              onClick={handleCopyBatch}
            >
              {copiedBatch ? '✓ Copied All Credits to Clipboard!' : '📋 Copy All YouTube Credits (1-Click)'}
            </button>
            <button className="clear-all-btn" onClick={handleClear}>
              Clear all
            </button>
          </div>
        )}

        <div className="saved-drawer-body">
          {items.length === 0 ? (
            <div className="saved-empty">
              <span className="saved-empty-icon">♥</span>
              <h3>No saved {isVideo ? 'videos' : 'audio tracks'} yet</h3>
              <p>
                Click the heart icon on any {isVideo ? 'video clip' : 'sound effect or music track'}{' '}
                to collect assets for your current project, then copy all YouTube credits at once!
              </p>
            </div>
          ) : (
            <div className="saved-list">
              {items.map((item) => (
                <div key={item.id} className="saved-card">
                  <div className="saved-card-media">
                    {isVideo && item.thumb ? (
                      <img src={item.thumb} alt={item.title} />
                    ) : (
                      <div className="saved-audio-icon">♪</div>
                    )}
                    {onPlay && (
                      <button
                        className="saved-play-overlay"
                        onClick={() => onPlay(item)}
                        aria-label={`Play ${item.title}`}
                      >
                        {activeId === item.id ? '⏸' : '▶'}
                      </button>
                    )}
                  </div>

                  <div className="saved-card-content">
                    <div className="saved-card-tags">
                      <span className={`saved-source-tag source-${item.source}`}>
                        {item.source_name || item.source}
                      </span>
                      <span className="saved-license-tag">
                        {item.license_label || item.license}
                      </span>
                    </div>
                    <h4 title={item.title}>{item.title}</h4>
                    <p>{item.creator}</p>
                    <div className="saved-card-actions">
                      <button
                        className="saved-single-copy"
                        onClick={() => handleCopySingle(item)}
                      >
                        {copiedSingleId === item.id ? '✓ Copied' : 'Copy credit'}
                      </button>
                      {item.landing_url && (
                        <a
                          href={item.landing_url}
                          target="_blank"
                          rel="noreferrer"
                          className="saved-view-link"
                        >
                          Source ↗
                        </a>
                      )}
                      <button
                        className="saved-remove-btn"
                        onClick={() => handleRemove(item.id)}
                        title="Remove from saved"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="saved-drawer-footer">
          <p>
            Assets are saved locally on your device. Never lose attribution links when exporting your video.
          </p>
          <button className="done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
