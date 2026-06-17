import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, TextField, Button, Typography,
  Box, CircularProgress, Paper, Stack, Chip,
} from '@mui/material';
import { apiClient } from '../../../services/api/client';

type Citation = {
  sourceType: string;
  sourceId: string;
  fileName?: string;
  chunkText: string;
  relevanceScore: number;
};

export function AiSearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [error, setError] = useState('');

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.post('/ai/search', { query, limit: 5 });
      setAnswer(data.data.answer);
      setCitations(data.data.citations);
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      const raw = apiMsg ?? (err instanceof Error ? err.message : '');
      const friendly = raw.toLowerCase().includes('fetch failed')
        ? 'AI service unreachable. Ensure the backend is running and Ollama is started (ollama pull nomic-embed-text).'
        : raw || 'AI search failed. Check that Ollama (embeddings) and Groq (answers) are configured in backend/.env';
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>AI Knowledge Search</DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <TextField fullWidth placeholder="Ask anything about company knowledge..." value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()} autoFocus />
          <Button variant="contained" onClick={search} disabled={loading}>Search</Button>
        </Stack>
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}
        {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
        {answer && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{answer}</Typography>
          </Paper>
        )}
        {citations.map((c, i) => (
          <Paper key={i} sx={{ p: 1.5, mb: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={c.sourceType} size="small" />
              {c.fileName && <Typography variant="caption">{c.fileName}</Typography>}
              <Chip label={`${(c.relevanceScore * 100).toFixed(0)}%`} size="small" variant="outlined" />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{c.chunkText}</Typography>
          </Paper>
        ))}
      </DialogContent>
    </Dialog>
  );
}
