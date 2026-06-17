import { micBlockedReason } from './secureMedia';

function mapMicError(err: unknown): string {
  const e = err as DOMException & { name?: string };
  switch (e.name) {
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No microphone found. On PC: plug in a mic or enable it in Windows Settings → Sound → Input. On phone: check mic is not blocked for the browser.';
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Microphone permission denied. Tap the lock icon in the address bar and allow microphone, then reload.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Microphone is busy or unavailable. Close other apps using the mic and try again.';
    case 'OverconstrainedError':
      return 'Microphone settings are not supported on this device. Try a different browser.';
    case 'SecurityError':
      return micBlockedReason() ?? 'Microphone blocked. Use HTTPS to open this app.';
    default:
      if (e.message?.includes('device not found')) {
        return 'No microphone found. Allow mic access in browser settings or connect a microphone.';
      }
      return e.message || 'Could not access microphone.';
  }
}

/** Request microphone with fallbacks for mobile + desktop browsers. */
export async function getMicrophoneStream(): Promise<MediaStream> {
  const blocked = micBlockedReason();
  if (blocked) throw new Error(blocked);

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone is not supported in this browser.');
  }

  const attempts: MediaStreamConstraints[] = [
    { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } },
    { audio: true },
  ];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastError = err;
      if ((err as DOMException).name !== 'NotFoundError' && (err as DOMException).name !== 'OverconstrainedError') {
        break;
      }
    }
  }

  // Last resort: pick first audio input if enumerateDevices returns any (after permission prompt elsewhere)
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const mic = devices.find((d) => d.kind === 'audioinput' && d.deviceId);
    if (mic?.deviceId) {
      return await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: mic.deviceId } },
      });
    }
  } catch {
    /* use mapped error below */
  }

  throw new Error(mapMicError(lastError));
}

function mapCameraError(err: unknown): string {
  const e = err as DOMException & { name?: string };
  if (e.name === 'NotFoundError') {
    return 'No camera found on this device.';
  }
  if (e.name === 'NotAllowedError') {
    return 'Camera permission denied. Allow camera access in browser settings.';
  }
  return e.message || 'Could not access camera.';
}

/** Request mic + optional camera for voice/video calls. */
export async function getCallMediaStream(withVideo: boolean): Promise<MediaStream> {
  if (!withVideo) return getMicrophoneStream();

  const blocked = micBlockedReason();
  if (blocked) throw new Error(blocked);
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera is not supported in this browser.');
  }

  const attempts: MediaStreamConstraints[] = [
    {
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    },
    { audio: true, video: { facingMode: 'user' } },
    { audio: true, video: true },
  ];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(mapCameraError(lastError));
}
