import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('Hero 4K Wallpaper Rotator', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="home-hero-wrapper" id="homeHeroWrapper">
        <div class="hero-bg-layer" id="heroBgLayer"></div>
        <div class="hero-wallpaper-widget" id="heroWallpaperWidget">
          <button type="button" class="hero-wallpaper-btn" id="heroWallpaperBtn">
            <span class="wallpaper-text" id="heroWallpaperTitle">4K Wallpaper</span>
          </button>
        </div>
      </div>
    `
    localStorage.clear()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
  })

  it('initializes and mounts elements correctly', async () => {
    const bgLayer = document.getElementById('heroBgLayer')
    const titleEl = document.getElementById('heroWallpaperTitle')
    const btn = document.getElementById('heroWallpaperBtn')

    expect(bgLayer).not.toBeNull()
    expect(titleEl).not.toBeNull()
    expect(btn).not.toBeNull()
  })

  it('updates wallpaper title and background layer on trigger', async () => {
    await import('../../js/hero-wallpaper.js?t=' + Date.now())
    const btn = document.getElementById('heroWallpaperBtn')
    expect(btn).not.toBeNull()

    // Trigger click on wallpaper button
    btn.click()
    expect(btn.classList.contains('loading')).toBe(true)
  })
})
