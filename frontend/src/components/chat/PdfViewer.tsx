import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, Alert, Box,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { FilePreviewCard, fileExtBadge } from './FilePreviewCard';

type Props = {
  blob: Blob;
  onLoaded?: () => void;
  onError?: (msg: string) => void;
};

async function initPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
  }
  return pdfjs;
}

export function PdfViewer({ blob, onLoaded, onError }: Props) {
  const [pages, setPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const passwordCallbackRef = useRef<((password: string) => void) | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordHint, setPasswordHint] = useState<'need' | 'wrong'>('need');

  const renderAllPages = useCallback(async (pdf: PDFDocumentProxy) => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.25 });
      const canvas = document.createElement('canvas');
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto 16px';
      canvas.style.maxWidth = '100%';
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      container.appendChild(canvas);
      await page.render({ canvas, viewport }).promise;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    pdfRef.current = null;
    setLoading(true);
    setPages(0);

    (async () => {
      try {
        const pdfjs = await initPdfJs();
        const data = await blob.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data });

        loadingTask.onPassword = (updatePassword: (password: string) => void, reason: number) => {
          passwordCallbackRef.current = updatePassword;
          setPasswordHint(reason === 2 ? 'wrong' : 'need');
          setPasswordOpen(true);
        };

        const pdf = await loadingTask.promise;
        if (cancelled) return;

        pdfRef.current = pdf;
        setPages(pdf.numPages);
        setPasswordOpen(false);
        await renderAllPages(pdf);
        onLoaded?.();
      } catch (err) {
        if (!cancelled) {
          onError?.((err as Error).message || 'Failed to open PDF');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [blob, onError, onLoaded, renderAllPages]);

  const submitPassword = () => {
    if (!passwordInput.trim()) return;
    passwordCallbackRef.current?.(passwordInput);
    setPasswordInput('');
    setPasswordOpen(false);
  };

  return (
    <>
      {loading && !passwordOpen && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          Loading PDF…
        </Typography>
      )}
      <Box ref={containerRef} sx={{ bgcolor: 'grey.100', p: 1, minHeight: loading ? 120 : undefined }} />
      {!loading && pages > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
          {pages} page{pages !== 1 ? 's' : ''}
        </Typography>
      )}

      <Dialog open={passwordOpen} onClose={() => setPasswordOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>PDF password required</DialogTitle>
        <DialogContent>
          {passwordHint === 'wrong' && (
            <Alert severity="error" sx={{ mb: 2 }}>Incorrect password. Try again.</Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This PDF is protected. Enter the password to preview it.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            type="password"
            label="Password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitPassword()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitPassword}>Open</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

/** Small first-page thumbnail canvas for document cards. */
function PdfThumbnailCanvas({ blob }: { blob: Blob }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const passwordCallbackRef = useRef<((password: string) => void) | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [wrongPassword, setWrongPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const pdfjs = await initPdfJs();
        const data = await blob.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data });

        loadingTask.onPassword = (updatePassword: (password: string) => void, reason: number) => {
          passwordCallbackRef.current = updatePassword;
          setWrongPassword(reason === 2);
          setNeedsPassword(true);
          if (reason === 2) setPasswordOpen(true);
        };

        const pdf = await loadingTask.promise;
        if (cancelled || !canvasRef.current) return;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.45 });
        const canvas = canvasRef.current;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvas, viewport }).promise;
        setNeedsPassword(false);
        setPasswordOpen(false);
        setWrongPassword(false);
      } catch {
        if (!cancelled) setNeedsPassword(true);
      }
    })();

    return () => { cancelled = true; };
  }, [blob]);

  const submitPassword = () => {
    if (!passwordInput.trim()) return;
    passwordCallbackRef.current?.(passwordInput);
    setPasswordInput('');
  };

  if (needsPassword && !canvasRef.current?.width) {
    return (
      <>
        <Box
          onClick={() => setPasswordOpen(true)}
          sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 0.5,
            bgcolor: '#f5f5f5',
            cursor: 'pointer',
          }}
        >
          <Typography variant="caption" fontWeight={600}>🔒 PDF</Typography>
          <Typography variant="caption" color="text.secondary">Tap to enter password</Typography>
        </Box>
        {passwordOpen && (
          <PasswordDialog
            open={passwordOpen}
            wrong={wrongPassword}
            value={passwordInput}
            onChange={setPasswordInput}
            onSubmit={submitPassword}
            onClose={() => setPasswordOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f5f5f5',
          overflow: 'hidden',
        }}
      >
        <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }} />
      </Box>
      {passwordOpen && (
        <PasswordDialog
          open={passwordOpen}
          wrong={wrongPassword}
          value={passwordInput}
          onChange={setPasswordInput}
          onSubmit={submitPassword}
          onClose={() => setPasswordOpen(false)}
        />
      )}
    </>
  );
}

/** PDF card for chat bubbles — same shell as spreadsheet / other docs. */
export function PdfPreviewCard({ blob, filename, onClick }: { blob: Blob; filename: string; onClick?: () => void }) {
  return (
    <FilePreviewCard
      filename={filename}
      accentColor="#d93025"
      icon={<PictureAsPdfIcon />}
      badge={fileExtBadge(filename, 'PDF')}
      onClick={onClick}
    >
      <PdfThumbnailCanvas blob={blob} />
    </FilePreviewCard>
  );
}

/** @deprecated Use PdfPreviewCard */
export function PdfThumbnail({ blob, onClick }: { blob: Blob; onClick: () => void }) {
  return (
    <Box onClick={onClick} sx={{ cursor: 'pointer', borderRadius: 1, overflow: 'hidden', display: 'inline-block', lineHeight: 0 }}>
      <PdfThumbnailCanvas blob={blob} />
    </Box>
  );
}

function PasswordDialog({
  open, wrong, value, onChange, onSubmit, onClose,
}: {
  open: boolean;
  wrong: boolean;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>PDF password</DialogTitle>
      <DialogContent>
        {wrong && <Alert severity="error" sx={{ mb: 2 }}>Incorrect password</Alert>}
        <TextField
          autoFocus
          fullWidth
          type="password"
          label="Password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit}>Open</Button>
      </DialogActions>
    </Dialog>
  );
}
