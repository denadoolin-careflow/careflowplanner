import { NavLink, useLocation } from "react-router-dom";
import { NAV_GROUPS } from "@/lib/nav";
import { PANEL_BY_ROUTE } from "@/components/workspace/PanelRegistry";
import { useWorkspaceLayout } from "@/components/workspace/useWorkspaceLayout";
import {
  Heart, ChevronDown, ChevronRight, Inbox as InboxIcon, Sun, CalendarRange,
  Layers, Moon, Archive, FolderOpen, Folder, PanelLeftClose, PanelLeftOpen, Plus, Star,
  PanelLeft, PanelRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, type MouseEvent } from "react";
import { useStore } from "@/lib/store";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AreaIconColorPicker, getAreaIcon } from "@/components/areas/AreaIconColorPicker";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

const LISTS = [
  { to: "/inbox", label: "Inbox", icon: InboxIcon },
  { to: "/today", label: "Today", icon: Sun },
  { to: "/upcoming", label: "Upcoming", icon: CalendarRange },
  { to: "/anytime", label: "Anytime", icon: Layers },
  { to: "/someday", label: "Someday", icon: Moon },
  { to: "/logbook", label: "Logbook", icon: Archive },
] as const;

const STORAGE_KEY = "careflow:sidebar:open-groups";
const COLLAPSED_KEY = "careflow:sidebar:collapsed";
const GROUP_ORDER_KEY = "careflow:sidebar:group-order";
const WIDTH_KEY = "careflow:sidebar:width";
const SIDE_KEY = "careflow:sidebar:side";          // "left" | "right"
const THEME_KEY = "careflow:sidebar:theme";        // "auto" | "light" | "dark"
const PREFS_EVENT = "careflow:sidebar:prefs";
const MIN_WIDTH = 200;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 256;

type SidebarSide = "left" | "right";
type SidebarTheme = "auto" | "light" | "dark";

function readSide(): SidebarSide {
  if (typeof window === "undefined") return "left";
  return window.localStorage.getItem(SIDE_KEY) === "right" ? "right" : "left";
}
function readTheme(): SidebarTheme {
  if (typeof window === "undefined") return "auto";
  const v = window.localStorage.getItem(THEME_KEY);
  return v === "light" || v === "dark" ? v : "auto";
}
function writePrefs(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch {}
  try { window.dispatchEvent(new Event(PREFS_EVENT)); } catch {}
}

function loadGroupOrder(): string[] {
  if (typeof window === "undefined") return NAV_GROUPS.map(g => g.id);
  try {
    const raw = window.localStorage.getItem(GROUP_ORDER_KEY);
    if (!raw) return NAV_GROUPS.map(g => g.id);
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids)) return NAV_GROUPS.map(g => g.id);
    // merge with any newly-added groups
    const merged = [...ids.filter((x: string) => NAV_GROUPS.some(g => g.id === x))];
    for (const g of NAV_GROUPS) if (!merged.includes(g.id)) merged.push(g.id);
    return merged;
  } catch { return NAV_GROUPS.map(g => g.id); }
}

function loadOpen(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function useSidebarData(forceExpanded: boolean) {
  const { pathname } = useLocation();
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => loadOpen());
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  });
  useEffect(() => {
    try { window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);
  const { state, updateArea } = useStore();
  // Dedupe areas by name as a defensive guard against any prior duplicates.
  const areas = (() => {
    const seen = new Set<string>();
    return (state.areas ?? []).filter(a => {
      if (a.isArchived) return false;
      const k = a.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  })();
  const projects = (state.projects ?? []).filter(p => !p.archivedAt && p.status !== "done");

  // Auto-open the group that contains the current route on first load.
  useEffect(() => {
    setOpenMap((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const g of NAV_GROUPS) {
        const has = g.items.some((it) => it.to === pathname);
        if (has && !next[g.id]) { next[g.id] = true; changed = true; }
        if (!(g.id in next)) { next[g.id] = g.id === "overview" || g.id === "planning"; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [pathname]);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(openMap)); } catch {}
  }, [openMap]);

  const toggle = (id: string) => setOpenMap((p) => ({ ...p, [id]: !p[id] }));

  // Auto-expand the area containing the active project.
  useEffect(() => {
    const m = pathname.match(/^\/projects\/([^/]+)$/);
    if (!m) return;
    const proj = projects.find(p => p.id === m[1]);
    if (!proj) return;
    const key = `area:${proj.areaName ?? "__none__"}`;
    setOpenMap(prev => prev[key] ? prev : { ...prev, [key]: true });
  }, [pathname, projects]);
  const effectiveCollapsed = forceExpanded ? false : collapsed;
  return { pathname, openMap, toggle, setOpenMap, collapsed: effectiveCollapsed, setCollapsed, areas, projects, updateArea };
}

function SidebarBody({ forceExpanded = false, onNavigate }: { forceExpanded?: boolean; onNavigate?: () => void }) {
  const { pathname, openMap, toggle, setOpenMap, collapsed, setCollapsed, areas, projects, updateArea } = useSidebarData(forceExpanded);
  const { updateProject, addProject } = useStore();
  const { openPanel } = useWorkspaceLayout();
  const [groupOrder, setGroupOrder] = useState<string[]>(() => loadGroupOrder());
  const [side, setSide] = useState<SidebarSide>(() => readSide());
  const [themePref, setThemePref] = useState<SidebarTheme>(() => readTheme());
  const cycleTheme = () => {
    const next: SidebarTheme = themePref === "auto" ? "light" : themePref === "light" ? "dark" : "auto";
    setThemePref(next);
    writePrefs(THEME_KEY, next);
  };
  const toggleSide = () => {
    const next: SidebarSide = side === "left" ? "right" : "left";
    setSide(next);
    writePrefs(SIDE_KEY, next);
  };
  useEffect(() => {
    try { window.localStorage.setItem(GROUP_ORDER_KEY, JSON.stringify(groupOrder)); } catch {}
  }, [groupOrder]);
  const orderedGroups = groupOrder
    .map(id => NAV_GROUPS.find(g => g.id === id))
    .filter(Boolean) as typeof NAV_GROUPS[number][];

  const handleNavClick = (to: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    const panelId = PANEL_BY_ROUTE[to];
    if (!panelId) { onNavigate?.(); return; }
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.preventDefault();
      openPanel(panelId, e.metaKey || e.ctrlKey ? "right" : "left");
      return;
    }
    onNavigate?.();
  };

  const wrapItem = (label: string, node: React.ReactNode) => collapsed ? (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{node as any}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  ) : node;

  const renderProjectNode = (p: typeof projects[number], depth: number, allProjects: typeof projects, areaName: string | undefined) => {
    const children = allProjects.filter(c => c.parentProjectId === p.id);
    const key = `proj:${p.id}`;
    const open = openMap[key] !== false; // default open
    const hasActive = pathname === `/projects/${p.id}` || children.some(c => pathname === `/projects/${c.id}`);
    const ProjIcon = getAreaIcon(p.icon);
    const PROJ_MIME = "application/x-careflow-proj-id";
    const reorderProject = async (draggedId: string, targetId: string) => {
      if (draggedId === targetId) return;
      const dragged = allProjects.find(x => x.id === draggedId);
      const target = allProjects.find(x => x.id === targetId);
      if (!dragged || !target) return;
      // gather siblings under same parent
      const siblings = allProjects
        .filter(x => (x.parentProjectId ?? null) === (target.parentProjectId ?? null))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      const without = siblings.filter(x => x.id !== draggedId);
      const insertIdx = without.findIndex(x => x.id === targetId);
      if (insertIdx < 0) return;
      without.splice(insertIdx, 0, dragged);
      await Promise.all(without.map((x, i) =>
        updateProject(x.id, { sortOrder: (i + 1) * 10, parentProjectId: target.parentProjectId ?? undefined } as any)
      ));
    };
    return (
      <div key={p.id}>
        <div
          className={cn(
            "group flex items-center gap-1 rounded-lg px-1 py-1 text-sm transition-colors",
            "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            hasActive && "text-foreground",
          )}
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData(PROJ_MIME, p.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes(PROJ_MIME)) {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = "move";
            }
          }}
          onDrop={(e) => {
            const id = e.dataTransfer.getData(PROJ_MIME);
            if (!id) return;
            e.preventDefault();
            e.stopPropagation();
            void reorderProject(id, p.id);
          }}
        >
          {children.length > 0 ? (
            <button type="button" onClick={() => toggle(key)} className="grid h-5 w-5 place-items-center">
              <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
            </button>
          ) : (
            <span className="h-5 w-5" />
          )}
          <AreaIconColorPicker
            icon={p.icon ?? "folder"}
            color={p.color}
            onChange={(patch) => updateProject(p.id, patch)}
            trigger={
              <button
                type="button"
                className="grid h-6 w-6 place-items-center rounded hover:bg-sidebar-accent/60"
                aria-label="Edit project icon and color"
              >
                <ProjIcon className="h-3.5 w-3.5 opacity-80" style={p.color ? { color: p.color } : undefined} />
              </button>
            }
          />
          <NavLink
            to={`/projects/${p.id}`}
            onClick={onNavigate}
            className={({ isActive }) => cn(
              "flex-1 truncate text-left rounded-md px-1 py-0.5 transition-colors",
              isActive && "bg-primary-soft text-foreground shadow-soft",
            )}
          >
            {p.name}
          </NavLink>
          <button
            type="button"
            aria-label={p.isFavorite ? "Unfavorite project" : "Favorite project"}
            title={p.isFavorite ? "Unfavorite" : "Favorite"}
            className={cn(
              "grid h-5 w-5 place-items-center rounded transition-opacity",
              p.isFavorite ? "opacity-100 text-amber-400" : "opacity-0 group-hover:opacity-80 text-muted-foreground hover:text-amber-400",
            )}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              updateProject(p.id, { isFavorite: !p.isFavorite });
            }}
          >
            <Star className={cn("h-3 w-3", p.isFavorite && "fill-current")} />
          </button>
          <button
            type="button"
            aria-label="Add subfolder"
            className="opacity-0 group-hover:opacity-80 grid h-5 w-5 place-items-center rounded hover:bg-sidebar-accent/60"
            onClick={async () => {
              const name = window.prompt("Subfolder name", "New subfolder")?.trim();
              if (!name) return;
              const created = await addProject({
                name,
                areaId: p.areaId,
                areaName: areaName,
                parentProjectId: p.id,
                status: "active",
                sortOrder: 0,
              } as any);
              if (created) {
                setOpenMap(prev => ({ ...prev, [key]: true }));
                toast(`Added subfolder “${name}”`);
              }
            }}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        {children.length > 0 && (
          <div className={cn(
            "grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}>
            <div className="min-h-0 overflow-hidden">
              <div className="ml-5 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border/60 pl-2">
                {children.map(c => renderProjectNode(c, depth + 1, allProjects, areaName))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
    <div className={cn(
      "flex h-full flex-col gap-2 bg-sidebar p-3 transition-[width] duration-200 ease-out",
      collapsed ? "w-[68px] items-center" : "w-full",
    )}>
      <div className={cn("flex items-center gap-2 px-1 py-2 w-full", collapsed && "justify-center")}>
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-glow">
          <Heart className="h-4 w-4" fill="currentColor" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg font-semibold leading-none">CareFlow</div>
            <div className="text-xs text-muted-foreground truncate">a gentle planner</div>
          </div>
        )}
        {!forceExpanded && !collapsed && (
          <>
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={cycleTheme}
                  aria-label={`Sidebar theme: ${themePref}`}
                  className="hidden lg:grid h-7 w-7 place-items-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  {themePref === "dark" ? <Moon className="h-4 w-4" /> : themePref === "light" ? <Sun className="h-4 w-4" /> : <Sun className="h-4 w-4 opacity-60" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Sidebar theme: {themePref}</TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleSide}
                  aria-label={side === "left" ? "Move sidebar to right" : "Move sidebar to left"}
                  className="hidden lg:grid h-7 w-7 place-items-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  {side === "left" ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Move to {side === "left" ? "right" : "left"}</TooltipContent>
            </Tooltip>
          </>
        )}
        {!forceExpanded && <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden lg:grid h-7 w-7 place-items-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>}
      </div>
      <nav className={cn("mt-1 flex flex-col gap-1 overflow-y-auto overflow-x-hidden w-full", !collapsed && "pr-1")}>
        {/* Things-style Lists rail */}
        <div className="mb-3 flex flex-col gap-0.5">
          {LISTS.map(({ to, label, icon: Icon }) => wrapItem(label,
            <NavLink
              key={to}
              to={to}
              onClick={handleNavClick(to)}
              className={({ isActive }) => cn(
                "group flex items-center gap-3 rounded-xl text-sm font-medium transition-all",
                "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed ? "justify-center h-10 w-10 mx-auto" : "px-3 py-2",
                isActive && "bg-primary-soft text-foreground shadow-soft",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </div>

        {/* Areas → Projects tree */}
        {!collapsed && projects.some(p => p.isFavorite) && (
          <div className="mb-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/60">
                <Star className="h-3 w-3 text-amber-400" /> Favorites
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              {projects.filter(p => p.isFavorite).map(fav => {
                const FavIcon = getAreaIcon(fav.icon);
                return (
                  <div key={fav.id} className="group flex items-center gap-1 rounded-lg px-1 py-1 text-sm text-sidebar-foreground/85 hover:bg-sidebar-accent">
                    <span className="h-5 w-5" />
                    <FavIcon className="h-3.5 w-3.5 opacity-80" style={fav.color ? { color: fav.color } : undefined} />
                    <NavLink
                      to={`/projects/${fav.id}`}
                      onClick={onNavigate}
                      className={({ isActive }) => cn(
                        "flex-1 truncate text-left rounded-md px-1 py-0.5 transition-colors",
                        isActive && "bg-primary-soft text-foreground shadow-soft",
                      )}
                    >
                      {fav.name}
                    </NavLink>
                    <button
                      type="button"
                      aria-label="Unfavorite"
                      className="grid h-5 w-5 place-items-center rounded text-amber-400"
                      onClick={(e) => { e.stopPropagation(); updateProject(fav.id, { isFavorite: false }); }}
                    >
                      <Star className="h-3 w-3 fill-current" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {areas.length > 0 && !collapsed && (
          <div className="mb-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/60">Areas</span>
              <NavLink to="/projects" onClick={onNavigate} className="text-[10px] text-sidebar-foreground/50 hover:text-sidebar-foreground">All</NavLink>
            </div>
            <div className="flex flex-col gap-0.5">
              {areas.map(area => {
                const areaProjects = projects.filter(p => p.areaName === area.name);
                const key = `area:${area.name}`;
                const open = !!openMap[key];
                const hasActive = areaProjects.some(p => pathname === `/projects/${p.id}`);
                const AreaIcon = getAreaIcon(area.icon);
                return (
                  <div key={area.id}>
                    <div
                      className={cn(
                        "group flex w-full items-center gap-1 rounded-lg px-1 py-1 text-sm",
                        "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
                        hasActive && "text-foreground",
                      )}
                    >
                      <button type="button" onClick={() => toggle(key)} className="grid h-5 w-5 place-items-center">
                        <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
                      </button>
                      <AreaIconColorPicker
                        icon={area.icon}
                        color={area.color}
                        onChange={(p) => updateArea(area.id, p)}
                        trigger={
                          <button
                            type="button"
                            className="grid h-6 w-6 place-items-center rounded hover:bg-sidebar-accent/60"
                            aria-label="Edit area icon and color"
                          >
                            <AreaIcon className="h-3.5 w-3.5 opacity-80" style={area.color ? { color: area.color } : undefined} />
                          </button>
                        }
                      />
                      <NavLink
                        to={`/areas/${encodeURIComponent(area.name)}`}
                        onClick={onNavigate}
                        className="flex-1 truncate text-left -mx-1 rounded-md bg-transparent px-[4px] text-foreground transition-colors hover:text-primary"
                      >
                        {area.name}
                      </NavLink>
                      {areaProjects.length > 0 && (
                        <span className="text-[10px] text-sidebar-foreground/50">{areaProjects.length}</span>
                      )}
                      <button
                        type="button"
                        aria-label="Add project"
                        className="opacity-0 group-hover:opacity-80 grid h-5 w-5 place-items-center rounded hover:bg-sidebar-accent/60"
                        onClick={async () => {
                          const name = window.prompt("Project name", "New project")?.trim();
                          if (!name) return;
                          const created = await addProject({
                            name,
                            areaId: area.id,
                            areaName: area.name,
                            status: "active",
                            sortOrder: 0,
                          } as any);
                          if (created) {
                            setOpenMap(prev => ({ ...prev, [key]: true }));
                            toast(`Added project “${name}”`);
                          }
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className={cn(
                      "grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out",
                      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}>
                      <div className="min-h-0 overflow-hidden">
                        <div className="ml-5 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border/60 pl-2">
                          {areaProjects.length === 0 ? (
                            <div className="px-2 py-1 text-[11px] italic text-sidebar-foreground/40">No projects</div>
                          ) : areaProjects
                              .filter(p => !p.parentProjectId || !areaProjects.some(q => q.id === p.parentProjectId))
                              .map(p => renderProjectNode(p, 0, areaProjects, area.name))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {orderedGroups.map((group, idx) => {
          const open = !!openMap[group.id];
          const GroupIcon = group.icon;
          const hasActive = group.items.some((it) => it.to === pathname);
          if (collapsed) {
            return (
              <div key={group.id} className="mb-1 flex flex-col items-center gap-0.5">
                {group.items.map(({ to, label, icon: Icon }) => wrapItem(label,
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    onClick={handleNavClick(to)}
                    className={({ isActive }) => cn(
                      "grid h-10 w-10 place-items-center rounded-xl transition-all",
                      "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActive && "bg-primary-soft text-foreground shadow-soft",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </NavLink>
                ))}
              </div>
            );
          }
          return (
            <div
              key={group.id}
              className="mb-1"
              draggable={!forceExpanded}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", group.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
              onDrop={(e) => {
                e.preventDefault();
                const fromId = e.dataTransfer.getData("text/plain");
                if (!fromId || fromId === group.id) return;
                setGroupOrder(prev => {
                  const next = prev.filter(x => x !== fromId);
                  const insertAt = next.indexOf(group.id);
                  if (insertAt < 0) return prev;
                  next.splice(insertAt, 0, fromId);
                  return next;
                });
              }}
            >
              <button
                type="button"
                onClick={() => toggle(group.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
                  "text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors",
                  hasActive && "text-sidebar-foreground/90",
                )}
              >
                <GroupIcon className="h-3.5 w-3.5 opacity-70" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform duration-200", open ? "rotate-0" : "-rotate-90")}
                />
              </button>
              <div
                className={cn(
                  "grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out",
                  open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="mt-1 flex flex-col gap-0.5 pl-1">
                    {group.items.map(({ to, label, icon: Icon }) => (
                      <NavLink
                        key={to}
                        to={to}
                        end={to === "/"}
                        onClick={handleNavClick(to)}
                        className={({ isActive }) =>
                          cn(
                            "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                            "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            isActive && "bg-primary-soft text-foreground shadow-soft",
                          )
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>
    </div>
    </TooltipProvider>
  );
}

export function Sidebar() {
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_WIDTH;
    const raw = window.localStorage.getItem(WIDTH_KEY);
    const n = raw ? parseInt(raw, 10) : DEFAULT_WIDTH;
    return Number.isFinite(n) ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n)) : DEFAULT_WIDTH;
  });
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  });
  const [side, setSide] = useState<SidebarSide>(() => readSide());
  const [themePref, setThemePref] = useState<SidebarTheme>(() => readTheme());
  useEffect(() => {
    const onStorage = () => {
      setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "1");
      setSide(readSide());
      setThemePref(readTheme());
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(PREFS_EVENT, onStorage);
    const id = window.setInterval(onStorage, 600);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PREFS_EVENT, onStorage);
      window.clearInterval(id);
    };
  }, []);
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const move = (ev: globalThis.MouseEvent) => {
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + (ev.clientX - startX)));
      setWidth(next);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      try { window.localStorage.setItem(WIDTH_KEY, String(width)); } catch {}
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  useEffect(() => {
    try { window.localStorage.setItem(WIDTH_KEY, String(width)); } catch {}
  }, [width]);
  return (
    <aside
      className={cn(
        "hidden lg:flex sticky top-0 self-start h-screen max-h-screen relative shrink-0",
        side === "right" ? "order-last border-l border-sidebar-border" : "border-r border-sidebar-border",
        themePref === "dark" && "sidebar-force-dark",
        themePref === "light" && "sidebar-force-light",
      )}
      style={collapsed ? undefined : { width }}
    >
      <SidebarBody />
      {!collapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          onMouseDown={startDrag}
          onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
          className={cn(
            "absolute top-0 z-10 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-primary/30 transition-colors",
            side === "right" ? "left-0 translate-x-1/2" : "right-0 -translate-x-1/2",
          )}
        />
      )}
    </aside>
  );
}

export function MobileSidebarTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-card text-foreground/80 hover:bg-muted lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar">
        <SidebarBody forceExpanded onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
