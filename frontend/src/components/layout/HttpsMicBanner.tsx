import { Alert, Box, Button, Collapse } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import { useState } from 'react';
import { httpsAppUrl, isMediaSecureContext } from '../../utils/secureMedia';

export function HttpsMicBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (isMediaSecureContext() || dismissed) return null;

  const httpsUrl = httpsAppUrl();

  return (
    <Collapse in>
      <Box sx={{ position: 'fixed', top: 'calc(56px + env(safe-area-inset-top, 0px))', left: 0, right: 0, zIndex: (t) => t.zIndex.snackbar, px: 1, pointerEvents: 'none' }}>
        <Alert
          severity="warning"
          icon={<MicIcon fontSize="inherit" />}
          action={
            <Button color="inherit" size="small" onClick={() => setDismissed(true)} sx={{ pointerEvents: 'auto' }}>
              Dismiss
            </Button>
          }
          sx={{ boxShadow: 2, pointerEvents: 'auto' }}
        >
          Voice & mic need <strong>HTTPS</strong>. Open{' '}
          <Box component="a" href={httpsUrl} sx={{ color: 'inherit', fontWeight: 700 }}>
            {httpsUrl}
          </Box>
          {' '}and accept the security warning.
        </Alert>
      </Box>
    </Collapse>
  );
}
