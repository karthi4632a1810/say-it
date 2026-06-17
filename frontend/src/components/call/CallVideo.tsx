import { useEffect, useRef } from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';

type Props = {
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  sx?: SxProps<Theme>;
};

export function CallVideo({ stream, muted = false, mirror = false, sx }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play().catch(() => {});
  }, [stream]);

  return (
    <Box
      component="video"
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      sx={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        bgcolor: '#111',
        transform: mirror ? 'scaleX(-1)' : undefined,
        ...sx,
      }}
    />
  );
}
