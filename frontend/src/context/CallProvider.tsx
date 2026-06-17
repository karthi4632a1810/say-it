import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { apiClient } from '../services/api/client';
import { getSocket } from '../services/socket/socket.client';
import {
  CALL_EVENTS,
  type CallSessionPayload,
  type CallStatus,
  type CallType,
  type IceServerConfig,
} from '../services/calls/callTypes';
import { CallRecorder, downloadCallRecording } from '../utils/callRecording';
import { micBlockedReason } from '../utils/secureMedia';
import { getCallMediaStream } from '../utils/microphone';
import { DEFAULT_ICE_SERVERS } from '../utils/webrtc';

const CONNECT_TIMEOUT_MS = 30_000;

type CallContextValue = {
  status: CallStatus;
  session: CallSessionPayload | null;
  callType: CallType;
  peerName: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isRecording: boolean;
  callDuration: number;
  error: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  clearError: () => void;
  initiateCall: (conversationId: string, calleeId: string, callType?: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleRecord: () => void;
};

const CallContext = createContext<CallContextValue | null>(null);

export function useVoiceCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useVoiceCall must be used within CallProvider');
  return ctx;
}

export function CallProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [session, setSession] = useState<CallSessionPayload | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const iceServersRef = useRef<IceServerConfig[]>([]);
  const callTypeRef = useRef<CallType>('voice');
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<CallSessionPayload | null>(null);
  const recorderRef = useRef<CallRecorder | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const durationTimerRef = useRef<ReturnType<typeof setInterval>>();
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  sessionRef.current = session;

  const peerName = session
    ? session.role === 'caller'
      ? session.callee.displayName
      : session.caller.displayName
    : '';

  const stopLocalMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
  }, []);

  const stopRemoteMedia = useCallback(() => {
    remoteStreamRef.current?.getTracks().forEach((t) => t.stop());
    remoteStreamRef.current = null;
    setRemoteStream(null);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  }, []);

  const closePeer = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    pendingCandidatesRef.current = [];
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = undefined;
    }
  }, []);

  const clearConnectTimeout = useCallback(() => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = undefined;
    }
  }, []);

  const playRemoteAudio = useCallback(async () => {
    const el = remoteAudioRef.current;
    if (!el?.srcObject) return;
    try {
      el.muted = false;
      await el.play();
    } catch {
      /* iOS may need another gesture — retried on track */
    }
  }, []);

  const startDurationTimer = useCallback(() => {
    stopDurationTimer();
    setCallDuration(0);
    durationTimerRef.current = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
  }, [stopDurationTimer]);

  const resetState = useCallback(() => {
    const name = sessionRef.current
      ? sessionRef.current.role === 'caller'
        ? sessionRef.current.callee.displayName
        : sessionRef.current.caller.displayName
      : 'call';
    const wasRecording = Boolean(recorderRef.current);

    stopDurationTimer();
    clearConnectTimeout();
    closePeer();
    stopLocalMedia();
    stopRemoteMedia();

    if (recorderRef.current) {
      const recorder = recorderRef.current;
      recorderRef.current = null;
      void recorder.stop().then((blob) => {
        if (blob && wasRecording) downloadCallRecording(blob, name);
      });
    }
    setIsMuted(false);
    setIsCameraOff(false);
    setIsRecording(false);
    callTypeRef.current = 'voice';
    setCallDuration(0);
    setSession(null);
    setStatus('idle');
    setError(null);
  }, [clearConnectTimeout, closePeer, stopDurationTimer, stopLocalMedia, stopRemoteMedia]);

  const markConnected = useCallback(() => {
    clearConnectTimeout();
    setStatus('active');
    startDurationTimer();
    void playRemoteAudio();
  }, [clearConnectTimeout, playRemoteAudio, startDurationTimer]);

  const startConnectTimeout = useCallback(() => {
    clearConnectTimeout();
    connectTimeoutRef.current = setTimeout(() => {
      if (sessionRef.current && pcRef.current?.connectionState !== 'connected') {
        setError('Could not connect the call. Stay on the same WiFi and try again.');
      }
    }, CONNECT_TIMEOUT_MS);
  }, [clearConnectTimeout]);

  const ensureLocalStream = useCallback(async (): Promise<MediaStream> => {
    const blocked = micBlockedReason();
    if (blocked) throw new Error(blocked);
    const withVideo = callTypeRef.current === 'video' || sessionRef.current?.callType === 'video';
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await getCallMediaStream(withVideo);
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const queueIceCandidate = useCallback((candidate: RTCIceCandidateInit) => {
    pendingCandidatesRef.current.push(candidate);
  }, []);

  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    const pending = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];
    for (const c of pending) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        /* ignore stale candidates */
      }
    }
  }, []);

  const createPeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const servers = iceServersRef.current.length > 0 ? iceServersRef.current : DEFAULT_ICE_SERVERS;
    const pc = new RTCPeerConnection({ iceServers: servers });
    pc.onicecandidate = (e) => {
      const s = sessionRef.current;
      if (e.candidate && s) {
        getSocket().emit(CALL_EVENTS.ICE, { callId: s.callId, candidate: e.candidate.toJSON() });
      }
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
      }
      void playRemoteAudio();
      if (recorderRef.current && localStreamRef.current) {
        recorderRef.current.start(localStreamRef.current, stream);
      }
    };
    const onConnected = () => {
      const state = pc.connectionState;
      const ice = pc.iceConnectionState;
      if (state === 'connected' || ice === 'connected' || ice === 'completed') {
        markConnected();
      } else if (state === 'failed' || ice === 'failed') {
        setError('Call connection failed. Use the same WiFi network on both devices.');
      }
    };
    pc.onconnectionstatechange = onConnected;
    pc.oniceconnectionstatechange = onConnected;
    pcRef.current = pc;
    return pc;
  }, [markConnected, playRemoteAudio]);

  const attachLocalTracks = useCallback(async (pc: RTCPeerConnection) => {
    const stream = await ensureLocalStream();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  }, [ensureLocalStream]);

  const handleOffer = useCallback(async (callId: string, sdp: RTCSessionDescriptionInit) => {
    if (sessionRef.current?.callId !== callId) return;
    setStatus('connecting');
    startConnectTimeout();
    const pc = createPeerConnection();
    await attachLocalTracks(pc);
    if (!pc.remoteDescription) {
      await pc.setRemoteDescription(sdp);
      await flushPendingCandidates();
    }
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    getSocket().emit(CALL_EVENTS.ANSWER, { callId, sdp: answer });
  }, [attachLocalTracks, createPeerConnection, flushPendingCandidates, startConnectTimeout]);

  const handleAccepted = useCallback(async (callId: string) => {
    if (sessionRef.current?.callId !== callId || sessionRef.current.role !== 'caller') return;
    setStatus('connecting');
    startConnectTimeout();
    const pc = createPeerConnection();
    await attachLocalTracks(pc);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    getSocket().emit(CALL_EVENTS.OFFER, { callId, sdp: offer });
  }, [attachLocalTracks, createPeerConnection, startConnectTimeout]);

  useEffect(() => {
    apiClient.get('/calls/ice-servers').then((r) => {
      const servers = r.data.data?.iceServers ?? [];
      iceServersRef.current = servers.length > 0 ? servers : DEFAULT_ICE_SERVERS;
    }).catch(() => {
      iceServersRef.current = DEFAULT_ICE_SERVERS;
    });

    const socket = getSocket();

    const onIncoming = (payload: CallSessionPayload) => {
      if (sessionRef.current) return;
      callTypeRef.current = payload.callType ?? 'voice';
      setSession(payload);
      setStatus(payload.role === 'caller' ? 'outgoing' : 'incoming');
      setError(null);
      if (payload.role === 'caller') {
        void ensureLocalStream().catch((err) => setError(err instanceof Error ? err.message : 'Media access denied'));
      }
    };

    const onAccepted = (data: { callId: string }) => {
      void handleAccepted(data.callId);
    };

    const onOffer = (data: { callId: string; sdp: RTCSessionDescriptionInit }) => {
      void handleOffer(data.callId, data.sdp);
    };

    const onAnswer = async (data: { callId: string; sdp: RTCSessionDescriptionInit }) => {
      if (sessionRef.current?.callId !== data.callId) return;
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(data.sdp);
      await flushPendingCandidates();
      void playRemoteAudio();
    };

    const onIce = async (data: { callId: string; candidate: RTCIceCandidateInit }) => {
      if (sessionRef.current?.callId !== data.callId) return;
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) {
        queueIceCandidate(data.candidate);
        return;
      }
      try {
        await pc.addIceCandidate(data.candidate);
      } catch {
        queueIceCandidate(data.candidate);
      }
    };

    const onEnded = (data: { callId: string; reason?: string }) => {
      if (sessionRef.current?.callId !== data.callId) return;
      if (data.reason === 'no-answer') setError('No answer');
      else if (data.reason === 'disconnected') setError('Call disconnected');
      resetState();
    };

    const onRejected = (data: { callId: string }) => {
      if (sessionRef.current?.callId !== data.callId) return;
      setError('Call declined');
      resetState();
    };

    const onBusy = (data: { reason?: string }) => {
      setError(data.reason ?? 'User is busy');
      resetState();
    };

    const onFailed = (data: { message?: string }) => {
      setError(data.message ?? 'Call failed');
      resetState();
    };

    socket.on(CALL_EVENTS.INCOMING, onIncoming);
    socket.on(CALL_EVENTS.ACCEPTED, onAccepted);
    socket.on(CALL_EVENTS.OFFER, onOffer);
    socket.on(CALL_EVENTS.ANSWER, onAnswer);
    socket.on(CALL_EVENTS.ICE, onIce);
    socket.on(CALL_EVENTS.ENDED, onEnded);
    socket.on(CALL_EVENTS.REJECTED, onRejected);
    socket.on(CALL_EVENTS.BUSY, onBusy);
    socket.on(CALL_EVENTS.FAILED, onFailed);

    return () => {
      socket.off(CALL_EVENTS.INCOMING, onIncoming);
      socket.off(CALL_EVENTS.ACCEPTED, onAccepted);
      socket.off(CALL_EVENTS.OFFER, onOffer);
      socket.off(CALL_EVENTS.ANSWER, onAnswer);
      socket.off(CALL_EVENTS.ICE, onIce);
      socket.off(CALL_EVENTS.ENDED, onEnded);
      socket.off(CALL_EVENTS.REJECTED, onRejected);
      socket.off(CALL_EVENTS.BUSY, onBusy);
      socket.off(CALL_EVENTS.FAILED, onFailed);
    };
  }, [ensureLocalStream, flushPendingCandidates, handleAccepted, handleOffer, playRemoteAudio, queueIceCandidate, resetState]);

  const initiateCall = useCallback(async (conversationId: string, calleeId: string, callType: CallType = 'voice') => {
    if (sessionRef.current) return;
    setError(null);
    callTypeRef.current = callType;
    try {
      await ensureLocalStream();
      startConnectTimeout();
      getSocket().emit(CALL_EVENTS.INITIATE, { conversationId, calleeId, callType });
    } catch (err) {
      clearConnectTimeout();
      setError(err instanceof Error ? err.message : 'Media access denied');
      stopLocalMedia();
    }
  }, [clearConnectTimeout, ensureLocalStream, startConnectTimeout, stopLocalMedia]);

  const acceptCall = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || s.role !== 'callee') return;
    setError(null);
    try {
      await ensureLocalStream();
      const pc = createPeerConnection();
      await attachLocalTracks(pc);
      getSocket().emit(CALL_EVENTS.ACCEPT, { callId: s.callId });
      setStatus('connecting');
      startConnectTimeout();
      void playRemoteAudio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Media access denied');
      getSocket().emit(CALL_EVENTS.REJECT, { callId: s.callId });
      resetState();
    }
  }, [attachLocalTracks, createPeerConnection, ensureLocalStream, playRemoteAudio, resetState, startConnectTimeout]);

  const rejectCall = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    getSocket().emit(CALL_EVENTS.REJECT, { callId: s.callId });
    resetState();
  }, [resetState]);

  const endCall = useCallback(() => {
    const s = sessionRef.current;
    if (s) {
      getSocket().emit(CALL_EVENTS.END, { callId: s.callId });
    }
    resetState();
  }, [resetState]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isMuted;
    stream.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setIsMuted(next);
  }, [isMuted]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) return;
    const next = !isCameraOff;
    videoTracks.forEach((t) => { t.enabled = !next; });
    setIsCameraOff(next);
  }, [isCameraOff]);

  const toggleRecord = useCallback(() => {
    if (!isRecording) {
      const local = localStreamRef.current;
      if (!local) return;
      recorderRef.current = new CallRecorder();
      recorderRef.current.start(local, remoteStreamRef.current);
      setIsRecording(true);
      return;
    }
    const recorder = recorderRef.current;
    recorderRef.current = null;
    setIsRecording(false);
    if (recorder) {
      void recorder.stop().then((blob) => {
        if (blob) downloadCallRecording(blob, peerName);
      });
    }
  }, [isRecording, peerName]);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => () => resetState(), [resetState]);

  return (
    <CallContext.Provider
      value={{
        status,
        session,
        callType: session?.callType ?? callTypeRef.current,
        peerName,
        isMuted,
        isCameraOff,
        isRecording,
        callDuration,
        error,
        localStream,
        remoteStream,
        clearError,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera,
        toggleRecord,
      }}
    >
      <audio ref={remoteAudioRef} autoPlay playsInline muted={false} style={{ display: 'none' }} />
      {children}
    </CallContext.Provider>
  );
}
