import { useState } from "react";
import { Circle, MoreHorizontal, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "plan" | "grow" | "care" | "letgo";
const TASKS: { title: string; area: string; when: string; time?: string; phase: Phase; prio: "High" | "Med" | "Low"; repeat?: boolean }[] = [
  { title: "Make Nana breakfast", area: "Caregiving", when: "Today · Morning", time: "8:00", phase: "plan", prio: "Med", repeat: true },
  { title: "Call the pharmacy about Mom's refill before they close", area: "Health", when: "Today · Afternoon", time: "2:30", phase: "grow", prio: "High" },
  { title: "Fold the laundry", area: "Home", when: "This week", phase: "care", prio: "Low" },
  { title: "Write in journal", area: "Self", when: "Today · Evening", time: "9:00", phase: "letgo", prio: "Low" },
];
const tint = (p: Phase) => ({ background: `hsl(var(--rhythm-${p}-tint))`, color: `hsl(var(--rhythm-${p}-deep))` });
const prioDot = { High: "bg-destructive", Med: "bg-accent", Low: "bg-muted-foreground/40" };

function Check() {
  const [d, setD] = useState(false);
  return (
    <button aria-label="Check off" onClick={() => setD(!d)} className="flex h-11 w-11 shrink-0 items-center justify-center -m-2.5">
      <span className={cn("h-6 w-6 rounded-full border-2 border-primary/60 transition", d && "bg-primary border-primary")} />
    </button>
  );
}

function Quiet() {
  return (
    <div className="divide-y divide-border/50 rounded-3xl bg-card px-4">
      {TASKS.map((t) => (
        <div key={t.title} className="flex items-start gap-3 py-3.5">
          <div className="pt-0.5"><Check /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-snug text-foreground">{t.title}</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 rounded-full", prioDot[t.prio])} />
              {t.area} · {t.when}{t.repeat && <Repeat className="h-3 w-3" />}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SoftCard() {
  return (
    <div className="space-y-2.5">
      {TASKS.map((t) => (
        <div key={t.title} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm"
          style={{ borderLeft: `4px solid hsl(var(--rhythm-${t.phase}-deep))` }}>
          <div className="pt-0.5"><Check /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium leading-snug">{t.title}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full px-2.5 py-0.5 text-xs" style={tint(t.phase)}>{t.when}</span>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{t.prio}</span>
            </div>
          </div>
          <button aria-label="More" className="flex h-11 w-11 -m-2 items-center justify-center text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

function PlannerStyle() {
  return (
    <div className="space-y-2">
      {TASKS.map((t) => (
        <div key={t.title} className="planner-card flex items-center gap-3 rounded-2xl bg-card p-3">
          <span className="w-14 shrink-0 rounded-full py-1 text-center font-serif text-xs" style={tint(t.phase)}>{t.time ?? "—"}</span>
          <Check />
          <p className="min-w-0 flex-1 text-[15px] leading-snug">{t.title}</p>
          <span className="hidden text-xs text-muted-foreground sm:inline">{t.area}</span>
          <button aria-label="More" className="flex h-11 w-11 -m-2 items-center justify-center text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

const OPTS = [
  { id: "A", label: "A · Quiet line", C: Quiet, note: "One soft line under each title. Extra buttons appear when you tap the task." },
  { id: "B", label: "B · Soft card", C: SoftCard, note: "Rounded cards with a phase-colored edge and two small chips. Extras behind ⋯." },
  { id: "C", label: "C · Planner style", C: PlannerStyle, note: "Same as Planner rows: time pill tinted by phase, title, area." },
];

export default function InboxRowMockups() {
  const [sel, setSel] = useState("A");
  const [dark, setDark] = useState(false);
  const opt = OPTS.find((o) => o.id === sel)!;
  return (
    <div className={cn(dark && "dark")}>
      <div className="min-h-screen bg-background p-4 text-foreground">
        <div className="mx-auto max-w-xl space-y-4">
          <h1 className="font-serif text-3xl">Inbox task rows</h1>
          <div className="flex flex-wrap gap-2">
            {OPTS.map((o) => (
              <button key={o.id} onClick={() => setSel(o.id)}
                className={cn("min-h-11 rounded-full border px-4 text-sm", sel === o.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>{o.label}</button>
            ))}
            <button onClick={() => setDark(!dark)} className="min-h-11 rounded-full border border-border bg-card px-4 text-sm">{dark ? "Light" : "Dark"}</button>
          </div>
          <p className="text-sm text-muted-foreground">{opt.note}</p>
          <h2 className="font-serif text-2xl">Held in your inbox</h2>
          <opt.C />
        </div>
      </div>
    </div>
  );
}
