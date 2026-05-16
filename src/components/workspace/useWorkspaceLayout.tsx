import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PanelId } from "./PanelRegistry";

type DockSide = "left" | "right";

export interface WorkspaceLayout {
  left: PanelId[];
  right: PanelId[];
  leftSize: number;   // percent
  rightSize: number;  // percent
}

const DEFAULT_LAYOUT: WorkspaceLayout = {
  left: [],
  right: [],
  leftSize: 22,
  rightSize: 26,
};

const STORAGE_KEY = "careflow.workspace.layout.v1";

function load(): WorkspaceLayout {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    return { ...DEFAULT_LAYOUT, ...JSON.parse(raw) };
  } catch { return DEFAULT_LAYOUT; }
}

interface Ctx {
  layout: WorkspaceLayout;
  openPanel: (id: PanelId, side?: DockSide) => void;
  closePanel: (id: PanelId) => void;
  togglePanel: (id: PanelId, side?: DockSide) => void;
  setSize: (side: DockSide, size: number) => void;
  closeSide: (side: DockSide) => void;
}

const WorkspaceContext = createContext<Ctx | null>(null);

export function WorkspaceLayoutProvider({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<WorkspaceLayout>(() => load());

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)); } catch {}
  }, [layout]);

  const openPanel = useCallback((id: PanelId, side: DockSide = "right") => {
    setLayout(prev => {
      // remove from both sides first
      const left = prev.left.filter(p => p !== id);
      const right = prev.right.filter(p => p !== id);
      if (side === "left") return { ...prev, left: [...left, id], right };
      return { ...prev, left, right: [...right, id] };
    });
  }, []);

  const closePanel = useCallback((id: PanelId) => {
    setLayout(prev => ({
      ...prev,
      left: prev.left.filter(p => p !== id),
      right: prev.right.filter(p => p !== id),
    }));
  }, []);

  const togglePanel = useCallback((id: PanelId, side: DockSide = "right") => {
    setLayout(prev => {
      const isOpen = prev.left.includes(id) || prev.right.includes(id);
      if (isOpen) {
        return {
          ...prev,
          left: prev.left.filter(p => p !== id),
          right: prev.right.filter(p => p !== id),
        };
      }
      const left = prev.left.filter(p => p !== id);
      const right = prev.right.filter(p => p !== id);
      if (side === "left") return { ...prev, left: [...left, id], right };
      return { ...prev, left, right: [...right, id] };
    });
  }, []);

  const setSize = useCallback((side: DockSide, size: number) => {
    setLayout(prev => side === "left" ? { ...prev, leftSize: size } : { ...prev, rightSize: size });
  }, []);

  const closeSide = useCallback((side: DockSide) => {
    setLayout(prev => side === "left" ? { ...prev, left: [] } : { ...prev, right: [] });
  }, []);

  const value = useMemo(
    () => ({ layout, openPanel, closePanel, togglePanel, setSize, closeSide }),
    [layout, openPanel, closePanel, togglePanel, setSize, closeSide],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceLayout(): Ctx {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    // Fallback no-op so the hook works outside the provider (sidebar may mount first).
    return {
      layout: DEFAULT_LAYOUT,
      openPanel: () => {},
      closePanel: () => {},
      togglePanel: () => {},
      setSize: () => {},
      closeSide: () => {},
    };
  }
  return ctx;
}