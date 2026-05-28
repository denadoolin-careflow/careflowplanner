import { useEffect, useMemo, useState } from "react";
import { Moon, Sparkles, X, ArrowRight } from "lucide-react";
import { addDays, format, parseISO, startOfDay } from "date-fns";
import { useCycle } from "@/lib/cycle-store";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { getPhaseInfo, PHASE_META } from "@/lib/cycle";
import {
  commitmentsInWindow,
  daysIntoCurrentPhase,
  isPhaseEntryDay,
  isPhasePreviewDay,
  nextMenstrualWindow,
  suggestBetterDate,
} from "@/lib/cycle-planning";
import { dismiss, getDismissed, onDismissedChange } from "@/lib/dismissed-notifications";
import { getCyclePrefs, onCyclePrefsChange } from "@/lib/cycle-prefs";
import { toast } from "sonner";

type Card =
  | { id: string; kind: "phase-entry" | "phase-preview" | "mid-phase" | "onboarding"; title: string; body: string; glyph: string; tone: "primary" | "muted" }
  | { id: string; kind: "burnout"; title: string; body: string; glyph: string; tone: "destructive"; items: Array<{ id: string; title: string; date: string; kind: "task" | "appt" }>; suggestISO?: string };

export function CycleNotificationsSection({ onCount }: { onCount?: (n: number) => void }) {
  const { settings, periods, loaded } = useCycle();
  const { state, updateTask, updateAppointment } = useStore();
  const [dismissed, setDismissed] = useState<Set<string>>(() => getDismissed());
  const [, setPrefsBump] = useState(0);
  useEffect(() => onDismissedChange(() => setDismissed(getDismissed())), []);
  useEffect(() => onCyclePrefsChange(() => setPrefsBump((n) => n + 1)), []);

  const cards = useMemo<Card[]>(() => {
    if (!loaded || !settings.enabled) return [];
    const prefs = getCyclePrefs();
    const today = startOfDay(new Date());
    const todayISO = format(today, "yyyy-MM-dd");
    const out: Card[] = [];

    if (periods.length === 0) {
      out.push({
        id: `cycle:onboarding`,
        kind: "onboarding",
        title: "Log your last period to unlock cyclical planning",
        body: "Phase-aware nudges activate once we know where you are in your cycle.",
        glyph: "🌙",
        tone: "muted",
      });
      return out;
    }

    const info = getPhaseInfo(today, periods, settings);
    if (info && prefs.notifyOnPhaseChange) {
      if (isPhaseEntryDay(today, periods, settings)) {
        out.push({
          id: `cycle:phase-entry:${todayISO}:${info.phase}`,
          kind: "phase-entry",
          title: `Entering ${info.label} phase`,
          body: `${info.invitation} · ${info.planningHints.slice(0, 3).join(" · ")}`,
          glyph: info.glyph,
          tone: "primary",
        });
      }
      if (isPhasePreviewDay(today, periods, settings)) {
        const tomorrow = getPhaseInfo(addDays(today, 1), periods, settings);
        if (tomorrow) {
          out.push({
            id: `cycle:phase-preview:${todayISO}:${tomorrow.phase}`,
            kind: "phase-preview",
            title: `Tomorrow you enter ${tomorrow.label}`,
            body: tomorrow.invitation,
            glyph: tomorrow.glyph,
            tone: "muted",
          });
        }
      }
      const dayIn = daysIntoCurrentPhase(today, periods, settings);
      const todaysCommitments = commitmentsInWindow(state.tasks, state.appointments, todayISO, todayISO).length;
      if (info.phase === "menstrual" && dayIn === 2) {
        out.push({
          id: `cycle:mid:${todayISO}:menstrual`,
          kind: "mid-phase",
          title: `Cycle day ${info.cycleDay} — protect your energy`,
          body: todaysCommitments > 0
            ? `${todaysCommitments} commitment${todaysCommitments === 1 ? "" : "s"} scheduled today. Anything you can move?`
            : info.affirmation,
          glyph: info.glyph,
          tone: "primary",
        });
      }
      if (info.phase === "ovulatory" && dayIn === 2) {
        out.push({
          id: `cycle:mid:${todayISO}:ovulatory`,
          kind: "mid-phase",
          title: `Radiant window`,
          body: `Good day for meetings, hard conversations, and shipping. ${info.affirmation}`,
          glyph: info.glyph,
          tone: "primary",
        });
      }
    }

    // Burnout guard for next menstrual window
    const win = nextMenstrualWindow(periods, settings, today);
    if (win) {
      const items = commitmentsInWindow(state.tasks, state.appointments, win.startISO, win.endISO);
      if (items.length >= prefs.burnoutThreshold) {
        const suggestion = suggestBetterDate(win.startISO, "commitment", periods, settings);
        out.push({
          id: `cycle:burnout:${win.startISO}`,
          kind: "burnout",
          title: `${items.length} commitments land in your next menstrual window`,
          body: `${format(parseISO(win.startISO), "MMM d")} – ${format(parseISO(win.endISO), "MMM d")}. Consider reshuffling to protect rest.`,
          glyph: "🌑",
          tone: "destructive",
          items,
          suggestISO: suggestion?.iso,
        });
      }
    }

    return out.filter((c) => !dismissed.has(c.id));
  }, [loaded, settings, periods, state.tasks, state.appointments, dismissed]);

  useEffect(() => { onCount?.(cards.length); }, [cards.length, onCount]);

  if (cards.length === 0) return null;

  const moveItem = async (item: { id: string; kind: "task" | "appt" }, iso: string) => {
    if (item.kind === "task") await updateTask(item.id, { dueDate: iso });
    else await updateAppointment(item.id, { date: iso });
    toast.success(`Moved to ${format(parseISO(iso), "EEE MMM d")}`);
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 px-2 pb-1 pt-2 text-[10px] uppercase tracking-[0.15em] text-[hsl(280_45%_55%)]">
        <Moon className="h-3 w-3" /> Cyclical rhythm <span className="ml-auto opacity-60">{cards.length}</span>
      </div>
      <div className="space-y-1">
        {cards.map((c) => (
          <div key={c.id} className={`group rounded-md border px-2 py-1.5 ${
            c.tone === "destructive" ? "border-destructive/30 bg-destructive/5"
              : c.tone === "primary" ? "border-primary/30 bg-primary/5"
              : "border-border/60 bg-muted/30"
          }`}>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-base leading-none">{c.glyph}</span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold">{c.title}</div>
                <div className="text-[11px] text-muted-foreground">{c.body}</div>
                {c.kind === "burnout" && (
                  <div className="mt-1 space-y-0.5">
                    {c.items.slice(0, 4).map((it) => (
                      <div key={it.id} className="flex items-center gap-1 text-[10px]">
                        <span className="truncate text-foreground/80">· {it.title}</span>
                        <span className="ml-auto text-muted-foreground">{format(parseISO(it.date), "MMM d")}</span>
                        {c.suggestISO && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-5 px-1 text-[10px]"
                            onClick={() => void moveItem(it, c.suggestISO!)}
                            title="Move to better day"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {c.items.length > 4 && (
                      <div className="text-[10px] text-muted-foreground">+{c.items.length - 4} more</div>
                    )}
                  </div>
                )}
              </div>
              <Button
                variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                title="Dismiss"
                onClick={() => dismiss(c.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}