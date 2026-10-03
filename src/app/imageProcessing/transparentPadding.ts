import type { Rect, Size } from './imageLayout';

/** RGBA pixels, as `getImageData` returns them. */
export interface Pixels extends Size {
  data: ArrayLike<number>;
}

/** Alpha at or below this counts as transparent: soft shadows that fade out do not hold the crop open. */
const ALPHA_THRESHOLD = 8;
/** A crop that keeps at least this share of the longer side is not worth a re-encode. */
const KEEP_ABOVE = 0.95;

/** The box around every pixel that is not transparent, or null when all are. */
export function opaqueBounds({ data, width, height }: Pixels): Rect | null {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((data[(y * width + x) * 4 + 3] ?? 0) <= ALPHA_THRESHOLD) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  return right < 0 ? null : { left, top, width: right + 1 - left, height: bottom + 1 - top };
}

/**
 * What a padded image is cropped to: the square around its visible pixels,
 * centred on them, so the art stays centred in its token. Where that square
 * would leave the image, it is cut back to the image's edge; visible pixels
 * are never cropped. Null when the padding is negligible or the image is empty.
 */
export function paddingCrop(bounds: Rect | null, size: Size): Rect | null {
  if (!bounds) return null;
  const side = Math.max(bounds.width, bounds.height);
  const width = Math.min(side, size.width);
  const height = Math.min(side, size.height);
  if (Math.max(width, height) >= KEEP_ABOVE * Math.max(size.width, size.height)) return null;
  const clamp = (start: number, extent: number, limit: number): number => Math.min(Math.max(0, start), limit - extent);
  return {
    left: clamp(bounds.left + (bounds.width - width) / 2, width, size.width),
    top: clamp(bounds.top + (bounds.height - height) / 2, height, size.height),
    width,
    height,
  };
}

/** `crop`, measured on a copy `scale` times the size of the image, in the image's own pixels. */
export function scaleCrop(crop: Rect, scale: number, size: Size): Rect {
  const width = Math.min(size.width, Math.max(1, Math.round(crop.width / scale)));
  const height = Math.min(size.height, Math.max(1, Math.round(crop.height / scale)));
  return {
    left: Math.min(Math.max(0, Math.round(crop.left / scale)), size.width - width),
    top: Math.min(Math.max(0, Math.round(crop.top / scale)), size.height - height),
    width,
    height,
  };
}

/**
 * The crop for an image of `size` whose padding was measured on `probe`, a
 * copy scaled by `scale`. The visible box grows by one probe pixel, so art
 * that faded out in the smaller copy is not cut off.
 */
export function measuredPaddingCrop(probe: Pixels, scale: number, size: Size): Rect | null {
  const bounds = opaqueBounds(probe);
  if (!bounds) return null;
  const left = Math.max(0, bounds.left - 1);
  const top = Math.max(0, bounds.top - 1);
  const grown = {
    left, top,
    width: Math.min(probe.width, bounds.left + bounds.width + 1) - left,
    height: Math.min(probe.height, bounds.top + bounds.height + 1) - top,
  };
  const crop = paddingCrop(grown, probe);
  return crop && scaleCrop(crop, scale, size);
}
