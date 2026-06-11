import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Box, Typography, Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import { getPreviewKind } from '../../utils/fileTypes';
import { PdfViewer } from './PdfViewer';
import { VideoFullscreenPlayer } from './VideoPreviewCard';

type Props = {
  open: boolean;
  onClose: () => void;
  name: string;
  mimeType: string;
  previewUrl: string;
};

export function LocalFilePreviewModal({ open, onClose, name, mimeType, previewUrl }: Props) {
  const kind = getPreviewKind(mimeType, name);
  const [blob, setBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (!open || kind !== 'pdf') {
      setBlob(null);
      return;
    }
    let cancelled = false;
    fetch(previewUrl)
      .then((r) => r.blob())
      .then((b) => { if (!cancelled) setBlob(b); })
      .catch(() => { if (!cancelled) setBlob(null); });
    return () => { cancelled = true; };
  }, [open, kind, previewUrl]);

  const download = () => {
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = name;
    a.click();
  };

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
      <DialogContent dividers sx={{ p: kind === 'pdf' ? 2 : 1, bgcolor: 'grey.900', display: 'flex', flexDirection: 'column' }}>
        {kind === 'image' && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
            <Box
              component="img"
              src={previewUrl}
              alt={name}
              sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </Box>
        )}
        {kind === 'video' && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
            <VideoFullscreenPlayer src={previewUrl} name={name} />
          </Box>
        )}
        {kind === 'pdf' && blob && (
          <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.paper', borderRadius: 1 }}>
            <PdfViewer blob={blob} />
          </Box>
        )}
        {kind === 'pdf' && !blob && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
            Loading PDF…
          </Typography>
        )}
        {kind === 'other' && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body1" color="grey.300" sx={{ textAlign: 'center' }}>
              Preview not available for this file type.
              <br />
              <IconButton onClick={download} sx={{ color: 'grey.300', mt: 2 }}>
                <DownloadIcon /> Download
              </IconButton>
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
