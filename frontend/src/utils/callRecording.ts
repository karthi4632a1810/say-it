import { pickAudioMimeType, audioFileExtension } from './audioRecord';

export class CallRecorder {
  private audioContext: AudioContext | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  start(localStream: MediaStream, remoteStream: MediaStream | null): void {
    this.stop();
    this.audioContext = new AudioContext();
    this.destination = this.audioContext.createMediaStreamDestination();

    const connect = (stream: MediaStream) => {
      if (!this.audioContext || !this.destination) return;
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.destination);
    };

    connect(localStream);
    if (remoteStream) connect(remoteStream);

    const mimeType = pickAudioMimeType();
    this.recorder = new MediaRecorder(
      this.destination.stream,
      mimeType ? { mimeType } : undefined,
    );
    this.chunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(1000);
  }

  stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const recorder = this.recorder;
      if (!recorder || recorder.state === 'inactive') {
        this.cleanup();
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || pickAudioMimeType() || 'audio/webm';
        const blob = new Blob(this.chunks, { type: mimeType });
        this.cleanup();
        resolve(blob.size > 0 ? blob : null);
      };
      recorder.stop();
    });
  }

  private cleanup(): void {
    this.recorder = null;
    this.chunks = [];
    this.destination = null;
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export function downloadCallRecording(blob: Blob, peerName: string): void {
  const mimeType = blob.type || 'audio/webm';
  const ext = audioFileExtension(mimeType);
  const safeName = peerName.replace(/[^\w\s-]/g, '').trim() || 'call';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `call-${safeName}-${Date.now()}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}
