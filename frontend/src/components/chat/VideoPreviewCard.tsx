import { useCallback, useRef, useState } from 'react';
import { Box, Skeleton, Typography, alpha } from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';

function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type CardProps = {
  src: string;
  onClick?: () => void;
  loading?: boolean;
  maxWidth?: number;
  /** Use on purple / primary message bubbles */
  onPrimaryBubble?: boolean;
};

export function VideoPreviewCard({
  src, onClick, loading, maxWidth = 280, onPrimaryBubble = false,
}: CardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const onMeta = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(formatDuration(v.duration));
    setReady(true);
  }, []);

  if (loading) {
    return (
      <Skeleton
        variant="rounded"
        width={maxWidth}
        sx={{ aspectRatio: '16/9', borderRadius: 2.5, bgcolor: onPrimaryBubble ? 'rgba(255,255,255,0.15)' : 'grey.300' }}
      />
    );
  }

  return (
    <Box
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth,
        aspectRatio: '16/9',
        borderRadius: 2.5,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        bgcolor: '#0f172a',
        boxShadow: onPrimaryBubble
          ? '0 4px 20px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.12)'
          : '0 4px 16px rgba(15,23,42,0.12), inset 0 0 0 1px rgba(15,23,42,0.08)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': onClick ? {
          transform: 'translateY(-1px)',
          boxShadow: onPrimaryBubble
            ? '0 8px 28px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.18)'
            : '0 8px 24px rgba(15,23,42,0.16), inset 0 0 0 1px rgba(15,23,42,0.1)',
        } : undefined,
        '&:focus-visible': onClick ? { outline: `2px solid ${onPrimaryBubble ? '#fff' : '#4F46E5'}`, outlineOffset: 2 } : undefined,
      }}
    >
      <Box
        component="video"
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={onMeta}
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          pointerEvents: 'none',
          opacity: ready ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      />

      {!ready && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MovieOutlinedIcon sx={{ fontSize: 40, color: alpha('#fff', 0.35) }} />
        </Box>
      )}

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.55) 100%)',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 52,
          height: 52,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha('#fff', 0.92),
          color: '#4F46E5',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          pointerEvents: 'none',
        }}
      >
        <PlayArrowRoundedIcon sx={{ fontSize: 34, ml: 0.3 }} />
      </Box>

      {duration && (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            px: 0.75,
            py: 0.2,
            borderRadius: 1,
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: 0.3,
            color: '#fff',
            bgcolor: alpha('#000', 0.55),
            backdropFilter: 'blur(4px)',
            pointerEvents: 'none',
          }}
        >
          {duration}
        </Typography>
      )}
    </Box>
  );
}

export function VideoFullscreenPlayer({ src, name }: { src: string; name: string }) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: 960,
        mx: 'auto',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: '#000',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}
    >
      <Box
        component="video"
        src={src}
        controls
        playsInline
        autoPlay
        sx={{ width: '100%', maxHeight: 'calc(100vh - 160px)', display: 'block' }}
      />
      <Typography
        variant="caption"
        noWrap
        sx={{
          position: 'absolute',
          left: 12,
          top: 12,
          px: 1,
          py: 0.35,
          borderRadius: 1,
          color: '#fff',
          bgcolor: alpha('#000', 0.5),
          backdropFilter: 'blur(6px)',
          maxWidth: '70%',
        }}
      >
        {name}
      </Typography>
    </Box>
  );
}
