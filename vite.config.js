import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    assetsDir: 'creatornew-assets',
    rollupOptions: {
      input: {
        home: 'index.html',
        imageConverter: 'image-converter/index.html',
        pngToWebp: 'png-to-webp/index.html',
        jpgToWebp: 'jpg-to-webp/index.html',
        webpToJpg: 'webp-to-jpg/index.html',
        imageCompressor: 'image-compressor/index.html',
        imageResize: 'image-resize/index.html',
        backgroundRemover: 'background-remover/index.html',
        imagesToPdf: 'images-to-pdf/index.html',
        mergePdf: 'merge-pdf/index.html',
        splitPdf: 'split-pdf/index.html',
        pdfToJpg: 'pdf-to-jpg/index.html',
        rotatePdf: 'rotate-pdf/index.html',
        audioSearch: 'audio-search/index.html',
        videoSearch: 'video-search/index.html',
        freeSounds: 'free-sounds/index.html',
        freeVideos: 'free-videos/index.html',
        pdfToPng: 'pdf-to-png/index.html',
        deletePdfPages: 'delete-pdf-pages/index.html',
        aiPromptBuilder: 'ai-prompt-builder/index.html',
        imageConversionGuide: 'how-to-convert-images-online-free/index.html',
      },
    },
  },
})
