import { useCallback, useEffect, useRef, useState } from 'react';
import { audioFileExtension, pickAudioMimeType } from '../utils/audioRecord';
import { micBlockedReason } from '../utils/secureMedia';
import { getMicrophoneStream } from '../utils/microphone';

export type VoiceRecorderError = 'insecure' | 'denied' | 'unsupported';

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [lastError, setLastError] = useState<VoiceRecorderError | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const cleanupStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(() => () => cleanupStream(), [cleanupStream]);

  const start = useCallback(async (): Promise<boolean> => {
    setLastError(null);
    const blocked = micBlockedReason();
    if (blocked) {
      setLastError('insecure');
      return false;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setLastError('unsupported');
      return false;
    }
    try {
      const stream = await getMicrophoneStream();
      streamRef.current = stream;
      const mimeType = pickAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(200);
      recorderRef.current = recorder;
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      return true;
    } catch {
      setLastError('denied');
      cleanupStream();
      setIsRecording(false);
      setSeconds(0);
      return false;
    }
  }, [cleanupStream]);

  const stop = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        cleanupStream();
        setIsRecording(false);
        setSeconds(0);
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || pickAudioMimeType() || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = audioFileExtension(mimeType);
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType });
        cleanupStream();
        setIsRecording(false);
        setSeconds(0);
        resolve(blob.size > 0 ? file : null);
      };

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
      recorder.stop();
    });
  }, [cleanupStream]);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    chunksRef.current = [];
    cleanupStream();
    setIsRecording(false);
    setSeconds(0);
  }, [cleanupStream]);

  return { isRecording, seconds, lastError, start, stop, cancel };
};
