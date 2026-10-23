import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lightweight wrapper around the browser SpeechRecognition API.
 * Calls `onText` with the latest combined transcript while listening, and
 * `onFinalDelta` once per newly finalised phrase (for inserting at a cursor).
 */
export function useVoiceDictation(onText: (text: string) => void, onFinalDelta?: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
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
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";
    let consumed = 0;
    rec.onresult = (e: any) => {
      const delta: string[] = [];
      while (consumed < e.results.length && e.results[consumed].isFinal) {
        delta.push(e.results[consumed][0].transcript);
        consumed += 1;
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
