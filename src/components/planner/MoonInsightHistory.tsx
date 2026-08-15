import { useMemo, useState } from "react";
import { format } from "date-fns";
import { NotebookPen } from "lucide-react";
import { MoonSVG } from "./MoonInsightCard";
import { buildMoonHistory, HISTORY_RANGES, type HistoryRange } from "@/lib/planner/moon-history";
import { useCycleDots } from "@/lib/planner/day-rhythm";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type ElementKey = "Fire" | "Earth" | "Air" | "Water";
const ELEMENTS: ElementKey[] = ["Fire", "Earth", "Air", "Water"];

/** Scrollable lunar history: phase, sign, element, theme and cycle per day. */
export function MoonInsightHistory({ date, onSelectDate }: { date: Date; onSelectDate?: (d: Date) => void }) {
  const [range, setRange] = useState<HistoryRange>(30);
  const [element, setElement] = useState<ElementKey | null>(null);
  const [principalOnly, setPrincipalOnly] = useState(false);
  const [cyclePhase, setCyclePhase] = useState<string | null>(null);
  const { state } = useStore() as any;

  const entries = useMemo(() => buildMoonHistory(date, range), [date, range]);
  const cycles = useCycleDots(useMemo(() => entries.map(e => e.date), [entries]));

  const journalDays = useMemo(() => {
    const s = new Set<string>();
    for (const j of state.journal ?? []) s.add(j.date);
    return s;
  }, [state.journal]);

  const cyclePhases = useMemo(
    () => [...new Map([...cycles.values()].map(c => [c.phase, c])).values()],
    [cycles],
  );

  const shown = entries.filter(e => {
    if (element && e.theme.element !== element) return false;
    if (principalOnly && !e.isPrincipal) return false;
    if (cyclePhase && cycles.get(e.iso)?.phase !== cyclePhase) return false;
    return true;
  });

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10.5px] transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {HISTORY_RANGES.map(r => (
          <Chip key={r} active={range === r} onClick={() => setRange(r)}>{r}d</Chip>
        ))}
        <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
        <Chip active={principalOnly} onClick={() => setPrincipalOnly(v => !v)}>Key phases</Chip>
        {ELEMENTS.map(el => (
          <Chip key={el} active={element === el} onClick={() => setElement(c => (c === el ? null : el))}>{el}</Chip>
        ))}
        {cyclePhases.map(c => (
          <Chip key={c.phase} active={cyclePhase === c.phase} onClick={() => setCyclePhase(p => (p === c.phase ? null : c.phase))}>
            {c.label}
          </Chip>
        ))}
      </div>

      <div className="max-h-[320px] space-y-1 overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch]">
        {shown.length === 0 && (
          <p className="py-6 text-center text-[11.5px] text-muted-foreground">Nothing matches those filters.</p>
        )}
        {shown.map(e => {
          const cyc = cycles.get(e.iso);
          return (
            <div key={e.iso} className="relative pl-3">
              <span
                aria-hidden
                className="absolute left-0 top-0 h-full w-px bg-border/60"
              />
              {e.isPhaseStart && (
                <p className="mb-0.5 ml-1 text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
                  {e.theme.moonLabel} begins
                </p>
              )}
              <button
                type="button"
                onClick={() => onSelectDate?.(e.date)}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
              >
                <MoonSVG fraction={e.theme.fraction} size={20} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className="text-[11.5px] font-medium">{format(e.date, "EEE, MMM d")}</span>
                    <span className="text-[10.5px] text-muted-foreground">{e.theme.moonLabel} · {e.theme.illumination}%</span>
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                    <span>{e.theme.signSymbol} {e.theme.sign}</span>
                    <span aria-hidden>·</span>
                    <span>{e.theme.element}</span>
                    <span
                      className="rounded-full px-1.5 py-[1px]"
                      style={{ background: `${e.theme.color}22`, color: e.theme.color }}
                    >
                      {e.theme.themeName}
                    </span>
                    {cyc && (
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: cyc.color }} />
                        {cyc.text}
                      </span>
                    )}
                  </span>
                </span>
                {journalDays.has(e.iso) && (
                  <NotebookPen className="h-3 w-3 shrink-0 text-primary" aria-label="Has a journal entry" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
