import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, NotebookPen } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { MOON_RITUALS, PHASE_ORDER, getMoonPhase, type MoonPhase } from "@/lib/astro-suite/lunar";
import { getMoonSign, MOON_IN_SIGN_GUIDE } from "@/lib/astro-suite/zodiac";
import { getIllumination, daysUntilFull, daysUntilNew } from "@/lib/moon";
import { appendToTodaysNote } from "@/lib/astro-suite/tarot-pulls";

const KEY = "careflow.moon-rituals.v1";
type Store = { lowEnergy: boolean; done: Record<string, string[]> };
function load(): Store { try { return { lowEnergy: false, done: {}, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { lowEnergy: false, done: {} }; } }

export default function CosmicMoon() {
  const today = getMoonPhase();
  const [phase, setPhase] = useState<MoonPhase>(today);
  const [store, setStore] = useState<Store>(load);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(store)); }, [store]);

  const r = MOON_RITUALS[phase];
  const items = store.lowEnergy ? r.lowEnergy : r.checklist;
  const dayKey = `${format(new Date(), "yyyy-MM-dd")}:${phase}`;
  const done = store.done[dayKey] ?? [];
  const toggle = (i: string) => setStore(s => {
    const cur = s.done[dayKey] ?? [];
    return { ...s, done: { ...s.done, [dayKey]: cur.includes(i) ? cur.filter(x => x !== i) : [...cur, i] } };
  });
  const sign = getMoonSign();
  const guide = MOON_IN_SIGN_GUIDE[sign.name];

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <header className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon"><Link to="/cosmic-flow" aria-label="Back to Cosmic Flow"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="font-display text-2xl">Moon & Rituals</h1>
          <p className="text-sm text-muted-foreground">
            {Math.round(getIllumination() * 100)}% lit · Moon in {sign.name} · full in {daysUntilFull()}d · new in {daysUntilNew()}d
          </p>
        </div>
      </header>

      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Moon phases">
        {PHASE_ORDER.map(p => (
          <button key={p} role="tab" aria-selected={phase === p} onClick={() => setPhase(p)}
            className={cn("flex min-w-[64px] flex-col items-center rounded-xl border px-2 py-2 text-[11px]",
              phase === p ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted")}>
            <span className="text-xl">{MOON_RITUALS[p].glyph}</span>
            <span className="leading-tight text-center">{MOON_RITUALS[p].label}</span>
            {p === today && <span className="mt-0.5 text-[9px] uppercase tracking-wider text-primary">Now</span>}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{r.theme}</p>
          <h2 className="font-display text-xl">{r.glyph} {r.label}</h2>
          <p className="mt-1 text-sm text-foreground/85">{r.description}</p>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2">
          <label htmlFor="low-energy" className="text-sm">Low-energy mode</label>
          <Switch id="low-energy" checked={store.lowEnergy} onCheckedChange={v => setStore(s => ({ ...s, lowEnergy: v }))} />
        </div>
        <ul className="space-y-1.5">
          {items.map(i => {
            const on = done.includes(i);
            return (
              <li key={i}>
                <button onClick={() => toggle(i)} className="flex w-full min-h-11 items-center gap-3 rounded-lg px-2 text-left hover:bg-muted">
                  <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border-2", on ? "border-secondary bg-secondary text-secondary-foreground" : "border-border")}>{on && <Check className="h-3.5 w-3.5" />}</span>
                  <span className={cn("text-sm", on && "line-through text-muted-foreground")}>{i}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <blockquote className="border-l-2 border-accent pl-3 font-display italic">“{r.affirmation}”</blockquote>
        <div className="rounded-xl bg-accent/10 p-3 text-sm space-y-1">
          <p className="font-medium">Tarot prompt: {r.tarotPrompt}</p>
          <p className="text-foreground/80">{r.tarotInvitation}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" asChild><Link to="/cosmic-flow/tarot">Pull a card</Link></Button>
            <Button size="sm" variant="outline" onClick={async () => {
              try { await appendToTodaysNote(`${r.glyph} ${r.label} reflection — ${r.tarotPrompt}\n\n`); toast.success("Prompt added to today's note"); }
              catch { toast.error("Couldn't add to today's note"); }
            }}><NotebookPen className="mr-1 h-3.5 w-3.5" />Journal this</Button>
          </div>
        </div>
      </section>

      {guide && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="font-display text-lg">Moon in {sign.name} today</h2>
          <p className="mt-1 text-sm">{guide.vibe}</p>
          <p className="text-sm text-muted-foreground">{guide.body}</p>
          <ul className="mt-2 list-disc pl-4 text-sm">{guide.actions.map(a => <li key={a}>{a}</li>)}</ul>
          <p className="mt-2 text-sm"><span className="text-muted-foreground">Ease off:</span> {guide.avoid}</p>
        </section>
      )}
    </div>
  );
}
