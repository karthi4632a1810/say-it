import { useEffect, useState } from 'react';
import {
  Box, IconButton, Paper, Typography, Stack, LinearProgress, Chip, alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CropIcon from '@mui/icons-material/Crop';
import BrushIcon from '@mui/icons-material/Brush';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';
import MicIcon from '@mui/icons-material/Mic';
import { getPreviewKind, formatFileSize, type PreviewKind } from '../../utils/fileTypes';
import { LocalFilePreviewModal } from './LocalFilePreviewModal';
import { ImageEditModal, type EditTool } from './ImageEditModal';
import { VideoEditModal } from './VideoEditModal';
import { VideoPreviewCard } from './VideoPreviewCard';

type Props = {
  name: string;
  mimeType: string;
  previewUrl: string;
  sizeBytes?: number;
  status: 'uploading' | 'ready' | 'error';
  onRemove: () => void;
  onImageEdited?: (file: File) => void;
  onVideoEdited?: (file: File) => void;
  sourceFile?: File;
};

const PREVIEW_H = 136;

function KindBadge({ kind }: { kind: PreviewKind }) {
  const map = {
    image: { label: 'Photo', icon: <ImageOutlinedIcon sx={{ fontSize: 12 }} /> },
    video: { label: 'Video', icon: <MovieOutlinedIcon sx={{ fontSize: 12 }} /> },
    audio: { label: 'Voice', icon: <MicIcon sx={{ fontSize: 12 }} /> },
    pdf: { label: 'PDF', icon: <PictureAsPdfIcon sx={{ fontSize: 12 }} /> },
    other: { label: 'File', icon: <InsertDriveFileOutlinedIcon sx={{ fontSize: 12 }} /> },
  };
  const { label, icon } = map[kind];
  return (
    <Chip
      size="small"
      icon={icon}
      label={label}
      sx={{
        height: 22,
        fontSize: 11,
        fontWeight: 600,
        bgcolor: 'rgba(0,0,0,0.55)',
        color: 'white',
        backdropFilter: 'blur(4px)',
        '& .MuiChip-icon': { color: 'white', ml: 0.5 },
      }}
    />
  );
}

function LocalImagePreview({ url, name }: { url: string; name: string }) {
  return (
    <Box
      component="img"
      src={url}
      alt={name}
      sx={{ width: '100%', height: PREVIEW_H, objectFit: 'cover', display: 'block' }}
    />
  );
}

function LocalVideoPreview({ url }: { url: string }) {
  return (
    <Box sx={{ height: PREVIEW_H, bgcolor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 0.5 }}>
      <VideoPreviewCard src={url} maxWidth={200} />
    </Box>
  );
}

function LocalPdfPreview({ url, name }: { url: string; name: string }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();
        const res = await fetch(url);
        const data = await res.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.55 });
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvas, viewport }).promise;
        if (!cancelled) setThumbUrl(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        if (!cancelled) setThumbUrl(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (loading) {
    return (
      <Box sx={{ height: PREVIEW_H, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}>
        <LinearProgress sx={{ width: '60%' }} />
      </Box>
    );
  }

  if (!thumbUrl) {
    return (
      <Box sx={{ height: PREVIEW_H, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#FEE2E2' }}>
        <PictureAsPdfIcon sx={{ fontSize: 48, color: 'error.main', opacity: 0.8 }} />
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={thumbUrl}
      alt={name}
      sx={{ width: '100%', height: PREVIEW_H, objectFit: 'cover', display: 'block' }}
    />
  );
}

function LocalAudioPreview({ url }: { url: string }) {
  return (
    <Box sx={{ height: PREVIEW_H, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, bgcolor: 'grey.100' }}>
      <Box component="audio" controls src={url} sx={{ width: '100%' }} />
    </Box>
  );
}

function PreviewBody({ kind, url, name }: { kind: PreviewKind; url: string; name: string }) {
  if (kind === 'image') return <LocalImagePreview url={url} name={name} />;
  if (kind === 'video') return <LocalVideoPreview url={url} />;
  if (kind === 'audio') return <LocalAudioPreview url={url} />;
  if (kind === 'pdf') return <LocalPdfPreview url={url} name={name} />;
  return (
    <Box
      sx={{
        height: PREVIEW_H,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.100',
        gap: 1,
        px: 2,
      }}
    >
      <InsertDriveFileOutlinedIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
      <Typography variant="caption" noWrap sx={{ maxWidth: '100%', color: 'text.secondary' }}>
        {name}
      </Typography>
    </Box>
  );
}

export function PendingAttachmentPreview({
  name, mimeType, previewUrl, sizeBytes, status, onRemove, onImageEdited, onVideoEdited, sourceFile,
}: Props) {
  const kind = getPreviewKind(mimeType, name);
  const [fullscreen, setFullscreen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [videoEditOpen, setVideoEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<EditTool>('draw');
  const [hovered, setHovered] = useState(false);
  const canExpand = kind !== 'other';
  const canEditImage = kind === 'image' && onImageEdited && status !== 'error';
  const canEditVideo = kind === 'video' && onVideoEdited && sourceFile && status !== 'error';

  const openEditor = (mode: EditTool) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditMode(mode);
    setEditOpen(true);
  };

  return (
    <>
      <Paper
        elevation={hovered ? 4 : 1}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        sx={{
          width: 200,
          flexShrink: 0,
          overflow: 'hidden',
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: status === 'error' ? 'error.light' : 'divider',
          transition: 'box-shadow 0.2s, transform 0.2s',
          transform: hovered ? 'translateY(-2px)' : 'none',
          bgcolor: 'background.paper',
        }}
      >
        <Box
          sx={{ position: 'relative', cursor: canExpand ? 'pointer' : 'default' }}
          onClick={canExpand ? () => setFullscreen(true) : undefined}
        >
          <PreviewBody kind={kind} url={previewUrl} name={name} />

          <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
            <KindBadge kind={kind} />
          </Box>

          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 28,
              height: 28,
              bgcolor: 'rgba(255,255,255,0.95)',
              color: 'text.primary',
              boxShadow: 1,
              '&:hover': { bgcolor: 'error.main', color: 'white' },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>

          {canExpand && (
            <Box
              className="preview-overlay"
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 0.5,
                bgcolor: alpha('#000', hovered ? 0.45 : 0),
                opacity: hovered ? 1 : 0,
                transition: 'opacity 0.2s, background-color 0.2s',
                pointerEvents: 'none',
              }}
            >
              <FullscreenIcon sx={{ fontSize: 32, color: 'white' }} />
              <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                Full screen
              </Typography>
            </Box>
          )}

          {status === 'uploading' && (
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
              <LinearProgress />
            </Box>
          )}

          {status === 'error' && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                bgcolor: alpha('#d32f2f', 0.82),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 1,
              }}
            >
              <Typography variant="caption" color="white" fontWeight={600} textAlign="center">
                Upload failed — tap ✕ to remove
              </Typography>
            </Box>
          )}
        </Box>

        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            px: 1.25,
            py: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            minWidth: 0,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap fontWeight={600} title={name} sx={{ fontSize: 13, lineHeight: 1.3 }}>
              {name}
            </Typography>
            {sizeBytes !== undefined && (
              <Typography variant="caption" color="text.secondary">
                {formatFileSize(sizeBytes)}
              </Typography>
            )}
          </Box>
          {status === 'ready' && (
            <Chip label="Ready" size="small" color="success" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
          )}
          {canEditImage && (
            <Stack direction="row" spacing={0.25} flexShrink={0}>
              <IconButton size="small" title="Crop" onClick={openEditor('crop')} sx={{ width: 28, height: 28 }}>
                <CropIcon sx={{ fontSize: 17 }} />
              </IconButton>
              <IconButton size="small" title="Draw" onClick={openEditor('draw')} sx={{ width: 28, height: 28 }}>
                <BrushIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Stack>
          )}
          {canEditVideo && (
            <IconButton
              size="small"
              title="Edit video"
              onClick={(e) => { e.stopPropagation(); setVideoEditOpen(true); }}
              sx={{ width: 28, height: 28 }}
            >
              <MovieFilterIcon sx={{ fontSize: 17 }} />
            </IconButton>
          )}
        </Stack>
      </Paper>

      {canEditImage && (
        <ImageEditModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          imageUrl={previewUrl}
          fileName={name}
          mimeType={mimeType}
          initialTool={editMode}
          onSave={(file) => {
            onImageEdited!(file);
            setEditOpen(false);
          }}
        />
      )}

      {canEditVideo && sourceFile && (
        <VideoEditModal
          open={videoEditOpen}
          onClose={() => setVideoEditOpen(false)}
          videoUrl={previewUrl}
          fileName={name}
          sourceFile={sourceFile}
          onSave={(file) => {
            onVideoEdited!(file);
            setVideoEditOpen(false);
          }}
        />
      )}

      <LocalFilePreviewModal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        name={name}
        mimeType={mimeType}
        previewUrl={previewUrl}
      />
    </>
  );
}

export type PendingAttachment = {
  localKey: string;
  serverId?: string;
  name: string;
  mimeType: string;
  previewUrl: string;
  sizeBytes: number;
  status: 'uploading' | 'ready' | 'error';
  sourceFile?: File;
};

export function revokePendingPreview(item: PendingAttachment): void {
  URL.revokeObjectURL(item.previewUrl);
}

export function createPendingFromFile(file: File): PendingAttachment {
  return {
    localKey: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    previewUrl: URL.createObjectURL(file),
    sizeBytes: file.size,
    status: 'uploading',
    sourceFile: file,
  };
}
