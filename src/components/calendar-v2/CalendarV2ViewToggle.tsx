import { CalendarDays, CalendarRange, LayoutGrid } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type CV2View = "day" | "week" | "month";
const KEY = "careflow:cv2:view";
const listeners = new Set<(v: CV2View) => void>();

function read(): CV2View {
  if (typeof localStorage === "undefined") return "day";
  const v = localStorage.getItem(KEY);
  return v === "week" || v === "month" ? v : "day";
}
let current: CV2View = read();
export function setCV2View(v: CV2View) {
  current = v;
  try { localStorage.setItem(KEY, v); } catch {}
  listeners.forEach((l) => l(v));
}
export function useCV2View(): [CV2View, (v: CV2View) => void] {
  const [v, setV] = useState<CV2View>(current);
  useEffect(() => { listeners.add(setV); return () => { listeners.delete(setV); }; }, []);
  return [v, setCV2View];
}

export function CalendarV2ViewToggle({ value, onChange }: { value: CV2View; onChange: (v: CV2View) => void }) {
  const opts: Array<{ id: CV2View; label: string; icon: typeof CalendarDays }> = [
    { id: "day", label: "Day", icon: CalendarDays },
    { id: "week", label: "Week", icon: CalendarRange },
    { id: "month", label: "Month", icon: LayoutGrid },
  ];
  return (
    <div className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-border/60 bg-card/70 p-0.5 text-xs">
      {opts.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 transition-colors",
            value === o.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
        >
          <o.icon className="h-3.5 w-3.5" /> {o.label}
        </button>
      ))}
    </div>
  );
}