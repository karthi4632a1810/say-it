import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog, Box, Stack, IconButton, Typography, Slider, Button, ToggleButton, ToggleButtonGroup,
  TextField, LinearProgress, Alert, alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SpeedIcon from '@mui/icons-material/Speed';
import BrandingWatermarkIcon from '@mui/icons-material/BrandingWatermark';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import CompressIcon from '@mui/icons-material/Compress';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { IMAGE_FILTERS, type ImageFilterId } from '../../utils/imageEdit';
import {
  exportEditedVideo, getVideoDuration, VIDEO_FILTER_CSS, VIDEO_SPEED_OPTIONS,
  type VideoEditSettings, type VideoWatermarkPosition,
} from '../../utils/videoEdit';

export type VideoEditTool = 'trim' | 'filter' | 'speed' | 'watermark' | 'audio' | 'compress';

type Props = {
  open: boolean;
  onClose: () => void;
  videoUrl: string;
  fileName: string;
  sourceFile: File;
  onSave: (file: File) => void;
};

const UI = {
  primary: '#4F46E5',
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  canvasBg: '#E2E8F0',
};

function ToolBtn({
  active, onClick, title, children,
}: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <IconButton
      onClick={onClick}
      title={title}
      sx={{
        color: active ? UI.primary : '#334155',
        width: 40,
        height: 40,
        bgcolor: active ? alpha(UI.primary, 0.1) : 'transparent',
        border: active ? `2px solid ${UI.primary}` : '2px solid transparent',
      }}
    >
      {children}
    </IconButton>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VideoEditModal({
  open, onClose, videoUrl, fileName, sourceFile, onSave,
}: Props) {
  const [tool, setTool] = useState<VideoEditTool>('trim');
  const [duration, setDuration] = useState(0);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 0]);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const [filter, setFilter] = useState<ImageFilterId>('none');
  const [speed, setSpeed] = useState(1);
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkPos, setWatermarkPos] = useState<VideoWatermarkPosition>('bottom-right');
  const [mute, setMute] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioName, setAudioName] = useState('');
  const [quality, setQuality] = useState<'standard' | 'original'>('standard');

  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setTool('trim');
    setTrimRange([0, 0]);
    setPlaying(false);
    setCurrentTime(0);
    setFilter('none');
    setSpeed(1);
    setWatermarkText('');
    setWatermarkPos('bottom-right');
    setMute(false);
    setAudioFile(null);
    setAudioName('');
    setQuality('standard');
    setExporting(false);
    setProgress(0);
    setStatus('');
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
    getVideoDuration(videoUrl).then((d) => {
      setDuration(d);
      setTrimRange([0, d]);
    }).catch(() => setError('Could not load video'));
  }, [open, videoUrl, reset]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = mute || Boolean(audioFile);
  }, [mute, audioFile]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < trimRange[0] || v.currentTime >= trimRange[1]) {
        v.currentTime = trimRange[0];
      }
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.currentTime >= trimRange[1]) {
      v.pause();
      v.currentTime = trimRange[0];
      setPlaying(false);
    }
  };

  const buildSettings = (): VideoEditSettings => ({
    trimStartSec: trimRange[0],
    trimEndSec: trimRange[1],
    filter,
    speed,
    watermark: watermarkText.trim()
      ? { text: watermarkText.trim(), position: watermarkPos }
      : null,
    mute: mute && !audioFile,
    audioFile,
    quality,
  });

  const handleDone = async () => {
    setExporting(true);
    setError(null);
    setProgress(0);
    try {
      const file = await exportEditedVideo(sourceFile, buildSettings(), {
        onProgress: setProgress,
        onStatus: setStatus,
      });
      onSave(file);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const filterCss = VIDEO_FILTER_CSS[filter];

  return (
    <Dialog fullScreen open={open} onClose={exporting ? undefined : onClose} PaperProps={{ sx: { bgcolor: UI.bg, display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ px: 1.5, py: 0.75, bgcolor: UI.surface, borderBottom: `1px solid ${UI.border}` }}>
        <Stack direction="row" alignItems="center" spacing={0.25} sx={{ overflowX: 'auto' }}>
          <ToolBtn title="Close" onClick={onClose}><CloseIcon /></ToolBtn>
          <ToolBtn title="Trim" active={tool === 'trim'} onClick={() => setTool('trim')}><ContentCutIcon /></ToolBtn>
          <ToolBtn title="Filters" active={tool === 'filter'} onClick={() => setTool('filter')}><AutoFixHighIcon /></ToolBtn>
          <ToolBtn title="Speed" active={tool === 'speed'} onClick={() => setTool('speed')}><SpeedIcon /></ToolBtn>
          <ToolBtn title="Watermark" active={tool === 'watermark'} onClick={() => setTool('watermark')}><BrandingWatermarkIcon /></ToolBtn>
          <ToolBtn title="Audio" active={tool === 'audio'} onClick={() => setTool('audio')}><MusicNoteIcon /></ToolBtn>
          <ToolBtn title="Compress" active={tool === 'compress'} onClick={() => setTool('compress')}><CompressIcon /></ToolBtn>
          <Box sx={{ flex: 1 }} />
          <Button onClick={handleDone} disabled={exporting} variant="contained" sx={{ fontWeight: 700, minWidth: 72, textTransform: 'none' }}>
            {exporting ? '…' : 'Done'}
          </Button>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', bgcolor: UI.canvasBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ position: 'relative', maxWidth: '100%', maxHeight: 'calc(100vh - 180px)' }}>
          <Box
            component="video"
            ref={videoRef}
            src={videoUrl}
            playsInline
            onTimeUpdate={onTimeUpdate}
            onEnded={() => setPlaying(false)}
            sx={{
              display: 'block',
              maxWidth: '100vw',
              maxHeight: 'calc(100vh - 180px)',
              filter: filterCss === 'none' ? undefined : filterCss,
            }}
          />
          {watermarkText.trim() && (
            <Typography
              sx={{
                position: 'absolute',
                ...(watermarkPos === 'bottom-right' && { right: 12, bottom: 12 }),
                ...(watermarkPos === 'bottom-left' && { left: 12, bottom: 12 }),
                ...(watermarkPos === 'top-right' && { right: 12, top: 12 }),
                ...(watermarkPos === 'top-left' && { left: 12, top: 12 }),
                color: '#fff',
                fontWeight: 700,
                fontSize: 18,
                bgcolor: alpha('#000', 0.45),
                px: 1,
                py: 0.5,
                borderRadius: 1,
                pointerEvents: 'none',
              }}
            >
              {watermarkText}
            </Typography>
          )}
          <IconButton
            onClick={togglePlay}
            sx={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              bgcolor: alpha('#000', 0.45),
              color: '#fff',
              '&:hover': { bgcolor: alpha('#000', 0.6) },
            }}
          >
            {playing ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
          </IconButton>
        </Box>
      </Box>

      {exporting && (
        <Box sx={{ px: 2, py: 1, bgcolor: UI.surface, borderTop: `1px solid ${UI.border}` }}>
          <Typography variant="caption" color="text.secondary">{status || 'Processing…'}</Typography>
          <LinearProgress variant="determinate" value={progress} sx={{ mt: 0.5 }} />
        </Box>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mx: 2, mt: 1 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ bgcolor: UI.surface, borderTop: `1px solid ${UI.border}`, minHeight: 80, px: 2, py: 1.5 }}>
        {tool === 'trim' && duration > 0 && (
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 72 }}>
                {formatTime(trimRange[0])} – {formatTime(trimRange[1])}
              </Typography>
              <Slider
                size="small"
                min={0}
                max={duration}
                step={0.1}
                value={trimRange}
                onChange={(_, v) => {
                  const range = v as number[];
                  const a = range[0] ?? 0;
                  const b = range[1] ?? duration;
                  setTrimRange([a, Math.max(a + 0.5, b)]);
                }}
                color="primary"
                sx={{ flex: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                {formatTime(currentTime)}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Drag handles to trim start and end · preview plays selected range only
            </Typography>
          </Stack>
        )}

        {tool === 'filter' && (
          <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto' }}>
            {IMAGE_FILTERS.map((f) => (
              <Box key={f.id} onClick={() => setFilter(f.id)} sx={{ cursor: 'pointer', textAlign: 'center', flexShrink: 0 }}>
                <Box sx={{ width: 56, height: 56, borderRadius: 1, border: filter === f.id ? `2px solid ${UI.primary}` : '2px solid transparent', bgcolor: '#111', filter: VIDEO_FILTER_CSS[f.id] === 'none' ? undefined : VIDEO_FILTER_CSS[f.id] }} />
                <Typography variant="caption" sx={{ color: filter === f.id ? 'primary.main' : 'text.secondary' }}>{f.label}</Typography>
              </Box>
            ))}
          </Stack>
        )}

        {tool === 'speed' && (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <SpeedIcon color="primary" />
            {VIDEO_SPEED_OPTIONS.map((s) => (
              <Button key={s} size="small" variant={speed === s ? 'contained' : 'outlined'} onClick={() => setSpeed(s)}>
                {s}x
              </Button>
            ))}
          </Stack>
        )}

        {tool === 'watermark' && (
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField size="small" placeholder="Watermark text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} sx={{ minWidth: 200 }} />
            <ToggleButtonGroup exclusive size="small" value={watermarkPos} onChange={(_, v) => v && setWatermarkPos(v)}>
              <ToggleButton value="top-left">TL</ToggleButton>
              <ToggleButton value="top-right">TR</ToggleButton>
              <ToggleButton value="bottom-left">BL</ToggleButton>
              <ToggleButton value="bottom-right">BR</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        )}

        {tool === 'audio' && (
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button
              variant={mute ? 'contained' : 'outlined'}
              color={mute ? 'warning' : 'inherit'}
              startIcon={<VolumeOffIcon />}
              onClick={() => setMute((m) => !m)}
              disabled={Boolean(audioFile)}
            >
              {mute ? 'Muted' : 'Mute original'}
            </Button>
            <input ref={audioInputRef} type="file" accept="audio/*" hidden onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setAudioFile(f); setAudioName(f.name); setMute(true); }
              e.target.value = '';
            }} />
            <Button variant="outlined" startIcon={<MusicNoteIcon />} onClick={() => audioInputRef.current?.click()}>
              {audioName || 'Add music / audio'}
            </Button>
            {audioFile && (
              <Button size="small" color="error" onClick={() => { setAudioFile(null); setAudioName(''); }}>
                Remove audio
              </Button>
            )}
          </Stack>
        )}

        {tool === 'compress' && (
          <Stack spacing={1}>
            <ToggleButtonGroup exclusive value={quality} onChange={(_, v) => v && setQuality(v)} color="primary">
              <ToggleButton value="standard">Standard (smaller, 720p max)</ToggleButton>
              <ToggleButton value="original">High quality</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary">
              Standard compresses with H.264 · good for chat uploads
            </Typography>
          </Stack>
        )}
      </Box>
    </Dialog>
  );
}
