import { useEffect, useState } from "react";
import { NAV_GROUPS, NAV_SUBPAGES } from "@/lib/nav";
import { ScheduleDayMoon } from "@/components/planner/schedule/ScheduleDayMoon";
import { useWeekForecast } from "@/lib/use-week-forecast";
import { useTempUnit, cToF } from "@/lib/weather-store";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo } from "@/lib/cycle";
import { ChevronDown, ChevronRight, Plus, Settings, Inbox, Sun, Pin, Moon, SunMedium, Smartphone, Monitor, Leaf, Menu, CloudSun, BookOpen, CalendarDays, CalendarRange, CalendarCheck } from "lucide-react";

function useSafeCycle() {
  try { return useCycle(); } catch { return null; }
}
import { cn } from "@/lib/utils";

type Group = (typeof NAV_GROUPS)[number];
const GROUPS = NAV_GROUPS as unknown as Group[];
const COUNTS: Record<string, number> = { "/inbox": 6, "/today": 4, "/planner": 9, "/notes": 2 };
const ACTIVE = "/inbox";

function Row({ icon: Icon, label, active, count, showCounts, size, onClick, chevron }: any) {
  return (
    <button onClick={onClick} className={cn("flex w-full min-h-[44px] items-center gap-3 rounded-xl px-3 text-left transition-colors",
      active ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted")} style={{ fontSize: size }}>
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="flex-1 truncate">{label}</span>
      {showCounts && count ? <span className="rounded-full bg-primary/15 px-2 text-xs text-primary">{count}</span> : null}
      {chevron}
    </button>
  );
}

function CalmList({ size, showCounts }: { size: number; showCounts: boolean }) {
  const [open, setOpen] = useState<string | null>(ACTIVE);
  return (
    <div className="flex h-full flex-col gap-4 p-3">
      <div className="px-2 font-display text-xl text-foreground">CareFlow</div>
      <div className="flex-1 space-y-4 overflow-y-auto">
        {GROUPS.map((g) => (
          <div key={g.id}>
            <div className="px-3 pb-1 text-[11px] uppercase tracking-widest text-muted-foreground">{g.label}</div>
            {g.items.map((it: any) => {
              const subs = NAV_SUBPAGES[it.to];
              return (
                <div key={it.to}>
                  <Row icon={it.icon} label={it.label} active={it.to === ACTIVE} count={COUNTS[it.to]} showCounts={showCounts} size={size}
                    onClick={() => setOpen(open === it.to ? null : it.to)}
                    chevron={subs?.length ? (open === it.to ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 opacity-50" />) : null} />
                  {open === it.to && subs?.map((s) => (
                    <div key={s.to} className="ml-9 min-h-[36px] flex items-center text-muted-foreground" style={{ fontSize: size - 1 }}>{s.label}</div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 border-t border-border pt-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">D</div>
        <span className="flex-1 text-sm">Dena</span>
        <Settings className="h-5 w-5 text-muted-foreground" />
      </div>
    </div>
  );
}

function IconRail({ size, showCounts }: { size: number; showCounts: boolean }) {
  const [sel, setSel] = useState<string | null>(GROUPS[0]?.id ?? null);
  const g = GROUPS.find((x) => x.id === sel);
  return (
    <div className="flex h-full">
      <div className="flex w-16 flex-col items-center gap-2 border-r border-border py-3">
        <Leaf className="mb-2 h-6 w-6 text-primary" />
        {GROUPS.map((x) => {
          const Icon = x.icon as any;
          return (
            <button key={x.id} title={x.label} onMouseEnter={() => setSel(x.id)} onClick={() => setSel(sel === x.id ? null : x.id)}
              className={cn("grid h-11 w-11 place-items-center rounded-xl", sel === x.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
        <div className="flex-1" />
        <Settings className="h-5 w-5 text-muted-foreground" />
      </div>
      {g && (
        <div className="w-60 overflow-y-auto bg-card p-3 shadow-lg">
          <div className="font-display text-lg">{g.label}</div>
          <div className="mb-2 text-xs text-muted-foreground">{(g as any).subtitle}</div>
          {g.items.map((it: any) => (
            <div key={it.to}>
              <Row icon={it.icon} label={it.label} active={it.to === ACTIVE} count={COUNTS[it.to]} showCounts={showCounts} size={size} />
              {NAV_SUBPAGES[it.to]?.map((s) => (
                <div key={s.to} className="ml-9 py-1 text-muted-foreground" style={{ fontSize: size - 1 }}>{s.label}</div>
              ))}
            </div>
          ))}
          {g.items.some((i: any) => i.to === "/notes") && (
            <div className="mt-3 rounded-xl bg-muted/50 p-2 text-sm">
              <div className="font-semibold">2026</div>
              <div className="ml-3">Autumn › November</div>
              <div className="ml-6 text-muted-foreground">Week 45 · Nov 3</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TodayFirst({ size, showCounts }: { size: number; showCounts: boolean }) {
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  const [pins, setPins] = useState(["Planner", "Notes", "Meals", "Mom's care"]);
  const today = new Date();
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <div className="planner-card rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-accent">Plan · Care · Grow</div>
            <div className="font-display text-xl">{today.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div>
          </div>
          <ScheduleDayMoon date={today} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button className="min-h-[44px] rounded-xl bg-primary text-sm text-primary-foreground"><Sun className="mx-auto h-4 w-4" />Today</button>
          <button className="min-h-[44px] rounded-xl bg-muted text-sm"><Inbox className="mx-auto h-4 w-4" />Inbox{showCounts && " 6"}</button>
          <button className="min-h-[44px] rounded-xl bg-muted text-sm"><Plus className="mx-auto h-4 w-4" />Add</button>
        </div>
      </div>
      <div>
        <div className="px-3 pb-1 text-[11px] uppercase tracking-widest text-muted-foreground">Pinned</div>
        {pins.map((p, i) => (
          <Row key={p} icon={Pin} label={p} size={size} onClick={() => i > 0 && setPins((a) => { const b = [...a]; [b[i - 1], b[i]] = [b[i], b[i - 1]]; return b; })}
            chevron={i > 0 ? <span className="text-xs text-muted-foreground">↑</span> : null} />
        ))}
      </div>
      {GROUPS.map((g) => (
        <div key={g.id}>
          <button onClick={() => setFolded((f) => ({ ...f, [g.id]: !(f[g.id] ?? true) }))}
            className="flex min-h-[44px] w-full items-center gap-2 px-3 text-[11px] uppercase tracking-widest text-muted-foreground">
            {(folded[g.id] ?? true) ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}{g.label}
          </button>
          {!(folded[g.id] ?? true) && g.items.map((it: any) => (
            <Row key={it.to} icon={it.icon} label={it.label} active={it.to === ACTIVE} count={COUNTS[it.to]} showCounts={showCounts} size={size} />
          ))}
        </div>
      ))}
    </div>
  );
}

function RailToday({ size, showCounts }: { size: number; showCounts: boolean }) {
  const [sel, setSel] = useState<string>("today");
  const g = GROUPS.find((x) => x.id === sel);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  const today = now;
  const { days } = useWeekForecast();
  const [unit] = useTempUnit();
  const wx = days?.find((x) => x.date === today.toISOString().slice(0, 10));
  const cyc = useSafeCycle();
  const cycleInfo = cyc?.settings?.enabled ? getPhaseInfo(today, cyc.periods, cyc.settings) : null;
  const railBtn = (active: boolean) => cn("grid h-11 w-11 place-items-center rounded-xl", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted");
  return (
    <div className="flex h-full">
      <div className="flex w-16 flex-col items-center gap-2 border-r border-border py-3">
        <Leaf className="mb-1 h-6 w-6 text-primary" />
        <button title="Today" onMouseEnter={() => setSel("today")} onClick={() => setSel("today")} className={railBtn(sel === "today")}>
          <Sun className="h-5 w-5" />
        </button>
        <button title="Inbox" className="relative grid h-11 w-11 place-items-center rounded-xl text-muted-foreground hover:bg-muted">
          <Inbox className="h-5 w-5" />
          {showCounts && <span className="absolute right-1 top-1 rounded-full bg-primary px-1 text-[10px] text-primary-foreground">6</span>}
        </button>
        <div className="my-1 h-px w-8 bg-border" />
        {GROUPS.map((x) => {
          const Icon = x.icon as any;
          return (
            <button key={x.id} title={x.label} onMouseEnter={() => setSel(x.id)} onClick={() => setSel(x.id)} className={railBtn(sel === x.id)}>
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
        <div className="flex-1" />
        <Settings className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="w-64 overflow-y-auto bg-card p-3 shadow-lg">
        {sel === "today" ? (
          <div className="space-y-3">
            <div className="planner-card rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-display text-xl leading-tight">{today.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div>
                  <div className="font-display text-2xl tabular-nums text-primary">{now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
                </div>
                <ScheduleDayMoon date={today} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                  <CloudSun className="h-3.5 w-3.5" />{wx ? `${unit === "F" ? cToF(wx.highC) : wx.highC}° / ${unit === "F" ? cToF(wx.lowC) : wx.lowC}°` : "62° · Partly sunny"}
                </span>
                {cycleInfo && (
                  <span className="rounded-full bg-muted px-2 py-1">Cycle day {cycleInfo.cycleDay} · {cycleInfo.label}</span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button className="min-h-[44px] rounded-xl bg-primary text-sm text-primary-foreground"><Sun className="mx-auto h-4 w-4" />Today</button>
                <button className="min-h-[44px] rounded-xl bg-muted text-sm"><Inbox className="mx-auto h-4 w-4" />Inbox{showCounts && " 6"}</button>
                <button className="min-h-[44px] rounded-xl bg-muted text-sm"><Plus className="mx-auto h-4 w-4" />Add</button>
              </div>
            </div>
            <div className="px-3 text-[11px] uppercase tracking-widest text-muted-foreground">Notebook</div>
            {[
              { icon: CalendarRange, k: "Month", v: today.toLocaleDateString(undefined, { month: "long", year: "numeric" }) },
              { icon: CalendarDays, k: "Week", v: `Week ${isoWeek(today)}` },
              { icon: CalendarCheck, k: "Day", v: today.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) },
            ].map(({ icon, k, v }) => (
              <Row key={k} icon={icon} label={<span><span className="mr-2 text-xs text-muted-foreground">{k}</span>{v}</span>} size={size}
                chevron={<ChevronRight className="h-4 w-4 opacity-50" />} />
            ))}
            <div className="px-3 text-[11px] uppercase tracking-widest text-muted-foreground">Pinned</div>
            {["Planner", "Notes", "Meals", "Mom's care"].map((p) => <Row key={p} icon={Pin} label={p} size={size} />)}
            <p className="px-3 text-xs text-muted-foreground">Hover or tap an icon for the rest of your pages.</p>
          </div>
        ) : g && (
          <>
            <div className="font-display text-lg">{g.label}</div>
            <div className="mb-2 text-xs text-muted-foreground">{(g as any).subtitle}</div>
            {g.items.map((it: any) => (
              <div key={it.to}>
                <Row icon={it.icon} label={it.label} active={it.to === ACTIVE} count={COUNTS[it.to]} showCounts={showCounts} size={size} />
                {NAV_SUBPAGES[it.to]?.map((s) => (
                  <div key={s.to} className="ml-9 py-1 text-muted-foreground" style={{ fontSize: size - 1 }}>{s.label}</div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

const DESIGNS = [
  { id: "mix", label: "4 · Rail + Today first", C: RailToday },
  { id: "calm", label: "1 · Calm list", C: CalmList },
  { id: "rail", label: "2 · Icon rail + flyout", C: IconRail },
  { id: "today", label: "3 · Today-first", C: TodayFirst },
];

export default function SidebarMockups() {
  const [tab, setTab] = useState("mix");
  const [dark, setDark] = useState(false);
  const [phone, setPhone] = useState(false);
  const [size, setSize] = useState(14);
  const [counts, setCounts] = useState(true);
  const [drawer, setDrawer] = useState(true);
  const D = DESIGNS.find((d) => d.id === tab)!.C;
  return (
    <div className={cn(dark && "dark")}>
      <div className="min-h-screen bg-background p-4 text-foreground">
        <h1 className="font-display text-3xl">Sidebar mockups</h1>
        <p className="mb-4 text-sm text-muted-foreground">Sample content only. Pick the design you like.</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {DESIGNS.map((d) => (
            <button key={d.id} onClick={() => setTab(d.id)} className={cn("min-h-[44px] rounded-full px-4 text-sm", tab === d.id ? "bg-primary text-primary-foreground" : "bg-muted")}>{d.label}</button>
          ))}
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <button onClick={() => setDark(!dark)} className="flex min-h-[44px] items-center gap-2 rounded-full bg-muted px-4">{dark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{dark ? "Light" : "Dark"}</button>
          <button onClick={() => setPhone(!phone)} className="flex min-h-[44px] items-center gap-2 rounded-full bg-muted px-4">{phone ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}{phone ? "Desktop" : "Phone"}</button>
          <label className="flex items-center gap-2 rounded-full bg-muted px-4 min-h-[44px]">Text {size}px<input type="range" min={12} max={18} value={size} onChange={(e) => setSize(+e.target.value)} /></label>
          <label className="flex items-center gap-2 rounded-full bg-muted px-4 min-h-[44px]"><input type="checkbox" checked={counts} onChange={(e) => setCounts(e.target.checked)} />Show counts</label>
        </div>
        <div className={cn("relative mx-auto flex overflow-hidden rounded-3xl border border-border bg-background shadow-xl", phone ? "h-[720px] w-[390px]" : "h-[760px] w-full max-w-6xl")}>
          {(!phone || drawer) && (
            <aside className={cn("h-full bg-card", phone ? "absolute inset-y-0 left-0 z-10 w-[85%] shadow-2xl" : "shrink-0 border-r border-border", !phone && tab !== "rail" && "w-72")}>
              <D size={size} showCounts={counts} />
            </aside>
          )}
          {phone && drawer && <div className="absolute inset-0 bg-foreground/30" onClick={() => setDrawer(false)} />}
          <main className="flex-1 p-6">
            {phone && <button onClick={() => setDrawer(true)} className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-muted"><Menu className="h-5 w-5" /></button>}
            <div className="font-display text-2xl">Inbox</div>
            <div className="mt-4 space-y-2">
              {["Call the pharmacy about Mom's refill", "Book dentist for the kids", "Renew car registration"].map((t) => (
                <div key={t} className="planner-card rounded-xl p-3 text-sm">{t}</div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y.getTime()) / 86400000 + 1) / 7);
}
