import { chromium } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const publicDir = join(root, 'public')

async function main() {
  const browser = await chromium.launch({ channel: 'msedge' })
  const page = await browser.newPage()

  // 1. Optimize creatornew-logo.png
  console.log('Optimizing creatornew-logo.png...')
  const logoBuf = await readFile(join(publicDir, 'creatornew-logo.png'))
  const logoBase64 = `data:image/png;base64,${logoBuf.toString('base64')}`

  const optimizedLogo = await page.evaluate(async (src) => {
    const img = new Image()
    img.src = src
    await new Promise((res) => { img.onload = res })

    // Target width 600px (provides >3x retina density for 174px display width)
    const targetWidth = 600
    const targetHeight = Math.round(targetWidth * (img.height / img.width))

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

    return {
      png: canvas.toDataURL('image/png'),
      webp: canvas.toDataURL('image/webp', 0.92)
    }
  }, logoBase64)

  const pngLogoBuffer = Buffer.from(optimizedLogo.png.split(',')[1], 'base64')
  const webpLogoBuffer = Buffer.from(optimizedLogo.webp.split(',')[1], 'base64')

  console.log(`Original logo: ${logoBuf.length} bytes`)
  console.log(`Optimized PNG logo: ${pngLogoBuffer.length} bytes`)
  console.log(`Optimized WebP logo: ${webpLogoBuffer.length} bytes`)

  await writeFile(join(publicDir, 'creatornew-logo.png'), pngLogoBuffer)
  await writeFile(join(publicDir, 'creatornew-logo.webp'), webpLogoBuffer)

  // 2. Optimize creatornew-icon.png
  console.log('Optimizing creatornew-icon.png...')
  const iconBuf = await readFile(join(publicDir, 'creatornew-icon.png'))
  const iconBase64 = `data:image/png;base64,${iconBuf.toString('base64')}`

  const optimizedIcon = await page.evaluate(async (src) => {
    const img = new Image()
    img.src = src
    await new Promise((res) => { img.onload = res })

    // 192x192 icon
    const canvas = document.createElement('canvas')
    canvas.width = 192
    canvas.height = 192
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, 192, 192)

    return {
      png: canvas.toDataURL('image/png'),
      webp: canvas.toDataURL('image/webp', 0.95)
    }
  }, iconBase64)

  const pngIconBuffer = Buffer.from(optimizedIcon.png.split(',')[1], 'base64')
  console.log(`Original icon: ${iconBuf.length} bytes`)
  console.log(`Optimized icon: ${pngIconBuffer.length} bytes`)
  await writeFile(join(publicDir, 'creatornew-icon.png'), pngIconBuffer)

  // 3. Optimize hero-creator-4k.jpg to hero-creator.webp
  console.log('Optimizing hero-creator-4k.jpg...')
  const heroBuf = await readFile(join(publicDir, 'hero-creator-4k.jpg'))
  const heroBase64 = `data:image/jpeg;base64,${heroBuf.toString('base64')}`

  const optimizedHero = await page.evaluate(async (src) => {
    const img = new Image()
    img.src = src
    await new Promise((res) => { img.onload = res })

    // Target 1600px width (for crisp desktop hero)
    const targetWidth = 1600
    const targetHeight = Math.round(targetWidth * (img.height / img.width))

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

    return {
      webp: canvas.toDataURL('image/webp', 0.82),
      jpg: canvas.toDataURL('image/jpeg', 0.82)
    }
  }, heroBase64)

  const webpHeroBuffer = Buffer.from(optimizedHero.webp.split(',')[1], 'base64')
  const jpgHeroBuffer = Buffer.from(optimizedHero.jpg.split(',')[1], 'base64')
  console.log(`Original hero: ${heroBuf.length} bytes`)
  console.log(`Optimized WebP hero: ${webpHeroBuffer.length} bytes`)
  console.log(`Optimized JPG hero: ${jpgHeroBuffer.length} bytes`)

  await writeFile(join(publicDir, 'hero-creator.webp'), webpHeroBuffer)
  await writeFile(join(publicDir, 'hero-creator-4k.jpg'), jpgHeroBuffer)

  await browser.close()
  console.log('Asset optimization completed successfully!')
}

main().catch(console.error)
