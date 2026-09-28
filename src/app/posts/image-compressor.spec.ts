import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageCompressor } from './image-compressor';

describe('Image compression worker lifecycle', () => {
  let worker: WorkerStub;
  class WorkerStub {
    onmessage?: (event: { data: { dataUrl?: string; error?: string } }) => void;
    onerror?: () => void;
    onmessageerror?: () => void;
    postMessage = vi.fn();
    terminate = vi.fn();
    constructor() { worker = this; }
  }
  beforeEach(() => {
    vi.stubGlobal('Worker', WorkerStub);
    TestBed.configureTestingModule({ providers: [ImageCompressor] });
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('sends the original file and terminates after receiving compressed base64', async () => {
    const file = new File(['image'], 'photo.png', { type: 'image/png' });
    const pending = TestBed.inject(ImageCompressor).compress(file);
    expect(worker.postMessage).toHaveBeenCalledWith(file);
    worker.onmessage!({ data: { dataUrl: 'data:image/webp;base64,UklGRg==' } });
    expect(await pending).toBe('data:image/webp;base64,UklGRg==');
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('terminates stalled workers after 30 seconds', async () => {
    vi.useFakeTimers();
    const pending = TestBed.inject(ImageCompressor).compress(new File(['x'], 'photo.png'));
    const failure = expect(pending).rejects.toThrow('took too long');
    vi.advanceTimersByTime(30000);
    await failure;
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('cancels pending work when the editor service is destroyed', async () => {
    const pending = TestBed.inject(ImageCompressor).compress(new File(['x'], 'photo.png'));
    const failure = expect(pending).rejects.toThrow('cancelled');
    TestBed.resetTestingModule();
    await failure;
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
