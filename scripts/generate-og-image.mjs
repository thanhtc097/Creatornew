import { chromium } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const publicDir = join(root, 'public')

async function main() {
  const browser = await chromium.launch({ channel: 'msedge' })
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })

  const logoBuf = await readFile(join(publicDir, 'creatornew-logo.png'))
  const logoBase64 = `data:image/png;base64,${logoBuf.toString('base64')}`

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@700;800&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1200px;
        height: 630px;
        background: #0a0d17;
        font-family: 'Inter', -apple-system, sans-serif;
        color: #ffffff;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 56px 64px;
      }
      .ambient-1 {
        position: absolute;
        top: -120px;
        right: -80px;
        width: 600px;
        height: 600px;
        background: radial-gradient(circle, rgba(93, 95, 239, 0.35) 0%, rgba(93, 95, 239, 0) 70%);
        filter: blur(40px);
        pointer-events: none;
      }
      .ambient-2 {
        position: absolute;
        bottom: -150px;
        left: 20%;
        width: 550px;
        height: 550px;
        background: radial-gradient(circle, rgba(32, 197, 216, 0.22) 0%, rgba(32, 197, 216, 0) 70%);
        filter: blur(50px);
        pointer-events: none;
      }
      .grid-pattern {
        position: absolute;
        inset: 0;
        background-image: linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
        background-size: 40px 40px;
        mask-image: radial-gradient(ellipse at 60% 40%, black 40%, transparent 80%);
        pointer-events: none;
      }
      .top-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: relative;
        z-index: 2;
      }
      .logo-box {
        background: rgba(255, 255, 255, 0.95);
        padding: 10px 20px;
        border-radius: 14px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
      }
      .logo-box img {
        height: 38px;
        width: auto;
        display: block;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: rgba(93, 95, 239, 0.2);
        border: 1px solid rgba(93, 95, 239, 0.5);
        border-radius: 999px;
        font-size: 15px;
        font-weight: 600;
        color: #a5b4fc;
        backdrop-filter: blur(10px);
      }
      .main-content {
        position: relative;
        z-index: 2;
        margin: auto 0;
      }
      h1 {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
        font-size: 58px;
        font-weight: 800;
        line-height: 1.14;
        letter-spacing: -1.5px;
        margin-bottom: 20px;
        background: linear-gradient(135deg, #ffffff 30%, #c7d2fe 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      h1 span {
        background: linear-gradient(135deg, #818cf8 0%, #38bdf8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      p.subtitle {
        font-size: 24px;
        line-height: 1.45;
        color: #94a3b8;
        max-width: 900px;
        font-weight: 400;
        letter-spacing: -0.2px;
      }
      .pills-row {
        display: flex;
        gap: 16px;
        margin-top: 28px;
        flex-wrap: wrap;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 18px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        color: #e2e8f0;
        backdrop-filter: blur(8px);
      }
      .pill-icon {
        font-size: 18px;
      }
      .footer-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding-top: 24px;
        position: relative;
        z-index: 2;
      }
      .tools-list {
        display: flex;
        gap: 20px;
        color: #64748b;
        font-size: 15px;
        font-weight: 500;
      }
      .tools-list span {
        color: #94a3b8;
      }
      .domain {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: -0.5px;
        color: #38bdf8;
      }
    </style>
  </head>
  <body>
    <div class="ambient-1"></div>
    <div class="ambient-2"></div>
    <div class="grid-pattern"></div>

    <div class="top-row">
      <div class="logo-box">
        <img src="${logoBase64}" alt="CreatorNew" />
      </div>
      <div class="badge">
        <span>⚡</span> 100% In-Browser &amp; Zero Server Uploads
      </div>
    </div>

    <div class="main-content">
      <h1>Free &amp; private creative tools<br><span>for modern creators</span></h1>
      <p class="subtitle">AI Background Remover, Smart Image Compression, PDF Conversion &amp; Open Media Search. Fast, watermark-free and completely private.</p>
      <div class="pills-row">
        <div class="pill"><span class="pill-icon">🔒</span> Client-Side Privacy</div>
        <div class="pill"><span class="pill-icon">🧠</span> On-Device AI (WASM)</div>
        <div class="pill"><span class="pill-icon">🚫</span> No File Limits &amp; No Ads</div>
        <div class="pill"><span class="pill-icon">✨</span> Free Forever</div>
      </div>
    </div>

    <div class="footer-row">
      <div class="tools-list">
        <span>Image Converter</span> &bull; <span>Background Remover</span> &bull; <span>Image Compressor</span> &bull; <span>Merge PDF</span> &bull; <span>Audio &amp; Video</span>
      </div>
      <div class="domain">creatornew.com</div>
    </div>
  </body>
  </html>
  `

  await page.setContent(html, { waitUntil: 'networkidle' })
  // Wait a bit for webfonts to render cleanly
  await page.waitForTimeout(600)

  const buffer = await page.screenshot({ type: 'png' })
  await writeFile(join(publicDir, 'og-image.png'), buffer)
  console.log(`Generated og-image.png: ${buffer.length} bytes`)

  await browser.close()
}

main().catch(console.error)
