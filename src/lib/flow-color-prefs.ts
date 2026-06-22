import { useCallback, useEffect, useState } from "react";

const KEY = "careflow:flow-color-overrides";
const EVT = "careflow:flow-colors-change";

export type FlowColorOverrides = Record<string, number>;

function read(): FlowColorOverrides {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? (obj as FlowColorOverrides) : {};
  } catch { return {}; }
}

export function getFlowColorOverrides(): FlowColorOverrides {
  return read();
}

export function setFlowColorOverride(flowId: string, index: number | null) {
  const next = read();
  if (index === null || index === undefined) delete next[flowId];
  else next[flowId] = index;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* */ }
  try { window.dispatchEvent(new CustomEvent(EVT)); } catch { /* */ }
}

export function clearFlowColorOverrides() {
  try { localStorage.removeItem(KEY); } catch { /* */ }
  try { window.dispatchEvent(new CustomEvent(EVT)); } catch { /* */ }
}

export function useFlowColorOverrides(): FlowColorOverrides {
  const [val, setVal] = useState<FlowColorOverrides>(() => read());
  const refresh = useCallback(() => setVal(read()), []);
  useEffect(() => {
    const onEvt = () => refresh();
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) refresh(); };
    window.addEventListener(EVT, onEvt);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVT, onEvt);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);
  return val;
}