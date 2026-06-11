export type ChatUser = {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl?: string | null;
};

export type MessageStatus = {
  messageId: string;
  userId: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  readAt?: string | null;
  deliveredAt?: string | null;
  user?: ChatUser;
};

export type MessageAttachment = {
  id: string;
  file: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: string | number;
  };
};

export type ChatMessage = {
  id: string;
  content: string | null;
  contentType: string;
  sender: ChatUser;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  isEdited: boolean;
  isPinned: boolean;
  reactions: Array<{ emoji: string; user: { id: string; displayName: string } }>;
  attachments?: MessageAttachment[];
  statuses?: MessageStatus[];
  stars?: Array<{ userId: string }>;
  parent?: {
    id: string;
    content: string | null;
    sender: { displayName: string };
    attachments?: MessageAttachment[];
  } | null;
};

export type ConversationMember = {
  userId: string;
  user: ChatUser;
};

export type Conversation = {
  id: string;
  name?: string | null;
  type: 'DIRECT' | 'GROUP' | 'CHANNEL';
  members?: ConversationMember[];
  messages?: Array<{ content: string | null; createdAt: string }>;
  lastActivityAt?: string;
};

export type ReplyTarget = {
  id: string;
  content: string | null;
  senderName: string;
};
