import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Global calendar-focused shortcuts.
 *   g then d/w/m/y/a → jump to Today / Week / Month / Year / Agenda
 *   t → Today · ? → open shortcut cheat sheet
 *   Cmd/Ctrl+K → quick add (dispatches window event `careflow:quick-add`)
 *   n → new event/task on active day
 *   [ / ] → prev / next period (dispatch `careflow:cal-shift` -1|+1)
 */
let goPrefix = false;
let goTimer: ReturnType<typeof setTimeout> | null = null;

function inField(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useGlobalShortcuts(onHelp?: () => void) {
  const navigate = useNavigate();
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (inField(e.target)) return;
      const k = e.key.toLowerCase();
      // Cmd/Ctrl+K → quick add
      if ((e.metaKey || e.ctrlKey) && k === "k") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("careflow:quick-add"));
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (k === "?" || (e.shiftKey && k === "/")) { e.preventDefault(); onHelp?.(); return; }
      if (k === "t") { navigate("/today"); return; }
      if (k === "[") { window.dispatchEvent(new CustomEvent("careflow:cal-shift", { detail: -1 })); return; }
      if (k === "]") { window.dispatchEvent(new CustomEvent("careflow:cal-shift", { detail: 1 })); return; }
      if (k === "n") { window.dispatchEvent(new CustomEvent("careflow:quick-add")); return; }
      if (goPrefix) {
        if (goTimer) { clearTimeout(goTimer); goTimer = null; }
        goPrefix = false;
        if (k === "d" || k === "t") navigate("/today");
        else if (k === "w") navigate("/week");
        else if (k === "m") navigate("/month");
        else if (k === "y") navigate("/year");
        else if (k === "a") navigate("/plan");
        return;
      }
      if (k === "g") {
        goPrefix = true;
        if (goTimer) clearTimeout(goTimer);
        goTimer = setTimeout(() => { goPrefix = false; }, 900);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [navigate, onHelp]);
}