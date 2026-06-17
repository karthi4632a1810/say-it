import { useState } from 'react';
import { Box, Typography, Stack, alpha, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import MicIcon from '@mui/icons-material/Mic';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import type { MessageAttachment } from '../../types/chat';
import { getPreviewKind, type PreviewKind } from '../../utils/fileTypes';
import { useFileBlob } from '../../hooks/useFileBlob';
import { AttachmentPreview } from './AttachmentPreview';

const SLOT_WIDTH = 268;

type Props = {
  attachments: MessageAttachment[];
  isOwn?: boolean;
};

const KIND_META: Record<PreviewKind, { icon: typeof ImageOutlinedIcon; color: string; label: string }> = {
  image: { icon: ImageOutlinedIcon, color: '#1a73e8', label: 'Photo' },
  video: { icon: MovieOutlinedIcon, color: '#7c3aed', label: 'Video' },
  pdf: { icon: PictureAsPdfIcon, color: '#d93025', label: 'PDF' },
  spreadsheet: { icon: TableChartOutlinedIcon, color: '#0f9d58', label: 'Sheet' },
  audio: { icon: MicIcon, color: '#e37400', label: 'Audio' },
  other: { icon: InsertDriveFileOutlinedIcon, color: '#5f6368', label: 'File' },
};

function kindCounts(attachments: MessageAttachment[]) {
  const counts = new Map<PreviewKind, number>();
  for (const a of attachments) {
    const k = getPreviewKind(a.file.mimeType, a.file.originalName);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

function PeekThumb({ fileId, mimeType, name }: { fileId: string; mimeType: string; name: string }) {
  const kind = getPreviewKind(mimeType, name);
  const visual = kind === 'image' || kind === 'video';
  const { blobUrl, loading } = useFileBlob(fileId, visual);
  const meta = KIND_META[kind];
  const Icon = meta.icon;

  if (visual && blobUrl && !loading) {
    return (
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 1.5,
          overflow: 'hidden',
          flexShrink: 0,
          bgcolor: '#f1f3f4',
        }}
      >
        {kind === 'image' ? (
          <Box component="img" src={blobUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Box
            component="video"
            src={blobUrl}
            muted
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: 56,
        height: 56,
        borderRadius: 1.5,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: alpha(meta.color, 0.12),
      }}
    >
      <Icon sx={{ fontSize: 26, color: meta.color }} />
    </Box>
  );
}

function CollapsedSlot({
  attachments,
  isOwn,
  onExpand,
}: {
  attachments: MessageAttachment[];
  isOwn?: boolean;
  onExpand: () => void;
}) {
  const count = attachments.length;
  const first = attachments[0]!;
  const counts = kindCounts(attachments);
  const summaryParts = [...counts.entries()].map(([k, n]) => {
    const label = KIND_META[k].label;
    return n > 1 ? `${n} ${label}s` : label;
  });

  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: SLOT_WIDTH }}>
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          left: 10,
          right: -10,
          bottom: -10,
          borderRadius: '5px',
          bgcolor: '#fff',
          opacity: 0.45,
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 5,
          left: 5,
          right: -5,
          bottom: -5,
          borderRadius: '5px',
          bgcolor: '#fff',
          opacity: 0.7,
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        }}
      />

      <Box
        role="button"
        tabIndex={0}
        onClick={onExpand}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpand(); } }}
        sx={{
          position: 'relative',
          borderRadius: '5px',
          bgcolor: '#fff',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          cursor: 'pointer',
          overflow: 'hidden',
          transition: 'box-shadow 0.2s, transform 0.2s',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.16)',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.25,
            py: 0.75,
            bgcolor: isOwn ? '#4F46E5' : '#5f6368',
            color: '#fff',
          }}
        >
          <FolderOpenOutlinedIcon sx={{ fontSize: 18 }} />
          <Typography variant="caption" sx={{ flex: 1, fontWeight: 600, fontSize: 12 }}>
            {count} attachments
          </Typography>
          <ExpandMoreIcon sx={{ fontSize: 18, opacity: 0.9 }} />
        </Box>

        <Box sx={{ display: 'flex', gap: 1.25, p: 1.25, alignItems: 'center' }}>
          <PeekThumb fileId={first.file.id} mimeType={first.file.mimeType} name={first.file.originalName} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} sx={{ color: '#1f1f1f', lineHeight: 1.3 }}>
              {summaryParts.slice(0, 3).join(' · ')}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: '#5f6368', display: 'block', mt: 0.25 }}>
              {first.file.originalName}
              {count > 1 ? ` +${count - 1} more` : ''}
            </Typography>
            <Typography variant="caption" sx={{ color: isOwn ? '#4F46E5' : 'primary.main', fontWeight: 600, mt: 0.5, display: 'block' }}>
              Tap to expand
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={0.5} sx={{ px: 1.25, pb: 1.25 }}>
          {[...counts.entries()].slice(0, 5).map(([k, n]) => {
            const { icon: Icon, color } = KIND_META[k];
            return (
              <Box
                key={k}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.4,
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: alpha(color, 0.1),
                  border: `1px solid ${alpha(color, 0.2)}`,
                }}
              >
                <Icon sx={{ fontSize: 13, color }} />
                <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, color }}>
                  {n}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}

export function AttachmentGroup({ attachments, isOwn }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (attachments.length === 0) return null;

  if (attachments.length === 1) {
    const a = attachments[0]!;
    return (
      <AttachmentPreview
        fileId={a.file.id}
        name={a.file.originalName}
        mimeType={a.file.mimeType}
        isOwn={isOwn}
      />
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: SLOT_WIDTH }}>
      {expanded ? (
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" fontWeight={600} sx={{ color: isOwn ? 'rgba(255,255,255,0.9)' : 'text.secondary' }}>
              {attachments.length} files
            </Typography>
            <IconButton
              size="small"
              onClick={() => setExpanded(false)}
              title="Collapse"
              sx={{
                color: isOwn ? 'rgba(255,255,255,0.85)' : 'text.secondary',
                bgcolor: isOwn ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.05)',
                width: 28,
                height: 28,
                '&:hover': { bgcolor: isOwn ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.1)' },
              }}
            >
              <ExpandLessIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          {attachments.map((a) => (
            <AttachmentPreview
              key={a.id}
              fileId={a.file.id}
              name={a.file.originalName}
              mimeType={a.file.mimeType}
              isOwn={isOwn}
            />
          ))}
        </Stack>
      ) : (
        <CollapsedSlot
          attachments={attachments}
          isOwn={isOwn}
          onExpand={() => setExpanded(true)}
        />
      )}
    </Box>
  );
}
