export async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export type PixelCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ImageFilterId = 'none' | 'pop' | 'bw' | 'cool' | 'chrome' | 'film';

export const IMAGE_FILTERS: { id: ImageFilterId; label: string; css: string }[] = [
  { id: 'none', label: 'None', css: 'none' },
  { id: 'pop', label: 'Pop', css: 'contrast(1.15) saturate(1.45) brightness(1.06)' },
  { id: 'bw', label: 'B&W', css: 'grayscale(1) contrast(1.05)' },
  { id: 'cool', label: 'Cool', css: 'saturate(0.85) hue-rotate(12deg) brightness(1.04)' },
  { id: 'chrome', label: 'Chrome', css: 'contrast(1.25) saturate(1.15) brightness(1.08)' },
  { id: 'film', label: 'Film', css: 'sepia(0.28) contrast(1.08) saturate(0.88) brightness(0.96)' },
];

export function getFilterCss(id: ImageFilterId): string {
  return IMAGE_FILTERS.find((f) => f.id === id)?.css ?? 'none';
}

export function getRadianAngle(degree: number): number {
  return (degree * Math.PI) / 180;
}

export function rotateSize(width: number, height: number, rotation: number) {
  const rot = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rot) * width) + Math.abs(Math.sin(rot) * height),
    height: Math.abs(Math.sin(rot) * width) + Math.abs(Math.cos(rot) * height),
  };
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  rotation = 0,
): Promise<HTMLCanvasElement> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const maxSize = Math.max(image.naturalWidth, image.naturalHeight);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  canvas.width = safeArea;
  canvas.height = safeArea;

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.translate(-safeArea / 2, -safeArea / 2);
  ctx.drawImage(
    image,
    safeArea / 2 - image.naturalWidth * 0.5,
    safeArea / 2 - image.naturalHeight * 0.5,
  );

  const data = ctx.getImageData(0, 0, safeArea, safeArea);
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.naturalWidth * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.naturalHeight * 0.5 - pixelCrop.y),
  );

  return canvas;
}

export function getCroppedCanvas(
  image: HTMLImageElement,
  crop: PixelCrop,
  rotation = 0,
): HTMLCanvasElement {
  void rotation;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(crop.width));
  canvas.height = Math.max(1, Math.round(crop.height));
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to export image'))),
      mimeType,
      quality,
    );
  });
}

export function editedFileName(originalName: string, mimeType: string): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'image';
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  return `${base}-edited.${ext}`;
}

export function blobToFile(blob: Blob, name: string, mimeType: string): File {
  return new File([blob], name, { type: mimeType });
}

export async function exportCanvasAsFile(
  canvas: HTMLCanvasElement,
  originalName: string,
  mimeType: string,
  quality = 0.92,
): Promise<File> {
  const blob = await canvasToBlob(canvas, mimeType, quality);
  return blobToFile(blob, editedFileName(originalName, mimeType), mimeType);
}

export type TextAnnotation = {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  withBg: boolean;
};

export type EmojiAnnotation = {
  id: string;
  x: number;
  y: number;
  emoji: string;
  size: number;
};

export type BlurRegion = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  intensity: number;
};

export type ShapeKind = 'rect' | 'circle' | 'line' | 'arrow';

export type ShapeAnnotation = {
  id: string;
  kind: ShapeKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth: number;
};

export function drawShapeOnCanvas(
  ctx: CanvasRenderingContext2D,
  shape: ShapeAnnotation,
  scaleX: number,
  scaleY: number,
): void {
  const x1 = shape.x1 * scaleX;
  const y1 = shape.y1 * scaleY;
  const x2 = shape.x2 * scaleX;
  const y2 = shape.y2 * scaleY;
  const lw = shape.strokeWidth * ((scaleX + scaleY) / 2);
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (shape.kind === 'rect') {
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  } else if (shape.kind === 'circle') {
    ctx.beginPath();
    ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (shape.kind === 'line') {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  } else if (shape.kind === 'arrow') {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const head = 12 + lw;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - 0.4), y2 - head * Math.sin(angle - 0.4));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle + 0.4), y2 - head * Math.sin(angle + 0.4));
    ctx.stroke();
  }
}

/** Map blur strength slider (10–90) to CSS/canvas blur radius in px. Higher = stronger blur. */
export function intensityToBlurPx(intensity: number): number {
  const t = (Math.max(10, Math.min(90, intensity)) - 10) / 80;
  return Math.round(2 + t * 22);
}

export function blurRegionOnCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  intensity: number,
): void {
  const blurPx = intensityToBlurPx(intensity);
  if (blurPx <= 0 || w < 1 || h < 1) return;

  const src = ctx.canvas;
  const scratch = document.createElement('canvas');
  scratch.width = w;
  scratch.height = h;
  const sctx = scratch.getContext('2d');
  if (!sctx) return;
  sctx.filter = `blur(${blurPx}px)`;
  sctx.drawImage(src, x, y, w, h, 0, 0, w, h);
  ctx.drawImage(scratch, 0, 0, w, h, x, y, w, h);
}

export function pixelateRegion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  blockSize: number,
): void {
  const imageData = ctx.getImageData(x, y, w, h);
  const { data, width, height } = imageData;
  for (let py = 0; py < height; py += blockSize) {
    for (let px = 0; px < width; px += blockSize) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;
      for (let dy = 0; dy < blockSize && py + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && px + dx < width; dx++) {
          const i = ((py + dy) * width + (px + dx)) * 4;
          r += data[i] ?? 0;
          g += data[i + 1] ?? 0;
          b += data[i + 2] ?? 0;
          a += data[i + 3] ?? 0;
          count++;
        }
      }
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);
      a = Math.round(a / count);
      for (let dy = 0; dy < blockSize && py + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && px + dx < width; dx++) {
          const i = ((py + dy) * width + (px + dx)) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = a;
        }
      }
    }
  }
  ctx.putImageData(imageData, x, y);
}

export async function composeEditedImage(opts: {
  imageUrl: string;
  filter: ImageFilterId;
  overlayCanvas: HTMLCanvasElement | null;
  displayWidth: number;
  displayHeight: number;
  texts: TextAnnotation[];
  emojis: EmojiAnnotation[];
  blurRegions: BlurRegion[];
  shapes: ShapeAnnotation[];
  crop?: PixelCrop | null;
  rotation?: number;
  mimeType: string;
  quality: number;
}): Promise<HTMLCanvasElement> {
  let img = await loadImage(opts.imageUrl);

  if (opts.crop) {
    const cropped = await getCroppedImg(opts.imageUrl, opts.crop, opts.rotation ?? 0);
    const blob = await canvasToBlob(cropped, opts.mimeType, opts.quality);
    img = await loadImage(URL.createObjectURL(blob));
  }

  const out = document.createElement('canvas');
  out.width = img.naturalWidth;
  out.height = img.naturalHeight;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.filter = getFilterCss(opts.filter);
  ctx.drawImage(img, 0, 0);
  ctx.filter = 'none';

  const sx = out.width / opts.displayWidth;
  const sy = out.height / opts.displayHeight;

  for (const region of opts.blurRegions) {
    const x = Math.round(region.x * sx);
    const y = Math.round(region.y * sy);
    const w = Math.max(1, Math.round(region.w * sx));
    const h = Math.max(1, Math.round(region.h * sy));
    blurRegionOnCanvas(ctx, x, y, w, h, region.intensity);
  }

  if (opts.overlayCanvas && opts.overlayCanvas.width > 0) {
    ctx.drawImage(
      opts.overlayCanvas,
      0,
      0,
      opts.overlayCanvas.width,
      opts.overlayCanvas.height,
      0,
      0,
      out.width,
      out.height,
    );
  }

  for (const t of opts.texts) {
    const x = t.x * sx;
    const y = t.y * sy;
    const fontSize = t.fontSize * sx;
    ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    const metrics = ctx.measureText(t.text);
    if (t.withBg) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x - 6, y - 4, metrics.width + 12, fontSize + 10);
    }
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, x, y);
  }

  for (const e of opts.emojis) {
    const x = e.x * sx;
    const y = e.y * sy;
    const size = e.size * sx;
    ctx.font = `${size}px serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(e.emoji, x, y);
  }

  for (const s of opts.shapes) {
    drawShapeOnCanvas(ctx, s, sx, sy);
  }

  return out;
}
