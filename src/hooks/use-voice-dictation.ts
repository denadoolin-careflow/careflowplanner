import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lightweight wrapper around the browser SpeechRecognition API.
 * Calls `onText` with the latest combined transcript while listening.
 */
export function useVoiceDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<any>(null);
  const cbRef = useRef(onText);
  cbRef.current = onText;

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
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";
    rec.onresult = (e: any) => {
      const text = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) cbRef.current(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { setListening(false); }
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop(); else start();
  }, [listening, start, stop]);

  useEffect(() => () => { try { recRef.current?.stop(); } catch {} }, []);

  return { listening, supported, start, stop, toggle };
}