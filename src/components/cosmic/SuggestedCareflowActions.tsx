import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ClipboardList, Sparkles, BookOpen, CalendarDays, Check, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import type { DailyGuidance } from "@/lib/cosmic/v2-hooks";

const DEFAULTS = [
  { title: "Review routines",       sub: "Reflect and refine what matters", icon: <ClipboardList className="h-3.5 w-3.5 text-primary" /> },
  { title: "Declutter a space",     sub: "Clear energy to invite new ideas", icon: <Sparkles className="h-3.5 w-3.5 text-primary" /> },
  { title: "Journal for 10 minutes", sub: "Capture insights and feelings",   icon: <BookOpen className="h-3.5 w-3.5 text-primary" /> },
  { title: "Plan next week",        sub: "Organize with intention",          icon: <CalendarDays className="h-3.5 w-3.5 text-primary" /> },
];

export function SuggestedCareflowActions({ data }: { data: DailyGuidance | null }) {
  const { addTask } = useStore() as any;
  const { toast } = useToast();
  const [added, setAdded] = useState<Record<string, boolean>>({});

  const actions = (data?.suggested_actions?.length ? data.suggested_actions.slice(0, 5).map((t, i) => ({
    title: t, sub: DEFAULTS[i]?.sub ?? "Aligned with today's energy", icon: DEFAULTS[i]?.icon ?? <Sparkles className="h-3.5 w-3.5 text-primary" />,
  })) : DEFAULTS);

  function add(title: string) {
    addTask?.({ title, area: undefined, cosmic_tag: "daily-guidance" });
    setAdded(s => ({ ...s, [title]: true }));
    toast({ title: "Added to CareFlow", description: title });
  }

  return (
    <section className="cozy-card p-5" aria-label="Suggested CareFlow actions">
      <header className="mb-1">
        <h3 className="font-display text-base">Suggested CareFlow Actions</h3>
        <p className="text-[11.5px] text-muted-foreground">Aligned with today's cosmic energy</p>
      </header>

      <ul className="mt-3 space-y-1.5">
        {actions.map(a => (
          <li key={a.title}>
            <button
              onClick={() => add(a.title)}
              disabled={!!added[a.title]}
              className="w-full text-left rounded-lg border border-border/40 bg-card/60 p-2 flex items-start gap-2 hover:bg-card transition-colors disabled:opacity-70"
            >
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted/60">{a.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-medium leading-tight">{a.title}</p>
                <p className="text-[11px] text-muted-foreground">{a.sub}</p>
              </div>
              <span className="mt-1 text-muted-foreground">
                {added[a.title] ? <Check className="h-3.5 w-3.5 text-primary" /> : <Plus className="h-3.5 w-3.5" />}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Button asChild size="sm" className="mt-3 w-full bg-gradient-to-r from-primary to-moon text-primary-foreground hover:opacity-95">
        <Link to="/today">Go to CareFlow</Link>
      </Button>
    </section>
  );
}