import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { format, startOfMonth, startOfWeek } from "date-fns";
import { NAV_GROUPS, NAV_SUBPAGES } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { useWeekForecast } from "@/lib/use-week-forecast";
import { useTempUnit, cToF } from "@/lib/weather-store";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo } from "@/lib/cycle";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { getMoonSign, MOON_IN_SIGN_GUIDE } from "@/lib/zodiac";
import { lunarRhythmAt, LUNAR_RHYTHM, PHASE_GUIDE } from "@/lib/cosmic/lunar-rhythm";
import { listPinnedNotes, type Note } from "@/lib/notes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WeatherCondition } from "@/lib/weather";
import { CareFlowMark } from "@/components/widgets/CareFlowMark";
import { cn } from "@/lib/utils";
import {
  ChevronRight, Plus, Settings, Inbox, Sun, Pin, CloudSun, CalendarDays, CalendarRange, CalendarCheck,
  Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, Zap, Droplet, MoonStar, PanelLeft,
} from "lucide-react";

export const SIDEBAR_STYLE_KEY = "careflow:sidebar:style"; // "rail" | "classic"
export function readSidebarStyle(): "rail" | "classic" {
  try { return window.localStorage.getItem(SIDEBAR_STYLE_KEY) === "classic" ? "classic" : "rail"; } catch { return "rail"; }
}
export function setSidebarStyle(v: "rail" | "classic") {
  try { window.localStorage.setItem(SIDEBAR_STYLE_KEY, v); } catch {}
  window.dispatchEvent(new Event("careflow:sidebar:prefs"));
}

type Group = (typeof NAV_GROUPS)[number];
const GROUPS = NAV_GROUPS as unknown as Group[];

function useSafeCycle() {
  try { return useCycle(); } catch { return null; }
}

export function RailTodaySidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { state } = useStore();
  const [sel, setSel] = useState<string>("today");
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  const [pins, setPins] = useState<Note[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => { void listPinnedNotes().then((n) => alive && setPins(n)).catch(() => {}); };
    load();
    window.addEventListener("careflow:notes:pinned-changed", load);
    return () => { alive = false; window.removeEventListener("careflow:notes:pinned-changed", load); };
  }, []);

  const inboxCount = state.tasks.filter((t: any) => t.inbox && !t.done && !t.parentTaskId && t.status !== "parked").length;
  const cyc = useSafeCycle();
  const cycleInfo = cyc?.settings?.enabled ? getPhaseInfo(now, cyc.periods, cyc.settings) : null;
  const moon = MOON_INFO[getMoonPhase(now)];
  const sign = getMoonSign(now);
  const signGuide = (MOON_IN_SIGN_GUIDE as any)[sign.name];
  const rhythm = lunarRhythmAt(now);
  const g = GROUPS.find((x) => x.id === sel);

  const go = (to: string) => { navigate(to); onNavigate?.(); };
  const isActive = (to: string) => pathname === to || (to !== "/" && pathname.startsWith(to + "/"));
  const railBtn = (active: boolean) => cn("relative grid h-11 w-11 place-items-center rounded-xl transition-colors",
    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted");

  const dateStr = now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const timeStr = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const weekIso = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const monthIso = format(startOfMonth(now), "yyyy-MM-dd");

  return (
    <div className="flex h-full min-h-0 bg-sidebar text-sidebar-foreground">
      <nav aria-label="Main" className="flex w-16 shrink-0 flex-col items-center gap-2 overflow-y-auto border-r border-sidebar-border py-3">
        <button aria-label="Home" onClick={() => go("/")} className="mb-1 grid h-11 w-11 place-items-center"><CareFlowMark size={32} /></button>
        <button aria-label="Today" title="Today" onMouseEnter={() => setSel("today")} onClick={() => setSel("today")} className={railBtn(sel === "today")}>
          <Sun className="h-5 w-5" />
        </button>
        <button aria-label="Inbox" title="Inbox" onClick={() => go("/inbox")} className={railBtn(isActive("/inbox"))}>
          <Inbox className="h-5 w-5" />
          {inboxCount > 0 && <span className="absolute right-0.5 top-0.5 min-w-[18px] rounded-full bg-primary px-1 text-[10px] leading-[18px] text-primary-foreground">{inboxCount}</span>}
        </button>
        <div className="my-1 h-px w-8 bg-sidebar-border" />
        {GROUPS.map((x) => {
          const Icon = x.icon as any;
          return (
            <button key={x.id} aria-label={x.label} title={x.label} onMouseEnter={() => setSel(x.id)} onClick={() => setSel(x.id)} className={railBtn(sel === x.id)}>
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
        <div className="flex-1" />
        <button aria-label="Settings" title="Settings" onClick={() => go("/settings")} className={railBtn(isActive("/settings"))}>
          <Settings className="h-5 w-5" />
        </button>
      </nav>

      <div className="w-72 min-h-0 overflow-y-auto p-4">
        {sel === "today" ? (
          <div className="space-y-4">
            <div className="planner-card space-y-4 rounded-3xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{dateStr}</div>
                  <div className="font-display text-4xl leading-none tabular-nums text-primary">{timeStr}</div>
                </div>
                <WeatherButton now={now} />
              </div>
              <div className="h-px bg-border" />
              <div className="space-y-2">
                <InfoRow icon={<span className="text-base leading-none">{moon.glyph}</span>} label={`${moon.label} · ${sign.name} ${sign.symbol}`}>
                  <div className="font-display text-base">{moon.label} in {sign.name}</div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{LUNAR_RHYTHM[rhythm]?.label ?? rhythm} phase</div>
                  <p className="mt-2 text-sm">{signGuide?.vibe ?? moon.invitation}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{PHASE_GUIDE[rhythm]?.focus ?? moon.invitation}</p>
                  {signGuide?.actions?.[0] && <p className="mt-2 text-sm">Try: {signGuide.actions[0]}</p>}
                </InfoRow>
                {cycleInfo && (
                  <InfoRow icon={<Droplet className="h-4 w-4 text-primary" />} label={`Day ${cycleInfo.cycleDay} · ${cycleInfo.label}`}>
                    <div className="font-display text-base">Cycle day {cycleInfo.cycleDay} · {cycleInfo.label}</div>
                    <p className="mt-2 text-sm">{cycleInfo.invitation}</p>
                    {cycleInfo.planningHints?.[0] && <p className="mt-1 text-sm text-muted-foreground">Plan tip: {cycleInfo.planningHints[0]}</p>}
                  </InfoRow>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => go("/today")} className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl bg-primary text-xs text-primary-foreground"><Sun className="h-4 w-4" />Today</button>
                <button onClick={() => go("/inbox")} className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl bg-muted text-xs"><Inbox className="h-4 w-4" />Inbox{inboxCount ? ` ${inboxCount}` : ""}</button>
                <button onClick={() => { window.dispatchEvent(new CustomEvent("careflow:quick-add")); onNavigate?.(); }} className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl bg-muted text-xs"><Plus className="h-4 w-4" />Add</button>
              </div>
            </div>

            <Section label="Notebook">
              <Row icon={CalendarRange} onClick={() => go(`/month?date=${monthIso}`)} label={<><span className="mr-2 text-xs text-muted-foreground">Month</span>{format(now, "MMM yyyy")}</>} />
              <Row icon={CalendarDays} onClick={() => go(`/week?date=${weekIso}`)} label={<><span className="mr-2 text-xs text-muted-foreground">Week</span>Week of {format(startOfWeek(now, { weekStartsOn: 1 }), "MMM d")}</>} />
              <Row icon={CalendarCheck} onClick={() => go("/today")} label={<><span className="mr-2 text-xs text-muted-foreground">Day</span>{format(now, "EEE, MMM d")}</>} />
            </Section>

            {pins.length > 0 && (
              <Section label="Pinned">
                {pins.slice(0, 8).map((n) => (
                  <Row key={n.id} icon={Pin} onClick={() => go(`/notes/${n.id}`)} label={n.title || "Untitled"} active={pathname === `/notes/${n.id}`} />
                ))}
              </Section>
            )}

            <button onClick={() => setSidebarStyle("classic")} className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3 text-xs text-muted-foreground hover:bg-muted">
              <PanelLeft className="h-4 w-4" />Switch to classic sidebar
            </button>
          </div>
        ) : g && (
          <div className="space-y-1">
            <div className="font-display text-xl">{g.label}</div>
            {(g as any).subtitle && <div className="mb-3 text-xs text-muted-foreground">{(g as any).subtitle}</div>}
            {g.items.map((it: any) => (
              <div key={it.to}>
                <Row icon={it.icon} label={it.label} active={isActive(it.to)} onClick={() => go(it.to)} />
                {NAV_SUBPAGES[it.to]?.map((s) => (
                  <NavLink key={s.to} to={s.to} onClick={onNavigate}
                    className={({ isActive: a }) => cn("ml-9 flex min-h-[36px] items-center rounded-lg px-2 text-sm text-muted-foreground hover:bg-muted", a && "text-primary font-semibold")}>
                    {s.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="px-3 pb-1 text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function Row({ icon: Icon, label, active, onClick }: { icon?: any; label: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors",
      active ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted")}>
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="flex-1 truncate">{label}</span>
      <ChevronRight className="h-4 w-4 opacity-40" />
    </button>
  );
}

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex min-h-[44px] w-full items-center gap-2 rounded-xl bg-muted/60 px-3 text-left text-xs hover:bg-muted">
          {icon}<span className="flex-1">{label}</span><ChevronRight className="h-3.5 w-3.5 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-72">{children}</PopoverContent>
    </Popover>
  );
}

function WxIcon({ c, night, className = "h-5 w-5" }: { c: WeatherCondition; night?: boolean; className?: string }) {
  if (c === "clear") return night ? <MoonStar className={className} /> : <Sun className={className} />;
  if (c === "partly-cloudy") return <CloudSun className={className} />;
  if (c === "fog") return <CloudFog className={className} />;
  if (c === "drizzle") return <CloudDrizzle className={className} />;
  if (c === "rain") return <CloudRain className={className} />;
  if (c === "snow") return <CloudSnow className={className} />;
  if (c === "thunderstorm") return <Zap className={className} />;
  return <Cloud className={className} />;
}

const COND_LABEL: Record<string, string> = { clear: "Clear", "partly-cloudy": "Partly cloudy", cloudy: "Cloudy", fog: "Foggy", drizzle: "Drizzle", rain: "Rain", snow: "Snow", thunderstorm: "Storms" };

function WeatherButton({ now }: { now: Date }) {
  const { days } = useWeekForecast();
  const [unit] = useTempUnit();
  const list = (days ?? []).slice(0, 7) as any[];
  if (!list.length) return null;
  const iso = format(now, "yyyy-MM-dd");
  const t = list.find((d) => d.date === iso) ?? list[0];
  const night = now.getHours() >= 18 || now.getHours() < 6;
  const f = (c: number) => `${unit === "F" ? cToF(c) : c}°`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button aria-label="Weather forecast" className="flex min-h-[44px] flex-col items-center rounded-xl bg-muted px-2 py-1 text-xs hover:bg-muted/70">
          <WxIcon c={t.condition} night={night} />
          <span className="tabular-nums">{f(t.highC)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-72">
        <Tabs defaultValue="today">
          <TabsList className="w-full"><TabsTrigger value="today" className="flex-1">Today</TabsTrigger><TabsTrigger value="week" className="flex-1">Week</TabsTrigger></TabsList>
          <TabsContent value="today" className="pt-2">
            <div className="flex items-center gap-3">
              <WxIcon c={t.condition} night={night} className="h-10 w-10 text-primary" />
              <div>
                <div className="font-display text-lg">{COND_LABEL[t.condition] ?? t.condition}</div>
                <div className="text-sm tabular-nums">High {f(t.highC)} · Low {f(t.lowC)}</div>
                {t.precip != null && <div className="text-sm text-muted-foreground">{t.precip}% chance of rain</div>}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="week" className="space-y-1 pt-2">
            {list.map((d) => (
              <div key={d.date} className="flex items-center gap-2 text-sm">
                <span className="w-10">{new Date(d.date + "T12:00").toLocaleDateString(undefined, { weekday: "short" })}</span>
                <WxIcon c={d.condition} className="h-4 w-4" />
                <span className="flex-1 tabular-nums">{f(d.highC)} / {f(d.lowC)}</span>
                {d.precip != null && <span className="text-xs text-muted-foreground">{d.precip}%</span>}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
