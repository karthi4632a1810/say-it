export const CALL_EVENTS = {
  INITIATE: 'call:initiate',
  INCOMING: 'call:incoming',
  ACCEPT: 'call:accept',
  ACCEPTED: 'call:accepted',
  REJECT: 'call:reject',
  REJECTED: 'call:rejected',
  END: 'call:end',
  ENDED: 'call:ended',
  OFFER: 'call:offer',
  ANSWER: 'call:answer',
  ICE: 'call:ice-candidate',
  BUSY: 'call:busy',
  FAILED: 'call:failed',
} as const;

export type CallType = 'voice' | 'video';

export type CallParticipant = {
  id: string;
  displayName: string;
};

export type CallSessionPayload = {
  callId: string;
  conversationId: string;
  caller: CallParticipant;
  callee: CallParticipant;
  callType: CallType;
  role: 'caller' | 'callee';
};

export type CallStatus =
  | 'idle'
  | 'outgoing'
  | 'incoming'
  | 'connecting'
  | 'active'
  | 'ended';

export type IceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};
