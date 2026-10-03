import { afterAll, describe, expect, it } from 'vitest';
import { disposeImageProcessing, IMAGE_PRESETS, optimizeImage } from '../imageProcessing';

/** A transparent canvas of `side` pixels with an opaque disc of `disc` pixels in its middle, as token art padded for another VTT. */
async function paddedToken(side: number, disc: number): Promise<Blob> {
  const canvas = new OffscreenCanvas(side, side);
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#7a3b2e';
  context.beginPath();
  context.arc(side / 2, side / 2, disc / 2, 0, Math.PI * 2);
  context.fill();
  return canvas.convertToBlob({ type: 'image/png' });
}

/** Alpha at `x`, `y` of an encoded image, and its size. */
async function decoded(image: Blob): Promise<{ width: number; height: number; alphaAt: (x: number, y: number) => number }> {
  const bitmap = await createImageBitmap(image);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d')!;
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return { width: canvas.width, height: canvas.height, alphaAt: (x, y) => context.getImageData(x, y, 1, 1).data[3] ?? 0 };
}

describe('trimming padded token art with the real workers', () => {
  afterAll(disposeImageProcessing);

  it('crops the transparent margins so the art fills the token, and keeps it whole', async () => {
    // 1000 px canvas, 450 px creature: Foundry-style padding of 55 %.
    const source = await paddedToken(1000, 450);
    const kept = await decoded((await optimizeImage(source, IMAGE_PRESETS.token)).image);
    const trimmed = await decoded((await optimizeImage(source, IMAGE_PRESETS.token, { trim: true })).image);

    expect(kept.width).toBe(400);
    expect(kept.alphaAt(20, 200)).toBe(0);
    // The disc now spans the image, edge to edge, with nothing of it cut away.
    expect(trimmed.width).toBe(trimmed.height);
    expect(trimmed.width).toBeGreaterThanOrEqual(400 * 0.95);
    expect(trimmed.alphaAt(trimmed.width / 2, trimmed.height / 2)).toBe(255);
    expect(trimmed.alphaAt(8, trimmed.height / 2)).toBeGreaterThan(200);
    expect(trimmed.alphaAt(trimmed.width - 9, trimmed.height / 2)).toBeGreaterThan(200);
    expect(trimmed.alphaAt(2, 2)).toBe(0);
  });

  it('keeps art that already fills its canvas as it is', async () => {
    const source = await paddedToken(400, 398);
    const result = await optimizeImage(source, IMAGE_PRESETS.token, { trim: true });
    const image = await decoded(result.image);
    expect([image.width, image.height]).toEqual([400, 400]);
  });
});
