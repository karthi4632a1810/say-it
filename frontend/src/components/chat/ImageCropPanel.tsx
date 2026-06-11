import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper, { type Area, type MediaSize } from 'react-easy-crop';
import { Box, Typography } from '@mui/material';

const PRIMARY = '#4F46E5';
const MIN_CROP = 96;

type CropSize = { width: number; height: number };

type Props = {
  imageUrl: string;
  aspect?: number;
  rotation: number;
  zoom: number;
  crop: { x: number; y: number };
  onCropChange: (crop: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onRotationChange: (rotation: number) => void;
  onCropComplete: (area: Area) => void;
};

type Corner = 'nw' | 'ne' | 'sw' | 'se';

function initCropSize(containerW: number, containerH: number): CropSize {
  const w = Math.round(Math.min(containerW, containerH) * 0.72);
  const h = Math.round(w * 0.72);
  return {
    width: Math.min(w, containerW - 24),
    height: Math.min(h, containerH - 24),
  };
}

function CornerHandle({
  left, top, corner, onDragStart, onDragMove, onDragEnd,
}: {
  left: number;
  top: number;
  corner: Corner;
  onDragStart: (corner: Corner, e: React.PointerEvent) => void;
  onDragMove: (e: React.PointerEvent) => void;
  onDragEnd: (e: React.PointerEvent) => void;
}) {
  return (
    <Box
      onPointerDown={(e) => { e.stopPropagation(); onDragStart(corner, e); }}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
      sx={{
        position: 'absolute',
        left: left - 9,
        top: top - 9,
        width: 18,
        height: 18,
        bgcolor: '#fff',
        border: `2.5px solid ${PRIMARY}`,
        borderRadius: '50%',
        boxShadow: '0 1px 4px rgba(15,23,42,0.25)',
        zIndex: 20,
        cursor: `${corner}-resize`,
        touchAction: 'none',
      }}
    />
  );
}

export function ImageCropPanel({
  imageUrl, aspect, rotation, zoom, crop,
  onCropChange, onZoomChange, onRotationChange, onCropComplete,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [cropSize, setCropSize] = useState<CropSize | null>(null);
  const resizeRef = useRef<{
    corner: Corner;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const isFree = aspect === undefined;

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w > 0 && h > 0) setContainerSize({ w, h });
  }, []);

  useEffect(() => {
    measure();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    if (!isFree || containerSize.w <= 0) return;
    setCropSize((prev) => prev ?? initCropSize(containerSize.w, containerSize.h));
  }, [isFree, containerSize.w, containerSize.h]);

  useEffect(() => {
    if (!isFree) setCropSize(null);
  }, [isFree]);

  const onMediaLoaded = useCallback((media: MediaSize) => {
    measure();
    if (!isFree) return;
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w > 0 && h > 0) setCropSize(initCropSize(w, h));
    void media;
  }, [isFree, measure]);

  const startCornerDrag = (corner: Corner, e: React.PointerEvent) => {
    if (!cropSize) return;
    resizeRef.current = {
      corner,
      startX: e.clientX,
      startY: e.clientY,
      startW: cropSize.width,
      startH: cropSize.height,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onCornerMove = (e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r || !containerSize.w) return;
    const dx = e.clientX - r.startX;
    const dy = e.clientY - r.startY;
    let w = r.startW;
    let h = r.startH;

    if (r.corner === 'se') { w += dx; h += dy; }
    else if (r.corner === 'sw') { w -= dx; h += dy; }
    else if (r.corner === 'ne') { w += dx; h -= dy; }
    else { w -= dx; h -= dy; }

    w = Math.max(MIN_CROP, Math.min(w, containerSize.w - 16));
    h = Math.max(MIN_CROP, Math.min(h, containerSize.h - 16));
    setCropSize({ width: Math.round(w), height: Math.round(h) });
  };

  const endCornerDrag = (e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    resizeRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const cropRect = cropSize && containerSize.w > 0 ? {
    left: (containerSize.w - cropSize.width) / 2,
    top: (containerSize.h - cropSize.height) / 2,
    width: cropSize.width,
    height: cropSize.height,
  } : null;

  return (
    <Box
      ref={containerRef}
      sx={{ position: 'absolute', inset: 0, bgcolor: '#E2E8F0' }}
    >
      <Cropper
        image={imageUrl}
        crop={crop}
        zoom={zoom}
        rotation={rotation}
        {...(isFree && cropSize ? { cropSize } : {})}
        {...(!isFree && aspect !== undefined ? { aspect } : {})}
        showGrid
        zoomWithScroll
        objectFit="contain"
        restrictPosition={false}
        onCropChange={onCropChange}
        onZoomChange={onZoomChange}
        onRotationChange={onRotationChange}
        onCropComplete={(_, area) => onCropComplete(area)}
        onMediaLoaded={onMediaLoaded}
        style={{
          containerStyle: { background: '#E2E8F0' },
          cropAreaStyle: {
            border: `2px solid ${PRIMARY}`,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.45)',
          },
        }}
      />

      {isFree && cropRect && (
        <>
          <Box
            sx={{
              position: 'absolute',
              left: cropRect.left,
              top: cropRect.top,
              width: cropRect.width,
              height: cropRect.height,
              border: `1px dashed rgba(255,255,255,0.5)`,
              pointerEvents: 'none',
              zIndex: 15,
            }}
          />
          <CornerHandle left={cropRect.left} top={cropRect.top} corner="nw" onDragStart={startCornerDrag} onDragMove={onCornerMove} onDragEnd={endCornerDrag} />
          <CornerHandle left={cropRect.left + cropRect.width} top={cropRect.top} corner="ne" onDragStart={startCornerDrag} onDragMove={onCornerMove} onDragEnd={endCornerDrag} />
          <CornerHandle left={cropRect.left} top={cropRect.top + cropRect.height} corner="sw" onDragStart={startCornerDrag} onDragMove={onCornerMove} onDragEnd={endCornerDrag} />
          <CornerHandle left={cropRect.left + cropRect.width} top={cropRect.top + cropRect.height} corner="se" onDragStart={startCornerDrag} onDragMove={onCornerMove} onDragEnd={endCornerDrag} />
        </>
      )}

      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          bgcolor: 'rgba(255,255,255,0.92)',
          color: '#64748B',
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          zIndex: 20,
          pointerEvents: 'none',
          boxShadow: '0 1px 3px rgba(15,23,42,0.1)',
        }}
      >
        {isFree ? 'Drag image to move · drag corner dots to resize crop' : 'Drag image to position · scroll or slider to zoom'}
      </Typography>
    </Box>
  );
}
