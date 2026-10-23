import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lightweight wrapper around the browser SpeechRecognition API.
 * Calls `onText` with the latest combined transcript while listening, and
 * `onFinalDelta` once per newly finalised phrase (for inserting at a cursor).
 */
export function useVoiceDictation(onText: (text: string) => void, onFinalDelta?: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<any>(null);
  const cbRef = useRef(onText);
  cbRef.current = onText;
  const finalRef = useRef(onFinalDelta);
  finalRef.current = onFinalDelta;

  useEffect(() => {
    const SR: any =
      (typeof window !== "undefined" &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;
    setSupported(!!SR);
  }, []);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch {}
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const SR: any =
      (typeof window !== "undefined" &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;
    if (!SR) return;
    if (recRef.current) return;
    setError(null);
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";
    const emitted = new Set<number>();
    rec.onresult = (e: any) => {
      if (recRef.current !== rec) return;
      const delta: string[] = [];
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal && !emitted.has(i)) {
          emitted.add(i);
          delta.push(e.results[i][0].transcript);
        }
      }
      const finalText = delta.join(" ").replace(/\s+/g, " ").trim();
      if (finalText) finalRef.current?.(finalText);
      const text = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) cbRef.current(text);
    };
    rec.onend = () => {
      if (recRef.current !== rec) return;
      recRef.current = null;
      setListening(false);
    };
    rec.onerror = (event: any) => {
      if (recRef.current !== rec) return;
      const messages: Record<string, string> = {
        network: "Live dictation couldn't connect to your browser's speech service. You can record a voice memo and transcribe it instead.",
        "not-allowed": "Microphone access was denied. Allow microphone access in your browser to dictate.",
        "service-not-allowed": "Your browser's speech service isn't available. You can record a voice memo and transcribe it instead.",
        "audio-capture": "No microphone is available. Check your microphone connection.",
        "no-speech": "No speech was heard. Try dictating again when you're ready.",
      };
      if (event.error !== "aborted") setError(messages[event.error] ?? "Dictation stopped unexpectedly. Please try again.");
      recRef.current = null;
      setListening(false);
    };
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch {
      recRef.current = null;
      setError("Couldn't start dictation. Please check microphone access and try again.");
      setListening(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop(); else start();
  }, [listening, start, stop]);

  useEffect(() => () => { try { recRef.current?.stop(); } catch {} }, []);

  return { listening, supported, error, start, stop, toggle };
}
