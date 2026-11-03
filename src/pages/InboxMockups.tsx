import { useState } from "react";
import { Mic, MoreHorizontal, Check, ArrowRight, CalendarDays, FileText, Trash2, Sun, Archive, Sparkles } from "lucide-react";
import { PHASE_ICONS } from "@/lib/phase-icons";
import { cn } from "@/lib/utils";

type Phase = "plan" | "grow" | "care" | "letgo";
type Item = { id: number; title: string; hint: string; phase: Phase; group: "today" | "earlier" };

const SAMPLE: Item[] = [
  { id: 1, title: "Call the pharmacy about refilling Mom's prescription", hint: "Tomorrow · Care", phase: "care", group: "today" },
  { id: 2, title: "Ideas for the spring garden beds", hint: "Goes to Notes", phase: "plan", group: "today" },
  { id: 3, title: "Pay electric bill", hint: "Fri · Grow", phase: "grow", group: "today" },
  { id: 4, title: "Book dentist cleaning for the kids", hint: "No date yet", phase: "plan", group: "earlier" },
  { id: 5, title: "Journal about the week's wins before bed", hint: "Tonight · Let go", phase: "letgo", group: "earlier" },
];

const PHASE_NAME: Record<Phase, string> = { plan: "Plan", grow: "Grow", care: "Care", letgo: "Let go" };

function Tint({ phase }: { phase: Phase }) {
  const I = PHASE_ICONS[phase];
  return (
    <span
      aria-label={PHASE_NAME[phase]}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
      style={{ background: `hsl(var(--rhythm-${phase}-tint))`, color: `hsl(var(--rhythm-${phase}-deep))` }}
    >
      <I className="h-3.5 w-3.5" />
    </span>
  );
}

function Capture() {
  const [v, setV] = useState("");
  return (
    <div className="planner-card p-3">
      <label htmlFor="cap" className="sr-only">Capture a thought</label>
      <div className="flex items-center gap-2">
        <input
          id="cap"
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="What's on your mind?"
          className="h-11 flex-1 rounded-xl bg-muted/50 px-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40"
        />
        <button aria-label="Record voice" className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Mic className="h-5 w-5" />
        </button>
      </div>
      {v && <p className="mt-2 px-1 text-xs text-muted-foreground">Will save as: <span className="font-semibold text-foreground">Tomorrow · Care</span></p>}
    </div>
  );
}

function Header({ count }: { count: number }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="font-display text-2xl text-foreground">Inbox</h2>
        <p className="text-xs text-muted-foreground">{count} to sort</p>
      </div>
      <button aria-label="More" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted">
        <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
      </button>
    </div>
  );
}

const Empty = () => <p className="py-8 text-center text-sm text-muted-foreground">Inbox zero, gently held.</p>;

function Row({ it, onDone, onSort, selected, onSelect }: { it: Item; onDone: () => void; onSort?: () => void; selected?: boolean; onSelect?: () => void }) {
  return (
    <li
      onClick={onSelect}
      className={cn("flex min-h-[52px] items-start gap-3 rounded-xl bg-card px-3 py-2.5 shadow-sm", onSelect && "cursor-pointer", selected && "ring-2 ring-primary")}
    >
      <button aria-label={`Done: ${it.title}`} onClick={(e) => { e.stopPropagation(); onDone(); }} className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border hover:border-primary">
        <Check className="h-3 w-3 opacity-0 hover:opacity-60" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="break-words text-[15px] leading-snug text-foreground">{it.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{it.hint}</p>
      </div>
      <Tint phase={it.phase} />
      {onSort && (
        <button onClick={(e) => { e.stopPropagation(); onSort(); }} className="h-8 shrink-0 rounded-full bg-muted px-3 text-xs font-semibold text-foreground">Sort</button>
      )}
    </li>
  );
}

function SortSheet({ it, onClose, onPick }: { it: Item; onClose: () => void; onPick: () => void }) {
  const acts = [
    { l: "Today", I: Sun }, { l: "Pick a day", I: CalendarDays }, { l: "Move to note", I: FileText }, { l: "Delete", I: Trash2 },
  ];
  return (
    <div className="planner-card mt-2 p-3">
      <p className="mb-2 text-xs text-muted-foreground">Sort “{it.title}”</p>
      <div className="grid grid-cols-2 gap-2">
        {acts.map(({ l, I }) => (
          <button key={l} onClick={onPick} className="flex h-12 items-center gap-2 rounded-xl bg-muted/60 px-3 text-sm font-semibold text-foreground"><I className="h-4 w-4" />{l}</button>
        ))}
      </div>
      <button onClick={onClose} className="mt-2 h-10 w-full text-xs text-muted-foreground">Cancel</button>
    </div>
  );
}

function CalmList() {
  const [items, setItems] = useState(SAMPLE);
  const [sorting, setSorting] = useState<number | null>(null);
  const rm = (id: number) => { setItems((x) => x.filter((i) => i.id !== id)); setSorting(null); };
  return (
    <div className="space-y-4">
      <Header count={items.length} />
      <Capture />
      {items.length === 0 ? <Empty /> : (["today", "earlier"] as const).map((g) => {
        const list = items.filter((i) => i.group === g);
        if (!list.length) return null;
        return (
          <section key={g}>
            <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g === "today" ? "New today" : "Earlier"}</h3>
            <ul className="space-y-2">
              {list.map((it) => (
                <div key={it.id}>
                  <Row it={it} onDone={() => rm(it.id)} onSort={() => setSorting(it.id)} />
                  {sorting === it.id && <SortSheet it={it} onClose={() => setSorting(null)} onPick={() => rm(it.id)} />}
                </div>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function OneAtATime() {
  const [items, setItems] = useState(SAMPLE);
  const [done, setDone] = useState(0);
  const cur = items[0];
  const next = () => { setItems((x) => x.slice(1)); setDone((d) => d + 1); };
  const acts = [{ l: "Today", I: Sun }, { l: "Later", I: CalendarDays }, { l: "Note", I: FileText }, { l: "Let go", I: Trash2 }];
  return (
    <div className="space-y-4">
      <Header count={items.length} />
      <Capture />
      {!cur ? <Empty /> : (
        <div className="planner-card p-5">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{done + 1} of {SAMPLE.length}</span>
            <Tint phase={cur.phase} />
          </div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all motion-reduce:transition-none" style={{ width: `${(done / SAMPLE.length) * 100}%` }} />
          </div>
          <p className="font-display text-xl leading-snug text-foreground">{cur.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{cur.hint}</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {acts.map(({ l, I }) => (
              <button key={l} onClick={next} className={cn("flex h-14 items-center justify-center gap-2 rounded-2xl text-sm font-semibold", l === "Today" ? "bg-primary text-primary-foreground" : "bg-muted/70 text-foreground")}>
                <I className="h-4 w-4" />{l}
              </button>
            ))}
          </div>
        </div>
      )}
      {items.length > 1 && (
        <section>
          <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Up next</h3>
          <ul className="space-y-2">{items.slice(1).map((it) => <Row key={it.id} it={it} onDone={() => setItems((x) => x.filter((i) => i.id !== it.id))} />)}</ul>
        </section>
      )}
    </div>
  );
}

const BUCKETS = [
  { l: "Today", I: Sun, p: "plan" as Phase },
  { l: "This week", I: CalendarDays, p: "grow" as Phase },
  { l: "Someday", I: Archive, p: "care" as Phase },
  { l: "Notes", I: FileText, p: "letgo" as Phase },
];

function Buckets() {
  const [items, setItems] = useState(SAMPLE);
  const [sel, setSel] = useState<number | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const drop = (l: string) => {
    if (sel == null) return;
    setItems((x) => x.filter((i) => i.id !== sel));
    setCounts((c) => ({ ...c, [l]: (c[l] ?? 0) + 1 }));
    setSel(null);
  };
  return (
    <div className="space-y-4">
      <Header count={items.length} />
      <Capture />
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div>
          <p className="mb-2 px-1 text-xs text-muted-foreground">{sel ? "Now tap where it goes" : "Tap an item, then a box"}</p>
          {items.length === 0 ? <Empty /> : (
            <ul className="space-y-2">{items.map((it) => <Row key={it.id} it={it} selected={sel === it.id} onSelect={() => setSel(sel === it.id ? null : it.id)} onDone={() => setItems((x) => x.filter((i) => i.id !== it.id))} />)}</ul>
          )}
        </div>
        <div className="sticky bottom-20 grid grid-cols-2 gap-2 lg:static lg:grid-cols-1 lg:content-start">
          {BUCKETS.map(({ l, I, p }) => (
            <button
              key={l}
              onClick={() => drop(l)}
              disabled={sel == null}
              className={cn("flex h-16 items-center gap-2 rounded-2xl px-3 text-left text-sm font-semibold shadow-sm transition-transform motion-reduce:transition-none", sel != null && "ring-2 ring-offset-2 ring-offset-background")}
              style={{ background: `hsl(var(--rhythm-${p}-tint))`, color: `hsl(var(--rhythm-${p}-deep))`, ["--tw-ring-color" as string]: `hsl(var(--rhythm-${p}))` }}
            >
              <I className="h-5 w-5" />
              <span className="flex-1">{l}</span>
              {counts[l] ? <span className="rounded-full bg-card px-2 text-xs">{counts[l]}</span> : <ArrowRight className="h-4 w-4 opacity-50" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const CONCEPTS = [
  { l: "1 · Calm List", C: CalmList },
  { l: "2 · One at a time", C: OneAtATime },
  { l: "3 · Sort Buckets", C: Buckets },
];

export default function InboxMockups() {
  const [i, setI] = useState(0);
  const C = CONCEPTS[i].C;
  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-28">
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Sparkles className="h-3.5 w-3.5" />Mockup · sample items</p>
          <h1 className="font-display text-3xl text-foreground">Refined Inbox</h1>
        </div>
        <div role="radiogroup" aria-label="Design" className="flex flex-wrap gap-2">
          {CONCEPTS.map((c, n) => (
            <button key={c.l} role="radio" aria-checked={i === n} onClick={() => setI(n)} className={cn("h-11 rounded-full px-4 text-sm font-semibold", i === n ? "bg-primary text-primary-foreground" : "bg-card text-foreground shadow-sm")}>{c.l}</button>
          ))}
        </div>
        <div className="mx-auto max-w-2xl lg:max-w-none"><C key={i} /></div>
      </div>
    </div>
  );
}
