import { randomUUID } from 'crypto';
import type { Server, Socket } from 'socket.io';
import { prisma } from '../../config/database.js';
import { CALL_EVENTS, type CallSessionPayload } from '../events/call.events.js';

type ActiveCall = {
  callId: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  callType: 'voice' | 'video';
  state: 'ringing' | 'active';
};

const activeCalls = new Map<string, ActiveCall>();
const userCallId = new Map<string, string>();

function emitToUser(io: Server, userId: string, event: string, payload: unknown) {
  io.to(`user:${userId}`).emit(event, payload);
}

function clearCall(callId: string) {
  const call = activeCalls.get(callId);
  if (!call) return;
  userCallId.delete(call.callerId);
  userCallId.delete(call.calleeId);
  activeCalls.delete(callId);
}

function getOtherUserId(call: ActiveCall, userId: string): string {
  return call.callerId === userId ? call.calleeId : call.callerId;
}

async function assertDirectMembers(conversationId: string, userId: string, otherUserId: string) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      members: {
        include: { user: { select: { id: true, displayName: true } } },
      },
    },
  });
  if (!conv || conv.type !== 'DIRECT') throw new Error('NOT_DIRECT');
  const memberIds = new Set(conv.members.map((m) => m.userId));
  if (!memberIds.has(userId) || !memberIds.has(otherUserId)) throw new Error('FORBIDDEN');
  return conv;
}

export function registerCallHandlers(io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;

  socket.on(CALL_EVENTS.INITIATE, async (data: { conversationId: string; calleeId: string; callType?: 'voice' | 'video' }) => {
    try {
      const callType = data.callType === 'video' ? 'video' : 'voice';
      if (userCallId.has(userId)) {
        socket.emit(CALL_EVENTS.BUSY, { reason: 'You are already in a call' });
        return;
      }
      if (userCallId.has(data.calleeId)) {
        socket.emit(CALL_EVENTS.BUSY, { reason: 'User is busy' });
        return;
      }

      const conv = await assertDirectMembers(data.conversationId, userId, data.calleeId);
      const caller = conv.members.find((m) => m.userId === userId)?.user;
      const callee = conv.members.find((m) => m.userId === data.calleeId)?.user;
      if (!caller || !callee) {
        socket.emit(CALL_EVENTS.FAILED, { message: 'Invalid participants' });
        return;
      }

      const callId = randomUUID();
      const session: ActiveCall = {
        callId,
        conversationId: data.conversationId,
        callerId: userId,
        calleeId: data.calleeId,
        callType,
        state: 'ringing',
      };
      activeCalls.set(callId, session);
      userCallId.set(userId, callId);
      userCallId.set(data.calleeId, callId);

      const payload: CallSessionPayload = {
        callId,
        conversationId: data.conversationId,
        caller: { id: caller.id, displayName: caller.displayName },
        callee: { id: callee.id, displayName: callee.displayName },
        callType,
      };

      socket.emit(CALL_EVENTS.INCOMING, { ...payload, role: 'caller' });
      emitToUser(io, data.calleeId, CALL_EVENTS.INCOMING, { ...payload, role: 'callee' });

      setTimeout(() => {
        const current = activeCalls.get(callId);
        if (current?.state === 'ringing') {
          emitToUser(io, current.callerId, CALL_EVENTS.ENDED, { callId, reason: 'no-answer' });
          emitToUser(io, current.calleeId, CALL_EVENTS.ENDED, { callId, reason: 'no-answer' });
          clearCall(callId);
        }
      }, 45_000);
    } catch (err) {
      const msg = (err as Error).message;
      socket.emit(CALL_EVENTS.FAILED, {
        message: msg === 'NOT_DIRECT' ? 'Calls are only available in direct chats' : 'Could not start call',
      });
    }
  });

  socket.on(CALL_EVENTS.ACCEPT, (data: { callId: string }) => {
    const call = activeCalls.get(data.callId);
    if (!call || call.calleeId !== userId || call.state !== 'ringing') return;
    call.state = 'active';
    emitToUser(io, call.callerId, CALL_EVENTS.ACCEPTED, { callId: call.callId });
    socket.emit(CALL_EVENTS.ACCEPTED, { callId: call.callId });
  });

  socket.on(CALL_EVENTS.REJECT, (data: { callId: string }) => {
    const call = activeCalls.get(data.callId);
    if (!call) return;
    if (call.calleeId !== userId && call.callerId !== userId) return;
    emitToUser(io, getOtherUserId(call, userId), CALL_EVENTS.REJECTED, { callId: call.callId });
    clearCall(call.callId);
  });

  socket.on(CALL_EVENTS.END, (data: { callId: string }) => {
    const call = activeCalls.get(data.callId);
    if (!call) return;
    if (call.callerId !== userId && call.calleeId !== userId) return;
    emitToUser(io, getOtherUserId(call, userId), CALL_EVENTS.ENDED, { callId: call.callId, reason: 'ended' });
    clearCall(call.callId);
  });

  socket.on(CALL_EVENTS.OFFER, (data: { callId: string; sdp: { type: string; sdp?: string } }) => {
    const call = activeCalls.get(data.callId);
    if (!call || call.callerId !== userId || call.state !== 'active') return;
    emitToUser(io, call.calleeId, CALL_EVENTS.OFFER, { callId: call.callId, sdp: data.sdp });
  });

  socket.on(CALL_EVENTS.ANSWER, (data: { callId: string; sdp: { type: string; sdp?: string } }) => {
    const call = activeCalls.get(data.callId);
    if (!call || call.calleeId !== userId || call.state !== 'active') return;
    emitToUser(io, call.callerId, CALL_EVENTS.ANSWER, { callId: call.callId, sdp: data.sdp });
  });

  socket.on(CALL_EVENTS.ICE, (data: { callId: string; candidate: { candidate?: string; sdpMid?: string | null; sdpMLineIndex?: number | null } }) => {
    const call = activeCalls.get(data.callId);
    if (!call) return;
    if (call.callerId !== userId && call.calleeId !== userId) return;
    emitToUser(io, getOtherUserId(call, userId), CALL_EVENTS.ICE, {
      callId: call.callId,
      candidate: data.candidate,
    });
  });

  socket.on('disconnect', () => {
    const callId = userCallId.get(userId);
    if (!callId) return;
    const call = activeCalls.get(callId);
    if (!call) return;
    emitToUser(io, getOtherUserId(call, userId), CALL_EVENTS.ENDED, { callId, reason: 'disconnected' });
    clearCall(callId);
  });
}
