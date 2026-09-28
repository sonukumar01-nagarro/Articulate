export const IMAGE_TARGET_BYTES = 180000;

// Runs inside the worker; WebP retains transparency as well as compressing photos.
export async function compressImage(file: Blob): Promise<Blob> {
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Choose a PNG or JPEG image.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose an image smaller than 20 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40000000) {
      throw new Error('Choose an image with fewer than 40 million pixels.');
    }
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * scale));
    let height = Math.max(1, Math.round(bitmap.height * scale));
    let best: Blob | undefined = scale === 1 ? file : undefined;
    for (let attempt = 0; attempt < 6; attempt++) {
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image compression is not supported in this browser.');
      context.drawImage(bitmap, 0, 0, width, height);
      for (const quality of [0.82, 0.68, 0.54]) {
        const compressed = await canvas.convertToBlob({ type: 'image/webp', quality });
        if (!best || compressed.size < best.size) best = compressed;
        if (compressed.size <= IMAGE_TARGET_BYTES) return best;
      }
      width = Math.max(1, Math.round(width * 0.8));
      height = Math.max(1, Math.round(height * 0.8));
    }
    if (best && best.size <= IMAGE_TARGET_BYTES) return best;
    throw new Error('This image is still too large after compression. Choose a smaller image.');
  } finally {
    bitmap.close();
  }
}
