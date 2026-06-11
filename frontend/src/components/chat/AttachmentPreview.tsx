import { useState } from 'react';
import { Box, Link, Skeleton, Typography } from '@mui/material';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import { getPreviewKind } from '../../utils/fileTypes';
import { useFileBlob, downloadFileBlob } from '../../hooks/useFileBlob';
import { FilePreviewModal } from './FilePreviewModal';
import { PdfThumbnail } from './PdfViewer';
import { VideoPreviewCard } from './VideoPreviewCard';
import { AudioMessagePlayer } from './AudioMessagePlayer';

type Props = {
  fileId: string;
  name: string;
  mimeType?: string;
  isOwn?: boolean;
};

export function AttachmentPreview({ fileId, name, mimeType, isOwn }: Props) {
  const kind = getPreviewKind(mimeType, name);
  const linkColor = isOwn ? 'rgba(255,255,255,0.95)' : 'primary.main';
  const [previewOpen, setPreviewOpen] = useState(false);
  const { blobUrl, blob, loading, error } = useFileBlob(fileId, kind !== 'other');

  const download = () => downloadFileBlob(fileId, name);

  if (kind === 'other' || error) {
    return (
      <Box
        component="button"
        onClick={download}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          mt: 0.5,
          p: 0,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: linkColor,
          textAlign: 'left',
          fontSize: 14,
          '&:hover': { textDecoration: 'underline' },
        }}
      >
        <InsertDriveFileOutlinedIcon sx={{ fontSize: 18 }} />
        {name}
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ mt: 0.5, position: 'relative' }}>
        {loading && (
          <Skeleton variant="rounded" width={200} height={120} sx={{ bgcolor: isOwn ? 'rgba(255,255,255,0.2)' : 'grey.300' }} />
        )}

        {!loading && kind === 'image' && blobUrl && (
          <Box
            onClick={() => setPreviewOpen(true)}
            sx={{ position: 'relative', display: 'inline-block', cursor: 'pointer', lineHeight: 0 }}
          >
            <Box
              component="img"
              src={blobUrl}
              alt={name}
              sx={{ maxWidth: 240, maxHeight: 200, borderRadius: 1, display: 'block' }}
            />
            <ZoomInIcon
              sx={{
                position: 'absolute',
                bottom: 6,
                right: 6,
                fontSize: 20,
                color: 'white',
                bgcolor: 'rgba(0,0,0,0.45)',
                borderRadius: '50%',
                p: 0.25,
              }}
            />
          </Box>
        )}

        {kind === 'video' && (
          <VideoPreviewCard
            src={blobUrl ?? ''}
            loading={loading || !blobUrl}
            onClick={() => setPreviewOpen(true)}
            onPrimaryBubble={isOwn}
            maxWidth={280}
          />
        )}

        {kind === 'audio' && (
          <AudioMessagePlayer fileId={fileId} isOwn={isOwn} />
        )}

        {!loading && kind === 'pdf' && blob && (
          <Box>
            <PdfThumbnail blob={blob} onClick={() => setPreviewOpen(true)} />
            <Link
              component="button"
              variant="caption"
              onClick={() => setPreviewOpen(true)}
              sx={{ color: linkColor, mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <PictureAsPdfIcon sx={{ fontSize: 16 }} />
              {name}
            </Link>
          </Box>
        )}

        {kind === 'image' && !loading && blobUrl && (
          <Link component="button" variant="caption" onClick={download} sx={{ color: linkColor, mt: 0.25, display: 'block' }}>
            Download
          </Link>
        )}
      </Box>

      <FilePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fileId={fileId}
        name={name}
        mimeType={mimeType}
      />
    </>
  );
}
