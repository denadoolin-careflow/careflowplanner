/**
 * Project Hub — calm, visual single-project workspace.
 * Wraps the existing task management UI inside ClassicProjectView for the
 * Tasks tab so all the section/kanban/schedule logic is preserved.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  ArrowLeft, Sparkles, Search, Share2, Pencil, Plus, Star, Calendar,
  Users, CheckCircle2, Circle, ListChecks, FileText, Link2, Flame,
  Activity as ActivityIcon, ImagePlus, RefreshCw, ExternalLink, Lightbulb,
  Flag, ArrowRight, Wind, Moon, Flower2, Leaf, Cloud, Trash2,
} from "lucide-react";
import { format, parseISO, differenceInDays, isThisWeek } from "date-fns";
import { ProjectCoverArt } from "@/components/projects/hub/ProjectCoverArt";
import { STAGE_META, HEALTH_META, stageOf, healthOf, STUDIO, hsl } from "@/components/projects/hub/studio-tokens";
import ClassicProjectView from "@/components/projects/detail/ClassicProjectView";
import { LinkedNotesPanel } from "@/components/notes/LinkedNotesPanel";
import { ProjectJournalPanel } from "@/components/journal/ProjectJournalPanel";
import { MilestonesCard } from "@/components/projects/MilestonesCard";
import { ResourcesCard } from "@/components/projects/ResourcesCard";
import { useEntityNotes } from "@/lib/note-links";
import { useProjectIdeas } from "@/lib/project-ideas";
import { aiInvoke } from "@/lib/ai-invoke";
import { haptics } from "@/lib/haptics";
import type { Project, ProjectStage } from "@/lib/types";

/* ----------------------------- Atmospheres ----------------------------- */

type AtmosphereKey = "sage" | "moonlit" | "blossom" | "quiet" | "momentum";
const ATMOSPHERES: Record<AtmosphereKey, {
  label: string; icon: React.ComponentType<{ className?: string }>;
  gradient: string; accent: string; tint: string;
}> = {
  sage:     { label: "Sage Sanctuary", icon: Leaf,    gradient: `linear-gradient(135deg, ${hsl(STUDIO.sage, 0.55)}, ${hsl(STUDIO.cream)})`, accent: STUDIO.sageDeep, tint: STUDIO.sage },
  moonlit:  { label: "Moonlit Focus",  icon: Moon,    gradient: `linear-gradient(135deg, ${hsl(STUDIO.plumSoft)}, ${hsl(STUDIO.plum, 0.25)})`, accent: STUDIO.plum, tint: STUDIO.plumSoft },
  blossom:  { label: "Blossom",        icon: Flower2, gradient: `linear-gradient(135deg, ${hsl(STUDIO.blush)}, ${hsl(STUDIO.cream)})`, accent: STUDIO.blushDeep, tint: STUDIO.blush },
  quiet:    { label: "Quiet Morning",  icon: Cloud,   gradient: `linear-gradient(135deg, ${hsl(STUDIO.cream)}, ${hsl(STUDIO.creamDeep)})`, accent: STUDIO.ink, tint: STUDIO.creamDeep },
  momentum: { label: "Momentum",       icon: Flame,   gradient: `linear-gradient(135deg, ${hsl(STUDIO.gold, 0.5)}, ${hsl(STUDIO.blush)})`, accent: STUDIO.gold, tint: STUDIO.goldSoft },
};
const atmoOf = (k?: string): AtmosphereKey => (k && k in ATMOSPHERES) ? k as AtmosphereKey : "sage";

/* =========================================================================
   Page
========================================================================= */

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { state, updateProject } = useStore();
  const project = (state.projects ?? []).find(p => p.id === id);
  const [tab, setTab] = useState("overview");

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center text-sm text-muted-foreground">
        Project not found. <Link to="/projects" className="text-primary underline">Back to Projects</Link>
      </div>
    );
  }

  const atmo = ATMOSPHERES[atmoOf(project.atmosphere)];

  return (
    <div
      className="min-h-screen"
      style={{
        background: `radial-gradient(1200px 600px at 50% -10%, ${hsl(atmo.tint, 0.45)}, transparent 70%), hsl(var(--background))`,
      }}
    >
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
        <HubHeader project={project} onUpdate={(p) => updateProject(project.id, p)} />
        <ProjectHero project={project} atmo={atmo} onUpdate={(p) => updateProject(project.id, p)} />

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList
              className="h-11 gap-1 rounded-full border border-border/40 bg-card/80 p-1 shadow-sm backdrop-blur"
            >
              {[
                ["overview",  "Overview",  Sparkles],
                ["tasks",     "Tasks",     ListChecks],
                ["milestones","Milestones",Flag],
                ["notes",     "Notes",     FileText],
                ["resources", "Resources", Link2],
                ["files",     "Files",     ImagePlus],
                ["activity",  "Activity",  ActivityIcon],
              ].map(([v, label, I]: any) => (
                <TabsTrigger
                  key={v}
                  value={v}
                  className="h-9 gap-1.5 rounded-full px-4 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow"
                >
                  <I className="h-3.5 w-3.5" /> {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0 space-y-6">
            <OverviewDashboard project={project} atmo={atmo} onUpdate={(p) => updateProject(project.id, p)} />
          </TabsContent>

          <TabsContent value="tasks" className="mt-0">
            <SoftCard>
              <ClassicProjectView embedded projectId={project.id} />
            </SoftCard>
          </TabsContent>

          <TabsContent value="milestones" className="mt-0">
            <SoftCard><MilestonesCard project={project} /></SoftCard>
          </TabsContent>

          <TabsContent value="notes" className="mt-0 space-y-4">
            <SoftCard><LinkedNotesPanel entityType="project" entityId={project.id} contextTitle={project.name} /></SoftCard>
            <SoftCard><ProjectJournalPanel projectId={project.id} projectName={project.name} /></SoftCard>
          </TabsContent>

          <TabsContent value="resources" className="mt-0">
            <SoftCard><ResourcesCard project={project} /></SoftCard>
          </TabsContent>

          <TabsContent value="files" className="mt-0">
            <FilesGallery project={project} />
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <ActivityFeed project={project} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ----------------------------- Soft Card ----------------------------- */

function SoftCard({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border/40 bg-card/85 p-5 shadow-[0_2px_24px_-12px_rgba(0,0,0,0.12)] backdrop-blur",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

/* ----------------------------- Header ----------------------------- */

function HubHeader({ project, onUpdate }: { project: Project; onUpdate: (p: Partial<Project>) => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <header className="flex flex-wrap items-center gap-3">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card/70 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Projects
      </Link>

      <div className="flex flex-1 items-center gap-3 min-w-0">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-lg"
          style={{ background: hsl(STUDIO.goldSoft), color: hsl("40 60% 28%") }}
        >
          {project.icon ?? "🌱"}
        </span>
        {editing ? (
          <Input
            autoFocus
            value={project.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => { if (e.key === "Enter") setEditing(false); }}
            className="h-9 max-w-md text-lg font-semibold"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="truncate text-lg font-semibold tracking-tight hover:underline"
          >
            {project.name}
          </button>
        )}
      </div>

      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="Quick search">
        <Search className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost" size="icon"
        className={cn("h-9 w-9 rounded-full", project.isFavorite && "text-amber-400")}
        onClick={() => { onUpdate({ isFavorite: !project.isFavorite }); haptics.tap(); }}
        aria-label="Favorite"
      >
        <Star className={cn("h-4 w-4", project.isFavorite && "fill-current")} />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-1.5 rounded-full"
        onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success("Project link copied"); }}
      >
        <Share2 className="h-3.5 w-3.5" /> Share
      </Button>
      <Button
        size="sm"
        className="h-9 gap-1.5 rounded-full"
        style={{ background: hsl(STUDIO.plum), color: "white" }}
        onClick={() => setEditing(true)}
      >
        <Pencil className="h-3.5 w-3.5" /> Edit Project
      </Button>
    </header>
  );
}

/* ----------------------------- Hero ----------------------------- */

function ProjectHero({
  project, atmo, onUpdate,
}: { project: Project; atmo: typeof ATMOSPHERES[AtmosphereKey]; onUpdate: (p: Partial<Project>) => void }) {
  const { state } = useStore();
  const tasks = useMemo(() => state.tasks.filter(t => t.projectId === project.id && !t.parentTaskId), [state.tasks, project.id]);
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const remaining = total - done;
  const stage = stageOf(project.stage);
  const health = healthOf(project.health);
  const stageMeta = STAGE_META[stage];
  const healthMeta = HEALTH_META[health];

  const [focusEditing, setFocusEditing] = useState(false);
  const [focusDraft, setFocusDraft] = useState(project.focusThisWeek ?? "");

  const targetDate = project.targetDate ?? project.endDate ?? project.deadline;

  return (
    <SoftCard className="overflow-hidden p-0">
      <div className="grid gap-0 md:grid-cols-[1fr_320px]">
        <div className="p-6 md:p-8 space-y-5">
          <div className="flex items-start gap-4">
            <div
              className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-border/40 bg-background/80 text-3xl shadow-sm"
            >
              {project.icon ?? "🌿"}
            </div>
            <div className="min-w-0 flex-1">
              <Textarea
                value={project.notes ?? ""}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                placeholder="What is this project about? Why does it matter?"
                rows={2}
                className="resize-none border-0 bg-transparent p-0 text-sm text-muted-foreground focus-visible:ring-0"
              />

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Chip color={healthMeta.bg} fg={healthMeta.fg} ring={healthMeta.ring}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: hsl(healthMeta.ring) }} />
                  {healthMeta.label}
                </Chip>
                <Chip color={stageMeta.chipBg} fg={stageMeta.chipFg}>
                  <Leaf className="h-3 w-3" /> {stageMeta.label}
                </Chip>
                <AtmosphereChip current={atmoOf(project.atmosphere)} onPick={(k) => onUpdate({ atmosphere: k })} />
                <span className="ml-auto text-xs font-medium text-muted-foreground">{pct}% complete</span>
              </div>

              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${hsl(STUDIO.sageDeep)}, ${hsl(STUDIO.gold)})` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatTile icon={Users} label="Team" value="1" />
            <StatTile icon={CheckCircle2} label="Tasks remaining" value={String(remaining)} />
            <StatTile
              icon={Calendar}
              label="Target date"
              value={targetDate ? format(parseISO(targetDate), "MMM d") : "—"}
            />
          </div>

          <div
            className="flex items-start gap-3 rounded-2xl border border-border/40 p-4"
            style={{ background: hsl(STUDIO.goldSoft, 0.5) }}
          >
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" style={{ color: hsl("40 70% 35%") }} />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: hsl("40 70% 30%") }}>
                Focus this week
              </div>
              {focusEditing ? (
                <div className="mt-1 flex gap-2">
                  <Input
                    autoFocus
                    value={focusDraft}
                    onChange={(e) => setFocusDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { onUpdate({ focusThisWeek: focusDraft.trim() || undefined }); setFocusEditing(false); } }}
                    placeholder="One sentence describing this week's intent"
                    className="h-8 bg-background/80 text-sm"
                  />
                  <Button size="sm" className="h-8" onClick={() => { onUpdate({ focusThisWeek: focusDraft.trim() || undefined }); setFocusEditing(false); }}>
                    Save
                  </Button>
                </div>
              ) : (
                <p className="mt-1 text-sm text-foreground/80">
                  {project.focusThisWeek ?? "Set an intention for the week ahead."}
                </p>
              )}
            </div>
            {!focusEditing && (
              <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs" onClick={() => setFocusEditing(true)}>
                Update Focus
              </Button>
            )}
          </div>
        </div>

        <div className="relative min-h-[220px] md:min-h-full" style={{ background: atmo.gradient }}>
          <ProjectCoverArt seed={project.id} className="absolute inset-0 h-full w-full opacity-90" />
          <div className="absolute right-4 top-4 rounded-full bg-background/80 px-3 py-1 text-[10px] font-medium tracking-wider text-muted-foreground backdrop-blur">
            {atmo.label}
          </div>
        </div>
      </div>
    </SoftCard>
  );
}

function Chip({ children, color, fg, ring }: { children: React.ReactNode; color: string; fg: string; ring?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{ background: hsl(color), color: hsl(fg), boxShadow: ring ? `inset 0 0 0 1px ${hsl(ring, 0.3)}` : undefined }}
    >
      {children}
    </span>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-background/70 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function AtmosphereChip({ current, onPick }: { current: AtmosphereKey; onPick: (k: AtmosphereKey) => void }) {
  const Icon = ATMOSPHERES[current].icon;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-foreground/70 hover:bg-background"
        >
          <Icon className="h-3 w-3" /> {ATMOSPHERES[current].label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">
        <div className="grid gap-1">
          {(Object.keys(ATMOSPHERES) as AtmosphereKey[]).map((k) => {
            const A = ATMOSPHERES[k];
            const I = A.icon;
            return (
              <button
                key={k}
                type="button"
                onClick={() => onPick(k)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted",
                  current === k && "bg-muted",
                )}
              >
                <span className="grid h-6 w-6 place-items-center rounded-md" style={{ background: A.gradient }}>
                  <I className="h-3.5 w-3.5" />
                </span>
                {A.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ----------------------------- Overview ----------------------------- */

function OverviewDashboard({
  project, atmo, onUpdate,
}: { project: Project; atmo: typeof ATMOSPHERES[AtmosphereKey]; onUpdate: (p: Partial<Project>) => void }) {
  return (
    <>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5">
          <NextUpCard project={project} />
          <MilestonesPreview project={project} />
        </div>
        <div className="space-y-5">
          <ProgressRingCard project={project} />
          <ThisWeekCard project={project} />
        </div>
        <div className="space-y-5">
          <NotesPreviewCard project={project} />
          <ProjectLinksCard project={project} />
        </div>
      </div>

      <IdeasInboxStrip project={project} />

      <div className="grid gap-5 md:grid-cols-3">
        <EnergyCard project={project} />
        <AtmospherePanel project={project} onUpdate={onUpdate} />
        <NextBestStepCard project={project} />
      </div>
    </>
  );
}

function CardHeader({ icon: Icon, title, action }: { icon: React.ComponentType<{ className?: string }>; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" /> {title}
      </div>
      {action}
    </div>
  );
}

/* --- Next Up --- */
function NextUpCard({ project }: { project: Project }) {
  const { state, toggleTask } = useStore();
  const next = useMemo(() => {
    return state.tasks
      .filter(t => t.projectId === project.id && !t.done && !t.parentTaskId)
      .sort((a, b) => {
        const pa = a.dueDate ?? "9999-12-31";
        const pb = b.dueDate ?? "9999-12-31";
        return pa.localeCompare(pb);
      })[0];
  }, [state.tasks, project.id]);

  return (
    <SoftCard>
      <CardHeader icon={ArrowRight} title="Next Up" />
      {next ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => toggleTask(next.id)}
            className="flex w-full items-start gap-2 rounded-xl bg-background/60 p-3 text-left hover:bg-background"
          >
            <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{next.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                {next.dueDate && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{format(parseISO(next.dueDate), "MMM d")}</span>}
                {next.energy && <span className="rounded-full bg-muted px-1.5 py-0.5">⚡ {next.energy}</span>}
                {next.estMinutes && <span className="rounded-full bg-muted px-1.5 py-0.5">~{next.estMinutes}m</span>}
                {next.area && <span className="rounded-full bg-muted px-1.5 py-0.5">{next.area}</span>}
              </div>
            </div>
          </button>
        </div>
      ) : (
        <EmptyHint>All caught up. Add a task in the Tasks tab.</EmptyHint>
      )}
    </SoftCard>
  );
}

/* --- Milestones preview --- */
function MilestonesPreview({ project }: { project: Project }) {
  const { updateProject } = useStore();
  const milestones = project.milestones ?? [];
  const toggle = (mid: string) => {
    const next = milestones.map(m => m.id === mid ? { ...m, done: !m.done } : m);
    updateProject(project.id, { milestones: next });
  };
  return (
    <SoftCard>
      <CardHeader icon={Flag} title="Milestones" />
      {milestones.length === 0 ? (
        <EmptyHint>Map out the moments that matter most.</EmptyHint>
      ) : (
        <ul className="space-y-1.5">
          {milestones.slice(0, 6).map(m => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => toggle(m.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted/60"
              >
                {m.done
                  ? <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: hsl(STUDIO.sageDeep) }} />
                  : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className={cn("flex-1 truncate", m.done && "text-muted-foreground line-through")}>{m.title}</span>
                {m.date && <span className="text-[10px] text-muted-foreground">{format(parseISO(m.date), "MMM d")}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </SoftCard>
  );
}

/* --- Progress ring --- */
function ProgressRingCard({ project }: { project: Project }) {
  const { state } = useStore();
  const tasks = state.tasks.filter(t => t.projectId === project.id && !t.parentTaskId);
  const total = tasks.length;
  const completed = tasks.filter(t => t.done).length;
  const blocked = tasks.filter(t => !t.done && (t as any).status === "blocked").length;
  const inProgress = tasks.filter(t => !t.done && (t.dueDate || (t as any).status === "in_progress")).length;
  const notStarted = Math.max(0, total - completed - blocked - inProgress);
  const pct = total ? Math.round((completed / total) * 100) : 0;

  const r = 38;
  const c = 2 * Math.PI * r;
  const arc = (val: number) => (val / Math.max(1, total)) * c;

  return (
    <SoftCard>
      <CardHeader icon={Sparkles} title="Project Progress" />
      <div className="flex items-center gap-5">
        <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
          <DonutSeg r={r} c={c} offset={0}                       value={arc(completed)}  color={STUDIO.sageDeep} />
          <DonutSeg r={r} c={c} offset={arc(completed)}          value={arc(inProgress)} color={STUDIO.gold} />
          <DonutSeg r={r} c={c} offset={arc(completed + inProgress)} value={arc(notStarted)} color={STUDIO.creamDeep} />
          <DonutSeg r={r} c={c} offset={arc(completed + inProgress + notStarted)} value={arc(blocked)} color="0 60% 60%" />
        </svg>
        <div className="flex-1 space-y-1.5 text-xs">
          <Legend dot={STUDIO.sageDeep} label="Completed" value={completed} />
          <Legend dot={STUDIO.gold}     label="In Progress" value={inProgress} />
          <Legend dot={STUDIO.creamDeep} label="Not Started" value={notStarted} />
          <Legend dot="0 60% 60%"        label="Blocked" value={blocked} />
        </div>
      </div>
      <div className="mt-3 text-center text-2xl font-semibold">{pct}%</div>
    </SoftCard>
  );
}
function DonutSeg({ r, c, offset, value, color }: { r: number; c: number; offset: number; value: number; color: string }) {
  return (
    <circle
      cx="50" cy="50" r={r} fill="none"
      stroke={hsl(color)}
      strokeWidth="10"
      strokeDasharray={`${value} ${c - value}`}
      strokeDashoffset={-offset}
    />
  );
}
function Legend({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full" style={{ background: hsl(dot) }} />
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

/* --- This week --- */
function ThisWeekCard({ project }: { project: Project }) {
  const { state, toggleTask } = useStore();
  const items = useMemo(() => {
    return state.tasks.filter(t => t.projectId === project.id && !t.parentTaskId && t.dueDate && isThisWeek(parseISO(t.dueDate), { weekStartsOn: 1 }));
  }, [state.tasks, project.id]);
  const done = items.filter(i => i.done).length;
  return (
    <SoftCard>
      <CardHeader icon={Calendar} title="This Week" action={items.length > 0 ? <span className="text-[10px] text-muted-foreground">{done}/{items.length}</span> : null} />
      {items.length === 0 ? (
        <EmptyHint>Nothing scheduled for this week yet.</EmptyHint>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 6).map(t => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => toggleTask(t.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted/60"
              >
                {t.done
                  ? <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: hsl(STUDIO.sageDeep) }} />
                  : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className={cn("flex-1 truncate", t.done && "line-through text-muted-foreground")}>{t.title}</span>
                {t.dueDate && <span className="text-[10px] text-muted-foreground">{format(parseISO(t.dueDate), "EEE")}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </SoftCard>
  );
}

/* --- Notes preview --- */
function NotesPreviewCard({ project }: { project: Project }) {
  const nav = useNavigate();
  const { notes } = useEntityNotes("project", project.id);
  return (
    <SoftCard>
      <CardHeader icon={FileText} title="Notes" action={
        <button type="button" onClick={() => nav(`/notes`)} className="text-[10px] uppercase tracking-wider text-primary hover:underline">View all</button>
      } />
      {notes.length === 0 ? (
        <EmptyHint>Capture research, voice memos, and meeting notes here.</EmptyHint>
      ) : (
        <ul className="space-y-2">
          {notes.slice(0, 3).map(n => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => nav(`/notes/${n.id}`)}
                className="flex w-full items-start gap-2 rounded-lg p-2 text-left hover:bg-muted/60"
              >
                <FileText className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{n.title || "Untitled"}</div>
                  <div className="line-clamp-1 text-[11px] text-muted-foreground">{(n.body ?? "").replace(/[#>*_`]/g, "").slice(0, 80)}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </SoftCard>
  );
}

/* --- Project links --- */
const LINK_PROVIDERS: { match: RegExp; label: string; icon: string }[] = [
  { match: /figma\.com/i,   label: "Figma",   icon: "🎨" },
  { match: /notion\./i,     label: "Notion",  icon: "📓" },
  { match: /miro\.com/i,    label: "Miro",    icon: "🗺️" },
  { match: /docs\.google/i, label: "Docs",    icon: "📄" },
  { match: /lovable\./i,    label: "Lovable", icon: "💜" },
  { match: /github\.com/i,  label: "GitHub",  icon: "🐙" },
];
const detectProvider = (url: string) => LINK_PROVIDERS.find(p => p.match.test(url)) ?? { label: "Link", icon: "🔗" };

function ProjectLinksCard({ project }: { project: Project }) {
  const links = useMemo(() => {
    const text = `${project.notes ?? ""} ${project.aiOverview ?? ""}`;
    const matches = Array.from(text.matchAll(/https?:\/\/[^\s)]+/g)).map(m => m[0]);
    return Array.from(new Set(matches)).slice(0, 8);
  }, [project.notes, project.aiOverview]);

  return (
    <SoftCard>
      <CardHeader icon={Link2} title="Project Links" />
      {links.length === 0 ? (
        <EmptyHint>Paste links in the project description and they'll show up here.</EmptyHint>
      ) : (
        <ul className="space-y-1.5">
          {links.map((url) => {
            const p = detectProvider(url);
            return (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-muted/60"
                >
                  <span className="text-base leading-none">{p.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{p.label}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{url.replace(/^https?:\/\//, "")}</div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </SoftCard>
  );
}

/* --- Ideas inbox --- */
function IdeasInboxStrip({ project }: { project: Project }) {
  const { ideas, add, remove } = useProjectIdeas(project.id);
  const [draft, setDraft] = useState("");

  const submit = async () => {
    if (!draft.trim()) return;
    await add(draft.trim());
    setDraft("");
  };

  return (
    <SoftCard style={{ background: `linear-gradient(135deg, ${hsl(STUDIO.blush, 0.45)}, ${hsl(STUDIO.cream, 0.85)})` }}>
      <CardHeader
        icon={Lightbulb}
        title="Ideas Inbox"
        action={<span className="text-[10px] text-muted-foreground">{ideas.length} idea{ideas.length === 1 ? "" : "s"}</span>}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ideas.slice(0, 6).map(i => (
          <div key={i.id} className="group relative rounded-xl border border-border/30 bg-background/80 p-3 text-sm shadow-sm">
            <div className="flex items-start gap-1.5">
              <span>💡</span>
              <span className="flex-1">{i.title}</span>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">{format(parseISO(i.createdAt), "MMM d")}</div>
            <button
              type="button"
              onClick={() => remove(i.id)}
              className="absolute right-1.5 top-1.5 opacity-0 transition group-hover:opacity-100"
              aria-label="Remove idea"
            >
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        ))}
        <div className="rounded-xl border border-dashed border-border/40 bg-background/40 p-3">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="+ Capture an idea…"
            className="h-8 border-0 bg-transparent px-1 text-sm placeholder:text-muted-foreground/70 focus-visible:ring-0"
          />
        </div>
      </div>
    </SoftCard>
  );
}

/* --- Energy --- */
function EnergyCard({ project }: { project: Project }) {
  const { state } = useStore();
  const energies = state.tasks
    .filter(t => t.projectId === project.id && !t.done && t.energy)
    .map(t => ({ low: 1, medium: 2, high: 3 } as any)[String(t.energy)] ?? 2);
  const avg = energies.length ? energies.reduce((a, b) => a + b, 0) / energies.length : 2;
  const label = avg < 1.6 ? "Low" : avg < 2.4 ? "Medium" : "High";
  const action =
    label === "Low"    ? "Tidy up one tiny task." :
    label === "Medium" ? "Continue Planning." :
                         "Tackle the hardest task first.";
  return (
    <SoftCard>
      <CardHeader icon={Flame} title="Project Energy" />
      <div className="text-2xl font-semibold tracking-tight" style={{ color: hsl(STUDIO.plum) }}>{label}</div>
      <div className="mt-1 text-xs text-muted-foreground">Recommended action</div>
      <div className="mt-0.5 text-sm">{action}</div>
    </SoftCard>
  );
}

/* --- Atmosphere panel --- */
function AtmospherePanel({ project, onUpdate }: { project: Project; onUpdate: (p: Partial<Project>) => void }) {
  const current = atmoOf(project.atmosphere);
  return (
    <SoftCard>
      <CardHeader icon={Wind} title="Atmosphere" />
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(ATMOSPHERES) as AtmosphereKey[]).map((k) => {
          const A = ATMOSPHERES[k];
          const I = A.icon;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onUpdate({ atmosphere: k })}
              className={cn(
                "flex items-center gap-2 rounded-xl border border-border/40 p-2 text-left text-xs transition hover:shadow-sm",
                current === k && "ring-2 ring-primary/40",
              )}
              style={{ background: A.gradient }}
            >
              <span className="grid h-6 w-6 place-items-center rounded-md bg-background/70">
                <I className="h-3.5 w-3.5" />
              </span>
              <span className="truncate font-medium">{A.label}</span>
            </button>
          );
        })}
      </div>
    </SoftCard>
  );
}

/* --- Next best step (AI) --- */
function NextBestStepCard({ project }: { project: Project }) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const { data, error } = await aiInvoke("ai-project-overview", {
        body: { project_id: project.id, mode: "next_step" },
      });
      if (error) throw error;
      const text = (data?.next_step || data?.suggestion || data?.overview || "").toString().split("\n")[0].trim();
      setSuggestion(text || "Pick the smallest task that unblocks the biggest one.");
    } catch (e: any) {
      setSuggestion("Pick the smallest task that unblocks the biggest one.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SoftCard style={{ background: `linear-gradient(135deg, ${hsl(STUDIO.plumSoft)}, ${hsl(STUDIO.cream, 0.9)})` }}>
      <CardHeader
        icon={Sparkles}
        title="Next Best Step"
        action={
          <Button size="sm" variant="ghost" className="h-7 gap-1 rounded-full text-[10px]" onClick={run} disabled={busy}>
            <RefreshCw className={cn("h-3 w-3", busy && "animate-spin")} /> {suggestion ? "Refresh" : "Suggest"}
          </Button>
        }
      />
      <p className="text-sm leading-relaxed text-foreground/85">
        {suggestion ?? "Tap Suggest for a gentle nudge on what to focus on next."}
      </p>
    </SoftCard>
  );
}

/* ----------------------------- Files / Activity ----------------------------- */

function FilesGallery({ project }: { project: Project }) {
  const { notes } = useEntityNotes("project", project.id);
  const withImages = notes.filter(n => /!\[[^\]]*\]\(([^)]+)\)/.test(n.body ?? ""));
  const images: { src: string; title: string; noteId: string }[] = [];
  for (const n of withImages) {
    const matches = Array.from((n.body ?? "").matchAll(/!\[[^\]]*\]\(([^)]+)\)/g));
    for (const m of matches) images.push({ src: m[1], title: n.title || "Untitled", noteId: n.id });
  }
  return (
    <SoftCard>
      <CardHeader icon={ImagePlus} title="Files & Imagery" />
      {images.length === 0 ? (
        <EmptyHint>Files from linked notes will appear here as a gallery.</EmptyHint>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.slice(0, 24).map((img, i) => (
            <a
              key={i}
              href={img.src}
              target="_blank"
              rel="noreferrer"
              className="group relative aspect-square overflow-hidden rounded-2xl border border-border/40 bg-muted"
            >
              <img src={img.src} alt={img.title} className="h-full w-full object-cover transition group-hover:scale-105" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                {img.title}
              </div>
            </a>
          ))}
        </div>
      )}
    </SoftCard>
  );
}

function ActivityFeed({ project }: { project: Project }) {
  const { state } = useStore();
  type Event = { ts: string; label: React.ReactNode; icon: React.ComponentType<{ className?: string }>; tone: string };
  const events: Event[] = [];

  for (const t of state.tasks) {
    if (t.projectId !== project.id) continue;
    if (t.done && t.updatedAt) events.push({ ts: t.updatedAt, icon: CheckCircle2, tone: STUDIO.sageDeep, label: <>Task completed · <span className="font-medium">{t.title}</span></> });
    else if (t.createdAt) events.push({ ts: t.createdAt, icon: Plus, tone: STUDIO.gold, label: <>Task added · <span className="font-medium">{t.title}</span></> });
  }
  for (const m of project.milestones ?? []) {
    if (m.done && m.date) events.push({ ts: m.date, icon: Flag, tone: STUDIO.plum, label: <>Milestone reached · <span className="font-medium">{m.title}</span></> });
  }

  events.sort((a, b) => b.ts.localeCompare(a.ts));

  return (
    <SoftCard>
      <CardHeader icon={ActivityIcon} title="Activity" />
      {events.length === 0 ? (
        <EmptyHint>Project history will show up here as you work.</EmptyHint>
      ) : (
        <ul className="space-y-3">
          {events.slice(0, 30).map((e, i) => {
            const Icon = e.icon;
            const date = (() => { try { return format(parseISO(e.ts), "MMM d, h:mm a"); } catch { return e.ts; } })();
            return (
              <li key={i} className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full" style={{ background: hsl(e.tone, 0.18), color: hsl(e.tone) }}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{e.label}</div>
                  <div className="text-[10px] text-muted-foreground">{date}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SoftCard>
  );
}

/* ----------------------------- Empty hint ----------------------------- */

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border/40 p-4 text-center text-xs text-muted-foreground">{children}</div>;
}

type ViewMode = "list" | "kanban" | "schedule";
const NO_SECTION = "__no_section__";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const {
    state, addTask, updateTask, updateProject, deleteProject,
    addSection, updateSection, deleteSection, reorderSections,
  } = useStore();
  const project = (state.projects ?? []).find(p => p.id === id);
  const [view, setView] = useState<ViewMode>("list");
  const [prefs, setPrefs] = useTaskListPrefs(`project:${id}`);
  const [taskFilter, setTaskFilter] = useState<"all" | "active" | "completed">("active");
  const [kanbanGroup, setKanbanGroup] = useState<ProjectKanbanGroup>(() => {
    try { return (localStorage.getItem(`project:${id}:kanbanGroup`) as ProjectKanbanGroup) || "section"; }
    catch { return "section"; }
  });
  const setKanbanGroupPersist = (g: ProjectKanbanGroup) => {
    setKanbanGroup(g);
    try { localStorage.setItem(`project:${id}:kanbanGroup`, g); } catch {}
  };
  const [kanbanColor, setKanbanColor] = useState<KanbanColorBy>(() => {
    try { return (localStorage.getItem(`project:${id}:kanbanColor`) as KanbanColorBy) || "area"; }
    catch { return "area"; }
  });
  const setKanbanColorPersist = (c: KanbanColorBy) => {
    setKanbanColor(c);
    try { localStorage.setItem(`project:${id}:kanbanColor`, c); } catch {}
  };

  const allTasks = useMemo(
    () => state.tasks.filter(t => t.projectId === id && !t.parentTaskId),
    [state.tasks, id],
  );
  const total = allTasks.length;
  const done = allTasks.filter(t => t.done).length;
  const activeCount = total - done;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const visibleTasks = useMemo(() => {
    if (taskFilter === "active") return allTasks.filter(t => !t.done);
    if (taskFilter === "completed") return allTasks.filter(t => t.done);
    return allTasks;
  }, [allTasks, taskFilter]);

  const sections = useMemo(
    () => (state.projectSections ?? [])
      .filter(s => s.projectId === id)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    [state.projectSections, id],
  );

  const [newTitle, setNewTitle] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center text-sm text-muted-foreground">
        Project not found. <Link to="/projects" className="text-primary underline">Back to Projects</Link>
      </div>
    );
  }

  const handleAddSection = async () => {
    const sec = await addSection({ projectId: project.id, name: "New section" });
    if (sec) toast.success("Section added");
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
      <Link to="/projects" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All projects
      </Link>

      <header className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/40 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <Input
              value={project.name}
              onChange={(e) => updateProject(project.id, { name: e.target.value })}
              className="border-0 bg-transparent px-0 text-2xl font-semibold focus-visible:ring-0"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{project.areaName ?? "No area"}</span>
              <span>·</span>
              <span>{done}/{total} done</span>
              <span>·</span>
              <span>{sections.length} section{sections.length === 1 ? "" : "s"}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={project.isFavorite ? "Unfavorite" : "Favorite"}
            onClick={() => { updateProject(project.id, { isFavorite: !project.isFavorite }); haptics.tap(); }}
            className={cn(project.isFavorite ? "text-amber-400" : "text-muted-foreground")}
          >
            <Star className={cn("h-4 w-4", project.isFavorite && "fill-current")} />
          </Button>
          <Select value={project.status} onValueChange={(v) => updateProject(project.id, { status: v as any })}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["active","paused","someday","done"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={async () => { await deleteProject(project.id); toast.success("Project removed"); history.back(); }}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        <Progress value={pct} className="h-1.5" />
        <Textarea
          value={project.notes ?? ""}
          placeholder="Notes about this project…"
          onChange={(e) => updateProject(project.id, { notes: e.target.value })}
          className="resize-none border-0 bg-transparent text-sm focus-visible:ring-0"
          rows={2}
        />
      </header>

      <GoalsHabitsStrip project={project} />
      <div className="grid gap-4 lg:grid-cols-2">
        <TimelineCard project={project} doneCount={done} totalCount={total} />
        <MilestonesCard project={project} />
      </div>
      <ResourcesCard project={project} />
      <AIOverviewCard project={project} />
      <NotesGallery project={project} />

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as ViewMode)}
          className="rounded-lg border border-border/60 bg-card/40 p-0.5"
        >
          <ToggleGroupItem value="list" className="h-8 gap-1.5 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <LayoutList className="h-3.5 w-3.5" /> List
          </ToggleGroupItem>
          <ToggleGroupItem value="kanban" className="h-8 gap-1.5 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <Columns className="h-3.5 w-3.5" /> Kanban
          </ToggleGroupItem>
          <ToggleGroupItem value="schedule" className="h-8 gap-1.5 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> Schedule
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScheduleOpen(true)}
            className="h-8 gap-1.5 rounded-lg text-xs"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Schedule
          </Button>
          <ToggleGroup
            type="single"
            value={taskFilter}
            onValueChange={(v) => v && setTaskFilter(v as "all" | "active" | "completed")}
            className="rounded-lg border border-border/60 bg-card/40 p-0.5"
          >
            <ToggleGroupItem value="active" className="h-8 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              Active <span className="ml-1 opacity-70">{activeCount}</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="completed" className="h-8 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              Done <span className="ml-1 opacity-70">{done}</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="all" className="h-8 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              All <span className="ml-1 opacity-70">{total}</span>
            </ToggleGroupItem>
          </ToggleGroup>
          {view === "list" && <TaskListControls prefs={prefs} onChange={setPrefs} />}
          {view === "kanban" && <ProjectKanbanGroupSelect value={kanbanGroup} onChange={setKanbanGroupPersist} />}
          {view === "kanban" && <KanbanColorBySelect value={kanbanColor} onChange={setKanbanColorPersist} />}
          <ViewOptionsMenu view={(view === "kanban" ? "board" : view) as TaskViewType} />
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-3 space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Add a task to this project…"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && newTitle.trim()) {
                await addTask({ title: newTitle.trim(), area: (project.areaName as any) ?? "Personal", projectId: project.id });
                setNewTitle("");
              }
            }}
          />
          <Button
            onClick={async () => {
              if (!newTitle.trim()) return;
              await addTask({ title: newTitle.trim(), area: (project.areaName as any) ?? "Personal", projectId: project.id });
              setNewTitle("");
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
          {view === "list" && (
            <Button variant="outline" onClick={handleAddSection} className="gap-1.5">
              <Plus className="h-4 w-4" /> Section
            </Button>
          )}
        </div>

        {view === "kanban" && (
          <ProjectKanbanBoard tasks={visibleTasks} projectId={project.id} group={kanbanGroup} colorBy={kanbanColor} />
        )}
        {view === "schedule" && <ScheduleView tasks={visibleTasks} />}
        {view === "list" && (
          <ProjectListView
            projectId={project.id}
            tasks={visibleTasks}
            sections={sections}
            prefs={prefs}
            updateTask={updateTask}
            updateSection={updateSection}
            deleteSection={deleteSection}
            reorderSections={(ids) => reorderSections(project.id, ids)}
            addTaskToSection={async (sectionId, title) => {
              await addTask({
                title,
                area: (project.areaName as any) ?? "Personal",
                projectId: project.id,
                sectionId: sectionId === NO_SECTION ? undefined : sectionId,
              });
            }}
          />
        )}
      </div>

      {/* notes-as-gallery is rendered above; keep this for compact linked-notes management */}
      <LinkedNotesPanel entityType="project" entityId={project.id} contextTitle={project.name} compact />
      <ProjectProgressTimeline projectId={project.id} />
      <ProjectJournalPanel projectId={project.id} projectName={project.name} />
      <WhiteboardsPanel projectId={project.id} projectName={project.name} />

      <ProjectScheduleSidebar
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        tasks={allTasks}
        projectName={project.name}
      />
    </div>
  );
}

/* ---------------- Linked whiteboards ---------------- */
function WhiteboardsPanel({ projectId, projectName }: { projectId: string; projectName: string }) {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Whiteboard[] | null>(null);
  const refresh = () => listWhiteboardsForProject(projectId).then(setBoards).catch(() => setBoards([]));
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [projectId]);
  const create = async () => {
    const b = await createWhiteboard({ title: `${projectName} board`, projectId });
    navigate(`/whiteboards/${b.id}`);
  };
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <PenLine className="h-3.5 w-3.5 text-primary" /> Whiteboards
        </div>
        <Button size="sm" variant="ghost" onClick={create} className="h-7 gap-1 text-xs">
          <Plus className="h-3 w-3" /> New board
        </Button>
      </div>
      {boards == null ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : boards.length === 0 ? (
        <div className="text-xs text-muted-foreground">No boards linked to this project yet.</div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map(b => (
            <Link key={b.id} to={`/whiteboards/${b.id}`} className="rounded-xl border border-border/60 bg-background/60 p-3 transition hover:border-primary/40">
              <div className="truncate text-sm font-medium">{b.title}</div>
              <div className="text-[11px] text-muted-foreground">
                {b.data.nodes.length} note{b.data.nodes.length === 1 ? "" : "s"} · {b.data.edges.length} link{b.data.edges.length === 1 ? "" : "s"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Goals & Habits chip strip ---------------- */

function GoalsHabitsStrip({ project }: { project: any }) {
  const { state, updateProject } = useStore();
  const navigate = useNavigate();
  const goalIds: string[] = project.linkedGoalIds ?? [];
  const habitIds: string[] = project.linkedHabitIds ?? [];
  const goals = (state.goals ?? []).filter(g => goalIds.includes(g.id));
  const habits = (state.habits ?? []).filter(h => habitIds.includes(h.id));

  const toggleGoal = (gid: string) => {
    const next = goalIds.includes(gid) ? goalIds.filter(x => x !== gid) : [...goalIds, gid];
    updateProject(project.id, { linkedGoalIds: next });
    haptics.tap();
  };
  const toggleHabit = (hid: string) => {
    const next = habitIds.includes(hid) ? habitIds.filter(x => x !== hid) : [...habitIds, hid];
    updateProject(project.id, { linkedHabitIds: next });
    haptics.tap();
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <ChipRow
        icon={<Target className="h-3.5 w-3.5" />}
        label="Goals"
        chips={goals.map(g => ({ id: g.id, label: g.title, onClick: () => navigate("/goals"), onRemove: () => toggleGoal(g.id) }))}
        picker={
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-full text-xs"><Plus className="h-3 w-3" /> Link goal</Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2">
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {(state.goals ?? []).length === 0 && <div className="p-2 text-xs text-muted-foreground">No goals yet.</div>}
                {(state.goals ?? []).map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGoal(g.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted",
                      goalIds.includes(g.id) && "bg-primary/10",
                    )}
                  >
                    <span className="truncate">{g.title}</span>
                    {goalIds.includes(g.id) && <span className="text-[10px] text-primary">linked</span>}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        }
      />
      <ChipRow
        icon={<Repeat className="h-3.5 w-3.5" />}
        label="Habits"
        chips={habits.map(h => ({ id: h.id, label: h.title, onClick: () => navigate("/habits"), onRemove: () => toggleHabit(h.id) }))}
        picker={
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-full text-xs"><Plus className="h-3 w-3" /> Link habit</Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2">
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {(state.habits ?? []).length === 0 && <div className="p-2 text-xs text-muted-foreground">No habits yet.</div>}
                {(state.habits ?? []).map(h => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => toggleHabit(h.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted",
                      habitIds.includes(h.id) && "bg-primary/10",
                    )}
                  >
                    <span className="truncate">{h.title}</span>
                    {habitIds.includes(h.id) && <span className="text-[10px] text-primary">linked</span>}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        }
      />
    </div>
  );
}

function ChipRow({
  icon, label, chips, picker,
}: {
  icon: React.ReactNode;
  label: string;
  chips: { id: string; label: string; onClick: () => void; onRemove: () => void }[];
  picker: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {chips.length === 0 && <span className="text-xs text-muted-foreground/70">Nothing linked yet</span>}
        {chips.map(c => (
          <span key={c.id} className="group inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-xs">
            <button type="button" onClick={c.onClick} className="truncate max-w-[12rem]">{c.label}</button>
            <button type="button" onClick={c.onRemove} className="opacity-50 hover:opacity-100" aria-label="Unlink">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {picker}
      </div>
    </div>
  );
}

/* ---------------- AI overview card ---------------- */

function AIOverviewCard({ project }: { project: any }) {
  const { updateProject } = useStore();
  const [busy, setBusy] = useState<"overview" | "update" | null>(null);

  const run = async (mode: "overview" | "update") => {
    setBusy(mode);
    try {
      const { data, error } = await aiInvoke("ai-project-overview", {
        body: { project_id: project.id, mode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.overview) {
        updateProject(project.id, { aiOverview: data.overview, aiOverviewUpdatedAt: data.updated_at });
        haptics.success();
        toast.success(mode === "update" ? "Status update added" : "Overview generated");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const hasOverview = !!project.aiOverview;

  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Overview
          {project.aiOverviewUpdatedAt && (
            <span className="ml-1 text-[10px] normal-case tracking-normal text-muted-foreground/70">
              · {format(parseISO(project.aiOverviewUpdatedAt), "MMM d, h:mm a")}
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="outline" size="sm" className="h-7 gap-1 rounded-full text-xs"
            disabled={busy !== null}
            onClick={() => run("overview")}
          >
            <Sparkles className="h-3 w-3" /> {busy === "overview" ? "Generating…" : hasOverview ? "Regenerate" : "Generate overview"}
          </Button>
          {hasOverview && (
            <Button
              variant="outline" size="sm" className="h-7 gap-1 rounded-full text-xs"
              disabled={busy !== null}
              onClick={() => run("update")}
            >
              <RefreshCw className={cn("h-3 w-3", busy === "update" && "animate-spin")} /> {busy === "update" ? "Updating…" : "Add update"}
            </Button>
          )}
        </div>
      </div>
      {hasOverview ? (
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
          <NoteMarkdown body={project.aiOverview} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Generate a gentle, AI-written overview of this project — what it's about, what's progressing, and what's next.
        </p>
      )}
    </div>
  );
}

/* ---------------- Notes gallery (markdown cards) ---------------- */

function NotesGallery({ project }: { project: any }) {
  const navigate = useNavigate();
  const { notes, reload } = useEntityNotes("project", project.id);

  const createAndOpen = async () => {
    try {
      const n = await createNote({ title: project.name });
      await linkNote(n.id, "project", project.id);
      await reload();
      navigate(`/notes/${n.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create note");
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <FileText className="h-3.5 w-3.5" /> Notes
          {notes.length > 0 && <span className="rounded-full bg-muted px-1.5 py-0 text-[10px] normal-case tracking-normal">{notes.length}</span>}
        </div>
        <NotePicker
          excludeIds={notes.map(n => n.id)}
          onPick={async (n) => { await linkNote(n.id, "project", project.id); await reload(); }}
          onCreateNew={createAndOpen}
        />
      </div>

      {notes.length === 0 ? (
        <button
          type="button"
          onClick={createAndOpen}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 px-4 py-8 text-sm text-muted-foreground hover:bg-muted/30"
        >
          <Plus className="h-4 w-4" /> Add the first note
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map(n => (
            <button
              key={n.id}
              type="button"
              onClick={() => navigate(`/notes/${n.id}`)}
              className="group flex h-44 flex-col gap-1 overflow-hidden rounded-xl border border-border/60 bg-background/60 p-3 text-left transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="truncate text-sm font-semibold">{n.title || "Untitled"}</div>
              <div className="prose prose-xs dark:prose-invert flex-1 overflow-hidden text-[11px] leading-snug text-muted-foreground">
                <NoteMarkdown body={(n.body ?? "").slice(0, 400)} />
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={createAndOpen}
            className="flex h-44 items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground hover:bg-muted/30"
          >
            <Plus className="h-4 w-4" /> New note
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- List view with sections + DnD ---------------- */

type Section = { id: string; name: string; color?: string; sortOrder: number; projectId: string; createdAt: string };

function ProjectListView({
  projectId, tasks, sections, prefs, updateTask, updateSection, deleteSection, reorderSections, addTaskToSection,
}: {
  projectId: string;
  tasks: Task[];
  sections: Section[];
  prefs: ReturnType<typeof useTaskListPrefs>[0];
  updateTask: (id: string, p: Partial<Task>) => Promise<void>;
  updateSection: (id: string, p: Partial<Section>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  reorderSections: (ids: string[]) => Promise<void>;
  addTaskToSection: (sectionId: string, title: string) => Promise<void>;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Filter + sort tasks once.
  const filtered = useMemo(() => sortTasks(applyFilters(tasks, prefs.filter), prefs.sort, prefs.sortDir), [tasks, prefs]);

  // If grouping isn't "none" or "project", show grouped buckets instead of sections.
  const useSectionLayout = prefs.group === "none" || prefs.group === "project";

  if (!useSectionLayout) {
    const groups = groupTasks(filtered, prefs.group, []);
    return (
      <div className="space-y-4">
        {groups.map(g => (
          <section key={g.key}>
            {g.label && (
              <div className="mb-1.5 flex items-center gap-2 px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</span>
                <span className="text-[10px] text-muted-foreground/70">{g.tasks.length}</span>
              </div>
            )}
            <div className="space-y-1">
              {g.tasks.map(t => <TaskRow key={t.id} task={t} showArea={false} />)}
            </div>
          </section>
        ))}
        {filtered.length === 0 && <EmptyState />}
      </div>
    );
  }

  // Section layout: include a "No section" bucket at top.
  const sectionList: Section[] = [
    { id: NO_SECTION, name: "No section", color: undefined, sortOrder: -1, projectId, createdAt: "" },
    ...sections,
  ];

  const tasksBySection = new Map<string, Task[]>();
  for (const s of sectionList) tasksBySection.set(s.id, []);
  for (const t of filtered) {
    const key = t.sectionId && tasksBySection.has(t.sectionId) ? t.sectionId : NO_SECTION;
    tasksBySection.get(key)!.push(t);
  }

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const aid = String(active.id);
    const oid = String(over.id);

    // Section reorder
    if (aid.startsWith("section:") && oid.startsWith("section:")) {
      const ids = sections.map(s => s.id);
      const from = ids.indexOf(aid.slice(8));
      const to = ids.indexOf(oid.slice(8));
      if (from < 0 || to < 0 || from === to) return;
      const next = arrayMove(ids, from, to);
      await reorderSections(next);
      return;
    }

    // Task move: target can be another task or a section drop-zone.
    if (aid.startsWith("task:")) {
      const taskId = aid.slice(5);
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      let targetSection: string = task.sectionId ?? NO_SECTION;
      if (oid.startsWith("section-drop:")) targetSection = oid.slice(13);
      else if (oid.startsWith("task:")) {
        const overTask = tasks.find(t => t.id === oid.slice(5));
        if (overTask) targetSection = overTask.sectionId ?? NO_SECTION;
      }
      const nextSectionId = targetSection === NO_SECTION ? undefined : targetSection;
      if (nextSectionId !== task.sectionId) {
        await updateTask(task.id, { sectionId: nextSectionId });
      }
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={sections.map(s => `section:${s.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {sectionList.map(s => {
            const items = tasksBySection.get(s.id) ?? [];
            const isCollapsed = collapsed.has(s.id);
            return (
              <SectionBlock
                key={s.id}
                section={s}
                items={items}
                collapsed={isCollapsed}
                onToggle={() => setCollapsed(prev => {
                  const n = new Set(prev);
                  n.has(s.id) ? n.delete(s.id) : n.add(s.id);
                  return n;
                })}
                onRename={(name) => updateSection(s.id, { name })}
                onDelete={s.id === NO_SECTION ? undefined : async () => {
                  if (!confirm(`Delete section "${s.name}"? Tasks inside will move to No section.`)) return;
                  await deleteSection(s.id);
                  toast.success("Section deleted");
                }}
                onAdd={(title) => addTaskToSection(s.id, title)}
              />
            );
          })}
          {filtered.length === 0 && sections.length === 0 && <EmptyState />}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SectionBlock({
  section, items, collapsed, onToggle, onRename, onDelete, onAdd,
}: {
  section: Section;
  items: Task[];
  collapsed: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete?: () => void;
  onAdd: (title: string) => Promise<void>;
}) {
  const isPlaceholder = section.id === NO_SECTION;
  const sortable = useSortable({ id: `section:${section.id}`, disabled: isPlaceholder });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const [draft, setDraft] = useState("");
  const [name, setName] = useState(section.name);
  // Section drop zone id used so dropping into an empty section moves the task here.
  const dropId = `section-drop:${section.id}`;

  return (
    <section
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-border/40 bg-background/40 p-2",
        sortable.isDragging && "opacity-60 ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-center gap-1.5 px-1 py-1">
        {!isPlaceholder && (
          <button
            {...sortable.attributes}
            {...sortable.listeners}
            className="cursor-grab touch-none rounded p-0.5 text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
            aria-label="Drag section"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? "Expand" : "Collapse"}
        >
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", !collapsed && "rotate-90")} />
        </button>
        {isPlaceholder ? (
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{section.name}</span>
        ) : (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== section.name && onRename(name.trim())}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") { setName(section.name); e.currentTarget.blur(); }
            }}
            className="flex-1 rounded bg-transparent px-1 text-sm font-medium outline-none focus:bg-muted/40"
          />
        )}
        <span className="text-[10px] text-muted-foreground/70">{items.length}</span>
        {onDelete && (
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100" onClick={onDelete} aria-label="Delete section">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {!collapsed && (
        <SortableContext items={items.map(t => `task:${t.id}`)} strategy={verticalListSortingStrategy}>
          <SectionDropZone id={dropId} empty={items.length === 0}>
            <div className="space-y-1">
              {items.map(t => <DraggableTask key={t.id} task={t} />)}
            </div>
          </SectionDropZone>
        </SortableContext>
      )}

      {!collapsed && (
        <div className="mt-1.5 flex gap-1 px-1">
          <Input
            placeholder={`Add to ${isPlaceholder ? "no section" : section.name}…`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && draft.trim()) {
                await onAdd(draft.trim());
                setDraft("");
              }
            }}
            className="h-8 text-xs"
          />
        </div>
      )}
    </section>
  );
}

function DraggableTask({ task }: { task: Task }) {
  const sortable = useSortable({ id: `task:${task.id}` });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn("flex items-start gap-1", sortable.isDragging && "opacity-50")}
    >
      <button
        {...sortable.attributes}
        {...sortable.listeners}
        className="mt-3 cursor-grab touch-none rounded p-0.5 text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
        aria-label="Drag task"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="min-w-0 flex-1">
        <TaskRow task={task} showArea={false} />
      </div>
    </div>
  );
}

function SectionDropZone({ id, empty, children }: { id: string; empty: boolean; children: React.ReactNode }) {
  // Use useSortable as a passive droppable target for the whole section, even
  // when empty, by registering an invisible sortable id.
  const sortable = useSortable({ id });
  return (
    <div
      ref={sortable.setNodeRef}
      className={cn(
        empty && "rounded-lg border border-dashed border-border/40 px-2 py-3 text-center text-[11px] text-muted-foreground",
        sortable.isOver && "ring-2 ring-primary/40 ring-inset",
      )}
    >
      {empty ? "Drop tasks here" : children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-6 text-center text-sm text-muted-foreground">No tasks yet. Add one above.</div>
  );
}

/* ---------------- Schedule (grouped by due date) ---------------- */

function ScheduleView({ tasks }: { tasks: Task[] }) {
  const groups = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      const key = t.dueDate ?? "_unscheduled";
      const arr = m.get(key) ?? [];
      arr.push(t);
      m.set(key, arr);
    }
    return Array.from(m.entries()).sort((a, b) => {
      if (a[0] === "_unscheduled") return 1;
      if (b[0] === "_unscheduled") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [tasks]);

  if (tasks.length === 0) return <EmptyState />;

  return (
    <div className="space-y-3">
      {groups.map(([key, items]) => (
        <section key={key}>
          <div className="mb-1.5 flex items-center gap-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {key === "_unscheduled" ? "Unscheduled" : format(parseISO(key), "EEE, MMM d")}
            </span>
            <span className="text-[10px] text-muted-foreground/70">{items.length}</span>
          </div>
          <div className="space-y-1">
            {items.map(t => <TaskRow key={t.id} task={t} showArea={false} />)}
          </div>
        </section>
      ))}
    </div>
  );
}