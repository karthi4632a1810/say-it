import { useState, type ReactNode } from 'react';
import { Box, Typography, alpha } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';

type FileCardProps = {
  filename: string;
  accentColor: string;
  icon: ReactNode;
  badge: string;
  onClick?: () => void;
  children: ReactNode;
  previewHeight?: number;
  maxWidth?: number;
};

export function FilePreviewCard({
  filename,
  accentColor,
  icon,
  badge,
  onClick,
  children,
  previewHeight = 118,
  maxWidth = 268,
}: FileCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Box
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        width: '100%',
        maxWidth,
        borderRadius: '5px',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        bgcolor: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.2s, transform 0.2s',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered
          ? '0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.08)'
          : '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.25,
          py: 0.75,
          bgcolor: accentColor,
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', opacity: 0.95, '& svg': { fontSize: 18 } }}>
          {icon}
        </Box>
        <Typography variant="caption" noWrap sx={{ flex: 1, fontWeight: 600, fontSize: 12, letterSpacing: 0.2 }}>
          {filename}
        </Typography>
        <Box
          sx={{
            px: 0.75,
            py: 0.15,
            borderRadius: 0.75,
            bgcolor: alpha('#fff', 0.22),
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.5,
            lineHeight: 1.6,
            flexShrink: 0,
          }}
        >
          {badge}
        </Box>
      </Box>

      <Box sx={{ position: 'relative', height: previewHeight, bgcolor: '#fff' }}>
        {children}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha('#000', hovered ? 0.35 : 0),
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.2s, background-color 0.2s',
            pointerEvents: 'none',
          }}
        >
          <ZoomInIcon sx={{ fontSize: 32, color: '#fff' }} />
        </Box>
      </Box>
    </Box>
  );
}

type MediaCardProps = {
  onClick?: () => void;
  children: ReactNode;
  maxWidth?: number;
  aspectRatio?: string;
};

export function MediaPreviewCard({
  onClick,
  children,
  maxWidth = 268,
  aspectRatio,
}: MediaCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Box
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth,
        ...(aspectRatio ? { aspectRatio } : {}),
        borderRadius: '5px',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        bgcolor: '#0f172a',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
        transition: 'box-shadow 0.2s, transform 0.2s',
        transform: hovered ? 'translateY(-1px)' : 'none',
        ...(hovered ? { boxShadow: '0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.08)' } : {}),
        lineHeight: 0,
      }}
    >
      {children}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha('#000', hovered ? 0.35 : 0),
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.2s',
          pointerEvents: 'none',
        }}
      >
        <ZoomInIcon sx={{ fontSize: 28, color: '#fff' }} />
      </Box>
    </Box>
  );
}

export function fileExtBadge(filename: string, fallback = 'FILE'): string {
  const ext = filename.split('.').pop()?.toUpperCase() ?? fallback;
  return ext.length <= 5 ? ext : fallback;
}
