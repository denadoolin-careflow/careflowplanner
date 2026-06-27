import { useEffect, useState } from "react";

export type InboxRowStyle = "soft" | "minimal" | "cozy";

export const INBOX_ROW_STYLES: { id: InboxRowStyle; label: string; description: string }[] = [
  { id: "soft", label: "Soft card", description: "Floating rounded card with subtle shadow." },
  { id: "minimal", label: "Minimalist row", description: "Compact divider rows, no card chrome." },
  { id: "cozy", label: "Cozy highlighted", description: "Tinted background with warm accent." },
];

const KEY = "careflow.inbox.rowStyle";
const EVT = "careflow:inbox-row-style-changed";

function read(): InboxRowStyle {
  if (typeof window === "undefined") return "soft";
  const v = window.localStorage.getItem(KEY) as InboxRowStyle | null;
  return v === "minimal" || v === "cozy" || v === "soft" ? v : "soft";
}

export function useInboxRowStyle(): [InboxRowStyle, (next: InboxRowStyle) => void] {
  const [style, setStyle] = useState<InboxRowStyle>(() => read());
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as InboxRowStyle | undefined;
      if (detail) setStyle(detail);
    };
    window.addEventListener(EVT, onChange);
    return () => window.removeEventListener(EVT, onChange);
  }, []);
  return [
    style,
    (next) => {
      setStyle(next);
      try {
        window.localStorage.setItem(KEY, next);
        window.dispatchEvent(new CustomEvent(EVT, { detail: next }));
      } catch {}
    },
  ];
}