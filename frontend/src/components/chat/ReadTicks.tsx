import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { Box } from '@mui/material';
import type { ReadTick } from '../../utils/chat';

export function ReadTicks({ status }: { status: ReadTick }) {
  const color = status === 'read' ? '#34B7F1' : 'rgba(255,255,255,0.7)';
  return (
    <Box component="span" sx={{ display: 'inline-flex', ml: 0.5, verticalAlign: 'middle', color }}>
      {status === 'sent' ? <DoneIcon sx={{ fontSize: 14 }} /> : <DoneAllIcon sx={{ fontSize: 14 }} />}
    </Box>
  );
}
