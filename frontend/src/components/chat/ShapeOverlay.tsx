import { Box } from '@mui/material';
import type { ShapeAnnotation, ShapeKind } from '../../utils/imageEdit';

const PRIMARY = '#4F46E5';

type Props = {
  shapes: ShapeAnnotation[];
  draft: { x1: number; y1: number; x2: number; y2: number; kind: ShapeKind; color: string; strokeWidth: number } | null;
  selectedId: string | null;
  interactive: boolean;
  width: number;
  height: number;
  onSelect: (id: string) => void;
  onStartDrag: (id: string, e: React.PointerEvent) => void;
  onStartResize: (id: string, handle: string, e: React.PointerEvent) => void;
  onStartDraw: (e: React.PointerEvent) => void;
};

function ShapePath({ s }: { s: ShapeAnnotation }) {
  const { x1, y1, x2, y2, color, strokeWidth, kind } = s;
  if (kind === 'rect') {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    return <rect x={x} y={y} width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)} fill="none" stroke={color} strokeWidth={strokeWidth} />;
  }
  if (kind === 'circle') {
    return (
      <ellipse
        cx={(x1 + x2) / 2}
        cy={(y1 + y2) / 2}
        rx={Math.abs(x2 - x1) / 2}
        ry={Math.abs(y2 - y1) / 2}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    );
  }
  if (kind === 'line') {
    return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />;
  }
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 12 + strokeWidth;
  const ax1 = x2 - head * Math.cos(angle - 0.4);
  const ay1 = y2 - head * Math.sin(angle - 0.4);
  const ax2 = x2 - head * Math.cos(angle + 0.4);
  const ay2 = y2 - head * Math.sin(angle + 0.4);
  return (
    <g stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <line x1={x2} y1={y2} x2={ax1} y2={ay1} />
      <line x1={x2} y1={y2} x2={ax2} y2={ay2} />
    </g>
  );
}

function bbox(s: ShapeAnnotation) {
  if (s.kind === 'line' || s.kind === 'arrow') {
    const pad = 12;
    return {
      x: Math.min(s.x1, s.x2) - pad,
      y: Math.min(s.y1, s.y2) - pad,
      w: Math.abs(s.x2 - s.x1) + pad * 2,
      h: Math.abs(s.y2 - s.y1) + pad * 2,
    };
  }
  return {
    x: Math.min(s.x1, s.x2),
    y: Math.min(s.y1, s.y2),
    w: Math.abs(s.x2 - s.x1),
    h: Math.abs(s.y2 - s.y1),
  };
}

function Handle({ cx, cy, onDown }: { cx: number; cy: number; onDown: (e: React.PointerEvent) => void }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={7}
      fill="#fff"
      stroke={PRIMARY}
      strokeWidth={2}
      style={{ cursor: 'nwse-resize', touchAction: 'none' }}
      onPointerDown={(e) => { e.stopPropagation(); onDown(e); }}
    />
  );
}

export function ShapeOverlay({
  shapes, draft, selectedId, interactive, width, height,
  onSelect, onStartDrag, onStartResize, onStartDraw,
}: Props) {
  if (width <= 0 || height <= 0) return null;

  const selected = shapes.find((s) => s.id === selectedId);
  const selBox = selected ? bbox(selected) : null;

  return (
    <Box
      component="svg"
      width={width}
      height={height}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 2,
        pointerEvents: interactive ? 'auto' : 'none',
        touchAction: 'none',
      }}
    >
      {interactive && (
        <rect
          width="100%"
          height="100%"
          fill="transparent"
          onPointerDown={onStartDraw}
        />
      )}
      {shapes.map((s) => {
        const box = bbox(s);
        return (
          <g
            key={s.id}
            data-shape-overlay
            style={{ pointerEvents: interactive ? 'auto' : 'none', cursor: interactive ? 'move' : 'default' }}
            onPointerDown={(e) => {
              if (!interactive) return;
              e.stopPropagation();
              onSelect(s.id);
              onStartDrag(s.id, e);
            }}
          >
            <ShapePath s={s} />
            {(s.kind === 'line' || s.kind === 'arrow') ? (
              <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="transparent" strokeWidth={Math.max(20, s.strokeWidth + 12)} />
            ) : (
              <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="transparent" stroke="none" />
            )}
          </g>
        );
      })}
      {draft && <ShapePath s={{ id: 'draft', ...draft }} />}
      {interactive && selected && selBox && selBox.w > 2 && (
        <g>
          <rect
            x={selBox.x}
            y={selBox.y}
            width={selBox.w}
            height={selBox.h}
            fill="none"
            stroke={PRIMARY}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            style={{ pointerEvents: 'none' }}
          />
          {selected.kind === 'line' || selected.kind === 'arrow' ? (
            <>
              <Handle cx={selected.x1} cy={selected.y1} onDown={(e) => onStartResize(selected.id, 'p1', e)} />
              <Handle cx={selected.x2} cy={selected.y2} onDown={(e) => onStartResize(selected.id, 'p2', e)} />
            </>
          ) : (
            <>
              <Handle cx={selBox.x} cy={selBox.y} onDown={(e) => onStartResize(selected.id, 'nw', e)} />
              <Handle cx={selBox.x + selBox.w} cy={selBox.y} onDown={(e) => onStartResize(selected.id, 'ne', e)} />
              <Handle cx={selBox.x} cy={selBox.y + selBox.h} onDown={(e) => onStartResize(selected.id, 'sw', e)} />
              <Handle cx={selBox.x + selBox.w} cy={selBox.y + selBox.h} onDown={(e) => onStartResize(selected.id, 'se', e)} />
            </>
          )}
        </g>
      )}
    </Box>
  );
}
