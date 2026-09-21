import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicDir = join(root, 'public');

const SOURCE_IMAGE_PATH = process.argv[2] || 'C:/Users/Thanhtc/.gemini/antigravity/brain/1e65fe9b-d2b6-48dd-b876-9f2aaeb87db6/.user_uploaded/media_1789954255570.png';

async function main() {
  console.log('Launching browser to generate brand assets...');
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage();

  const sourceBuf = await readFile(SOURCE_IMAGE_PATH);
  const sourceBase64 = `data:image/png;base64,${sourceBuf.toString('base64')}`;

  const generated = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const w = img.width;
    const h = img.height;

    // 1. Process source image to remove outer white background
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = w;
    srcCanvas.height = h;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.drawImage(img, 0, 0);

    const imgData = srcCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Flood fill from outer edges
    const visited = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    let head = 0;
    let tail = 0;

    const push = (x, y) => {
      const idx = y * w + x;
      if (!visited[idx]) {
        visited[idx] = 1;
        queue[tail++] = idx;
      }
    };

    for (let x = 0; x < w; x++) {
      push(x, 0);
      push(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      push(0, y);
      push(w - 1, y);
    }

    while (head < tail) {
      const idx = queue[head++];
      const x = idx % w;
      const y = Math.floor(idx / w);
      const pi = idx * 4;
      const r = data[pi];
      const g = data[pi + 1];
      const b = data[pi + 2];

      if (r > 240 && g > 240 && b > 240) {
        if (x > 0) push(x - 1, y);
        if (x < w - 1) push(x + 1, y);
        if (y > 0) push(x, y - 1);
        if (y < h - 1) push(x, y + 1);
      }
    }

    for (let idx = 0; idx < w * h; idx++) {
      if (visited[idx]) {
        const pi = idx * 4;
        const brightness = (data[pi] + data[pi + 1] + data[pi + 2]) / 3;
        if (brightness >= 250) {
          data[pi + 3] = 0;
        } else if (brightness > 235) {
          data[pi + 3] = Math.round(((250 - brightness) / 15) * 255);
        }
      }
    }
    srcCtx.putImageData(imgData, 0, 0);

    // 2. Generate creatornew-logo.png & creatornew-logo.webp (600 x 219)
    // Content box: minX: 79, maxX: 936, minY: 49, maxY: 214
    const contentX = 79;
    const contentY = 49;
    const contentW = 936 - 79 + 1; // 858
    const contentH = 214 - 49 + 1; // 166

    const targetCanvasW = 600;
    const targetCanvasH = 219;
    const targetContentH = 102;
    const targetContentW = targetContentH * (contentW / contentH); // ~527.2

    const destX = (targetCanvasW - targetContentW) / 2;
    const destY = (targetCanvasH - targetContentH) / 2;

    const logoCanvas = document.createElement('canvas');
    logoCanvas.width = targetCanvasW;
    logoCanvas.height = targetCanvasH;
    const logoCtx = logoCanvas.getContext('2d');
    logoCtx.imageSmoothingEnabled = true;
    logoCtx.imageSmoothingQuality = 'high';
    logoCtx.drawImage(
      srcCanvas,
      contentX, contentY, contentW, contentH,
      destX, destY, targetContentW, targetContentH
    );

    const logoPng = logoCanvas.toDataURL('image/png');
    const logoWebp = logoCanvas.toDataURL('image/webp', 0.95);

    // 3. Generate creatornew-icon.png (192 x 192)
    // Icon box in source: x: 79, y: 49, w: 166, h: 166
    const iconSrcX = 79;
    const iconSrcY = 49;
    const iconSrcW = 166;
    const iconSrcH = 166;

    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 192;
    iconCanvas.height = 192;
    const iconCtx = iconCanvas.getContext('2d');
    iconCtx.imageSmoothingEnabled = true;
    iconCtx.imageSmoothingQuality = 'high';

    // 180x180 icon with 6px padding inside 192x192
    const iconDestX = 6;
    const iconDestY = 6;
    const iconDestSize = 180;

    iconCtx.drawImage(
      srcCanvas,
      iconSrcX, iconSrcY, iconSrcW, iconSrcH,
      iconDestX, iconDestY, iconDestSize, iconDestSize
    );

    const iconPng = iconCanvas.toDataURL('image/png');

    return {
      logoPng,
      logoWebp,
      iconPng
    };
  }, sourceBase64);

  const logoPngBuf = Buffer.from(generated.logoPng.split(',')[1], 'base64');
  const logoWebpBuf = Buffer.from(generated.logoWebp.split(',')[1], 'base64');
  const iconPngBuf = Buffer.from(generated.iconPng.split(',')[1], 'base64');

  await writeFile(join(publicDir, 'creatornew-logo.png'), logoPngBuf);
  await writeFile(join(publicDir, 'creatornew-logo.webp'), logoWebpBuf);
  await writeFile(join(publicDir, 'creatornew-icon.png'), iconPngBuf);

  console.log(`Saved public/creatornew-logo.png (${logoPngBuf.length} bytes)`);
  console.log(`Saved public/creatornew-logo.webp (${logoWebpBuf.length} bytes)`);
  console.log(`Saved public/creatornew-icon.png (${iconPngBuf.length} bytes)`);

  await browser.close();
}

main().catch(console.error);
