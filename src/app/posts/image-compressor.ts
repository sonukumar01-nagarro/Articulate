import { DestroyRef, inject, Injectable } from '@angular/core';

@Injectable()
export class ImageCompressor {
  private readonly jobs = new Set<() => void>();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.jobs.forEach(cancel => cancel()));
  }

  compress(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof Worker === 'undefined') {
        reject(new Error('Image compression is not supported in this browser. Try an updated browser.'));
        return;
      }
      const worker = new Worker(new URL('./image-compression.worker', import.meta.url), { type: 'module' });
      let timer: ReturnType<typeof setTimeout>;
      const finish = (error?: string, dataUrl?: string) => {
        clearTimeout(timer);
        worker.terminate();
        this.jobs.delete(cancel);
        if (error) reject(new Error(error));
        else resolve(dataUrl!);
      };
      const cancel = () => finish('Image compression was cancelled.');
      this.jobs.add(cancel);
      timer = setTimeout(() => finish('Image compression took too long. Try a smaller image.'), 30000);
      worker.onmessage = ({ data }: MessageEvent<{ dataUrl?: string; error?: string }>) => {
        if (data.error || !data.dataUrl) finish(data.error || 'Could not compress this image.');
        else finish(undefined, data.dataUrl);
      };
      worker.onerror = () => finish('Could not compress this image. Try a smaller PNG or JPEG.');
      worker.onmessageerror = () => finish('Could not read the compressed image. Please try again.');
      try { worker.postMessage(file); }
      catch { finish('Could not process this image. Please try again.'); }
    });
  }
}
