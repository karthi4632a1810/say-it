import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, List, ListItemButton, ListItemText } from '@mui/material';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { apiClient } from '../../services/api/client';
import { getConversationTitle } from '../../utils/chat';
import type { Conversation } from '../../types/chat';

type Props = {
  open: boolean;
  messageId: string | null;
  currentConversationId?: string;
  onClose: () => void;
  onForwarded: () => void;
};

export function ForwardDialog({ open, messageId, currentConversationId, onClose, onForwarded }: Props) {
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!open) return;
    apiClient.get('/conversations').then((r) => setConversations(r.data.data));
  }, [open]);

  const forward = async (conversationId: string) => {
    if (!messageId) return;
    await apiClient.post(`/messages/${messageId}/forward`, { conversationId });
    onForwarded();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Forward to</DialogTitle>
      <DialogContent>
        <List dense>
          {conversations
            .filter((c) => c.id !== currentConversationId)
            .map((c) => (
              <ListItemButton key={c.id} onClick={() => forward(c.id)}>
                <ListItemText primary={getConversationTitle(c, userId ?? '')} secondary={c.type} />
              </ListItemButton>
            ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
