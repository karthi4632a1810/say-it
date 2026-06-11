import { Avatar, Badge, type AvatarProps } from '@mui/material';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { presenceDotColor } from '../../utils/presence';

type Props = AvatarProps & {
  userId?: string | null;
  showStatus?: boolean;
};

export function PresenceAvatar({ userId, showStatus = true, sx, ...avatarProps }: Props) {
  const status = useSelector((s: RootState) => (userId ? s.presence[userId]?.status : undefined));
  const dotColor = showStatus && userId ? presenceDotColor(status) : null;

  const avatar = <Avatar sx={sx} {...avatarProps} />;

  if (!dotColor) return avatar;

  return (
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      variant="dot"
      sx={{
        '& .MuiBadge-badge': {
          backgroundColor: dotColor,
          color: dotColor,
          boxShadow: '0 0 0 2px #fff',
          width: 10,
          height: 10,
          borderRadius: '50%',
        },
      }}
    >
      {avatar}
    </Badge>
  );
}
