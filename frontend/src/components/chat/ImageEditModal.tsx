import { useCallback, useEffect, useRef, useState } from 'react';
import { type Area } from 'react-easy-crop';
import {
  Dialog, Box, Stack, IconButton, Typography, Slider, Button, Popover,
  TextField, ToggleButton, ToggleButtonGroup, alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import CropRotateIcon from '@mui/icons-material/CropRotate';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import EditIcon from '@mui/icons-material/Edit';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import BlurOnIcon from '@mui/icons-material/BlurOn';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import HdIcon from '@mui/icons-material/Hd';
import DownloadIcon from '@mui/icons-material/Download';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckIcon from '@mui/icons-material/Check';
import AddIcon from '@mui/icons-material/Add';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import {
  composeEditedImage, exportCanvasAsFile, canvasToBlob, getCroppedImg,
  IMAGE_FILTERS, type ImageFilterId, type TextAnnotation, type EmojiAnnotation,
  type BlurRegion, type ShapeKind, type ShapeAnnotation,
} from '../../utils/imageEdit';
import { ImageCropPanel } from './ImageCropPanel';
import { ShapeOverlay } from './ShapeOverlay';
import { BlurOverlay } from './BlurOverlay';

export type EditTool = 'crop' | 'filter' | 'draw' | 'text' | 'shape' | 'blur' | 'emoji' | 'sticker' | 'hd';

type EditorSnapshot = {
  canvasData: ImageData | null;
  canvasW: number;
  canvasH: number;
  texts: TextAnnotation[];
  emojis: EmojiAnnotation[];
  blurRegions: BlurRegion[];
  shapes: ShapeAnnotation[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName: string;
  mimeType: string;
  initialTool?: EditTool;
  onSave: (file: File) => void;
};

const DRAW_COLORS = ['#1e293b', '#64748b', '#ffffff', '#0EA5E9', '#4F46E5', '#22c55e', '#f97316', '#ef4444'];
const BRUSH_SIZES = [3, 6, 10, 16, 24];
const EMOJI_PICKS = ['😀', '😂', '😍', '🥳', '😎', '😢', '👍', '👎', '❤️', '🔥', '✨', '🎉', '⭐', '💯', '🙏', '👋'];
const STICKER_PICKS = ['🎈', '🎁', '🎂', '🏆', '💡', '🚀', '🌈', '☀️', '🌙', '⚡', '💎', '🎯'];

/** Matches frontend/src/config/theme.ts */
const UI = {
  primary: '#4F46E5',
  secondary: '#0EA5E9',
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#334155',
  textMuted: '#64748B',
  canvasBg: '#E2E8F0',
};

const NO_COPY_MEDIA_SX = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
} as const;

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement
    && Boolean(target.closest('input, textarea, [contenteditable="true"]'));
}

function blockImageCopyEvent(e: React.SyntheticEvent) {
  e.preventDefault();
}

function getOutputMimeType(mimeType: string): string {
  if (mimeType === 'image/png' || mimeType === 'image/webp') return 'image/png';
  return 'image/jpeg';
}

function ToolBtn({
  active, onClick, title, children,
}: { active?: boolean; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; title: string; children: React.ReactNode }) {
  return (
    <IconButton
      onClick={onClick}
      title={title}
      sx={{
        color: active ? UI.primary : UI.text,
        width: 40,
        height: 40,
        bgcolor: active ? alpha(UI.primary, 0.1) : 'transparent',
        border: active ? `2px solid ${UI.primary}` : '2px solid transparent',
        '&:hover': { bgcolor: alpha(UI.primary, 0.08) },
      }}
    >
      {children}
    </IconButton>
  );
}

function isStickerItem(e: EmojiAnnotation): boolean {
  return e.id.startsWith('stk-');
}

function EmojiOverlayItem({
  item, selected, interactive, onSelect, onPointerDown, onStartResize,
}: {
  item: EmojiAnnotation;
  selected: boolean;
  interactive: boolean;
  onSelect: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onStartResize: (e: React.PointerEvent) => void;
}) {
  return (
    <Box
      data-emoji-overlay
      onPointerDown={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        onSelect();
        onPointerDown(e);
      }}
      sx={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        fontSize: item.size,
        lineHeight: 1,
        border: selected ? `2px solid ${UI.primary}` : '2px solid transparent',
        boxShadow: selected ? `0 0 0 1px ${alpha(UI.primary, 0.35)}` : 'none',
        borderRadius: 1,
        pointerEvents: interactive ? 'auto' : 'none',
        cursor: interactive ? 'move' : 'default',
        userSelect: 'none',
        touchAction: 'none',
        zIndex: 3,
      }}
    >
      {item.emoji}
      {selected && interactive && (
        <Box
          onPointerDown={(e) => {
            e.stopPropagation();
            onStartResize(e);
          }}
          sx={{
            position: 'absolute',
            right: -9,
            bottom: -9,
            width: 18,
            height: 18,
            bgcolor: '#fff',
            border: `2.5px solid ${UI.primary}`,
            borderRadius: '50%',
            boxShadow: '0 1px 4px rgba(15,23,42,0.25)',
            cursor: 'nwse-resize',
            touchAction: 'none',
          }}
        />
      )}
    </Box>
  );
}

function TextOverlayItem({
  t, selected, interactive, onSelect, onPointerDown,
}: {
  t: TextAnnotation;
  selected: boolean;
  interactive: boolean;
  onSelect: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <Box
      data-text-overlay
      onPointerDown={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        onSelect();
        onPointerDown(e);
      }}
      sx={{
        position: 'absolute',
        left: t.x,
        top: t.y,
        color: t.color,
        fontWeight: 700,
        fontSize: t.fontSize,
        fontFamily: 'system-ui, sans-serif',
        lineHeight: 1.25,
        bgcolor: t.withBg ? alpha('#000', 0.55) : 'transparent',
        px: t.withBg ? 0.75 : 0,
        py: t.withBg ? 0.35 : 0,
        borderRadius: 1,
        border: selected ? `2px solid ${UI.primary}` : '2px solid transparent',
        boxShadow: selected ? `0 0 0 1px ${alpha(UI.primary, 0.35)}` : 'none',
        pointerEvents: interactive ? 'auto' : 'none',
        cursor: interactive ? 'move' : 'default',
        userSelect: 'none',
        touchAction: 'none',
        maxWidth: '90%',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        zIndex: 3,
      }}
    >
      {t.text}
    </Box>
  );
}

export function ImageEditModal({
  open, onClose, imageUrl, fileName, mimeType, initialTool = 'draw', onSave,
}: Props) {
  const [tool, setTool] = useState<EditTool>(initialTool);
  const [workingUrl, setWorkingUrl] = useState(imageUrl);
  const [saving, setSaving] = useState(false);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });

  const [filter, setFilter] = useState<ImageFilterId>('none');
  const [quality, setQuality] = useState<'standard' | 'hd'>('standard');

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [aspect, setAspect] = useState<number | undefined>(undefined);

  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(6);
  const [drawing, setDrawing] = useState(false);

  const [shapeKind, setShapeKind] = useState<ShapeKind>('rect');
  const [shapes, setShapes] = useState<ShapeAnnotation[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [shapeDraft, setShapeDraft] = useState<{
    x1: number; y1: number; x2: number; y2: number;
    kind: ShapeKind; color: string; strokeWidth: number;
  } | null>(null);
  const [shapePopover, setShapePopover] = useState<HTMLElement | null>(null);

  const [texts, setTexts] = useState<TextAnnotation[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textWithBg, setTextWithBg] = useState(true);
  const [textFontSize, setTextFontSize] = useState(22);

  const [emojis, setEmojis] = useState<EmojiAnnotation[]>([]);
  const [selectedEmojiId, setSelectedEmojiId] = useState<string | null>(null);
  const [emojiOverlaySize, setEmojiOverlaySize] = useState(36);
  const [pickedEmoji, setPickedEmoji] = useState<string | null>(null);
  const [pickedSticker, setPickedSticker] = useState<string | null>(null);

  const [blurRegions, setBlurRegions] = useState<BlurRegion[]>([]);
  const [blurDraft, setBlurDraft] = useState<{ x: number; y: number; w: number; h: number; intensity: number } | null>(null);
  const [blurIntensity, setBlurIntensity] = useState(50);
  const [selectedBlurId, setSelectedBlurId] = useState<string | null>(null);

  const [hdAnchor, setHdAnchor] = useState<HTMLElement | null>(null);

  const displayImgRef = useRef<HTMLImageElement>(null);
  const mediaGuardRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const undoStackRef = useRef<EditorSnapshot[]>([]);
  const redoStackRef = useRef<EditorSnapshot[]>([]);
  const workingUrlRevokedRef = useRef<string | null>(null);
  const dragTextRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const emojiDragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const emojiResizeRef = useRef<{ id: string; startX: number; startY: number; origSize: number } | null>(null);
  const shapeDraftRef = useRef<typeof shapeDraft>(null);
  const blurDrawAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const blurDraftRef = useRef<{ x: number; y: number; w: number; h: number; intensity: number } | null>(null);
  const blurDragRef = useRef<{ id: string; startX: number; startY: number; orig: BlurRegion } | null>(null);
  const blurResizeRef = useRef<{ id: string; handle: string; startX: number; startY: number; orig: BlurRegion } | null>(null);
  const shapeDragRef = useRef<{ id: string; startX: number; startY: number; orig: ShapeAnnotation } | null>(null);
  const shapeResizeRef = useRef<{ id: string; handle: string; startX: number; startY: number; orig: ShapeAnnotation } | null>(null);
  const emojisRef = useRef(emojis);
  const blurRef = useRef(blurRegions);
  const textsRef = useRef(texts);
  const shapesRef = useRef(shapes);
  textsRef.current = texts;
  emojisRef.current = emojis;
  blurRef.current = blurRegions;
  shapesRef.current = shapes;

  const outputMime = getOutputMimeType(mimeType);
  const exportQuality = quality === 'hd' ? 0.95 : 0.82;
  const filterCss = IMAGE_FILTERS.find((f) => f.id === filter)?.css ?? 'none';

  const syncOverlaySize = useCallback((preserve = true) => {
    const img = displayImgRef.current;
    const canvas = overlayRef.current;
    if (!img || !canvas) return;
    const w = img.clientWidth;
    const h = img.clientHeight;
    if (w <= 0 || h <= 0) return;

    if (canvas.width !== w || canvas.height !== h) {
      const prev = document.createElement('canvas');
      if (preserve && canvas.width > 0) {
        prev.width = canvas.width;
        prev.height = canvas.height;
        prev.getContext('2d')?.drawImage(canvas, 0, 0);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx && preserve && prev.width > 0) {
        ctx.drawImage(prev, 0, 0, prev.width, prev.height, 0, 0, w, h);
      }
    }
    setDisplaySize({ w, h });
  }, []);

  const captureSnapshot = useCallback((): EditorSnapshot => {
    const canvas = overlayRef.current;
    const ctx = canvas?.getContext('2d');
    return {
      canvasData: canvas && ctx && canvas.width > 0
        ? ctx.getImageData(0, 0, canvas.width, canvas.height)
        : null,
      canvasW: canvas?.width ?? 0,
      canvasH: canvas?.height ?? 0,
      texts: textsRef.current.map((t) => ({ ...t })),
      emojis: emojisRef.current.map((e) => ({ ...e })),
      blurRegions: blurRef.current.map((b) => ({ ...b })),
      shapes: shapesRef.current.map((s) => ({ ...s })),
    };
  }, []);

  const restoreSnapshot = useCallback((snap: EditorSnapshot) => {
    const canvas = overlayRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      if (snap.canvasData && snap.canvasW === canvas.width && snap.canvasH === canvas.height) {
        ctx.putImageData(snap.canvasData, 0, 0);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setTexts(snap.texts);
    setEmojis(snap.emojis);
    setBlurRegions(snap.blurRegions);
    setShapes(snap.shapes ?? []);
    setSelectedTextId(null);
    setSelectedBlurId(null);
    setSelectedShapeId(null);
    setSelectedEmojiId(null);
    setShapeDraft(null);
    shapeDraftRef.current = null;
    blurDrawAnchorRef.current = null;
    blurDraftRef.current = null;
    blurDragRef.current = null;
    blurResizeRef.current = null;
  }, []);

  const pushHistory = useCallback(() => {
    undoStackRef.current.push(captureSnapshot());
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    redoStackRef.current = [];
  }, [captureSnapshot]);

  const undo = useCallback(() => {
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    redoStackRef.current.push(captureSnapshot());
    restoreSnapshot(prev);
  }, [captureSnapshot, restoreSnapshot]);

  const redo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    undoStackRef.current.push(captureSnapshot());
    restoreSnapshot(next);
  }, [captureSnapshot, restoreSnapshot]);

  const updateTexts = useCallback((updater: (prev: TextAnnotation[]) => TextAnnotation[], recordHistory = true) => {
    if (recordHistory) pushHistory();
    setTexts(updater);
  }, [pushHistory]);

  const updateShapes = useCallback((updater: (prev: ShapeAnnotation[]) => ShapeAnnotation[], recordHistory = true) => {
    if (recordHistory) pushHistory();
    setShapes(updater);
  }, [pushHistory]);

  const updateBlurRegions = useCallback((updater: (prev: BlurRegion[]) => BlurRegion[], recordHistory = true) => {
    if (recordHistory) pushHistory();
    setBlurRegions(updater);
  }, [pushHistory]);

  const updateEmojis = useCallback((updater: (prev: EmojiAnnotation[]) => EmojiAnnotation[], recordHistory = true) => {
    if (recordHistory) pushHistory();
    setEmojis(updater);
  }, [pushHistory]);

  const resetEditor = useCallback(() => {
    if (workingUrlRevokedRef.current) {
      URL.revokeObjectURL(workingUrlRevokedRef.current);
      workingUrlRevokedRef.current = null;
    }
    setWorkingUrl(imageUrl);
    setTool(initialTool);
    setFilter('none');
    setQuality('standard');
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspect(undefined);
    setCroppedAreaPixels(null);
    setBrushColor('#ffffff');
    setBrushSize(6);
    setTexts([]);
    setSelectedTextId(null);
    setTextDraft('');
    setTextColor('#ffffff');
    setTextWithBg(true);
    setTextFontSize(22);
    setEmojis([]);
    setSelectedEmojiId(null);
    setEmojiOverlaySize(36);
    setBlurRegions([]);
    setBlurDraft(null);
    setShapes([]);
    setSelectedShapeId(null);
    setShapeDraft(null);
    shapeDraftRef.current = null;
    shapeDragRef.current = null;
    shapeResizeRef.current = null;
    blurDrawAnchorRef.current = null;
    blurDraftRef.current = null;
    blurDragRef.current = null;
    blurResizeRef.current = null;
    setSelectedBlurId(null);
    setPickedEmoji(null);
    setPickedSticker(null);
    setDisplaySize({ w: 0, h: 0 });
    undoStackRef.current = [];
    redoStackRef.current = [];
    overlayRef.current?.getContext('2d')?.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
  }, [imageUrl, initialTool]);

  useEffect(() => {
    if (open) resetEditor();
  }, [open, resetEditor]);

  useEffect(() => {
    if (!open) return;
    const img = displayImgRef.current;
    if (!img) return;
    const ro = new ResizeObserver(() => syncOverlaySize(true));
    ro.observe(img);
    return () => ro.disconnect();
  }, [open, workingUrl, syncOverlaySize]);

  useEffect(() => {
    if (!open) return;

    const onCopy = (e: ClipboardEvent) => {
      if (!isEditableTarget(e.target)) e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'c') return;
      if (!isEditableTarget(e.target)) e.preventDefault();
    };

    document.addEventListener('copy', onCopy, true);
    document.addEventListener('cut', onCopy, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('copy', onCopy, true);
      document.removeEventListener('cut', onCopy, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = mediaGuardRef.current;
    if (!root) return;

    const blockMediaEvent = (e: Event) => e.preventDefault();
    const imgs = root.querySelectorAll('img');
    imgs.forEach((img) => {
      img.setAttribute('draggable', 'false');
      img.style.setProperty('-webkit-user-drag', 'none');
      img.addEventListener('contextmenu', blockMediaEvent);
      img.addEventListener('dragstart', blockMediaEvent);
    });

    return () => {
      imgs.forEach((img) => {
        img.removeEventListener('contextmenu', blockMediaEvent);
        img.removeEventListener('dragstart', blockMediaEvent);
      });
    };
  }, [open, workingUrl, tool]);

  useEffect(() => {
    if (!selectedTextId) return;
    const t = textsRef.current.find((x) => x.id === selectedTextId);
    if (!t) return;
    setTextDraft(t.text);
    setTextColor(t.color);
    setTextWithBg(t.withBg);
    setTextFontSize(t.fontSize);
  }, [selectedTextId]);

  useEffect(() => {
    if (!selectedShapeId) return;
    const s = shapesRef.current.find((x) => x.id === selectedShapeId);
    if (!s) return;
    setBrushColor(s.color);
    setBrushSize(s.strokeWidth);
  }, [selectedShapeId]);

  useEffect(() => {
    if (!selectedBlurId) return;
    const b = blurRef.current.find((x) => x.id === selectedBlurId);
    if (!b) return;
    setBlurIntensity(b.intensity);
  }, [selectedBlurId]);

  useEffect(() => {
    if (!selectedEmojiId) return;
    const item = emojisRef.current.find((x) => x.id === selectedEmojiId);
    if (!item) return;
    setEmojiOverlaySize(item.size);
  }, [selectedEmojiId]);

  const getPoint = (e: React.PointerEvent) => {
    const canvas = overlayRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const getImgPoint = (clientX: number, clientY: number) => {
    const img = displayImgRef.current!;
    const rect = img.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== 'draw') return;
    e.preventDefault();
    const canvas = overlayRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    pushHistory();
    setDrawing(true);
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = getPoint(e);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = brushColor;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing || tool !== 'draw') return;
    e.preventDefault();
    const ctx = overlayRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    setDrawing(false);
    overlayRef.current?.releasePointerCapture(e.pointerId);
  };

  const startShapeDraw = (e: React.PointerEvent) => {
    if (tool !== 'shape') return;
    e.preventDefault();
    e.stopPropagation();
    const p = getImgPoint(e.clientX, e.clientY);
    const draft = { x1: p.x, y1: p.y, x2: p.x, y2: p.y, kind: shapeKind, color: brushColor, strokeWidth: brushSize };
    shapeDraftRef.current = draft;
    setShapeDraft(draft);
    workspaceRef.current?.setPointerCapture(e.pointerId);
  };

  const startShapeDrag = (id: string, e: React.PointerEvent) => {
    const s = shapes.find((x) => x.id === id);
    if (!s) return;
    setSelectedShapeId(id);
    shapeDragRef.current = { id, startX: e.clientX, startY: e.clientY, orig: { ...s } };
    pushHistory();
    workspaceRef.current?.setPointerCapture(e.pointerId);
  };

  const startShapeResize = (id: string, handle: string, e: React.PointerEvent) => {
    const s = shapes.find((x) => x.id === id);
    if (!s) return;
    setSelectedShapeId(id);
    shapeResizeRef.current = { id, handle, startX: e.clientX, startY: e.clientY, orig: { ...s } };
    pushHistory();
    workspaceRef.current?.setPointerCapture(e.pointerId);
  };

  const applyShapeResize = (orig: ShapeAnnotation, handle: string, dx: number, dy: number) => {
    let { x1, y1, x2, y2 } = orig;
    if (handle === 'nw') { x1 = orig.x1 + dx; y1 = orig.y1 + dy; }
    else if (handle === 'ne') { x2 = orig.x2 + dx; y1 = orig.y1 + dy; }
    else if (handle === 'sw') { x1 = orig.x1 + dx; y2 = orig.y2 + dy; }
    else if (handle === 'se') { x2 = orig.x2 + dx; y2 = orig.y2 + dy; }
    else if (handle === 'p1') { x1 = orig.x1 + dx; y1 = orig.y1 + dy; }
    else if (handle === 'p2') { x2 = orig.x2 + dx; y2 = orig.y2 + dy; }
    return { ...orig, x1, y1, x2, y2 };
  };

  const handleShapeColorChange = (color: string) => {
    setBrushColor(color);
    if (selectedShapeId) updateShapes((prev) => prev.map((s) => (s.id === selectedShapeId ? { ...s, color } : s)));
  };

  const handleShapeSizeChange = (size: number) => {
    setBrushSize(size);
    if (selectedShapeId) updateShapes((prev) => prev.map((s) => (s.id === selectedShapeId ? { ...s, strokeWidth: size } : s)));
  };

  const deleteSelectedShape = () => {
    if (!selectedShapeId) return;
    updateShapes((prev) => prev.filter((s) => s.id !== selectedShapeId));
    setSelectedShapeId(null);
  };

  const startBlurDraw = (e: React.PointerEvent) => {
    if (tool !== 'blur') return;
    e.preventDefault();
    e.stopPropagation();
    const p = getImgPoint(e.clientX, e.clientY);
    blurDrawAnchorRef.current = { x: p.x, y: p.y };
    const draft = { x: p.x, y: p.y, w: 0, h: 0, intensity: blurIntensity };
    blurDraftRef.current = draft;
    setBlurDraft(draft);
    workspaceRef.current?.setPointerCapture(e.pointerId);
  };

  const startBlurDrag = (id: string, e: React.PointerEvent) => {
    const b = blurRegions.find((x) => x.id === id);
    if (!b) return;
    setSelectedBlurId(id);
    blurDragRef.current = { id, startX: e.clientX, startY: e.clientY, orig: { ...b } };
    pushHistory();
    workspaceRef.current?.setPointerCapture(e.pointerId);
  };

  const startBlurResize = (id: string, handle: string, e: React.PointerEvent) => {
    const b = blurRegions.find((x) => x.id === id);
    if (!b) return;
    setSelectedBlurId(id);
    blurResizeRef.current = { id, handle, startX: e.clientX, startY: e.clientY, orig: { ...b } };
    pushHistory();
    workspaceRef.current?.setPointerCapture(e.pointerId);
  };

  const applyBlurResize = (orig: BlurRegion, handle: string, dx: number, dy: number): BlurRegion => {
    let { x, y, w, h } = orig;
    if (handle === 'nw') { x += dx; y += dy; w -= dx; h -= dy; }
    else if (handle === 'ne') { y += dy; w += dx; h -= dy; }
    else if (handle === 'sw') { x += dx; w -= dx; h += dy; }
    else if (handle === 'se') { w += dx; h += dy; }
    const min = 16;
    if (w < min) w = min;
    if (h < min) h = min;
    return { ...orig, x, y, w, h };
  };

  const handleBlurIntensityChange = (value: number, commit = false) => {
    setBlurIntensity(value);
    if (selectedBlurId) {
      setBlurRegions((prev) => prev.map((b) => (b.id === selectedBlurId ? { ...b, intensity: value } : b)));
      if (commit) pushHistory();
    }
    if (blurDraftRef.current) {
      const next = { ...blurDraftRef.current, intensity: value };
      blurDraftRef.current = next;
      setBlurDraft(next);
    }
  };

  const deleteSelectedBlur = () => {
    if (!selectedBlurId) return;
    updateBlurRegions((prev) => prev.filter((b) => b.id !== selectedBlurId));
    setSelectedBlurId(null);
  };

  const placeTextAt = (x: number, y: number) => {
    const content = textDraft.trim();
    if (!content) return;
    const id = `txt-${Date.now()}`;
    updateTexts((prev) => [...prev, {
      id, x, y, text: content, color: textColor, fontSize: textFontSize, withBg: textWithBg,
    }]);
    setSelectedTextId(id);
    setTextDraft('');
  };

  const applyTextDraftToSelected = (patch: Partial<TextAnnotation>, recordHistory = true) => {
    if (!selectedTextId) return;
    updateTexts((prev) => prev.map((t) => (t.id === selectedTextId ? { ...t, ...patch } : t)), recordHistory);
  };

  const handleTextDraftChange = (value: string) => {
    setTextDraft(value);
    if (selectedTextId) applyTextDraftToSelected({ text: value }, false);
  };

  const handleTextColorChange = (color: string) => {
    setTextColor(color);
    if (selectedTextId) applyTextDraftToSelected({ color });
  };

  const handleTextBgToggle = () => {
    const next = !textWithBg;
    setTextWithBg(next);
    if (selectedTextId) applyTextDraftToSelected({ withBg: next });
  };

  const handleTextFontSizeChange = (size: number) => {
    setTextFontSize(size);
    if (selectedTextId) applyTextDraftToSelected({ fontSize: size }, false);
  };

  const deleteSelectedText = () => {
    if (!selectedTextId) return;
    updateTexts((prev) => prev.filter((t) => t.id !== selectedTextId));
    setSelectedTextId(null);
    setTextDraft('');
  };

  const startTextDrag = (e: React.PointerEvent, id: string) => {
    const t = texts.find((x) => x.id === id);
    if (!t) return;
    dragTextRef.current = { id, startX: e.clientX, startY: e.clientY, origX: t.x, origY: t.y };
    pushHistory();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const placeEmojiAt = (x: number, y: number, emoji: string, sticker: boolean) => {
    const id = `${sticker ? 'stk' : 'em'}-${Date.now()}`;
    const size = sticker ? 64 : 36;
    updateEmojis((prev) => [...prev, { id, x, y, emoji, size }]);
    setSelectedEmojiId(id);
    setEmojiOverlaySize(size);
  };

  const startEmojiDrag = (e: React.PointerEvent, id: string) => {
    const item = emojis.find((x) => x.id === id);
    if (!item) return;
    setSelectedEmojiId(id);
    emojiDragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: item.x, origY: item.y };
    pushHistory();
    workspaceRef.current?.setPointerCapture(e.pointerId);
  };

  const startEmojiResize = (e: React.PointerEvent, id: string) => {
    const item = emojis.find((x) => x.id === id);
    if (!item) return;
    setSelectedEmojiId(id);
    emojiResizeRef.current = { id, startX: e.clientX, startY: e.clientY, origSize: item.size };
    pushHistory();
    workspaceRef.current?.setPointerCapture(e.pointerId);
  };

  const handleEmojiSizeChange = (size: number, commit = false) => {
    setEmojiOverlaySize(size);
    if (!selectedEmojiId) return;
    setEmojis((prev) => prev.map((item) => (item.id === selectedEmojiId ? { ...item, size } : item)));
    if (commit) pushHistory();
  };

  const deleteSelectedEmoji = () => {
    if (!selectedEmojiId) return;
    updateEmojis((prev) => prev.filter((item) => item.id !== selectedEmojiId));
    setSelectedEmojiId(null);
  };

  const handleWorkspacePointerMove = (e: React.PointerEvent) => {
    if (blurDrawAnchorRef.current && tool === 'blur') {
      const p = getImgPoint(e.clientX, e.clientY);
      const anchor = blurDrawAnchorRef.current;
      const next = {
        x: Math.min(anchor.x, p.x),
        y: Math.min(anchor.y, p.y),
        w: Math.abs(p.x - anchor.x),
        h: Math.abs(p.y - anchor.y),
        intensity: blurDraftRef.current?.intensity ?? blurIntensity,
      };
      blurDraftRef.current = next;
      setBlurDraft(next);
      return;
    }
    const blurResize = blurResizeRef.current;
    if (blurResize) {
      const dx = e.clientX - blurResize.startX;
      const dy = e.clientY - blurResize.startY;
      const next = applyBlurResize(blurResize.orig, blurResize.handle, dx, dy);
      setBlurRegions((prev) => prev.map((b) => (b.id === blurResize.id ? next : b)));
      return;
    }
    const blurDrag = blurDragRef.current;
    if (blurDrag) {
      const dx = e.clientX - blurDrag.startX;
      const dy = e.clientY - blurDrag.startY;
      setBlurRegions((prev) => prev.map((b) => (
        b.id === blurDrag.id
          ? { ...b, x: blurDrag.orig.x + dx, y: blurDrag.orig.y + dy }
          : b
      )));
      return;
    }
    if (shapeDraftRef.current && tool === 'shape') {
      const p = getImgPoint(e.clientX, e.clientY);
      const next = { ...shapeDraftRef.current, x2: p.x, y2: p.y };
      shapeDraftRef.current = next;
      setShapeDraft(next);
      return;
    }
    const resize = shapeResizeRef.current;
    if (resize) {
      const dx = e.clientX - resize.startX;
      const dy = e.clientY - resize.startY;
      const next = applyShapeResize(resize.orig, resize.handle, dx, dy);
      setShapes((prev) => prev.map((s) => (s.id === resize.id ? next : s)));
      return;
    }
    const shapeDrag = shapeDragRef.current;
    if (shapeDrag) {
      const dx = e.clientX - shapeDrag.startX;
      const dy = e.clientY - shapeDrag.startY;
      setShapes((prev) => prev.map((s) => (
        s.id === shapeDrag.id
          ? {
            ...s,
            x1: shapeDrag.orig.x1 + dx,
            y1: shapeDrag.orig.y1 + dy,
            x2: shapeDrag.orig.x2 + dx,
            y2: shapeDrag.orig.y2 + dy,
          }
          : s
      )));
      return;
    }
    const emojiResize = emojiResizeRef.current;
    if (emojiResize) {
      const dx = e.clientX - emojiResize.startX;
      const dy = e.clientY - emojiResize.startY;
      const delta = (dx + dy) / 2;
      const item = emojisRef.current.find((x) => x.id === emojiResize.id);
      const max = item && isStickerItem(item) ? 160 : 96;
      const min = item && isStickerItem(item) ? 24 : 16;
      const nextSize = Math.max(min, Math.min(max, Math.round(emojiResize.origSize + delta)));
      setEmojiOverlaySize(nextSize);
      setEmojis((prev) => prev.map((em) => (em.id === emojiResize.id ? { ...em, size: nextSize } : em)));
      return;
    }
    const emojiDrag = emojiDragRef.current;
    if (emojiDrag) {
      const dx = e.clientX - emojiDrag.startX;
      const dy = e.clientY - emojiDrag.startY;
      setEmojis((prev) => prev.map((em) => (
        em.id === emojiDrag.id ? { ...em, x: emojiDrag.origX + dx, y: emojiDrag.origY + dy } : em
      )));
      return;
    }
    const drag = dragTextRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    setTexts((prev) => prev.map((t) => (
      t.id === drag.id ? { ...t, x: drag.origX + dx, y: drag.origY + dy } : t
    )));
  };

  const handleWorkspacePointerUp = (e: React.PointerEvent) => {
    if (blurDrawAnchorRef.current) {
      const draft = blurDraftRef.current;
      if (draft && draft.w > 12 && draft.h > 12) {
        pushHistory();
        const id = `blur-${Date.now()}`;
        setBlurRegions((prev) => [...prev, { id, x: draft.x, y: draft.y, w: draft.w, h: draft.h, intensity: draft.intensity }]);
        setSelectedBlurId(id);
      }
      blurDrawAnchorRef.current = null;
      blurDraftRef.current = null;
      setBlurDraft(null);
    }
    if (blurDragRef.current || blurResizeRef.current) {
      blurDragRef.current = null;
      blurResizeRef.current = null;
    }
    if (shapeDraftRef.current) {
      const draft = shapeDraftRef.current;
      if (Math.abs(draft.x2 - draft.x1) > 6 || Math.abs(draft.y2 - draft.y1) > 6) {
        pushHistory();
        const id = `shape-${Date.now()}`;
        setShapes((prev) => [...prev, {
          id,
          kind: draft.kind,
          x1: draft.x1,
          y1: draft.y1,
          x2: draft.x2,
          y2: draft.y2,
          color: draft.color,
          strokeWidth: draft.strokeWidth,
        }]);
        setSelectedShapeId(id);
      }
      shapeDraftRef.current = null;
      setShapeDraft(null);
    }
    if (shapeDragRef.current || shapeResizeRef.current) {
      shapeDragRef.current = null;
      shapeResizeRef.current = null;
    }
    if (emojiDragRef.current || emojiResizeRef.current) {
      emojiDragRef.current = null;
      emojiResizeRef.current = null;
    }
    if (dragTextRef.current) {
      dragTextRef.current = null;
    }
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { /* not captured */ }
  };

  const handleWorkspacePointerDown = (e: React.PointerEvent) => {
    if (tool === 'text') {
      if ((e.target as HTMLElement).closest('[data-text-overlay]')) return;
      if (textDraft.trim()) {
        const p = getImgPoint(e.clientX, e.clientY);
        placeTextAt(p.x, p.y);
      } else {
        setSelectedTextId(null);
        setTextDraft('');
      }
      return;
    }
    if (tool === 'emoji' || tool === 'sticker') {
      if ((e.target as HTMLElement).closest('[data-emoji-overlay]')) return;
      setSelectedEmojiId(null);
    }
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'draw') startDraw(e);
    else if (tool === 'emoji' && pickedEmoji) {
      const p = getImgPoint(e.clientX, e.clientY);
      placeEmojiAt(p.x, p.y, pickedEmoji, false);
    } else if (tool === 'sticker' && pickedSticker) {
      const p = getImgPoint(e.clientX, e.clientY);
      placeEmojiAt(p.x, p.y, pickedSticker, true);
    }
  };

  const transformOverlaysForCrop = (cropArea: Area) => {
    const img = displayImgRef.current;
    if (!img || displaySize.w <= 0) {
      return {
        texts: [] as TextAnnotation[],
        emojis: [] as EmojiAnnotation[],
        blurRegions: [] as BlurRegion[],
        shapes: [] as ShapeAnnotation[],
      };
    }

    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    const toNat = (x: number, y: number) => ({ x: x * (natW / displaySize.w), y: y * (natH / displaySize.h) });
    const fromCropNorm = (relX: number, relY: number) => ({ x: relX * displaySize.w, y: relY * displaySize.h });

    const newTexts = texts
      .map((t) => {
        const { x: nx, y: ny } = toNat(t.x, t.y);
        const relX = (nx - cropArea.x) / cropArea.width;
        const relY = (ny - cropArea.y) / cropArea.height;
        if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return null;
        const pos = fromCropNorm(relX, relY);
        return { ...t, x: pos.x, y: pos.y };
      })
      .filter((t): t is TextAnnotation => t !== null);

    const newEmojis = emojis
      .map((em) => {
        const { x: nx, y: ny } = toNat(em.x, em.y);
        const relX = (nx - cropArea.x) / cropArea.width;
        const relY = (ny - cropArea.y) / cropArea.height;
        if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return null;
        const pos = fromCropNorm(relX, relY);
        return { ...em, x: pos.x, y: pos.y };
      })
      .filter((em): em is EmojiAnnotation => em !== null);

    const newBlur = blurRegions
      .map((b) => {
        const tl = toNat(b.x, b.y);
        const br = toNat(b.x + b.w, b.y + b.h);
        const nx = Math.max(tl.x, cropArea.x);
        const ny = Math.max(tl.y, cropArea.y);
        const nx2 = Math.min(br.x, cropArea.x + cropArea.width);
        const ny2 = Math.min(br.y, cropArea.y + cropArea.height);
        if (nx2 <= nx || ny2 <= ny) return null;
        const relX = (nx - cropArea.x) / cropArea.width;
        const relY = (ny - cropArea.y) / cropArea.height;
        const pos = fromCropNorm(relX, relY);
        return { ...b, x: pos.x, y: pos.y, w: ((nx2 - nx) / cropArea.width) * displaySize.w, h: ((ny2 - ny) / cropArea.height) * displaySize.h };
      })
      .filter((b): b is BlurRegion => b !== null);

    const newShapes = shapes
      .map((s) => {
        const p1 = toNat(s.x1, s.y1);
        const p2 = toNat(s.x2, s.y2);
        const rel1x = (p1.x - cropArea.x) / cropArea.width;
        const rel1y = (p1.y - cropArea.y) / cropArea.height;
        const rel2x = (p2.x - cropArea.x) / cropArea.width;
        const rel2y = (p2.y - cropArea.y) / cropArea.height;
        const cx = (rel1x + rel2x) / 2;
        const cy = (rel1y + rel2y) / 2;
        if (cx < 0 || cx > 1 || cy < 0 || cy > 1) return null;
        const pos1 = fromCropNorm(rel1x, rel1y);
        const pos2 = fromCropNorm(rel2x, rel2y);
        return { ...s, x1: pos1.x, y1: pos1.y, x2: pos2.x, y2: pos2.y };
      })
      .filter((s): s is ShapeAnnotation => s !== null);

    return { texts: newTexts, emojis: newEmojis, blurRegions: newBlur, shapes: newShapes };
  };

  const applyCropToWorking = async () => {
    if (!croppedAreaPixels) return;
    const transformed = transformOverlaysForCrop(croppedAreaPixels);
    const cropped = await getCroppedImg(workingUrl, croppedAreaPixels, rotation);
    const blob = await canvasToBlob(cropped, outputMime, exportQuality);
    const nextUrl = URL.createObjectURL(blob);
    if (workingUrl !== imageUrl) {
      if (workingUrlRevokedRef.current) URL.revokeObjectURL(workingUrlRevokedRef.current);
      else URL.revokeObjectURL(workingUrl);
    } else {
      workingUrlRevokedRef.current = nextUrl;
    }
    setWorkingUrl(nextUrl);
    setRotation(0);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    overlayRef.current?.getContext('2d')?.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setTexts(transformed.texts);
    setEmojis(transformed.emojis);
    setBlurRegions(transformed.blurRegions);
    setShapes(transformed.shapes);
    setSelectedTextId(null);
    setSelectedShapeId(null);
    setSelectedEmojiId(null);
  };

  const buildExportCanvas = async (cropOverride?: Area | null) => {
    const cropArea = cropOverride ?? (tool === 'crop' ? croppedAreaPixels : null);
    return composeEditedImage({
      imageUrl: workingUrl,
      filter,
      overlayCanvas: overlayRef.current,
      displayWidth: displaySize.w || 1,
      displayHeight: displaySize.h || 1,
      texts,
      emojis,
      blurRegions,
      shapes,
      crop: cropArea,
      rotation: cropArea ? rotation : 0,
      mimeType: outputMime,
      quality: exportQuality,
    });
  };

  const handleDone = async () => {
    setSaving(true);
    try {
      const cropArea = tool === 'crop' ? croppedAreaPixels : null;
      const out = await buildExportCanvas(cropArea);
      const file = await exportCanvasAsFile(out, fileName, outputMime, exportQuality);
      onSave(file);
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    const out = await buildExportCanvas(tool === 'crop' ? croppedAreaPixels : null);
    const blob = await canvasToBlob(out, outputMime, exportQuality);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleClose = () => {
    if (workingUrl !== imageUrl) {
      if (workingUrlRevokedRef.current !== workingUrl) URL.revokeObjectURL(workingUrl);
    }
    if (workingUrlRevokedRef.current) {
      URL.revokeObjectURL(workingUrlRevokedRef.current);
      workingUrlRevokedRef.current = null;
    }
    onClose();
  };

  const switchTool = async (next: EditTool) => {
    if (tool === 'crop' && next !== 'crop' && croppedAreaPixels) {
      await applyCropToWorking();
    }
    if (tool === 'text') setSelectedTextId(null);
    if (tool === 'shape') {
      setSelectedShapeId(null);
      setShapeDraft(null);
      shapeDraftRef.current = null;
    }
    if (tool === 'blur') {
      setSelectedBlurId(null);
      setBlurDraft(null);
      blurDrawAnchorRef.current = null;
      blurDraftRef.current = null;
    }
    if (tool === 'emoji' || tool === 'sticker') {
      setSelectedEmojiId(null);
    }
    setTool(next);
  };

  const canvasInteractive = tool === 'draw'
    || (tool === 'emoji' && !!pickedEmoji)
    || (tool === 'sticker' && !!pickedSticker);

  const emojiStickerInteractive = tool === 'emoji' || tool === 'sticker';
  const selectedBlur = blurRegions.find((b) => b.id === selectedBlurId);
  const selectedEmoji = emojis.find((e) => e.id === selectedEmojiId);
  const selectedEmojiIsSticker = selectedEmoji ? isStickerItem(selectedEmoji) : false;

  return (
    <Dialog fullScreen open={open} onClose={handleClose} PaperProps={{ sx: { bgcolor: UI.bg, display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ px: 1.5, py: 0.75, bgcolor: UI.surface, borderBottom: '1px solid', borderColor: UI.border, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <Stack direction="row" alignItems="center" spacing={0.25} sx={{ overflowX: 'auto' }}>
          <ToolBtn title="Close" onClick={handleClose}><CloseIcon /></ToolBtn>
          <ToolBtn title="Undo" onClick={undo}><UndoIcon /></ToolBtn>
          <ToolBtn title="Redo" onClick={redo}><RedoIcon /></ToolBtn>
          <ToolBtn title="Crop & rotate" active={tool === 'crop'} onClick={() => switchTool('crop')}><CropRotateIcon /></ToolBtn>
          <ToolBtn title="Filters" active={tool === 'filter'} onClick={() => switchTool('filter')}><AutoFixHighIcon /></ToolBtn>
          <ToolBtn title="Draw" active={tool === 'draw'} onClick={() => switchTool('draw')}><EditIcon /></ToolBtn>
          <ToolBtn title="Text" active={tool === 'text'} onClick={() => switchTool('text')}><TextFieldsIcon /></ToolBtn>
          <ToolBtn title="Shapes" active={tool === 'shape'} onClick={(e) => { switchTool('shape'); setShapePopover(e.currentTarget); }}><CropSquareIcon /></ToolBtn>
          <ToolBtn title="Blur" active={tool === 'blur'} onClick={() => switchTool('blur')}><BlurOnIcon /></ToolBtn>
          <ToolBtn title="Emoji" active={tool === 'emoji'} onClick={() => switchTool('emoji')}><EmojiEmotionsIcon /></ToolBtn>
          <ToolBtn title="Stickers" active={tool === 'sticker'} onClick={() => switchTool('sticker')}><StickyNote2Icon /></ToolBtn>
          <ToolBtn title="HD quality" active={tool === 'hd'} onClick={(e) => { switchTool('hd'); setHdAnchor(e.currentTarget); }}><HdIcon /></ToolBtn>
          <Box sx={{ flex: 1 }} />
          <Button onClick={handleDone} disabled={saving} variant="contained" color="primary" sx={{ fontWeight: 700, minWidth: 72, borderRadius: 2, textTransform: 'none', boxShadow: 'none' }}>
            {saving ? '…' : 'Done'}
          </Button>
          <ToolBtn title="Download" onClick={handleDownload}><DownloadIcon /></ToolBtn>
        </Stack>
      </Box>

      <Box
        ref={mediaGuardRef}
        onContextMenu={blockImageCopyEvent}
        onDragStart={blockImageCopyEvent}
        sx={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: UI.canvasBg, ...NO_COPY_MEDIA_SX }}
      >
        {tool === 'crop' ? (
          <ImageCropPanel
            imageUrl={workingUrl}
            aspect={aspect}
            rotation={rotation}
            zoom={zoom}
            crop={crop}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={setCroppedAreaPixels}
          />
        ) : (
          <Box
            ref={workspaceRef}
            onPointerDown={handleWorkspacePointerDown}
            onPointerMove={handleWorkspacePointerMove}
            onPointerUp={handleWorkspacePointerUp}
            onPointerLeave={handleWorkspacePointerUp}
            onContextMenu={blockImageCopyEvent}
            onDragStart={blockImageCopyEvent}
            sx={{ position: 'relative', lineHeight: 0, maxWidth: '100%', maxHeight: 'calc(100vh - 140px)', touchAction: 'none', ...NO_COPY_MEDIA_SX }}
          >
            <Box
              component="img"
              ref={displayImgRef}
              src={workingUrl}
              alt={fileName}
              draggable={false}
              onLoad={() => syncOverlaySize(false)}
              onContextMenu={blockImageCopyEvent}
              onDragStart={blockImageCopyEvent}
              sx={{
                display: 'block',
                maxWidth: '100vw',
                maxHeight: 'calc(100vh - 140px)',
                objectFit: 'contain',
                filter: filterCss === 'none' ? undefined : filterCss,
                pointerEvents: 'none',
                WebkitUserDrag: 'none',
                ...NO_COPY_MEDIA_SX,
              }}
            />
            <canvas
              ref={overlayRef}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={(e) => { if (tool === 'draw') moveDraw(e); }}
              onPointerUp={(e) => { if (tool === 'draw') endDraw(e); }}
              onPointerLeave={(e) => { if (tool === 'draw') endDraw(e); }}
              onContextMenu={blockImageCopyEvent}
              onDragStart={blockImageCopyEvent}
              style={{ position: 'absolute', top: 0, left: 0, width: displaySize.w > 0 ? displaySize.w : undefined, height: displaySize.h > 0 ? displaySize.h : undefined, pointerEvents: canvasInteractive ? 'auto' : 'none', cursor: tool === 'draw' ? 'crosshair' : 'default', touchAction: 'none', zIndex: 1, userSelect: 'none' }}
            />
            <BlurOverlay
              regions={blurRegions}
              draft={blurDraft}
              selectedId={selectedBlurId}
              interactive={tool === 'blur'}
              width={displaySize.w}
              height={displaySize.h}
              onSelect={setSelectedBlurId}
              onStartDrag={startBlurDrag}
              onStartResize={startBlurResize}
              onStartDraw={startBlurDraw}
            />
            <ShapeOverlay
              shapes={shapes}
              draft={shapeDraft}
              selectedId={selectedShapeId}
              interactive={tool === 'shape'}
              width={displaySize.w}
              height={displaySize.h}
              onSelect={setSelectedShapeId}
              onStartDrag={startShapeDrag}
              onStartResize={startShapeResize}
              onStartDraw={startShapeDraw}
            />
            {texts.map((t) => (
              <TextOverlayItem key={t.id} t={t} selected={selectedTextId === t.id} interactive={tool === 'text'} onSelect={() => setSelectedTextId(t.id)} onPointerDown={(e) => startTextDrag(e, t.id)} />
            ))}
            {emojis.map((e) => (
              <EmojiOverlayItem
                key={e.id}
                item={e}
                selected={selectedEmojiId === e.id}
                interactive={emojiStickerInteractive}
                onSelect={() => setSelectedEmojiId(e.id)}
                onPointerDown={(ev) => startEmojiDrag(ev, e.id)}
                onStartResize={(ev) => startEmojiResize(ev, e.id)}
              />
            ))}
          </Box>
        )}
      </Box>

      <Box sx={{ bgcolor: UI.surface, borderTop: '1px solid', borderColor: UI.border, minHeight: 72, px: 2, py: 1.5, boxShadow: '0 -1px 3px rgba(15,23,42,0.04)' }}>
        {tool === 'crop' && (
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            {[{ label: 'Free', value: undefined }, { label: '1:1', value: 1 }, { label: '4:3', value: 4 / 3 }, { label: '16:9', value: 16 / 9 }].map((a) => (
              <Button key={a.label} size="small" variant={aspect === a.value ? 'contained' : 'outlined'} color="primary" onClick={() => { setAspect(a.value); setCrop({ x: 0, y: 0 }); setZoom(1); }}>{a.label}</Button>
            ))}
            <IconButton onClick={() => setRotation((r) => (r + 90) % 360)} color="primary" title="Rotate"><RotateRightIcon /></IconButton>
            <Box sx={{ width: 120 }}><Slider size="small" min={1} max={3} step={0.05} value={zoom} onChange={(_, v) => setZoom(v as number)} color="primary" /></Box>
            <Button variant="contained" color="success" startIcon={<CheckIcon />} onClick={applyCropToWorking} disabled={!croppedAreaPixels}>Apply</Button>
          </Stack>
        )}

        {tool === 'filter' && (
          <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto' }}>
            {IMAGE_FILTERS.map((f) => (
              <Box key={f.id} onClick={() => setFilter(f.id)} sx={{ cursor: 'pointer', textAlign: 'center', flexShrink: 0 }}>
                <Box component="img" src={workingUrl} alt={f.label} sx={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 1, border: filter === f.id ? `2px solid ${UI.primary}` : '2px solid transparent', filter: f.css === 'none' ? undefined : f.css }} />
                <Typography variant="caption" sx={{ color: filter === f.id ? 'primary.main' : 'text.secondary', display: 'block', mt: 0.5, fontWeight: filter === f.id ? 600 : 400 }}>{f.label}</Typography>
              </Box>
            ))}
          </Stack>
        )}

        {tool === 'draw' && (
          <Stack direction="row" alignItems="center" spacing={2}>
            <Stack direction="row" spacing={0.75}>
              {DRAW_COLORS.map((c) => (
                <Box key={c} onClick={() => setBrushColor(c)} sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: c, border: brushColor === c ? `3px solid ${UI.primary}` : `2px solid ${UI.border}`, cursor: 'pointer' }} />
              ))}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              {BRUSH_SIZES.map((s) => (
                <Box key={s} onClick={() => setBrushSize(s)} sx={{ width: s + 8, height: s + 8, borderRadius: '50%', bgcolor: brushColor, border: brushSize === s ? `2px solid ${UI.primary}` : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </Stack>
          </Stack>
        )}

        {tool === 'shape' && (
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
              <Stack direction="row" spacing={0.75}>
                {DRAW_COLORS.map((c) => (
                  <Box key={c} onClick={() => handleShapeColorChange(c)} sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: c, border: brushColor === c ? `3px solid ${UI.primary}` : `2px solid ${UI.border}`, cursor: 'pointer' }} />
                ))}
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                {BRUSH_SIZES.map((s) => (
                  <Box key={s} onClick={() => handleShapeSizeChange(s)} sx={{ width: s + 8, height: s + 8, borderRadius: '50%', bgcolor: brushColor, border: brushSize === s ? `2px solid ${UI.primary}` : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </Stack>
              {selectedShapeId && (
                <IconButton onClick={deleteSelectedShape} sx={{ color: '#ef4444' }} title="Delete shape"><DeleteOutlineIcon /></IconButton>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {selectedShapeId ? 'Selected · drag to move · corner handles to resize' : `Drag on image to draw · ${shapes.length} shape${shapes.length !== 1 ? 's' : ''}`}
            </Typography>
          </Stack>
        )}

        {tool === 'text' && (
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
              <Stack direction="row" spacing={0.75}>
                {DRAW_COLORS.map((c) => (
                  <Box key={c} onClick={() => handleTextColorChange(c)} sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: c, border: textColor === c ? `2px solid ${UI.primary}` : `2px solid ${UI.border}`, cursor: 'pointer' }} />
                ))}
              </Stack>
              <TextField
                size="small"
                placeholder={selectedTextId ? 'Edit selected text' : 'Type text, tap image to place'}
                value={textDraft}
                onChange={(e) => handleTextDraftChange(e.target.value)}
                sx={{ flex: 1, minWidth: 160, bgcolor: UI.bg, borderRadius: 1 }}
              />
              <IconButton onClick={() => { if (textDraft.trim()) placeTextAt((displaySize.w || 200) / 2, (displaySize.h || 200) / 2); }} disabled={!textDraft.trim()} color="primary" title="Add at center"><AddIcon /></IconButton>
              <ToggleButton size="small" value="bg" selected={textWithBg} onChange={handleTextBgToggle} color="primary">Background</ToggleButton>
              {selectedTextId && (
                <IconButton onClick={deleteSelectedText} sx={{ color: '#ef4444' }} title="Delete text"><DeleteOutlineIcon /></IconButton>
              )}
            </Stack>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 32 }}>Size</Typography>
              <Slider size="small" min={14} max={48} value={textFontSize} onChange={(_, v) => handleTextFontSizeChange(v as number)} onChangeCommitted={() => { if (selectedTextId) pushHistory(); }} color="primary" sx={{ maxWidth: 200 }} />
              <Typography variant="caption" color="text.secondary">
                {selectedTextId ? 'Selected · drag to move' : `${texts.length} layer${texts.length !== 1 ? 's' : ''} · tap image to add`}
              </Typography>
            </Stack>
          </Stack>
        )}

        {tool === 'blur' && (
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
              <BlurOnIcon color="primary" />
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
                {selectedBlurId ? 'Selected blur area' : 'Drag on image to blur'}
              </Typography>
              <Typography variant="caption" color="text.secondary">Strength</Typography>
              <Slider
                size="small"
                min={10}
                max={90}
                value={blurIntensity}
                onChange={(_, v) => handleBlurIntensityChange(v as number)}
                onChangeCommitted={(_, v) => handleBlurIntensityChange(v as number, true)}
                color="primary"
                sx={{ width: 160 }}
              />
              {selectedBlur && (
                <IconButton color="error" onClick={deleteSelectedBlur} title="Delete blur"><DeleteOutlineIcon /></IconButton>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {selectedBlurId ? 'Drag to move · corner handles to resize · slider changes blur strength' : `${blurRegions.length} blur area${blurRegions.length !== 1 ? 's' : ''}`}
            </Typography>
          </Stack>
        )}

        {tool === 'emoji' && (
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} sx={{ overflowX: 'auto' }} alignItems="center">
              {EMOJI_PICKS.map((em) => (
                <Box key={em} onClick={() => setPickedEmoji(em)} sx={{ fontSize: 28, cursor: 'pointer', p: 0.5, borderRadius: 1, bgcolor: pickedEmoji === em ? alpha(UI.primary, 0.12) : 'transparent', border: pickedEmoji === em ? `1px solid ${UI.primary}` : '1px solid transparent' }}>{em}</Box>
              ))}
              {selectedEmoji && !selectedEmojiIsSticker && (
                <IconButton onClick={deleteSelectedEmoji} sx={{ color: '#ef4444', ml: 1 }} title="Delete"><DeleteOutlineIcon /></IconButton>
              )}
            </Stack>
            {selectedEmoji && !selectedEmojiIsSticker ? (
              <Stack direction="row" alignItems="center" spacing={2}>
                <Typography variant="caption" color="text.secondary">Size</Typography>
                <Slider size="small" min={16} max={96} value={emojiOverlaySize} onChange={(_, v) => handleEmojiSizeChange(v as number)} onChangeCommitted={(_, v) => handleEmojiSizeChange(v as number, true)} color="primary" sx={{ maxWidth: 200 }} />
                <Typography variant="caption" color="text.secondary">Selected · drag to move · corner handle to scale</Typography>
              </Stack>
            ) : (
              <Typography variant="caption" color="text.secondary">Pick emoji, tap image to place · tap placed emoji to move or scale</Typography>
            )}
          </Stack>
        )}

        {tool === 'sticker' && (
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} sx={{ overflowX: 'auto' }} alignItems="center">
              {STICKER_PICKS.map((em) => (
                <Box key={em} onClick={() => setPickedSticker(em)} sx={{ fontSize: 36, cursor: 'pointer', p: 0.5, borderRadius: 1, bgcolor: pickedSticker === em ? alpha(UI.primary, 0.12) : 'transparent', border: pickedSticker === em ? `1px solid ${UI.primary}` : '1px solid transparent' }}>{em}</Box>
              ))}
              {selectedEmoji && selectedEmojiIsSticker && (
                <IconButton onClick={deleteSelectedEmoji} sx={{ color: '#ef4444', ml: 1 }} title="Delete"><DeleteOutlineIcon /></IconButton>
              )}
            </Stack>
            {selectedEmoji && selectedEmojiIsSticker ? (
              <Stack direction="row" alignItems="center" spacing={2}>
                <Typography variant="caption" color="text.secondary">Size</Typography>
                <Slider size="small" min={24} max={160} value={emojiOverlaySize} onChange={(_, v) => handleEmojiSizeChange(v as number)} onChangeCommitted={(_, v) => handleEmojiSizeChange(v as number, true)} color="primary" sx={{ maxWidth: 200 }} />
                <Typography variant="caption" color="text.secondary">Selected · drag to move · corner handle to scale</Typography>
              </Stack>
            ) : (
              <Typography variant="caption" color="text.secondary">Pick sticker, tap image to place · tap placed sticker to move or scale</Typography>
            )}
          </Stack>
        )}

        {tool === 'hd' && (
          <Typography variant="body2" color="text.secondary">{quality === 'hd' ? 'HD quality — clearer, larger file' : 'Standard quality — faster to send'}</Typography>
        )}
      </Box>

      <Popover open={Boolean(shapePopover)} anchorEl={shapePopover} onClose={() => setShapePopover(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Stack direction="row" spacing={1} sx={{ p: 1.5, bgcolor: UI.surface }}>
          {([['rect', <CropSquareIcon key="r" color="primary" />], ['circle', <RadioButtonUncheckedIcon key="c" color="primary" />], ['line', <HorizontalRuleIcon key="l" color="primary" />], ['arrow', <ArrowForwardIcon key="a" color="primary" />]] as const).map(([kind, icon]) => (
            <IconButton key={kind} onClick={() => { setShapeKind(kind); setShapePopover(null); }} sx={{ bgcolor: shapeKind === kind ? alpha(UI.primary, 0.12) : UI.bg, border: shapeKind === kind ? `1px solid ${UI.primary}` : `1px solid ${UI.border}` }}>{icon}</IconButton>
          ))}
        </Stack>
      </Popover>

      <Popover open={Boolean(hdAnchor)} anchorEl={hdAnchor} onClose={() => setHdAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Box sx={{ p: 2, bgcolor: UI.surface, minWidth: 260 }}>
          <ToggleButtonGroup exclusive fullWidth value={quality} onChange={(_, v) => v && setQuality(v)} color="primary" sx={{ mb: 1 }}>
            <ToggleButton value="standard">Standard</ToggleButton>
            <ToggleButton value="hd">HD</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary">HD photos are clearer. Standard photos use less storage and send faster.</Typography>
        </Box>
      </Popover>
    </Dialog>
  );
}
