import {
  Dialog, DialogTitle, DialogContent, IconButton, Box, Typography, Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import { useFileBlob, downloadFileBlob } from '../../hooks/useFileBlob';
import { getPreviewKind } from '../../utils/fileTypes';
import { PdfViewer } from './PdfViewer';
import { VideoFullscreenPlayer } from './VideoPreviewCard';

type Props = {
  open: boolean;
  onClose: () => void;
  fileId: string;
  name: string;
  mimeType?: string;
};

export function FilePreviewModal({ open, onClose, fileId, name, mimeType }: Props) {
  const kind = getPreviewKind(mimeType, name);
  const { blobUrl, blob, loading, error } = useFileBlob(open ? fileId : null, open);

  const download = () => downloadFileBlob(fileId, name);

  return (
    <Dialog fullScreen open={open} onClose={onClose}>
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1" noWrap sx={{ maxWidth: '85%' }}>{name}</Typography>
          <IconButton onClick={download} title="Download" size="small">
            <DownloadIcon />
          </IconButton>
        </Stack>
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ minHeight: 240, p: kind === 'pdf' ? 2 : 1, bgcolor: kind === 'image' || kind === 'video' ? 'grey.900' : undefined, flex: 1 }}>
        {loading && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
            Loading preview…
          </Typography>
        )}
        {error && (
          <Typography variant="body2" color="error" sx={{ textAlign: 'center', py: 6 }}>
            {error}
          </Typography>
        )}
        {!loading && !error && blobUrl && kind === 'image' && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 120px)' }}>
            <Box
              component="img"
              src={blobUrl}
              alt={name}
              sx={{ maxWidth: '100%', maxHeight: 'calc(100vh - 120px)', objectFit: 'contain' }}
            />
          </Box>
        )}
        {!loading && !error && blobUrl && kind === 'video' && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 120px)', px: 2 }}>
            <VideoFullscreenPlayer src={blobUrl} name={name} />
          </Box>
        )}
        {!loading && !error && blob && kind === 'pdf' && (
          <PdfViewer blob={blob} />
        )}
        {!loading && !error && kind === 'other' && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
            Preview not available for this file type.
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
