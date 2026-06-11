import { Box } from '@mui/material';
import { intensityToBlurPx, type BlurRegion } from '../../utils/imageEdit';

const PRIMARY = '#4F46E5';
const SECONDARY = '#0EA5E9';

type Draft = { x: number; y: number; w: number; h: number; intensity: number };

type Props = {
  regions: BlurRegion[];
  draft: Draft | null;
  selectedId: string | null;
  interactive: boolean;
  width: number;
  height: number;
  onSelect: (id: string) => void;
  onStartDrag: (id: string, e: React.PointerEvent) => void;
  onStartResize: (id: string, handle: string, e: React.PointerEvent) => void;
  onStartDraw: (e: React.PointerEvent) => void;
};

function BlurRect({
  x, y, w, h, intensity, selected, dashed, onPointerDown,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  intensity: number;
  selected?: boolean;
  dashed?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  const blurPx = intensityToBlurPx(intensity);
  if (w < 1 || h < 1) return null;

  return (
    <Box
      data-blur-overlay
      onPointerDown={onPointerDown}
      sx={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        backdropFilter: `blur(${blurPx}px)`,
        WebkitBackdropFilter: `blur(${blurPx}px)`,
        border: dashed
          ? `2px dashed ${PRIMARY}`
          : `2px solid ${selected ? PRIMARY : SECONDARY}`,
        boxShadow: selected ? `0 0 0 1px ${PRIMARY}33` : 'none',
        cursor: onPointerDown ? 'move' : 'default',
        touchAction: 'none',
        zIndex: 2,
        pointerEvents: onPointerDown ? 'auto' : 'none',
        overflow: 'hidden',
      }}
    />
  );
}

function Handle({ left, top, onDown }: { left: number; top: number; onDown: (e: React.PointerEvent) => void }) {
  return (
    <Box
      onPointerDown={(e) => { e.stopPropagation(); onDown(e); }}
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
        zIndex: 4,
        cursor: 'nwse-resize',
        touchAction: 'none',
      }}
    />
  );
}

export function BlurOverlay({
  regions, draft, selectedId, interactive, width, height,
  onSelect, onStartDrag, onStartResize, onStartDraw,
}: Props) {
  if (width <= 0 || height <= 0) return null;

  const selected = regions.find((b) => b.id === selectedId);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        zIndex: 2,
        pointerEvents: interactive ? 'auto' : 'none',
        touchAction: 'none',
        cursor: interactive ? 'crosshair' : 'default',
      }}
    >
      {interactive && (
        <Box
          sx={{ position: 'absolute', inset: 0, zIndex: 0 }}
          onPointerDown={onStartDraw}
        />
      )}
      {regions.map((b) => (
        <BlurRect
          key={b.id}
          x={b.x}
          y={b.y}
          w={b.w}
          h={b.h}
          intensity={b.intensity}
          selected={selectedId === b.id}
          onPointerDown={interactive ? (e) => {
            e.stopPropagation();
            onSelect(b.id);
            onStartDrag(b.id, e);
          } : undefined}
        />
      ))}
      {draft && (
        <BlurRect x={draft.x} y={draft.y} w={draft.w} h={draft.h} intensity={draft.intensity} dashed />
      )}
      {interactive && selected && selected.w > 12 && selected.h > 12 && (
        <>
          <Handle left={selected.x} top={selected.y} onDown={(e) => onStartResize(selected.id, 'nw', e)} />
          <Handle left={selected.x + selected.w} top={selected.y} onDown={(e) => onStartResize(selected.id, 'ne', e)} />
          <Handle left={selected.x} top={selected.y + selected.h} onDown={(e) => onStartResize(selected.id, 'sw', e)} />
          <Handle left={selected.x + selected.w} top={selected.y + selected.h} onDown={(e) => onStartResize(selected.id, 'se', e)} />
        </>
      )}
    </Box>
  );
}
