import { Box, Typography } from '@mui/material';
import ReplyIcon from '@mui/icons-material/Reply';

type Props = {
  senderName: string;
  preview: string;
  isOwnBubble?: boolean;
  compact?: boolean;
  onClick?: () => void;
};

export function ReplyQuote({ senderName, preview, isOwnBubble = false, compact = false, onClick }: Props) {
  return (
    <Box
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 0.75,
        mb: compact ? 0 : 1,
        px: 1,
        py: compact ? 0.75 : 0.85,
        borderRadius: 1.5,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflow: 'hidden',
        flex: compact ? 1 : undefined,
        flexShrink: 1,
        boxSizing: 'border-box',
        cursor: onClick ? 'pointer' : 'default',
        bgcolor: isOwnBubble ? 'rgba(0,0,0,0.28)' : 'rgba(79, 70, 229, 0.1)',
        borderLeft: '3px solid',
        borderColor: isOwnBubble ? '#C7D2FE' : 'primary.main',
        transition: 'background-color 0.15s ease, transform 0.15s ease',
        '&:hover': onClick ? {
          bgcolor: isOwnBubble ? 'rgba(0,0,0,0.38)' : 'rgba(79, 70, 229, 0.16)',
          transform: 'translateY(-1px)',
        } : undefined,
        '&:focus-visible': onClick ? { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 1 } : undefined,
      }}
    >
      {onClick && (
        <ReplyIcon sx={{ fontSize: 16, mt: 0.2, color: isOwnBubble ? 'rgba(255,255,255,0.7)' : 'primary.main', flexShrink: 0 }} />
      )}
      <Box sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
        <Typography
          variant="caption"
          fontWeight={700}
          noWrap
          sx={{ color: isOwnBubble ? '#E0E7FF' : 'primary.main', display: 'block', lineHeight: 1.35 }}
        >
          {senderName}
        </Typography>
        <Typography
          variant="caption"
          noWrap
          sx={{
            color: isOwnBubble ? 'rgba(255,255,255,0.9)' : 'text.secondary',
            display: 'block',
            lineHeight: 1.35,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {preview}
        </Typography>
      </Box>
    </Box>
  );
}
