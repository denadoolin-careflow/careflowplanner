import { useNavigate } from "react-router-dom";
import { Plus, CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getMoonPhase } from "@/lib/moon";
import { getKeyPhaseInfo } from "@/lib/lunar-phases";
import { getMoonSign, MOON_IN_SIGN_GUIDE } from "@/lib/zodiac";
import { useStore } from "@/lib/store";

interface Props {
  date?: Date;
}

/**
 * Planning insights tied to the day's lunar phase.
 * - Phase-aware hints (Sow/Grow/Glow/Let-go) with deep links to Today/Week/Inbox.
 * - Moon-in-sign micro-actions with one-tap "Add to Today".
 */
export function PhasePlanningCard({ date = new Date() }: Props) {
  const navigate = useNavigate();
  const { addTask } = useStore();
  const phase = getMoonPhase(date);
  const key = getKeyPhaseInfo(phase);
  const sign = getMoonSign(date);
  const signGuide = MOON_IN_SIGN_GUIDE[sign.name];

  const addToToday = async (title: string) => {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    await addTask({ title, dueDate: iso, area: "Personal" });
    toast.success("Added to Today");
  };

  return (
    <section
      className="cozy-card relative overflow-hidden p-5 sm:p-6"
      style={{
        background: `linear-gradient(135deg, hsl(${key.hsl} / 0.08), hsl(var(--card)))`,
      }}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Plan with this phase
          </p>
          <h3 className="mt-1 font-display text-xl" style={{ color: `hsl(${key.hsl})` }}>
            {key.glyph} {key.verb} · {key.label.split(" · ")[1]}
          </h3>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 gap-1.5"
          onClick={() => navigate("/week")}
        >
          <CalendarDays className="h-3.5 w-3.5" /> Open week
        </Button>
      </header>

      <p className="mt-3 text-sm leading-relaxed text-foreground/85">{key.planning}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            How to plan today
          </p>
          <ul className="space-y-1.5">
            {key.hints.map((h) => (
              <li
                key={h}
                className="flex items-start gap-2 rounded-lg border border-border/60 bg-card/60 px-2.5 py-1.5 text-[12.5px]"
              >
                <span
                  aria-hidden
                  className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: `hsl(${key.hsl})` }}
                />
                <span className="flex-1">{h}</span>
                <button
                  onClick={() => addToToday(h)}
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  aria-label="Add to Today"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Moon in {sign.name} · gentle actions
          </p>
          <ul className="space-y-1.5">
            {signGuide.actions.map((a) => (
              <li
                key={a}
                className="flex items-start gap-2 rounded-lg border border-border/60 bg-card/60 px-2.5 py-1.5 text-[12.5px]"
              >
                <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                <span className="flex-1">{a}</span>
                <button
                  onClick={() => addToToday(a)}
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  aria-label="Add to Today"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] italic text-muted-foreground">
            Ease off: {signGuide.avoid}
          </p>
        </div>
      </div>
    </section>
  );
}