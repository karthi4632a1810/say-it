import { Typography, type TypographyProps } from '@mui/material';
import { usePresenceLabel } from '../../hooks/usePresenceLabel';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

type Props = TypographyProps & {
  userId?: string | null;
};

export function PresenceLabel({ userId, ...typographyProps }: Props) {
  const label = usePresenceLabel(userId);
  const status = useSelector((s: RootState) => (userId ? s.presence[userId]?.status : undefined));

  if (!userId || !label) return null;

  return (
    <Typography
      variant="caption"
      color={status === 'online' ? 'success.main' : 'text.secondary'}
      {...typographyProps}
    >
      {label}
    </Typography>
  );
}
