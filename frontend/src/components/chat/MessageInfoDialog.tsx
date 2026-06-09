import {
  Dialog, DialogTitle, DialogContent, Typography, List, ListItem, ListItemText, Divider,
} from '@mui/material';
import { formatMessageTime } from '../../utils/chat';

type Info = {
  id: string;
  content: string | null;
  createdAt: string;
  isEdited: boolean;
  sender: { displayName: string };
  statuses: Array<{ status: string; readAt?: string | null; user: { displayName: string } }>;
  edits: Array<{ previousContent: string; editedAt: string }>;
};

type Props = {
  open: boolean;
  info: Info | null;
  onClose: () => void;
};

export function MessageInfoDialog({ open, info, onClose }: Props) {
  if (!info) return null;
  const readers = info.statuses.filter((s) => s.status === 'READ');

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Message info</DialogTitle>
      <DialogContent>
        <Typography variant="body2" gutterBottom>
          <strong>Sent:</strong> {formatMessageTime(info.createdAt)} by {info.sender.displayName}
        </Typography>
        {info.isEdited && <Typography variant="caption" color="text.secondary">Edited</Typography>}

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>Read by</Typography>
        {readers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Not read yet</Typography>
        ) : (
          <List dense>
            {readers.map((s, i) => (
              <ListItem key={i} disablePadding>
                <ListItemText
                  primary={s.user.displayName}
                  secondary={s.readAt ? formatMessageTime(s.readAt) : ''}
                />
              </ListItem>
            ))}
          </List>
        )}

        {info.edits.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>Edit history</Typography>
            <List dense>
              {info.edits.map((e, i) => (
                <ListItem key={i} alignItems="flex-start" disablePadding sx={{ mb: 1 }}>
                  <ListItemText
                    primary={e.previousContent}
                    secondary={formatMessageTime(e.editedAt)}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
