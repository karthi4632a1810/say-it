import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, TextField, InputAdornment, Box, Typography,
  CircularProgress, Alert, IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import {
  fetchTrendingGifs, searchGifs, hasGiphyApiKey, type GiphyGif,
} from '../../services/giphy/giphy.client';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (gif: GiphyGif) => void | Promise<void>;
  sending?: boolean;
};

export function GifPickerDialog({ open, onClose, onSelect, sending = false }: Props) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const queryRef = useRef('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadGifs = useCallback(async (reset: boolean) => {
    if (!hasGiphyApiKey()) {
      setError('Add VITE_GIPHY_API_KEY to frontend/.env.local and restart the dev server.');
      return;
    }
    const q = queryRef.current;
    if (reset) {
      offsetRef.current = 0;
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const { gifs: batch, hasMore: more } = q
        ? await searchGifs(q, offsetRef.current)
        : await fetchTrendingGifs(offsetRef.current);

      setGifs((prev) => (reset ? batch : [...prev, ...batch]));
      setHasMore(more);
      offsetRef.current += batch.length;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GIFs');
      if (reset) setGifs([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    queryRef.current = '';
    setGifs([]);
    loadGifs(true);
  }, [open, loadGifs]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      queryRef.current = query;
      loadGifs(true);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, loadGifs]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || loading || loadingMore || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      loadGifs(false);
    }
  };

  const pick = (gif: GiphyGif) => {
    if (sending) return;
    void onSelect(gif);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { height: 'min(560px, 85vh)' } }}>
      <DialogTitle sx={{ pr: 6, pb: 1 }}>
        GIFs
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search Giphy"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {!query.trim() && (
          <Typography variant="caption" color="text.secondary">
            Trending on Giphy — tap a GIF to save & send
          </Typography>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        <Box
          ref={scrollRef}
          onScroll={onScroll}
          sx={{
            flex: 1,
            overflowY: 'auto',
            minHeight: 280,
            mx: -0.5,
            px: 0.5,
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={32} />
            </Box>
          ) : gifs.length === 0 && !error ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No GIFs found
            </Typography>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 1,
              }}
            >
              {gifs.map((gif) => (
                <Box
                  key={gif.id}
                  component="button"
                  type="button"
                  onClick={() => pick(gif)}
                  disabled={sending}
                  title={gif.title}
                  sx={{
                    border: 'none',
                    p: 0,
                    m: 0,
                    cursor: sending ? 'wait' : 'pointer',
                    opacity: sending ? 0.6 : 1,
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: 'grey.100',
                    aspectRatio: `${gif.width} / ${gif.height}`,
                    minHeight: 72,
                    maxHeight: 140,
                    '&:hover': { opacity: 0.85 },
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
                  }}
                >
                  <Box
                    component="img"
                    src={gif.previewUrl}
                    alt={gif.title}
                    loading="lazy"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </Box>
              ))}
            </Box>
          )}

          {loadingMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right', opacity: 0.7 }}>
          Powered by GIPHY
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
