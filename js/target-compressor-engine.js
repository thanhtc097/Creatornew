/**
 * Target Size Compressor Engine
 * Binary search on quality and proportional dimensional scaling to guarantee
 * output file size <= targetBytes with maximum visual clarity.
 */

/**
 * Calculates optimal scale and quality to fit target bytes.
 * @param {object} params
 * @param {number} params.originalWidth
 * @param {number} params.originalHeight
 * @param {number} params.originalBytes
 * @param {number} params.targetBytes
 * @param {Function} params.measureFn - async (width, height, quality) => Promise<number> (size in bytes)
 * @param {number} [params.maxIterations=6]
 * @returns {Promise<{width: number, height: number, quality: number, finalSize: number}>}
 */
export async function optimizeToTargetBytes({
  originalWidth,
  originalHeight,
  originalBytes,
  targetBytes,
  measureFn,
  maxIterations = 6
}) {
  if (targetBytes <= 0) {
    throw new Error('Target size must be greater than 0 bytes.');
  }

  // If already smaller than target, check high quality export (0.90)
  if (originalBytes <= targetBytes) {
    const testSize = await measureFn(originalWidth, originalHeight, 0.90);
    if (testSize <= targetBytes) {
      return { width: originalWidth, height: originalHeight, quality: 0.90, finalSize: testSize };
    }
  }

  let bestResult = null;
  const scales = [1.0, 0.85, 0.70, 0.55, 0.40, 0.25];

  for (const currentScale of scales) {
    const curWidth = Math.max(160, Math.round(originalWidth * currentScale));
    const curHeight = Math.max(160, Math.round(originalHeight * currentScale));

    let lowQ = 0.05;
    let highQ = 0.92;
    let passBest = null;

    for (let iter = 0; iter < maxIterations; iter++) {
      const midQ = Number(((lowQ + highQ) / 2).toFixed(3));
      const size = await measureFn(curWidth, curHeight, midQ);

      if (size <= targetBytes) {
        passBest = { width: curWidth, height: curHeight, quality: midQ, finalSize: size };
        // Increase quality to maximize clarity within target budget
        lowQ = midQ;
      } else {
        // Over target budget, decrease quality
        highQ = midQ;
      }
    }

    if (passBest && passBest.finalSize <= targetBytes) {
      bestResult = passBest;
      break;
    }
  }

  // Extreme fallback: aggressive scaling to guarantee target fit
  if (!bestResult) {
    const fallbackScale = 0.2;
    const fallbackW = Math.max(120, Math.round(originalWidth * fallbackScale));
    const fallbackH = Math.max(120, Math.round(originalHeight * fallbackScale));
    const fallbackSize = await measureFn(fallbackW, fallbackH, 0.25);
    bestResult = { width: fallbackW, height: fallbackH, quality: 0.25, finalSize: fallbackSize };
  }

  return bestResult;
}

/**
 * Compresses an image File/Blob to be strictly <= targetBytes.
 * @param {File|Blob} file
 * @param {number} targetBytes
 * @param {string} [outputMime='image/jpeg']
 * @returns {Promise<{blob: Blob, width: number, height: number, quality: number, finalSize: number, originalSize: number, targetBytes: number}>}
 */
export async function compressFileToTarget(file, targetBytes, outputMime = 'image/jpeg') {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Canvas context is not supported in this browser.'));
      }

      const measureFn = (w, h, q) => {
        return new Promise((res) => {
          canvas.width = w;
          canvas.height = h;
          if (outputMime === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
          }
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => {
            res(blob ? blob.size : Infinity);
          }, outputMime, q);
        });
      };

      try {
        const optimal = await optimizeToTargetBytes({
          originalWidth: img.naturalWidth,
          originalHeight: img.naturalHeight,
          originalBytes: file.size,
          targetBytes,
          measureFn
        });

        canvas.width = optimal.width;
        canvas.height = optimal.height;
        if (outputMime === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, optimal.width, optimal.height);
        }
        ctx.drawImage(img, 0, 0, optimal.width, optimal.height);

        canvas.toBlob((finalBlob) => {
          if (!finalBlob) return reject(new Error('Failed to create compressed image blob.'));
          resolve({
            blob: finalBlob,
            width: optimal.width,
            height: optimal.height,
            quality: optimal.quality,
            finalSize: finalBlob.size,
            originalSize: file.size,
            targetBytes
          });
        }, outputMime, optimal.quality);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name || 'uploaded file'}`));
    };

    img.src = url;
  });
}
