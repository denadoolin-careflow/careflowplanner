import { NavLink, useLocation } from "react-router-dom";
import { NAV_GROUPS } from "@/lib/nav";
import {
  Heart, ChevronDown, ChevronRight, Inbox as InboxIcon, Sun, CalendarRange,
  Layers, Moon, Archive, FolderOpen, Folder, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AreaIconColorPicker, getAreaIcon } from "@/components/areas/AreaIconColorPicker";

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

function loadOpen(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function Sidebar() {
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

  const wrapItem = (label: string, node: React.ReactNode) => collapsed ? (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{node as any}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  ) : node;

  return (
    <TooltipProvider>
    <aside className={cn(
      "hidden lg:flex shrink-0 flex-col gap-2 border-r border-sidebar-border bg-sidebar p-3 transition-[width] duration-200 ease-out",
      collapsed ? "w-[68px] items-center" : "w-64",
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
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="grid h-7 w-7 place-items-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
      <nav className={cn("mt-1 flex flex-col gap-1 overflow-y-auto overflow-x-hidden w-full", !collapsed && "pr-1")}>
        {/* Things-style Lists rail */}
        <div className="mb-3 flex flex-col gap-0.5">
          {LISTS.map(({ to, label, icon: Icon }) => wrapItem(label,
            <NavLink
              key={to}
              to={to}
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
        {areas.length > 0 && !collapsed && (
          <div className="mb-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/60">Areas</span>
              <NavLink to="/projects" className="text-[10px] text-sidebar-foreground/50 hover:text-sidebar-foreground">All</NavLink>
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
                        className={({ isActive }) => cn(
                          "flex-1 truncate text-left rounded px-1 -mx-1 transition-colors",
                          isActive && "bg-primary-soft text-foreground"
                        )}
                      >
                        {area.name}
                      </NavLink>
                      {areaProjects.length > 0 && (
                        <span className="text-[10px] text-sidebar-foreground/50">{areaProjects.length}</span>
                      )}
                    </div>
                    <div className={cn(
                      "grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out",
                      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}>
                      <div className="min-h-0 overflow-hidden">
                        <div className="ml-5 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border/60 pl-2">
                          {areaProjects.length === 0 ? (
                            <div className="px-2 py-1 text-[11px] italic text-sidebar-foreground/40">No projects</div>
                          ) : areaProjects.map(p => (
                            <NavLink
                              key={p.id}
                              to={`/projects/${p.id}`}
                              className={({ isActive }) => cn(
                                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                                "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                isActive && "bg-primary-soft text-foreground shadow-soft",
                              )}
                            >
                              <FolderOpen className="h-3.5 w-3.5 shrink-0" style={p.color ? { color: p.color } : undefined} />
                              <span className="truncate">{p.name}</span>
                            </NavLink>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {NAV_GROUPS.map((group) => {
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
            <div key={group.id} className="mb-1">
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
    </aside>
    </TooltipProvider>
  );
}
