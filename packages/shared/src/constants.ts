export const CONVERSATION_TYPES = ['DIRECT', 'GROUP', 'CHANNEL'] as const;
export const MESSAGE_CONTENT_TYPES = ['TEXT', 'MARKDOWN', 'SYSTEM'] as const;
export const PRESENCE_STATUSES = ['online', 'away', 'busy', 'offline'] as const;
export const EMBEDDING_SOURCE_TYPES = ['MESSAGE', 'FILE', 'ANNOUNCEMENT', 'MEETING_NOTE'] as const;

export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  DEPT_ADMIN: 'DEPT_ADMIN',
  MEMBER: 'MEMBER',
  READONLY: 'READONLY',
} as const;

export const PERMISSIONS = [
  'users:read',
  'users:write',
  'users:delete',
  'conversations:create',
  'conversations:manage',
  'channels:create',
  'channels:manage',
  'channels:delete',
  'files:upload',
  'files:delete',
  'announcements:create',
  'announcements:emergency',
  'meetings:schedule',
  'meetings:manage',
  'admin:users',
  'admin:roles',
  'admin:audit',
  'ai:search',
  'ai:summarize',
] as const;
