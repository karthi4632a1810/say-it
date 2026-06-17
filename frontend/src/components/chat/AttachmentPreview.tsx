import { useState } from 'react';
import { Box, Skeleton } from '@mui/material';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import { getPreviewKind } from '../../utils/fileTypes';
import { useFileBlob, downloadFileBlob } from '../../hooks/useFileBlob';
import { FilePreviewModal } from './FilePreviewModal';
import { PdfPreviewCard } from './PdfViewer';
import { SpreadsheetThumbnail } from './SpreadsheetViewer';
import { VideoPreviewCard } from './VideoPreviewCard';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import { FilePreviewCard, MediaPreviewCard, fileExtBadge } from './FilePreviewCard';

const ATTACHMENT_WIDTH = 268;

type Props = {
  fileId: string;
  name: string;
  mimeType?: string;
  isOwn?: boolean;
};

export function AttachmentPreview({ fileId, name, mimeType, isOwn }: Props) {
  const kind = getPreviewKind(mimeType, name);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { blobUrl, blob, loading, error } = useFileBlob(fileId, kind !== 'other');

  const openPreview = () => setPreviewOpen(true);
  const download = () => downloadFileBlob(fileId, name);

  if (kind === 'other' || error) {
    return (
      <FilePreviewCard
        filename={name}
        accentColor="#5f6368"
        icon={<InsertDriveFileOutlinedIcon />}
        badge={fileExtBadge(name)}
        onClick={download}
        previewHeight={72}
      >
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f8f9fa',
          }}
        >
          <InsertDriveFileOutlinedIcon sx={{ fontSize: 36, color: '#5f6368', opacity: 0.5 }} />
        </Box>
      </FilePreviewCard>
    );
  }

  if (loading) {
    return (
      <Skeleton
        variant="rounded"
        width={ATTACHMENT_WIDTH}
        height={kind === 'audio' ? 56 : 168}
        sx={{ bgcolor: isOwn ? 'rgba(255,255,255,0.2)' : 'grey.300', borderRadius: 2 }}
      />
    );
  }

  return (
    <>
      {kind === 'image' && blobUrl && (
        <MediaPreviewCard onClick={openPreview} maxWidth={ATTACHMENT_WIDTH}>
          <Box
            component="img"
            src={blobUrl}
            alt={name}
            sx={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }}
          />
        </MediaPreviewCard>
      )}

      {kind === 'video' && blobUrl && (
        <VideoPreviewCard
          src={blobUrl}
          onClick={openPreview}
          maxWidth={ATTACHMENT_WIDTH}
        />
      )}

      {kind === 'audio' && (
        <AudioMessagePlayer fileId={fileId} isOwn={isOwn} />
      )}

      {kind === 'pdf' && blob && (
        <PdfPreviewCard blob={blob} filename={name} onClick={openPreview} />
      )}

      {kind === 'spreadsheet' && blob && (
        <SpreadsheetThumbnail blob={blob} filename={name} onClick={openPreview} />
      )}

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
