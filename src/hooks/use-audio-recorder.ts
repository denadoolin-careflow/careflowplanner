import { useCallback, useEffect, useRef, useState } from "react";

export type AudioRecorderState = "idle" | "recording" | "stopping";

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const m of candidates) {
    try { if ((MediaRecorder as any).isTypeSupported?.(m)) return m; } catch { /* noop */ }
  }
  return "";
}

/** Record microphone audio to a Blob; returns base64 + mime when stopped. */
export function useAudioRecorder() {
  const [state, setState] = useState<AudioRecorderState>("idle");
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const chunksRef = useRef<Blob[]>([]);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    setSupported(typeof navigator !== "undefined"
      && !!navigator.mediaDevices?.getUserMedia
      && typeof MediaRecorder !== "undefined");
  }, []);

  const cleanup = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
      rec.start(250);
      recRef.current = rec;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      tickRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 200);
      setState("recording");
    } catch (e: any) {
      setError(e?.message ?? "Microphone access denied");
      cleanup();
      setState("idle");
    }
  }, [cleanup]);

  const stop = useCallback((): Promise<{ blob: Blob; base64: string; mimeType: string } | null> => {
    return new Promise((resolve) => {
      const rec = recRef.current;
      if (!rec) { resolve(null); return; }
      setState("stopping");
      rec.onstop = async () => {
        const mimeType = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const buf = await blob.arrayBuffer();
        // base64 encode in chunks to avoid call-stack issues
        let binary = "";
        const bytes = new Uint8Array(buf);
        const CHUNK = 0x8000;
        for (let i = 0; i < bytes.length; i += CHUNK) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)) as any);
        }
        const base64 = btoa(binary);
        cleanup();
        setState("idle");
        resolve({ blob, base64, mimeType });
      };
      try { rec.stop(); } catch { cleanup(); setState("idle"); resolve(null); }
    });
  }, [cleanup]);

  const cancel = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* noop */ }
    cleanup();
    chunksRef.current = [];
    setState("idle");
    setElapsedMs(0);
  }, [cleanup]);

  return { state, supported, error, elapsedMs, start, stop, cancel };
}