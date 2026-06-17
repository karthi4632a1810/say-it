import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Stack, Avatar,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import VideocamIcon from '@mui/icons-material/Videocam';
import CallEndIcon from '@mui/icons-material/CallEnd';
import { useVoiceCall } from '../../context/CallProvider';

export function IncomingCallDialog() {
  const { status, session, peerName, acceptCall, rejectCall } = useVoiceCall();

  if (status !== 'incoming' || !session) return null;

  const isVideo = session.callType === 'video';

  return (
    <Dialog open maxWidth="xs" fullWidth disableEscapeKeyDown>
      <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>Incoming call</DialogTitle>
      <DialogContent>
        <Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
          <Avatar sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: 28 }}>
            {peerName[0]?.toUpperCase() ?? '?'}
          </Avatar>
          <Typography variant="h6" fontWeight={600}>{peerName}</Typography>
          <Typography variant="body2" color="text.secondary">
            {isVideo ? 'Video call' : 'Voice call'}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 3 }}>
        <Button
          variant="contained"
          color="error"
          startIcon={<CallEndIcon />}
          onClick={rejectCall}
          sx={{ minWidth: 120 }}
        >
          Decline
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={isVideo ? <VideocamIcon /> : <PhoneIcon />}
          onClick={() => void acceptCall()}
          sx={{ minWidth: 120 }}
        >
          Accept
        </Button>
      </DialogActions>
    </Dialog>
  );
}
