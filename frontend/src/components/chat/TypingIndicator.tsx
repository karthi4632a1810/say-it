import { Box, Paper, Typography, Avatar } from '@mui/material';
import type { ChatUser } from '../../types/chat';

type Props = {
  user: ChatUser;
};

function TypingDots() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.25,
        py: 0.5,
        minWidth: 44,
      }}
    >
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: 'text.secondary',
            opacity: 0.45,
            animation: 'typingDot 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
            '@keyframes typingDot': {
              '0%, 60%, 100%': { transform: 'translateY(0)', opacity: 0.35 },
              '30%': { transform: 'translateY(-5px)', opacity: 0.85 },
            },
          }}
        />
      ))}
    </Box>
  );
}

export function TypingIndicator({ user }: Props) {
  return (
    <Box
      sx={{
        mb: 1.5,
        display: 'flex',
        gap: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        px: 0.5,
        py: 0.25,
        mx: -0.5,
      }}
    >
      <Avatar src={user.avatarUrl ?? undefined} sx={{ width: 32, height: 32 }}>
        {user.displayName[0]}
      </Avatar>
      <Box sx={{ maxWidth: '75%', minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
          {user.displayName}
        </Typography>
        <Paper
          sx={{
            p: 1.25,
            bgcolor: 'grey.100',
            width: 'fit-content',
            minWidth: 56,
          }}
        >
          <TypingDots />
        </Paper>
      </Box>
    </Box>
  );
}
