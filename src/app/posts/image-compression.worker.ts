/// <reference lib="webworker" />
import { compressImage } from './image-compression';

addEventListener('message', async ({ data }: MessageEvent<Blob>) => {
  try {
    if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') {
      throw new Error('Image compression is not supported in this browser. Try an updated browser.');
    }
    const compressed = await compressImage(data);
    const dataUrl = new FileReaderSync().readAsDataURL(compressed);
    postMessage({ dataUrl });
  } catch (error) {
    postMessage({ error: error instanceof Error ? error.message : 'Could not process this image. Choose another PNG or JPEG.' });
  }
});
