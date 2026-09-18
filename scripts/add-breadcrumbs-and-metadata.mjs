import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))

const pages = [
  // Comparison & Guides
  {
    path: 'creatornew-vs-remove-bg/index.html',
    type: 'article',
    category: 'Guides & Comparisons',
    categoryUrl: '../#guides',
    categoryFullUrl: 'https://creatornew.com/#guides',
    name: 'CreatorNew vs Remove.bg',
    url: 'https://creatornew.com/creatornew-vs-remove-bg/'
  },
  {
    path: 'creatornew-vs-tinypng/index.html',
    type: 'article',
    category: 'Guides & Comparisons',
    categoryUrl: '../#guides',
    categoryFullUrl: 'https://creatornew.com/#guides',
    name: 'CreatorNew vs TinyPNG',
    url: 'https://creatornew.com/creatornew-vs-tinypng/'
  },
  {
    path: 'creatornew-vs-ilovepdf/index.html',
    type: 'article',
    category: 'Guides & Comparisons',
    categoryUrl: '../#guides',
    categoryFullUrl: 'https://creatornew.com/#guides',
    name: 'CreatorNew vs iLovePDF',
    url: 'https://creatornew.com/creatornew-vs-ilovepdf/'
  },
  {
    path: 'creatornew-vs-smallpdf/index.html',
    type: 'article',
    category: 'Guides & Comparisons',
    categoryUrl: '../#guides',
    categoryFullUrl: 'https://creatornew.com/#guides',
    name: 'CreatorNew vs Smallpdf',
    url: 'https://creatornew.com/creatornew-vs-smallpdf/'
  },
  {
    path: 'creatornew-vs-ezgif/index.html',
    type: 'article',
    category: 'Guides & Comparisons',
    categoryUrl: '../#guides',
    categoryFullUrl: 'https://creatornew.com/#guides',
    name: 'CreatorNew vs Ezgif',
    url: 'https://creatornew.com/creatornew-vs-ezgif/'
  },
  {
    path: 'creatornew-vs-convertio/index.html',
    type: 'article',
    category: 'Guides & Comparisons',
    categoryUrl: '../#guides',
    categoryFullUrl: 'https://creatornew.com/#guides',
    name: 'CreatorNew vs Convertio',
    url: 'https://creatornew.com/creatornew-vs-convertio/'
  },
  {
    path: 'how-to-convert-images-online-free/index.html',
    type: 'article',
    category: 'Guides & Comparisons',
    categoryUrl: '../#guides',
    categoryFullUrl: 'https://creatornew.com/#guides',
    name: 'How to Convert Images Online',
    url: 'https://creatornew.com/how-to-convert-images-online-free/'
  },

  // Image Tools
  {
    path: 'background-remover/index.html',
    type: 'tool',
    category: 'Image Tools',
    categoryUrl: '../#tools',
    categoryFullUrl: 'https://creatornew.com/#tools',
    name: 'Background Remover',
    url: 'https://creatornew.com/background-remover/'
  },
  {
    path: 'image-compressor/index.html',
    type: 'tool',
    category: 'Image Tools',
    categoryUrl: '../#tools',
    categoryFullUrl: 'https://creatornew.com/#tools',
    name: 'Image Compressor',
    url: 'https://creatornew.com/image-compressor/'
  },
  {
    path: 'image-converter/index.html',
    type: 'tool',
    category: 'Image Tools',
    categoryUrl: '../#tools',
    categoryFullUrl: 'https://creatornew.com/#tools',
    name: 'Image Converter',
    url: 'https://creatornew.com/image-converter/'
  },
  {
    path: 'image-resize/index.html',
    type: 'tool',
    category: 'Image Tools',
    categoryUrl: '../#tools',
    categoryFullUrl: 'https://creatornew.com/#tools',
    name: 'Image Resizer',
    url: 'https://creatornew.com/image-resize/'
  },
  {
    path: 'png-to-webp/index.html',
    type: 'tool',
    category: 'Image Tools',
    categoryUrl: '../#tools',
    categoryFullUrl: 'https://creatornew.com/#tools',
    name: 'PNG to WebP',
    url: 'https://creatornew.com/png-to-webp/'
  },
  {
    path: 'jpg-to-webp/index.html',
    type: 'tool',
    category: 'Image Tools',
    categoryUrl: '../#tools',
    categoryFullUrl: 'https://creatornew.com/#tools',
    name: 'JPG to WebP',
    url: 'https://creatornew.com/jpg-to-webp/'
  },
  {
    path: 'webp-to-jpg/index.html',
    type: 'tool',
    category: 'Image Tools',
    categoryUrl: '../#tools',
    categoryFullUrl: 'https://creatornew.com/#tools',
    name: 'WebP to JPG',
    url: 'https://creatornew.com/webp-to-jpg/'
  },

  // PDF Tools
  {
    path: 'merge-pdf/index.html',
    type: 'tool',
    category: 'PDF Tools',
    categoryUrl: '../#tools',
    categoryFullUrl: 'https://creatornew.com/#tools',
    name: 'Merge PDF',
    url: 'https://creatornew.com/merge-pdf/'
  },
  {
    path: 'split-pdf/index.html',
    type: 'tool',
    category: 'PDF Tools',
    categoryUrl: '../#tools',
    categoryFullUrl: 'https://creatornew.com/#tools',
    name: 'Split PDF',
    url: 'https://creatornew.com/split-pdf/'
  },
  {
    path: 'delete-pdf-pages/index.html',
    type: 'tool',
    category: 'PDF Tools',
    categoryUrl: '../#tools',
    categoryFullUrl: 'https://creatornew.com/#tools',
    name: 'Delete PDF Pages',
    url: 'https://creatornew.com/delete-pdf-pages/'
  },
  {
    path: 'images-to-pdf/index.html',
    type: 'tool',
    category: 'PDF Tools',
    categoryUrl: '../#tools',
    categoryFullUrl: 'https://creatornew.com/#tools',
    name: 'Images to PDF',
    url: 'https://creatornew.com/images-to-pdf/'
  },
  {
    path: 'pdf-to-jpg/index.html',
    type: 'tool',
    category: 'PDF Tools',
    categoryUrl: '../#tools',
    categoryFullUrl: 'https://creatornew.com/#tools',
    name: 'PDF to JPG',
    url: 'https://creatornew.com/pdf-to-jpg/'
  },
  {
    path: 'pdf-to-png/index.html',
    type: 'tool',
    category: 'PDF Tools',
    categoryUrl: '../#tools',
    categoryFullUrl: 'https://creatornew.com/#tools',
    name: 'PDF to PNG',
    url: 'https://creatornew.com/pdf-to-png/'
  },
  {
    path: 'rotate-pdf/index.html',
    type: 'tool',
    category: 'PDF Tools',
    categoryUrl: '../#tools',
    categoryFullUrl: 'https://creatornew.com/#tools',
    name: 'Rotate PDF',
    url: 'https://creatornew.com/rotate-pdf/'
  },

  // Media & AI
  {
    path: 'ai-prompt-builder/index.html',
    type: 'tool',
    category: 'AI Tools',
    categoryUrl: '../#tools',
    categoryFullUrl: 'https://creatornew.com/#tools',
    name: 'AI Prompt Builder',
    url: 'https://creatornew.com/ai-prompt-builder/'
  },
  {
    path: 'free-sounds/index.html',
    type: 'tool',
    category: 'Audio Tools',
    categoryUrl: '../#tools',
    categoryFullUrl: 'https://creatornew.com/#tools',
    name: 'Free Sounds',
    url: 'https://creatornew.com/free-sounds/'
  },
  {
    path: 'free-videos/index.html',
    type: 'tool',
    category: 'Video Tools',
    categoryUrl: '../#tools',
    categoryFullUrl: 'https://creatornew.com/#tools',
    name: 'Free Videos',
    url: 'https://creatornew.com/free-videos/'
  },

  // Trust & Legal
  {
    path: 'about/index.html',
    type: 'company',
    name: 'About CreatorNew',
    url: 'https://creatornew.com/about/'
  },
  {
    path: 'privacy-policy/index.html',
    type: 'company',
    name: 'Privacy Policy',
    url: 'https://creatornew.com/privacy-policy/'
  },
  {
    path: 'terms/index.html',
    type: 'company',
    name: 'Terms of Service',
    url: 'https://creatornew.com/terms/'
  }
]

async function run() {
  for (const page of pages) {
    const fullPath = join(root, page.path)
    let content = await readFile(fullPath, 'utf-8')

    // 1. Ensure social preview & manifest
    if (!content.includes('site.webmanifest')) {
      content = content.replace(
        '<link rel="apple-touch-icon"',
        '<link rel="manifest" href="../site.webmanifest">\n  <link rel="apple-touch-icon"'
      )
    }
    if (!content.includes('og:image')) {
      content = content.replace(
        '<meta property="og:url"',
        '<meta property="og:image" content="https://creatornew.com/og-image.png">\n  <meta property="og:url"'
      )
    }
    if (!content.includes('twitter:image')) {
      content = content.replace(
        'name="twitter:card" content="summary"',
        'name="twitter:card" content="summary_large_image">\n  <meta name="twitter:image" content="https://creatornew.com/og-image.png"'
      )
    }

    // 2. Generate BreadcrumbList schema
    const breadcrumbItems = [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://creatornew.com/'
      }
    ]

    if (page.category) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: page.category,
        item: page.categoryFullUrl
      })
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 3,
        name: page.name,
        item: page.url
      })
    } else {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: page.name,
        item: page.url
      })
    }

    const breadcrumbSchemaObj = {
      '@type': 'BreadcrumbList',
      '@id': `${page.url}#breadcrumbs`,
      itemListElement: breadcrumbItems
    }

    // Add schema if not present
    if (!content.includes('BreadcrumbList')) {
      const schemaString = JSON.stringify(breadcrumbSchemaObj, null, 8).replace(/^ {8}/gm, '    ')
      content = content.replace(
        /"@graph":\s*\[/,
        `"@graph": [\n      ${schemaString.trim()},`
      )
    }

    // 3. Generate HTML breadcrumb nav
    let breadcrumbHtml = ''
    if (page.category) {
      breadcrumbHtml = `  <nav class="breadcrumb-nav" aria-label="Breadcrumb">\n    <ol class="breadcrumb-list">\n      <li><a href="../">Home</a></li>\n      <li class="breadcrumb-separator" aria-hidden="true">›</li>\n      <li><a href="${page.categoryUrl}">${page.category}</a></li>\n      <li class="breadcrumb-separator" aria-hidden="true">›</li>\n      <li aria-current="page">${page.name}</li>\n    </ol>\n  </nav>`
    } else {
      breadcrumbHtml = `  <nav class="breadcrumb-nav" aria-label="Breadcrumb">\n    <ol class="breadcrumb-list">\n      <li><a href="../">Home</a></li>\n      <li class="breadcrumb-separator" aria-hidden="true">›</li>\n      <li aria-current="page">${page.name}</li>\n    </ol>\n  </nav>`
    }

    // Insert breadcrumb nav into HTML if not present
    if (!content.includes('class="breadcrumb-nav"')) {
      if (page.type === 'article') {
        content = content.replace(
          '<header class="article-hero">',
          `${breadcrumbHtml}\n    <header class="article-hero">`
        )
      } else if (page.type === 'tool') {
        content = content.replace(
          '<main',
          `${breadcrumbHtml}\n  <main`
        )
      } else if (page.type === 'company') {
        content = content.replace(
          '<main',
          `${breadcrumbHtml}\n  <main`
        )
      }
    }

    await writeFile(fullPath, content, 'utf-8')
    console.log(`Updated ${page.path}`)
  }
  console.log('All pages successfully updated with breadcrumbs and metadata!')
}

run().catch(console.error)
