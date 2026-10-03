import { describe, expect, it } from 'vitest';
import { measuredPaddingCrop, opaqueBounds, paddingCrop, scaleCrop } from '../../src/app/imageProcessing/transparentPadding';

function pixels(width: number, height: number, opaque: (x: number, y: number) => boolean) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (opaque(x, y)) data[(y * width + x) * 4 + 3] = 255;
  return { data, width, height };
}

describe('transparent padding', () => {
  it('crops padded art to the square around its visible pixels, centred on them', () => {
    const padded = pixels(100, 100, (x, y) => x >= 30 && x < 70 && y >= 25 && y < 75);
    const bounds = opaqueBounds(padded);
    expect(bounds).toEqual({ left: 30, top: 25, width: 40, height: 50 });
    expect(paddingCrop(bounds, padded)).toEqual({ left: 25, top: 25, width: 50, height: 50 });
  });

  it('ignores faint pixels such as a fading shadow', () => {
    const art = pixels(10, 10, (x, y) => x === 5 && y === 5);
    art.data[3] = 8;
    expect(opaqueBounds(art)).toEqual({ left: 5, top: 5, width: 1, height: 1 });
  });

  it('leaves art that already fills its canvas, and empty images, alone', () => {
    const round = pixels(100, 100, (x, y) => (x - 49.5) ** 2 + (y - 49.5) ** 2 < 49.5 ** 2);
    expect(paddingCrop(opaqueBounds(round), round)).toBeNull();
    const empty = pixels(10, 10, () => false);
    expect(opaqueBounds(empty)).toBeNull();
    expect(paddingCrop(null, empty)).toBeNull();
  });

  it('never cuts visible pixels where the square would leave the image', () => {
    // A long creature in a wide canvas: the square around it is taller than the canvas.
    const wide = pixels(100, 60, (x, y) => x >= 5 && x < 95 && y >= 20 && y < 40);
    expect(paddingCrop(opaqueBounds(wide), wide)).toEqual({ left: 5, top: 0, width: 90, height: 60 });
  });

  it('measures on a small copy and crops the full image, with a pixel of slack', () => {
    const probe = pixels(100, 100, (x, y) => x >= 30 && x < 70 && y >= 30 && y < 70);
    expect(measuredPaddingCrop(probe, 0.25, { width: 400, height: 400 })).toEqual({ left: 116, top: 116, width: 168, height: 168 });
    expect(scaleCrop({ left: 90, top: 90, width: 20, height: 20 }, 0.5, { width: 200, height: 200 })).toEqual({ left: 160, top: 160, width: 40, height: 40 });
  });
});
