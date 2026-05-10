import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useWidgetText, widgetText } from "@/lib/widget-text";

interface Props {
  widgetId: string;
  field: string;
  fallback: string;
  className?: string;
  as?: "span" | "div";
}

export function EditableText({ widgetId, field, fallback, className, as = "span" }: Props) {
  const value = useWidgetText(widgetId, field, fallback);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commit = () => {
    const v = draft.trim();
    if (v === value) { setEditing(false); return; }
    void widgetText.set(widgetId, field, v || fallback);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className={cn(
          "rounded border border-primary/40 bg-background/60 px-1 py-0 outline-none",
          className
        )}
      />
    );
  }

  const Tag: any = as;
  return (
    <Tag
      onDoubleClick={() => setEditing(true)}
      title="Double-click to edit"
      className={cn("cursor-text rounded transition-colors hover:bg-muted/40", className)}
    >
      {value}
    </Tag>
  );
}