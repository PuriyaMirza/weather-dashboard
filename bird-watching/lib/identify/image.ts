'use client';

/*
  Browser-side image prep. Every pixel sent to Claude is input tokens (≈ width × height / 750), so
  the identify call gets a small square around the bird, not the whole frame; the copy kept in the
  log is the whole photo, downsized so a season of sightings fits on the phone.
*/

/** Long edge of the crop sent for identification: ~790 tokens, plenty for field marks. */
export const ID_CROP_PX = 768;
/** Long edge of the photo kept with the sighting. */
export const KEEP_PX = 1600;
/** The crop covers this share of the photo's shorter side, centred on the tap. */
const CROP_SHARE = 0.5;

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable image'));
    };
    image.src = url;
  });
}

function draw(image: HTMLImageElement, sx: number, sy: number, sw: number, sh: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  canvas.getContext('2d')!.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Source rectangle of a square crop centred on (fx, fy), given as fractions of the photo, kept inside it. */
export function cropRect(width: number, height: number, fx: number, fy: number) {
  const side = Math.round(Math.min(width, height) * CROP_SHARE);
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);
  return {
    x: Math.round(clamp(fx * width - side / 2, width - side)),
    y: Math.round(clamp(fy * height - side / 2, height - side)),
    side,
  };
}

/**
 * The image Claude sees: a square around the tapped point, or — with no tap — the whole photo.
 * Re-encoding drops EXIF, so no location metadata leaves the phone.
 */
export function identifyCanvas(image: HTMLImageElement, tap: { fx: number; fy: number } | null) {
  const w = image.naturalWidth;
  const h = image.naturalHeight;
  if (!tap) return draw(image, 0, 0, w, h, 1024);
  const { x, y, side } = cropRect(w, h, tap.fx, tap.fy);
  return draw(image, x, y, side, side, ID_CROP_PX);
}

export function keepCanvas(image: HTMLImageElement) {
  return draw(image, 0, 0, image.naturalWidth, image.naturalHeight, KEEP_PX);
}

export function toBase64Jpeg(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1] ?? '';
}

export function toJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))), 'image/jpeg', 0.85),
  );
}
