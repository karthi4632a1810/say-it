import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, CircularProgress, IconButton, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import MicIcon from '@mui/icons-material/Mic';
import { useFileBlob } from '../../hooks/useFileBlob';

type Props = {
  fileId: string;
  isOwn?: boolean;
};

const BAR_COUNT = 32;

const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const n = Math.sin(i * 0.55) * 0.22 + Math.cos(i * 1.15) * 0.18 + Math.sin(i * 2.1) * 0.12;
  return 0.28 + Math.abs(n);
});

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function Waveform({
  progress,
  isOwn,
  playing,
  onSeek,
}: {
  progress: number;
  isOwn?: boolean;
  playing: boolean;
  onSeek: (ratio: number) => void;
}) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(ratio);
  };

  return (
    <Box
      onClick={handleClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        flex: 1,
        height: 30,
        minWidth: 0,
        cursor: 'pointer',
        py: 0.25,
      }}
    >
      {BAR_HEIGHTS.map((h, i) => {
        const barProgress = (i + 0.5) / BAR_COUNT;
        const active = barProgress <= progress;
        return (
          <Box
            key={i}
            sx={{
              flex: 1,
              maxWidth: 4,
              borderRadius: 1,
              height: `${h * 100}%`,
              minHeight: 4,
              bgcolor: isOwn
                ? (active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.32)')
                : (active ? 'primary.main' : 'rgba(79, 70, 229, 0.22)'),
              transform: playing && active ? 'scaleY(1.08)' : 'scaleY(1)',
              transition: 'transform 0.12s ease, background-color 0.12s ease',
              animation: playing
                ? `audioBar ${0.45 + (i % 7) * 0.08}s ease-in-out infinite alternate`
                : undefined,
              animationDelay: `${(i % 5) * 0.05}s`,
              '@keyframes audioBar': {
                from: { transform: 'scaleY(0.85)' },
                to: { transform: 'scaleY(1.15)' },
              },
            }}
          />
        );
      })}
    </Box>
  );
}

function PlayerShell({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        mt: 0.25,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: 240,
        maxWidth: 300,
        py: 0.25,
      }}
    >
      {children}
    </Box>
  );
}

function AudioPlayerControls({ blobUrl, isOwn }: { blobUrl: string; isOwn?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const progress = duration > 0 ? currentTime / duration : 0;

  const syncTime = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);
    setDuration(el.duration || 0);
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };
    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onLoaded = () => setDuration(el.duration || 0);

    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('durationchange', onLoaded);

    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('durationchange', onLoaded);
    };
  }, [blobUrl]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else void el.play();
  };

  const seek = (ratio: number) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    el.currentTime = ratio * duration;
    syncTime();
  };

  const timeLabel = useMemo(() => {
    if (playing || currentTime > 0) return formatAudioTime(currentTime);
    return formatAudioTime(duration);
  }, [playing, currentTime, duration]);

  return (
    <PlayerShell>
      <audio ref={audioRef} src={blobUrl} preload="metadata" style={{ display: 'none' }} />

      <IconButton
        onClick={togglePlay}
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
        sx={{
          width: 42,
          height: 42,
          flexShrink: 0,
          bgcolor: isOwn ? 'rgba(255,255,255,0.95)' : 'primary.main',
          color: isOwn ? 'primary.main' : 'white',
          boxShadow: isOwn ? 'none' : '0 2px 8px rgba(79, 70, 229, 0.35)',
          '&:hover': {
            bgcolor: isOwn ? 'white' : 'primary.dark',
          },
        }}
      >
        {playing ? <PauseIcon sx={{ fontSize: 22 }} /> : <PlayArrowIcon sx={{ fontSize: 24, ml: 0.25 }} />}
      </IconButton>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Waveform progress={progress} isOwn={isOwn} playing={playing} onSeek={seek} />
        <StackMeta isOwn={isOwn} timeLabel={timeLabel} />
      </Box>
    </PlayerShell>
  );
}

function StackMeta({ isOwn, timeLabel }: { isOwn?: boolean; timeLabel: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
      <MicIcon sx={{ fontSize: 12, opacity: 0.7, color: isOwn ? 'rgba(255,255,255,0.85)' : 'text.secondary' }} />
      <Typography
        variant="caption"
        sx={{
          fontSize: 11,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color: isOwn ? 'rgba(255,255,255,0.85)' : 'text.secondary',
        }}
      >
        {timeLabel}
      </Typography>
    </Box>
  );
}

function LoadingPlayer({ isOwn }: { isOwn?: boolean }) {
  return (
    <PlayerShell>
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(79, 70, 229, 0.1)',
        }}
      >
        <CircularProgress size={20} sx={{ color: isOwn ? 'white' : 'primary.main' }} />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px', height: 30, opacity: 0.45 }}>
          {BAR_HEIGHTS.map((h, i) => (
            <Box
              key={i}
              sx={{
                flex: 1,
                maxWidth: 4,
                borderRadius: 1,
                height: `${h * 100}%`,
                bgcolor: isOwn ? 'rgba(255,255,255,0.5)' : 'rgba(79, 70, 229, 0.35)',
              }}
            />
          ))}
        </Box>
      </Box>
    </PlayerShell>
  );
}

export function AudioMessagePlayer({ fileId, isOwn }: Props) {
  const { blobUrl, loading, error } = useFileBlob(fileId, true);

  if (loading) return <LoadingPlayer isOwn={isOwn} />;
  if (error || !blobUrl) return null;

  return <AudioPlayerControls blobUrl={blobUrl} isOwn={isOwn} />;
}
