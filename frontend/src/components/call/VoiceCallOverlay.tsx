import {
  Box, Paper, Typography, IconButton, Stack, Snackbar, Alert,
} from '@mui/material';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import { useVoiceCall } from '../../context/CallProvider';
import { formatRecordTime } from '../../utils/audioRecord';
import { CallVideo } from './CallVideo';

function statusLabel(status: string, duration: number): string {
  if (status === 'active') return formatRecordTime(duration);
  if (status === 'outgoing') return 'Calling…';
  if (status === 'connecting') return 'Connecting…';
  return 'On call';
}

function CallControls({
  status,
  isMuted,
  isCameraOff,
  isRecording,
  isVideo,
  onToggleMute,
  onToggleCamera,
  onToggleRecord,
  onEndCall,
}: {
  status: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isRecording: boolean;
  isVideo: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleRecord: () => void;
  onEndCall: () => void;
}) {
  return (
    <Stack direction="row" spacing={2} justifyContent="center">
      <IconButton
        onClick={onToggleMute}
        sx={{
          bgcolor: isMuted ? 'error.light' : 'action.hover',
          color: isMuted ? 'error.contrastText' : 'text.primary',
          '&:hover': { bgcolor: isMuted ? 'error.main' : 'action.selected' },
          width: 56,
          height: 56,
        }}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <MicOffIcon /> : <MicIcon />}
      </IconButton>

      {isVideo && (
        <IconButton
          onClick={onToggleCamera}
          sx={{
            bgcolor: isCameraOff ? 'error.light' : 'action.hover',
            color: isCameraOff ? 'error.contrastText' : 'text.primary',
            '&:hover': { bgcolor: isCameraOff ? 'error.main' : 'action.selected' },
            width: 56,
            height: 56,
          }}
          title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
        >
          {isCameraOff ? <VideocamOffIcon /> : <VideocamIcon />}
        </IconButton>
      )}

      {status === 'active' && (
        <IconButton
          onClick={onToggleRecord}
          sx={{
            bgcolor: isRecording ? 'error.main' : 'action.hover',
            color: isRecording ? 'error.contrastText' : 'text.primary',
            '&:hover': { bgcolor: isRecording ? 'error.dark' : 'action.selected' },
            width: 56,
            height: 56,
          }}
          title={isRecording ? 'Stop recording' : 'Record call'}
        >
          {isRecording ? <StopCircleIcon /> : <FiberManualRecordIcon />}
        </IconButton>
      )}

      <IconButton
        onClick={onEndCall}
        sx={{
          bgcolor: 'error.main',
          color: 'error.contrastText',
          '&:hover': { bgcolor: 'error.dark' },
          width: 56,
          height: 56,
        }}
        title="End call"
      >
        <CallEndIcon />
      </IconButton>
    </Stack>
  );
}

export function VoiceCallOverlay() {
  const {
    status,
    callType,
    peerName,
    isMuted,
    isCameraOff,
    isRecording,
    callDuration,
    error,
    localStream,
    remoteStream,
    clearError,
    endCall,
    toggleMute,
    toggleCamera,
    toggleRecord,
  } = useVoiceCall();

  const visible = status === 'outgoing' || status === 'connecting' || status === 'active';
  const isVideo = callType === 'video';

  if (!visible) {
    return error ? (
      <Snackbar open autoHideDuration={4000} onClose={clearError} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="warning" variant="filled" sx={{ width: '100%' }} onClose={clearError}>{error}</Alert>
      </Snackbar>
    ) : null;
  }

  const controls = (
    <CallControls
      status={status}
      isMuted={isMuted}
      isCameraOff={isCameraOff}
      isRecording={isRecording}
      isVideo={isVideo}
      onToggleMute={toggleMute}
      onToggleCamera={toggleCamera}
      onToggleRecord={toggleRecord}
      onEndCall={endCall}
    />
  );

  if (isVideo) {
    return (
      <>
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: (t) => t.zIndex.modal + 2,
            bgcolor: '#000',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
            <CallVideo stream={remoteStream} sx={{ position: 'absolute', inset: 0 }} />
            {!remoteStream && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#111',
                }}
              >
                <Typography variant="h5" color="grey.400">{peerName}</Typography>
              </Box>
            )}

            {localStream && !isCameraOff && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  right: 16,
                  width: { xs: 100, sm: 140 },
                  height: { xs: 140, sm: 180 },
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '2px solid rgba(255,255,255,0.3)',
                  boxShadow: 4,
                  zIndex: 1,
                }}
              >
                <CallVideo stream={localStream} muted mirror />
              </Box>
            )}

            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                p: 2,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
                textAlign: 'center',
                zIndex: 1,
              }}
            >
              <Typography variant="h6" fontWeight={700} color="common.white">{peerName}</Typography>
              <Typography variant="body2" color="grey.300">
                {statusLabel(status, callDuration)}
              </Typography>
              {isRecording && (
                <Typography variant="caption" color="error.light" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
                  <FiberManualRecordIcon sx={{ fontSize: 12 }} /> Recording
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ p: 2, pb: 3, bgcolor: 'rgba(0,0,0,0.85)' }}>
            {controls}
          </Box>
        </Box>

        {error && (
          <Snackbar open autoHideDuration={4000} onClose={clearError} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
            <Alert severity="warning" variant="filled" onClose={clearError}>{error}</Alert>
          </Snackbar>
        )}
      </>
    );
  }

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: (t) => t.zIndex.modal + 2,
          bgcolor: 'rgba(0,0,0,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Paper
          elevation={8}
          sx={{
            width: '100%',
            maxWidth: 360,
            borderRadius: 3,
            p: 3,
            textAlign: 'center',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {peerName}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            {statusLabel(status, callDuration)}
          </Typography>
          {status === 'connecting' && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Setting up secure audio…
            </Typography>
          )}
          {isRecording && (
            <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 2 }}>
              <FiberManualRecordIcon sx={{ fontSize: 12 }} /> Recording
            </Typography>
          )}

          <Box sx={{ mt: 3 }}>{controls}</Box>
        </Paper>
      </Box>

      {error && (
        <Snackbar open autoHideDuration={4000} onClose={clearError} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity="warning" variant="filled" onClose={clearError}>{error}</Alert>
        </Snackbar>
      )}
    </>
  );
}
