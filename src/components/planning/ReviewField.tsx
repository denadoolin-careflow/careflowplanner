import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";

/** Save-on-blur textarea for review sections, re-syncing when the period changes. */
export function ReviewField({
  label, value, onSave, className, rows = 2, placeholder = "…",
}: {
  label: string;
  value: string | null;
  onSave: (v: string) => void;
  className?: string;
  rows?: number;
  placeholder?: string;
}) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => { setV(value ?? ""); }, [value]);
  return (
    <div className={className}>
      <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <Textarea
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { if (v !== (value ?? "")) onSave(v); }}
        placeholder={placeholder}
        rows={rows}
        className="mt-1"
      />
    </div>
  );
}