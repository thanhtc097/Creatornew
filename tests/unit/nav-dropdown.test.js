import { afterEach, beforeEach, describe, expect, it } from 'vitest'

describe('nav-dropdown behavior', () => {
  beforeEach(async () => {
    document.body.innerHTML = `
      <nav class="nav">
        <details class="nav-dropdown" id="dropdown1">
          <summary id="summary1">Dropdown 1</summary>
          <div class="nav-dropdown-menu">
            <a href="#link1" id="link1">Link 1</a>
          </div>
        </details>
        <details class="nav-dropdown" id="dropdown2">
          <summary id="summary2">Dropdown 2</summary>
          <div class="nav-dropdown-menu">
            <a href="#link2" id="link2">Link 2</a>
          </div>
        </details>
        <button id="outsideBtn">Outside</button>
      </nav>
    `
    // Reset any global flags and load site-i18n
    window.__creatornewNavDropdownsInitialized = false
    await import('../../js/site-i18n.js?t=' + Date.now())
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('closes open dropdown when clicking another summary', () => {
    const d1 = document.getElementById('dropdown1')
    const d2 = document.getElementById('dropdown2')
    const s2 = document.getElementById('summary2')

    // Open first dropdown
    d1.open = true
    expect(d1.open).toBe(true)
    expect(d2.open).toBe(false)

    // Click summary of second dropdown
    s2.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(d1.open).toBe(false)
  })

  it('closes all dropdowns when clicking outside', () => {
    const d1 = document.getElementById('dropdown1')
    const outsideBtn = document.getElementById('outsideBtn')

    d1.open = true
    expect(d1.open).toBe(true)

    outsideBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(d1.open).toBe(false)
  })

  it('closes all dropdowns when pressing Escape', () => {
    const d1 = document.getElementById('dropdown1')

    d1.open = true
    expect(d1.open).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(d1.open).toBe(false)
  })

  it('closes dropdown when clicking a link inside menu', () => {
    const d1 = document.getElementById('dropdown1')
    const link1 = document.getElementById('link1')

    d1.open = true
    expect(d1.open).toBe(true)

    link1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(d1.open).toBe(false)
  })
})
