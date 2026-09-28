import { afterEach, describe, expect, it, vi } from 'vitest';
import { compressImage } from './image-compression';

describe('Image compression worker algorithm', () => {
  afterEach(() => vi.unstubAllGlobals());

  function canvas(bitmapWidth: number, bitmapHeight: number, sizes: number[]) {
    const close = vi.fn();
    const drawImage = vi.fn();
    const dimensions: number[][] = [];
    const convert = vi.fn(async () => new Blob(['x'.repeat(sizes.shift() ?? 90000)], { type: 'image/webp' }));
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: bitmapWidth, height: bitmapHeight, close }));
    vi.stubGlobal('OffscreenCanvas', class {
      constructor(width: number, height: number) { dimensions.push([width, height]); }
      getContext() { return { drawImage }; }
      convertToBlob = convert;
    });
    return { close, dimensions, convert };
  }

  it('resizes proportionally, reduces quality until the target is met and releases the bitmap', async () => {
    const { dimensions, convert, close } = canvas(4000, 2000, [240000, 150000]);
    const result = await compressImage(new Blob(['x'.repeat(500000)], { type: 'image/jpeg' }));
    expect(dimensions).toEqual([[1600, 800]]);
    expect(convert).toHaveBeenNthCalledWith(1, { type: 'image/webp', quality: 0.82 });
    expect(convert).toHaveBeenNthCalledWith(2, { type: 'image/webp', quality: 0.68 });
    expect(result.size).toBe(150000);
    expect(result.type).toBe('image/webp');
    expect(close).toHaveBeenCalledOnce();
  });

  it('does not enlarge a smaller original file', async () => {
    const { dimensions } = canvas(100, 50, [1000]);
    const file = new Blob(['small'], { type: 'image/png' });
    expect(await compressImage(file)).toBe(file);
    expect(dimensions).toEqual([[100, 50]]);
  });

  it('rejects unreadable and oversized input without silently inserting it', async () => {
    await expect(compressImage(new Blob(['bad'], { type: 'text/plain' }))).rejects.toThrow('PNG or JPEG');
    const { close } = canvas(10000, 10000, []);
    await expect(compressImage(new Blob(['x'], { type: 'image/png' }))).rejects.toThrow('40 million');
    expect(close).toHaveBeenCalledOnce();
  });
});
