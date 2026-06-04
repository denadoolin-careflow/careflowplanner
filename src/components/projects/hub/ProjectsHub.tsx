import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { useAtmosphere } from "@/lib/atmospheres";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ArrowRight, Sparkles, Folder, Rocket, Leaf, Pause, Lightbulb,
  CheckSquare, FileText, Paperclip, Heart, Plus, LayoutGrid, List as ListIcon, Images, Hourglass, Clock,
} from "lucide-react";
import { AREAS, type Project, type ProjectStage, type ProjectHealth } from "@/lib/types";
import { ProjectCoverArt } from "./ProjectCoverArt";
import { STUDIO, STAGE_META, HEALTH_META, stageOf, healthOf } from "./studio-tokens";
import { useProjectIdeas } from "@/lib/project-ideas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAreaIcon } from "@/components/areas/AreaIconColorPicker";
import { formatRelativeDate } from "@/lib/date-format";

type View = "cards" | "list" | "gallery";
const VIEW_KEY = "projects.hub.view";

const ALL_STAGES: Array<ProjectStage | "all"> = ["all", "idea", "planning", "building", "launching", "maintaining"];
const ALL_HEALTH: Array<ProjectHealth | "all"> = ["all", "active", "waiting", "blocked"];

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Winding down";
}

function useProjectMetrics() {
  const { state } = useStore();
  return useMemo(() => {
    const tasks = state.tasks ?? [];
    return (p: Project) => {
      const ts = tasks.filter((t) => t.projectId === p.id && !t.parentTaskId);
      const done = ts.filter((t) => t.done).length;
      const open = ts.filter((t) => !t.done);
      const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const next = [...open].sort((a, b) => {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        if (ad !== bd) return ad - bd;
        return (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3);
      })[0];
      const lastTouched = ts
        .map((t: any) => t.updatedAt || t.createdAt)
        .filter(Boolean)
        .sort()
        .pop();
      return {
        total: ts.length,
        done,
        open: open.length,
        pct: ts.length ? Math.round((done / ts.length) * 100) : 0,
        next,
        nextDue: open.map((t) => t.dueDate).filter((d): d is string => !!d).sort()[0],
        lastTouched: lastTouched ?? p.createdAt,
      };
    };
  }, [state.tasks]);
}

function StageChip({ stage, size = "md" }: { stage: ProjectStage; size?: "sm" | "md" }) {
  const m = STAGE_META[stage];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      )}
      style={{ background: `hsl(${m.chipBg})`, color: `hsl(${m.chipFg})` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${m.dot})` }} />
      {m.label}
    </span>
  );
}

function HealthPill({ health }: { health: ProjectHealth }) {
  const m = HEALTH_META[health];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide"
      style={{ background: `hsl(${m.bg})`, color: `hsl(${m.fg})` }}
    >
      <span className="h-1 w-1 rounded-full" style={{ background: `hsl(${m.ring})` }} />
      {m.label}
    </span>
  );
}

function HeroFocusCard({ focus, metrics }: { focus?: Project; metrics: ReturnType<typeof useProjectMetrics> }) {
  if (!focus) {
    return (
      <div
        className="relative overflow-hidden rounded-3xl border p-8"
        style={{ background: `linear-gradient(135deg, hsl(${STUDIO.sage} / 0.35), hsl(${STUDIO.cream}))`, borderColor: `hsl(${STUDIO.sageDeep} / 0.15)` }}
      >
        <div className="text-xs uppercase tracking-[0.2em]" style={{ color: `hsl(${STUDIO.plumText})` }}>
          Focus This Week
        </div>
        <h2 className="mt-3 font-display text-2xl">Plant your first project</h2>
        <p className="mt-2 text-sm text-muted-foreground">Capture an idea below and watch it grow.</p>
      </div>
    );
  }
  const m = metrics(focus);
  return (
    <div
      className="relative overflow-hidden rounded-3xl border"
      style={{ borderColor: `hsl(${STUDIO.sageDeep} / 0.12)` }}
    >
      <ProjectCoverArt seed={focus.id} coverUrl={focus.coverUrl} className="absolute inset-0" />
      <div
        className="relative p-6 md:p-8"
        style={{ background: `linear-gradient(115deg, hsl(${STUDIO.cream} / 0.92) 35%, hsl(${STUDIO.cream} / 0.35) 100%)` }}
      >
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em]" style={{ color: `hsl(${STUDIO.plumText})` }}>
          Focus This Week <Sparkles className="h-3.5 w-3.5" style={{ color: `hsl(${STUDIO.gold})` }} />
        </div>
        <h2 className="mt-3 font-display text-3xl leading-tight">{focus.name}</h2>
        <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{m.pct}% complete</span>
          <StageChip stage={stageOf(focus.stage)} size="sm" />
        </div>
        <div className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full" style={{ background: `hsl(${STUDIO.sageDeep} / 0.12)` }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${m.pct}%`, background: `hsl(${STUDIO.sageDeep})` }} />
        </div>
        {m.next && (
          <div className="mt-5 max-w-md">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Next up</div>
            <div className="mt-1 flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: `hsl(${STUDIO.plum})` }} />
              <span className="leading-snug">{m.next.title}</span>
            </div>
          </div>
        )}
        <Link to={`/projects/${focus.id}`}>
          <Button
            size="lg"
            className="mt-6 h-12 rounded-2xl px-6 text-sm shadow-md hover:opacity-95"
            style={{ background: `hsl(${STUDIO.plum})`, color: "hsl(40 50% 98%)" }}
          >
            Continue Project <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function HeroStatTile({ icon: Icon, value, label, tone }: { icon: any; value: number; label: string; tone: string }) {
  return (
    <div
      className="rounded-2xl border bg-card/70 p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
      style={{ borderColor: `hsl(${STUDIO.sageDeep} / 0.1)` }}
    >
      <div
        className="grid h-10 w-10 place-items-center rounded-xl"
        style={{ background: `hsl(${tone} / 0.18)`, color: `hsl(${tone})` }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 font-display text-3xl leading-none">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function HeroStatsGrid({ projects, metrics }: { projects: Project[]; metrics: ReturnType<typeof useProjectMetrics> }) {
  const active = projects.filter((p) => p.status === "active").length;
  const inProgress = projects.filter((p) => stageOf(p.stage) === "building").length;
  const launching = projects.filter((p) => stageOf(p.stage) === "launching" || metrics(p).pct >= 90).length;
  const onHold = projects.filter((p) => p.status === "paused" || healthOf(p.health) === "waiting").length;
  return (
    <div className="grid grid-cols-2 gap-3">
      <HeroStatTile icon={Folder} value={active} label="Active Projects" tone={STUDIO.sageDeep} />
      <HeroStatTile icon={Leaf}   value={inProgress} label="In Progress"  tone={STUDIO.blushDeep} />
      <HeroStatTile icon={Rocket} value={launching}  label="Ready to Launch" tone={STUDIO.plum} />
      <HeroStatTile icon={Pause}  value={onHold}     label="On Hold" tone={STUDIO.gold} />
    </div>
  );
}

function QuickChip({
  icon: Icon, label, tone, render, onClick,
}: { icon: any; label: string; tone: string; render?: (close: () => void) => React.ReactNode; onClick?: () => void }) {
  const [open, setOpen] = useState(false);
  const inner = (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 hover:shadow-sm"
      style={{ borderColor: `hsl(${tone} / 0.35)`, color: `hsl(${tone})` }}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
  if (!render) return inner;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{inner}</PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">{render(() => setOpen(false))}</PopoverContent>
    </Popover>
  );
}

function CapturePopover({ placeholder, onSubmit, disabled }: { placeholder: string; onSubmit: (v: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (value.trim()) { onSubmit(value.trim()); setValue(""); } }}
      className="space-y-2"
    >
      <Input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
      <Button type="submit" size="sm" className="w-full" disabled={disabled || !value.trim()}>Capture</Button>
    </form>
  );
}

function QuickCapture({ onCaptureIdea, defaultArea }: { onCaptureIdea: (title: string) => void; defaultArea: string }) {
  const { addProject } = useStore();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border bg-card/60 p-4 sm:flex-row sm:items-center"
      style={{ borderColor: `hsl(${STUDIO.sageDeep} / 0.12)` }}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" style={{ color: `hsl(${STUDIO.gold})` }} /> Quick Capture
      </div>
      <div className="flex flex-1 flex-wrap gap-2">
        <QuickChip
          icon={Lightbulb} label="New Idea" tone={STUDIO.gold}
          render={(close) => (
            <CapturePopover placeholder="What's the idea?" onSubmit={(v) => { onCaptureIdea(v); close(); }} />
          )}
        />
        <QuickChip icon={CheckSquare} label="New Task" tone={STUDIO.sageDeep} onClick={() => navigate("/inbox?capture=task")} />
        <QuickChip icon={FileText} label="New Note" tone={STUDIO.ink} onClick={() => navigate("/notes?new=1")} />
        <QuickChip
          icon={Paperclip} label="New Project" tone={STUDIO.plum}
          render={(close) => (
            <CapturePopover
              placeholder="Project name…"
              onSubmit={async (v) => {
                setBusy(true);
                const created = await addProject({ name: v, areaName: defaultArea });
                setBusy(false);
                if (created) {
                  toast.success(`Project "${created.name}" created`);
                  navigate(`/projects/${created.id}`);
                }
                close();
              }}
              disabled={busy}
            />
          )}
        />
        <QuickChip icon={Heart} label="Inspiration" tone={STUDIO.blushDeep} onClick={() => navigate("/notes?new=1&kind=inspiration")} />
      </div>
    </div>
  );
}

function ProjectCard({ p, metrics }: { p: Project; metrics: ReturnType<typeof useProjectMetrics> }) {
  const m = metrics(p);
  const Icon = getAreaIcon(p.icon);
  return (
    <Link
      to={`/projects/${p.id}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border bg-card/70 transition hover:-translate-y-1 hover:shadow-lg"
      style={{ borderColor: `hsl(${STUDIO.sageDeep} / 0.1)` }}
    >
      <div className="relative h-32 w-full overflow-hidden">
        <ProjectCoverArt seed={p.id} coverUrl={p.coverUrl} className="absolute inset-0" />
        <div className="absolute right-3 top-3"><HealthPill health={healthOf(p.health)} /></div>
        <div
          className="absolute -bottom-4 left-4 grid h-10 w-10 place-items-center rounded-xl border bg-background shadow-sm"
          style={{ borderColor: `hsl(${STUDIO.sageDeep} / 0.15)`, color: p.color ?? `hsl(${STUDIO.plum})` }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 pt-6">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-tight">{p.name}</h3>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{m.pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: `hsl(${STUDIO.sageDeep} / 0.12)` }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${m.pct}%`, background: `hsl(${STUDIO.sageDeep})` }} />
        </div>
        <div className="text-xs text-muted-foreground">
          {m.open > 0 ? `${m.open} task${m.open === 1 ? "" : "s"} remaining` : "All caught up"}
        </div>
        {m.next && (
          <div className="line-clamp-2 rounded-lg bg-muted/40 px-2.5 py-1.5 text-[11px] text-foreground/80">
            Next: {m.next.title}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-1">
          <StageChip stage={stageOf(p.stage)} size="sm" />
          {p.areaName && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.areaName}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProjectsListView({ projects, metrics }: { projects: Project[]; metrics: ReturnType<typeof useProjectMetrics> }) {
  return (
    <div className="overflow-hidden rounded-3xl border bg-card/60" style={{ borderColor: `hsl(${STUDIO.sageDeep} / 0.12)` }}>
      <div className="grid grid-cols-[1.5fr_8rem_7rem_8rem_4rem] gap-3 border-b px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" style={{ borderColor: `hsl(${STUDIO.sageDeep} / 0.1)` }}>
        <div>Project</div><div>Stage</div><div>Health</div><div>Next due</div><div className="text-right">%</div>
      </div>
      {projects.map((p) => {
        const m = metrics(p);
        const Icon = getAreaIcon(p.icon);
        return (
          <Link
            key={p.id}
            to={`/projects/${p.id}`}
            className="grid grid-cols-[1.5fr_8rem_7rem_8rem_4rem] items-center gap-3 border-b px-5 py-3 transition last:border-b-0 hover:bg-muted/30"
            style={{ borderColor: `hsl(${STUDIO.sageDeep} / 0.08)` }}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <Icon className="h-4 w-4 shrink-0" style={{ color: p.color ?? `hsl(${STUDIO.plum})` }} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">{m.open} open · {m.total} total</div>
              </div>
            </div>
            <div><StageChip stage={stageOf(p.stage)} size="sm" /></div>
            <div><HealthPill health={healthOf(p.health)} /></div>
            <div className="text-xs text-muted-foreground">{m.nextDue ? formatRelativeDate(m.nextDue) : "—"}</div>
            <div className="text-right text-xs tabular-nums">{m.pct}%</div>
          </Link>
        );
      })}
    </div>
  );
}

function ProjectsGalleryView({ projects }: { projects: Project[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {projects.map((p) => (
        <Link
          key={p.id}
          to={`/projects/${p.id}`}
          className="group relative aspect-[4/5] overflow-hidden rounded-3xl border transition hover:-translate-y-1 hover:shadow-lg"
          style={{ borderColor: `hsl(${STUDIO.sageDeep} / 0.1)` }}
        >
          <ProjectCoverArt seed={p.id} coverUrl={p.coverUrl} className="absolute inset-0 scale-105 transition group-hover:scale-110" />
          <div className="absolute inset-x-0 bottom-0 p-3" style={{ background: `linear-gradient(0deg, hsl(${STUDIO.ink} / 0.55), transparent)` }}>
            <div className="font-display text-base leading-tight text-white drop-shadow">{p.name}</div>
            <div className="mt-1 flex items-center gap-1.5"><StageChip stage={stageOf(p.stage)} size="sm" /></div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Shelf({ title, icon: Icon, tone, children, action }: { title: string; icon: any; tone: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl border bg-card/70 p-4" style={{ borderColor: `hsl(${STUDIO.sageDeep} / 0.1)` }}>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `hsl(${tone} / 0.18)`, color: `hsl(${tone})` }}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {action}
      </header>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  );
}

function IdeasInboxShelf() {
  const { ideas, add, remove } = useProjectIdeas();
  const [draft, setDraft] = useState("");
  return (
    <Shelf title="Ideas Inbox" icon={Lightbulb} tone={STUDIO.gold}>
      {ideas.slice(0, 5).map((i) => (
        <button
          key={i.id}
          onClick={() => remove(i.id)}
          className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-muted/40"
          title="Click to dismiss"
        >
          <Lightbulb className="mt-0.5 h-3 w-3 shrink-0" style={{ color: `hsl(${STUDIO.gold})` }} />
          <span className="flex-1 leading-snug">{i.title}</span>
          <span className="text-[10px] text-muted-foreground">{formatRelativeDate(i.createdAt)}</span>
        </button>
      ))}
      {ideas.length === 0 && (
        <div className="rounded-lg border border-dashed px-3 py-4 text-center text-[11px] text-muted-foreground" style={{ borderColor: `hsl(${STUDIO.gold} / 0.3)` }}>
          No ideas yet — capture one below.
        </div>
      )}
      <form
        onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { add(draft.trim()); setDraft(""); } }}
        className="mt-1 flex items-center gap-1.5"
      >
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Capture a new idea…" className="h-8 text-xs" />
        <Button type="submit" size="icon" variant="ghost" className="h-8 w-8 shrink-0" disabled={!draft.trim()}><Plus className="h-4 w-4" /></Button>
      </form>
    </Shelf>
  );
}

function RecentlyUpdatedShelf({ projects, metrics }: { projects: Project[]; metrics: ReturnType<typeof useProjectMetrics> }) {
  const items = useMemo(() => {
    return [...projects]
      .map((p) => ({ p, lastTouched: metrics(p).lastTouched }))
      .sort((a, b) => (b.lastTouched ?? "").localeCompare(a.lastTouched ?? ""))
      .slice(0, 5);
  }, [projects, metrics]);
  return (
    <Shelf title="Recently Updated" icon={Clock} tone={STUDIO.sageDeep}>
      {items.length === 0 && (
        <div className="rounded-lg border border-dashed px-3 py-4 text-center text-[11px] text-muted-foreground">Nothing recent.</div>
      )}
      {items.map(({ p, lastTouched }) => {
        const meta = STAGE_META[stageOf(p.stage)];
        return (
          <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-muted/40">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: `hsl(${meta.dot})` }} />
            <span className="flex-1 truncate">{p.name}</span>
            <span className="text-[10px] text-muted-foreground">{lastTouched ? formatRelativeDate(lastTouched) : "—"}</span>
          </Link>
        );
      })}
    </Shelf>
  );
}

function WaitingOnShelf({ projects }: { projects: Project[] }) {
  const items = projects.filter((p) => healthOf(p.health) === "waiting").slice(0, 5);
  return (
    <Shelf title="Waiting On" icon={Hourglass} tone={STUDIO.gold}>
      {items.length === 0 && (
        <div className="rounded-lg border border-dashed px-3 py-4 text-center text-[11px] text-muted-foreground">Nothing blocked — keep going.</div>
      )}
      {items.map((p) => (
        <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-muted/40">
          <span className="flex-1 truncate">{p.name}</span>
          <span className="truncate text-[10px] text-muted-foreground">{p.waitingOn || "Pending"}</span>
        </Link>
      ))}
    </Shelf>
  );
}

export default function ProjectsHub() {
  const { state, addProject } = useStore();
  const { atmosphere } = useAtmosphere();
  const projects = (state.projects ?? []).filter((p) => p.status !== "done");
  const metrics = useProjectMetrics();
  const ideasApi = useProjectIdeas();
  const navigate = useNavigate();

  const [view, setView] = useState<View>(() => {
    if (typeof window === "undefined") return "cards";
    return ((localStorage.getItem(VIEW_KEY) as View) ?? "cards");
  });
  const [stageFilter, setStageFilter] = useState<ProjectStage | "all">("all");
  const [healthFilter, setHealthFilter] = useState<ProjectHealth | "all">("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const setViewPersist = (v: View) => { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch {} };

  const filtered = useMemo(() => projects.filter((p) =>
    (stageFilter === "all" || stageOf(p.stage) === stageFilter)
    && (healthFilter === "all" || healthOf(p.health) === healthFilter)
    && (areaFilter === "all" || p.areaName === areaFilter)
  ), [projects, stageFilter, healthFilter, areaFilter]);

  const focus = useMemo(() => {
    if (!projects.length) return undefined;
    const fav = projects.find((p) => p.isFavorite);
    if (fav) return fav;
    return [...projects]
      .map((p) => ({ p, t: metrics(p).lastTouched }))
      .sort((a, b) => (b.t ?? "").localeCompare(a.t ?? ""))[0]?.p;
  }, [projects, metrics]);

  const handleIdeaToProject = async (title: string) => {
    const idea = await ideasApi.add(title);
    if (idea) toast.success("Idea captured");
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: `
          radial-gradient(70rem 36rem at 0% -10%, ${atmosphere.palette[0] ?? `hsl(${STUDIO.sage})`}33, transparent 60%),
          radial-gradient(60rem 34rem at 100% 0%, ${atmosphere.palette[3] ?? atmosphere.palette[1] ?? `hsl(${STUDIO.blush})`}33, transparent 60%),
          radial-gradient(50rem 30rem at 50% 100%, ${atmosphere.palette[4] ?? atmosphere.palette[2] ?? `hsl(${STUDIO.goldSoft})`}26, transparent 60%),
          hsl(${STUDIO.cream})
        `,
      }}
    >
      <div className="mx-auto w-full max-w-7xl space-y-8 p-4 md:p-8">
        <header
          className="relative overflow-hidden rounded-3xl border px-6 py-7 md:px-10 md:py-10"
          style={{
            borderColor: `hsl(${STUDIO.sageDeep} / 0.12)`,
            background: `linear-gradient(115deg, ${atmosphere.palette[0] ?? `hsl(${STUDIO.sage})`}26 0%, hsl(${STUDIO.cream} / 0.85) 55%, ${atmosphere.palette[3] ?? `hsl(${STUDIO.blush})`}26 100%)`,
          }}
        >
          <div className="text-[11px] uppercase tracking-[0.25em]" style={{ color: `hsl(${STUDIO.plumText})` }}>
            {greetingFor()} · CareFlow
          </div>
          <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
            Creative Projects <Sparkles className="inline h-5 w-5" style={{ color: `hsl(${STUDIO.gold})` }} />
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            A calm space for {projects.length} {projects.length === 1 ? "project" : "projects"} —
            turning ideas into impact, one small step at a time.
          </p>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
            style={{ background: `${atmosphere.palette[4] ?? atmosphere.palette[1] ?? `hsl(${STUDIO.gold})`}40` }}
          />
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <HeroFocusCard focus={focus} metrics={metrics} />
          <div className="flex flex-col gap-3">
            <HeroStatsGrid projects={projects} metrics={metrics} />
            <QuickCapture onCaptureIdea={handleIdeaToProject} defaultArea="Personal" />
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="h-7 w-1.5 rounded-full" style={{ background: `hsl(${STUDIO.sageDeep})` }} />
              <div>
                <h2 className="font-display text-2xl leading-none">Projects</h2>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">All your creative work</p>
              </div>
            </div>
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && setViewPersist(v as View)}
              className="rounded-2xl border bg-card/60 p-1"
              style={{ borderColor: `hsl(${STUDIO.sageDeep} / 0.15)` }}
            >
              <ToggleGroupItem value="cards" className="gap-1.5 rounded-xl px-3 py-1 text-xs data-[state=on]:bg-[hsl(330_30%_35%)] data-[state=on]:text-white">
                <LayoutGrid className="h-3.5 w-3.5" /> Cards
              </ToggleGroupItem>
              <ToggleGroupItem value="list" className="gap-1.5 rounded-xl px-3 py-1 text-xs data-[state=on]:bg-[hsl(330_30%_35%)] data-[state=on]:text-white">
                <ListIcon className="h-3.5 w-3.5" /> List
              </ToggleGroupItem>
              <ToggleGroupItem value="gallery" className="gap-1.5 rounded-xl px-3 py-1 text-xs data-[state=on]:bg-[hsl(330_30%_35%)] data-[state=on]:text-white">
                <Images className="h-3.5 w-3.5" /> Gallery
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {ALL_STAGES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStageFilter(s)}
                  className={cn("rounded-full border px-2.5 py-1 text-[11px] capitalize transition",
                    stageFilter === s ? "shadow-sm" : "opacity-70 hover:opacity-100")}
                  style={stageFilter === s
                    ? { background: `hsl(${STUDIO.plum})`, color: "white", borderColor: `hsl(${STUDIO.plum})` }
                    : { borderColor: `hsl(${STUDIO.sageDeep} / 0.2)`, background: "transparent" }}
                >
                  {s === "all" ? "All stages" : STAGE_META[s].label}
                </button>
              ))}
            </div>
            <div className="mx-2 h-4 w-px bg-border" />
            <div className="flex flex-wrap gap-1">
              {ALL_HEALTH.map((h) => (
                <button
                  key={h}
                  onClick={() => setHealthFilter(h)}
                  className={cn("rounded-full border px-2.5 py-1 text-[11px] capitalize transition",
                    healthFilter === h ? "shadow-sm" : "opacity-70 hover:opacity-100")}
                  style={healthFilter === h
                    ? { background: `hsl(${STUDIO.sageDeep})`, color: "white", borderColor: `hsl(${STUDIO.sageDeep})` }
                    : { borderColor: `hsl(${STUDIO.sageDeep} / 0.2)`, background: "transparent" }}
                >
                  {h === "all" ? "All health" : HEALTH_META[h].label}
                </button>
              ))}
            </div>
            <div className="mx-2 h-4 w-px bg-border" />
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="rounded-full border bg-transparent px-3 py-1 text-[11px]"
              style={{ borderColor: `hsl(${STUDIO.sageDeep} / 0.2)` }}
            >
              <option value="all">All areas</option>
              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed p-12 text-center"
                 style={{ borderColor: `hsl(${STUDIO.sageDeep} / 0.25)`, background: `hsl(${STUDIO.cream})` }}>
              <Leaf className="mx-auto h-8 w-8" style={{ color: `hsl(${STUDIO.sageDeep})` }} />
              <h3 className="mt-3 font-display text-xl">Plant your first project</h3>
              <p className="mt-1 text-sm text-muted-foreground">Capture an idea above, or create one directly.</p>
              <Button
                className="mt-4 rounded-2xl"
                style={{ background: `hsl(${STUDIO.plum})`, color: "white" }}
                onClick={async () => {
                  const created = await addProject({ name: "Untitled project", areaName: "Personal" });
                  if (created) navigate(`/projects/${created.id}`);
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> New Project
              </Button>
            </div>
          ) : view === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => <ProjectCard key={p.id} p={p} metrics={metrics} />)}
            </div>
          ) : view === "list" ? (
            <ProjectsListView projects={filtered} metrics={metrics} />
          ) : (
            <ProjectsGalleryView projects={filtered} />
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="h-7 w-1.5 rounded-full" style={{ background: `hsl(${STUDIO.gold})` }} />
            <div>
              <h2 className="font-display text-2xl leading-none">Studio Shelves</h2>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">Ideas, momentum, what's waiting</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <IdeasInboxShelf />
            <RecentlyUpdatedShelf projects={projects} metrics={metrics} />
            <WaitingOnShelf projects={projects} />
          </div>
        </section>
      </div>
    </div>
  );
}