import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const buildRoot = join(projectRoot, 'dist')
const buildSitemap = join(buildRoot, 'tools-sitemap.xml')
const projectSitemap = join(projectRoot, 'tools-sitemap.xml')
const toolsConfig = join(projectRoot, 'wordpress-plugin', 'creatornew-tools-sitemap', 'tools.json')

function escapeXml(value) {
  return value.replace(/[<>&'"]/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
  })[character])
}

function canonicalFromHtml(html) {
  return html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1]
    || html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i)?.[1]
}

function isNoindex(html) {
  const robots = html.match(/<meta\s+[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1] || ''
  return robots.toLowerCase().split(',').map((value) => value.trim()).includes('noindex')
}

const entries = []
const toolSlugs = JSON.parse(await readFile(toolsConfig, 'utf8'))
for (const slug of toolSlugs) {
  const relativeIndex = join(slug, 'index.html')
  const builtIndex = join(buildRoot, relativeIndex)
  const html = await readFile(builtIndex, 'utf8')
  if (isNoindex(html)) continue

  const loc = canonicalFromHtml(html)
  if (!loc || !loc.startsWith('https://creatornew.com/')) continue

  const sourceIndex = join(projectRoot, relativeIndex)
  let modifiedFile = builtIndex
  try {
    await stat(sourceIndex)
    modifiedFile = sourceIndex
  } catch {}

  const fileInfo = await stat(modifiedFile)
  entries.push({ loc, lastmod: fileInfo.mtime.toISOString() })
}

entries.sort((first, second) => first.loc.localeCompare(second.loc))

const urlNodes = entries.map(({ loc, lastmod }) => [
  '  <url>',
  `    <loc>${escapeXml(loc)}</loc>`,
  `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
  '  </url>'
].join('\n')).join('\n')

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  urlNodes,
  '</urlset>',
  ''
].join('\n')

function validateSitemap(value, expectedEntries) {
  if (!value.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')) {
    throw new Error('Sitemap validation failed: missing XML declaration.')
  }
  if (!value.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">') || !value.endsWith('</urlset>\n')) {
    throw new Error('Sitemap validation failed: invalid urlset root.')
  }

  const locations = [...value.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
  if (locations.length !== expectedEntries.length) {
    throw new Error(`Sitemap validation failed: expected ${expectedEntries.length} URLs, found ${locations.length}.`)
  }
  if (new Set(locations).size !== locations.length) {
    throw new Error('Sitemap validation failed: duplicate URLs found.')
  }
  if (locations.some((location) => !location.startsWith('https://creatornew.com/'))) {
    throw new Error('Sitemap validation failed: a URL is outside creatornew.com.')
  }
}

validateSitemap(xml, entries)

await mkdir(dirname(buildSitemap), { recursive: true })
await writeFile(buildSitemap, xml, 'utf8')
await copyFile(buildSitemap, projectSitemap)
console.log(`Created tools-sitemap.xml with ${entries.length} tool URLs.`)
