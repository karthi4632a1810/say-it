import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { ImageFilterId } from './imageEdit';

export type VideoWatermarkPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export type VideoEditSettings = {
  trimStartSec: number;
  trimEndSec: number;
  filter: ImageFilterId;
  speed: number;
  watermark: { text: string; position: VideoWatermarkPosition } | null;
  mute: boolean;
  audioFile: File | null;
  quality: 'standard' | 'original';
};

export const VIDEO_SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export const VIDEO_FILTER_CSS: Record<ImageFilterId, string> = {
  none: 'none',
  pop: 'contrast(1.15) saturate(1.45) brightness(1.06)',
  bw: 'grayscale(1) contrast(1.05)',
  cool: 'saturate(0.85) hue-rotate(12deg) brightness(1.04)',
  chrome: 'contrast(1.25) saturate(1.15) brightness(1.08)',
  film: 'sepia(0.28) contrast(1.08) saturate(0.88) brightness(0.96)',
};

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

function getExt(name: string): string {
  const m = name.match(/\.[^.]+$/);
  return m ? m[0].toLowerCase() : '.mp4';
}

export function editedVideoFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'video';
  return `${base}-edited.mp4`;
}

export function getVideoDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const d = Number.isFinite(video.duration) ? video.duration : 0;
      resolve(d);
    };
    video.onerror = () => reject(new Error('Could not read video duration'));
    video.src = url;
  });
}

async function loadFfmpeg(onStatus?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  ffmpegLoadPromise = (async () => {
    onStatus?.('Loading video engine…');
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return ffmpegLoadPromise;
}

function filterToEq(filter: ImageFilterId): string | null {
  switch (filter) {
    case 'pop': return 'eq=contrast=1.15:saturation=1.45:brightness=0.06';
    case 'bw': return 'hue=s=0';
    case 'cool': return 'eq=saturation=0.85:brightness=0.04';
    case 'chrome': return 'eq=contrast=1.25:saturation=1.15:brightness=0.08';
    case 'film': return 'eq=sepia=0.28:contrast=1.08:saturation=0.88:brightness=0.96';
    default: return null;
  }
}

function overlayCoords(pos: VideoWatermarkPosition): string {
  switch (pos) {
    case 'bottom-right': return 'x=W-w-16:y=H-h-16';
    case 'bottom-left': return 'x=16:y=H-h-16';
    case 'top-right': return 'x=W-w-16:y=16';
    case 'top-left': return 'x=16:y=16';
  }
}

async function createWatermarkPng(text: string): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.font = 'bold 22px system-ui,sans-serif';
  const w = Math.ceil(ctx.measureText(text).width) + 24;
  canvas.width = w;
  canvas.height = 40;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, w, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui,sans-serif';
  ctx.fillText(text, 12, 28);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Watermark failed'))), 'image/png');
  });
  return new Uint8Array(await blob.arrayBuffer());
}

function buildVideoFilters(settings: VideoEditSettings): string[] {
  const parts: string[] = [];
  const eq = filterToEq(settings.filter);
  if (eq) parts.push(eq);

  if (settings.speed !== 1) parts.push(`setpts=PTS/${settings.speed}`);

  if (settings.quality === 'standard') {
    parts.push("scale='min(1280,iw)':-2");
  }

  return parts;
}

function buildAudioFilter(speed: number, mute: boolean, hasExternalAudio: boolean): string | null {
  if (mute || hasExternalAudio || speed === 1) return null;
  if (speed >= 0.5 && speed <= 2) return `atempo=${speed}`;
  return null;
}

export async function exportEditedVideo(
  sourceFile: File,
  settings: VideoEditSettings,
  callbacks?: {
    onProgress?: (pct: number) => void;
    onStatus?: (status: string) => void;
  },
): Promise<File> {
  const ffmpeg = await loadFfmpeg(callbacks?.onStatus);
  const inputName = `input${getExt(sourceFile.name)}`;
  const outputName = 'output.mp4';
  const duration = Math.max(0.1, settings.trimEndSec - settings.trimStartSec);
  const hasWatermark = Boolean(settings.watermark?.text.trim());
  const hasExternalAudio = Boolean(settings.audioFile);

  callbacks?.onStatus?.('Preparing files…');
  await ffmpeg.writeFile(inputName, await fetchFile(sourceFile));

  if (hasExternalAudio && settings.audioFile) {
    await ffmpeg.writeFile(`audio${getExt(settings.audioFile.name)}`, await fetchFile(settings.audioFile));
  }

  if (hasWatermark && settings.watermark) {
    await ffmpeg.writeFile('watermark.png', await createWatermarkPng(settings.watermark.text.trim()));
  }

  const args: string[] = [];
  if (settings.trimStartSec > 0) args.push('-ss', settings.trimStartSec.toFixed(3));
  args.push('-i', inputName);

  if (hasExternalAudio && settings.audioFile) {
    args.push('-i', `audio${getExt(settings.audioFile.name)}`);
  }
  if (hasWatermark) args.push('-i', 'watermark.png');

  args.push('-t', duration.toFixed(3));

  const vfParts = buildVideoFilters(settings);
  const wmPos = settings.watermark?.position ?? 'bottom-right';

  if (hasWatermark) {
    const base = vfParts.length ? `[0:v]${vfParts.join(',')}[v0]` : '[0:v]copy[v0]';
    const wmIdx = hasExternalAudio ? 2 : 1;
    const overlay = overlayCoords(wmPos).replace(/W/g, 'main_w').replace(/H/g, 'main_h');
    args.push(
      '-filter_complex',
      `${base};[v0][${wmIdx}:v]overlay=${overlay}[outv]`,
      '-map', '[outv]',
    );
  } else if (vfParts.length) {
    args.push('-vf', vfParts.join(','));
    args.push('-map', '0:v:0');
  } else {
    args.push('-map', '0:v:0');
  }

  if (hasExternalAudio) {
    args.push('-map', '1:a:0', '-shortest');
  } else if (settings.mute) {
    args.push('-an');
  } else {
    const af = buildAudioFilter(settings.speed, settings.mute, hasExternalAudio);
    if (af) args.push('-af', af);
    args.push('-map', '0:a:0?');
  }

  args.push(
    '-c:v', 'libx264',
    '-crf', settings.quality === 'standard' ? '28' : '20',
    '-preset', settings.quality === 'standard' ? 'fast' : 'medium',
    '-movflags', '+faststart',
  );

  if (!settings.mute || hasExternalAudio) {
    args.push('-c:a', 'aac', '-b:a', settings.quality === 'standard' ? '128k' : '192k');
  }

  args.push('-y', outputName);

  const progressHandler = ({ progress }: { progress: number }) => {
    callbacks?.onProgress?.(Math.min(100, Math.round(progress * 100)));
  };
  ffmpeg.on('progress', progressHandler);

  callbacks?.onStatus?.('Exporting video…');
  const code = await ffmpeg.exec(args);
  ffmpeg.off('progress', progressHandler);

  if (code !== 0) throw new Error('Video export failed');

  const data = await ffmpeg.readFile(outputName);
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
  const blob = new Blob([bytes as BlobPart], { type: 'video/mp4' });

  await ffmpeg.deleteFile(inputName).catch(() => undefined);
  await ffmpeg.deleteFile(outputName).catch(() => undefined);
  if (hasExternalAudio && settings.audioFile) {
    await ffmpeg.deleteFile(`audio${getExt(settings.audioFile.name)}`).catch(() => undefined);
  }
  if (hasWatermark) await ffmpeg.deleteFile('watermark.png').catch(() => undefined);

  return new File([blob], editedVideoFileName(sourceFile.name), { type: 'video/mp4' });
}
