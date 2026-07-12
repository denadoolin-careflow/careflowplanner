import { useEffect, useState } from "react";

export type TaskEditorStyle =
  | "focused-sheet"
  | "split-inspector"
  | "compact-command"
  | "fullscreen-focus";

const KEY = "careflow:task-editor-style";
const DEFAULT: TaskEditorStyle = "focused-sheet";

export const TASK_EDITOR_STYLES: Array<{
  id: TaskEditorStyle;
  name: string;
  inspiration: string;
  blurb: string;
}> = [
  {
    id: "focused-sheet",
    name: "Focused Sheet",
    inspiration: "Things 3 · Craft",
    blurb: "Editorial serif title, chip metadata, one calm scroll.",
  },
  {
    id: "split-inspector",
    name: "Split Inspector",
    inspiration: "Notion · Linear",
    blurb: "Content left, dense property rail right.",
  },
  {
    id: "compact-command",
    name: "Compact Command",
    inspiration: "Linear · Superhuman",
    blurb: "Centered modal, tight grid, keyboard-first.",
  },
  {
    id: "fullscreen-focus",
    name: "Fullscreen Focus",
    inspiration: "Craft · iA Writer",
    blurb: "Immersive canvas, sidebar tucked away.",
  },
];

export function useTaskEditorStyle() {
  const [style, setStyle] = useState<TaskEditorStyle>(() => {
    if (typeof window === "undefined") return DEFAULT;
    return (localStorage.getItem(KEY) as TaskEditorStyle) || DEFAULT;
  });
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) setStyle(e.newValue as TaskEditorStyle);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const update = (v: TaskEditorStyle) => {
    setStyle(v);
    localStorage.setItem(KEY, v);
  };
  return [style, update] as const;
}