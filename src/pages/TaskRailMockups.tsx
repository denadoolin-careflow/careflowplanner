import { useState } from "react";
import { Sun, CalendarRange, Cloud, NotebookPen, Check, GripVertical, CalendarPlus, ChevronLeft, ChevronRight, Plus, Inbox as InboxIcon, FolderKanban, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PHASE_ICONS } from "@/lib/phase-icons";

type Phase = "plan" | "grow" | "care" | "letgo";
type Item = { id: string; title: string; phase: Phase; box: "inbox" | "today" | "week" | "someday" | "notes"; when: "today" | "upcoming" | "someday"; area: string; est?: number; time?: string; note?: boolean };

const SAMPLE: Item[] = [
  { id: "1", title: "Call the pharmacy about Mom's refill", phase: "plan", box: "inbox", when: "today", area: "Caregiving", est: 10 },
  { id: "2", title: "Book dentist for the kids", phase: "plan", box: "inbox", when: "upcoming", area: "Kids", est: 5 },
  { id: "3", title: "School drop-off", phase: "plan", box: "today", when: "today", area: "Family", time: "8:30", est: 20 },
  { id: "4", title: "Fold laundry and put away the towels", phase: "grow", box: "today", when: "today", area: "Home", est: 25 },
  { id: "5", title: "Prep dinner: lentil soup", phase: "care", box: "today", when: "today", area: "Meals", time: "17:30", est: 45 },
  { id: "6", title: "Pay the electric bill", phase: "grow", box: "week", when: "upcoming", area: "Money", est: 10 },
  { id: "7", title: "Reorganize the pantry shelves", phase: "care", box: "week", when: "upcoming", area: "Home", est: 60 },
  { id: "8", title: "Plan a weekend picnic", phase: "letgo", box: "someday", when: "someday", area: "Family" },
  { id: "9", title: "Ideas for the garden bed", phase: "letgo", box: "notes", when: "someday", area: "Personal", note: true },
];

const BOXES = [
  { id: "inbox", label: "Inbox", I: InboxIcon, p: "plan" as Phase },
  { id: "today", label: "Today", I: Sun, p: "grow" as Phase },
  { id: "week", label: "This week", I: CalendarRange, p: "plan" as Phase },
  { id: "someday", label: "Someday", I: Cloud, p: "care" as Phase },
  { id: "notes", label: "Notes", I: NotebookPen, p: "letgo" as Phase },
] as const;
const PHASE_NAME: Record<Phase, string> = { plan: "Plan", grow: "Grow", care: "Care", letgo: "Let go" };
const tint = (p: Phase) => ({ background: `hsl(var(--rhythm-${p}-tint))`, color: `hsl(var(--rhythm-${p}-deep))` });

const STYLES = ["Calm list", "Compact", "Cards", "Phase-grouped"] as const;
const GROUPS = ["By box", "By time", "By area"] as const;
const TAPS = ["Check off", "Open details", "Select to schedule"] as const;
const PLACE = ["Drag", "Schedule button"] as const;
const DONE = ["Strike through", "Fade", "Hide"] as const;
const RAIL = ["Always open", "Collapse to icons", "Slide in"] as const;

function Seg<T extends string>({ label, opts, v, set }: { label: string; opts: readonly T[]; v: T; set: (x: any) => void }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {opts.map((o) => (
          <button key={o} role="radio" aria-checked={v === o} onClick={() => set(o)} className={cn("min-h-11 rounded-full px-3 text-xs font-semibold", v === o ? "bg-primary text-primary-foreground" : "bg-card text-foreground shadow-sm")}>{o}</button>
        ))}
      </div>
    </div>
  );
}

export default function TaskRailMockups() {
  const [style, setStyle] = useState<(typeof STYLES)[number]>("Calm list");
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("By box");
  const [tap, setTap] = useState<(typeof TAPS)[number]>("Check off");
  const [place, setPlace] = useState<(typeof PLACE)[number]>("Drag");
  const [doneMode, setDoneMode] = useState<(typeof DONE)[number]>("Strike through");
  const [rail, setRail] = useState<(typeof RAIL)[number]>("Always open");
  const [px, setPx] = useState(14);
  const [done, setDone] = useState<string[]>(["3"]);
  const [selected, setSelected] = useState<string | null>(null);
  const [box, setBox] = useState<string>("inbox");
  const [collapsed, setCollapsed] = useState(false);
  const [slideOpen, setSlideOpen] = useState(true);
  const [toast, setToast] = useState("");
  const [draft, setDraft] = useState("");
  const [items, setItems] = useState(SAMPLE);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1600); };
  const toggle = (id: string) => setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  const onTap = (it: Item) => {
    if (it.note) return say(`Opens note "${it.title}"`);
    if (tap === "Check off") toggle(it.id);
    else if (tap === "Open details") say(`Opens details for "${it.title}"`);
    else setSelected(selected === it.id ? null : it.id);
  };
  const visible = items.filter((i) => !(doneMode === "Hide" && done.includes(i.id)));

  const sections: { key: string; label: string; icon?: any; p?: Phase; list: Item[] }[] =
    group === "By box"
      ? BOXES.map((b) => ({ key: b.id, label: b.label, icon: b.I, p: b.p, list: visible.filter((i) => i.box === b.id) }))
      : group === "By time"
      ? (["today", "upcoming", "someday"] as const).map((w) => ({ key: w, label: w[0].toUpperCase() + w.slice(1), list: visible.filter((i) => i.when === w) }))
      : [...new Set(visible.map((i) => i.area))].map((a) => ({ key: a, label: a, icon: FolderKanban, list: visible.filter((i) => i.area === a) }));

  const Row = ({ it }: { it: Item }) => {
    const isDone = done.includes(it.id);
    const PI = PHASE_ICONS[it.phase];
    const doneCls = isDone && (doneMode === "Strike through" ? "line-through text-muted-foreground" : doneMode === "Fade" ? "opacity-50" : "");
    const check = (
      <button aria-label={isDone ? `Mark ${it.title} not done` : `Check off ${it.title}`} onClick={(e) => { e.stopPropagation(); toggle(it.id); }}
        className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border-2", isDone ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
        {isDone && <Check className="h-3.5 w-3.5" />}
      </button>
    );
    const lead = it.note ? <NotebookPen className="h-5 w-5 shrink-0" style={{ color: "hsl(var(--rhythm-letgo-deep))" }} /> : check;
    const extras = (
      <>
        {place === "Drag" ? <GripVertical aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground/60" /> : !it.note && (
          <button aria-label={`Schedule ${it.title}`} onClick={(e) => { e.stopPropagation(); say(`Pick a time for "${it.title}"`); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-muted"><CalendarPlus className="h-4 w-4 text-muted-foreground" /></button>
        )}
      </>
    );
    const sel = selected === it.id && "ring-2 ring-primary";
    if (style === "Compact")
      return (
        <li onClick={() => onTap(it)} className={cn("flex min-h-11 cursor-pointer items-center gap-2 border-b border-border/40 px-1", sel)}>
          {lead}<span className={cn("min-w-0 flex-1 truncate", doneCls)}>{it.title}</span>
          {it.time && <span className="text-xs text-muted-foreground">{it.time}</span>}{extras}
        </li>
      );
    if (style === "Cards")
      return (
        <li onClick={() => onTap(it)} className={cn("planner-card cursor-pointer bg-card p-3", sel)}>
          <div className="flex items-start gap-2">{lead}<span className={cn("min-w-0 flex-1 break-words font-medium", doneCls)}>{it.title}</span>{extras}</div>
          <div className="mt-2 flex flex-wrap gap-1.5 pl-8 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={tint(it.phase)}><PI className="h-3 w-3" />{PHASE_NAME[it.phase]}</span>
            {it.est && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground"><Clock className="h-3 w-3" />~{it.est}m</span>}
            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{it.area}</span>
          </div>
        </li>
      );
    return (
      <li onClick={() => onTap(it)} className={cn("relative flex min-h-12 cursor-pointer items-start gap-2 overflow-hidden rounded-xl border border-border/40 bg-card py-2.5 pl-4 pr-2 shadow-sm", sel)}>
        <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: `hsl(var(--rhythm-${it.phase}))` }} />
        {lead}
        <div className="min-w-0 flex-1">
          <p className={cn("break-words leading-snug", doneCls)}>{it.title}</p>
          <p className="text-xs text-muted-foreground">{[it.time, it.est && `~${it.est}m`, it.area].filter(Boolean).join(" · ")}</p>
        </div>
        {extras}
      </li>
    );
  };

  const List = ({ list }: { list: Item[] }) =>
    style === "Phase-grouped" ? (
      <div className="space-y-2">
        {(["plan", "grow", "care", "letgo"] as Phase[]).map((p) => {
          const l = list.filter((i) => i.phase === p);
          if (!l.length) return null;
          const PI = PHASE_ICONS[p];
          return (
            <div key={p}>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold" style={{ color: `hsl(var(--rhythm-${p}-deep))` }}>
                <span className="grid h-6 w-6 place-items-center rounded-full" style={tint(p)}><PI className="h-3.5 w-3.5" /></span>{PHASE_NAME[p]}
              </p>
              <ul className="space-y-1.5">{l.map((it) => <Row key={it.id} it={it} />)}</ul>
            </div>
          );
        })}
      </div>
    ) : (
      <ul className={cn(style === "Compact" ? "" : "space-y-1.5")}>{list.map((it) => <Row key={it.id} it={it} />)}</ul>
    );

  const addItem = () => {
    if (!draft.trim()) return;
    const b = (group === "By box" ? box : "inbox") as Item["box"];
    setItems((x) => [{ id: String(Date.now()), title: draft.trim(), phase: "plan", box: b, when: "today", area: "Personal", est: 15 }, ...x]);
    setDraft(""); say("Added");
  };

  const railBody = (
    <div className="space-y-3" style={{ fontSize: px }}>
      <form onSubmit={(e) => { e.preventDefault(); addItem(); }} className="flex items-center gap-2 rounded-xl bg-muted/50 px-3">
        <Plus className="h-4 w-4 text-muted-foreground" />
        <label htmlFor="rail-add" className="sr-only">Capture a task</label>
        <input id="rail-add" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder='Capture… "call mom 3pm"' className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
      </form>
      {group === "By box" ? (
        <>
          <div role="tablist" aria-label="Boxes" className="flex flex-wrap gap-1.5">
            {BOXES.map((b) => {
              const n = items.filter((i) => i.box === b.id && !done.includes(i.id)).length;
              return (
                <button key={b.id} role="tab" aria-selected={box === b.id} onClick={() => setBox(b.id)} className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold", box === b.id && "ring-2 ring-current")} style={tint(b.p)}>
                  <b.I className="h-4 w-4" />{b.label}<span className="rounded-full bg-background/70 px-1.5 tabular-nums">{n}</span>
                </button>
              );
            })}
          </div>
          {(() => { const s = sections.find((x) => x.key === box)!; return s.list.length ? <List list={s.list} /> : <p className="py-3 text-center text-xs text-muted-foreground">Nothing here yet.</p>; })()}
        </>
      ) : (
        sections.map((s) => s.list.length > 0 && (
          <section key={s.key}>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</h3>
            <List list={s.list} />
          </section>
        ))
      )}
    </div>
  );

  const collapsedRail = (
    <div className="flex flex-col items-center gap-2 py-2">
      <button aria-label="Expand rail" onClick={() => setCollapsed(false)} className="grid h-11 w-11 place-items-center rounded-full hover:bg-muted"><ChevronRight className="h-5 w-5" /></button>
      {BOXES.map((b) => (
        <button key={b.id} aria-label={b.label} onClick={() => { setBox(b.id); setCollapsed(false); }} className="grid h-11 w-11 place-items-center rounded-full" style={tint(b.p)}><b.I className="h-5 w-5" /></button>
      ))}
    </div>
  );

  const showRail = rail === "Always open" || (rail === "Collapse to icons") || (rail === "Slide in" && slideOpen);

  return (
    <div className="min-h-screen bg-background px-3 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header>
          <h1 className="font-display text-3xl text-foreground">Planner task rail · mockup</h1>
          <p className="text-sm text-muted-foreground">Sample items only. Change the style and behavior; everything below updates live.</p>
        </header>

        <div className="planner-card grid gap-4 bg-card p-4 md:grid-cols-2">
          <Seg label="Style" opts={STYLES} v={style} set={setStyle} />
          <Seg label="Sections" opts={GROUPS} v={group} set={setGroup} />
          <Seg label="Tapping a task" opts={TAPS} v={tap} set={setTap} />
          <Seg label="Placing on the schedule" opts={PLACE} v={place} set={setPlace} />
          <Seg label="Finished tasks" opts={DONE} v={doneMode} set={setDoneMode} />
          <Seg label="Rail" opts={RAIL} v={rail} set={(v) => { setRail(v); setCollapsed(false); setSlideOpen(true); }} />
          <div>
            <label htmlFor="px" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Text size · {px}px</label>
            <input id="px" type="range" min={12} max={18} value={px} onChange={(e) => setPx(+e.target.value)} className="w-full accent-primary" />
          </div>
        </div>

        <div className={cn("relative grid gap-4", showRail && !(rail === "Slide in") && (collapsed ? "md:grid-cols-[64px_minmax(0,1fr)]" : "md:grid-cols-[340px_minmax(0,1fr)]"))}>
          {rail === "Slide in" && !slideOpen && (
            <button onClick={() => setSlideOpen(true)} className="absolute left-0 top-4 z-10 flex min-h-11 items-center gap-1 rounded-r-full bg-primary px-3 text-sm font-semibold text-primary-foreground shadow"><ChevronRight className="h-4 w-4" />Tasks</button>
          )}
          {showRail && (
            <aside className={cn("planner-card bg-card p-3", rail === "Slide in" && "absolute left-0 top-0 z-20 w-[min(340px,92vw)] shadow-2xl")}>
              {collapsed ? collapsedRail : (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-display text-lg">Tasks</p>
                    {rail !== "Always open" && (
                      <button aria-label="Close rail" onClick={() => (rail === "Slide in" ? setSlideOpen(false) : setCollapsed(true))} className="grid h-11 w-11 place-items-center rounded-full hover:bg-muted"><ChevronLeft className="h-5 w-5" /></button>
                    )}
                  </div>
                  {railBody}
                </>
              )}
            </aside>
          )}

          <section className="planner-card min-h-[420px] bg-card p-4">
            <p className="mb-3 font-display text-xl">Tuesday schedule</p>
            {selected && <p className="mb-2 rounded-xl bg-primary/10 px-3 py-2 text-sm">Tap a time below to place “{items.find((i) => i.id === selected)?.title}”.</p>}
            <ul className="space-y-1">
              {["8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"].map((h) => (
                <li key={h}>
                  <button onClick={() => { if (selected) { say(`Placed at ${h}`); setSelected(null); } }} className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-dashed border-border/60 px-3 text-left text-sm text-muted-foreground hover:bg-muted/40">
                    <span className="w-12 font-serif text-xs">{h}</span>{place === "Drag" ? "Drop a task here" : "Open time"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      {toast && <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg">{toast}</div>}
    </div>
  );
}
