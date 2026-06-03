import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PANELS, type PanelId } from "./PanelRegistry";
import { useWorkspaceLayout } from "./useWorkspaceLayout";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PanelLeft, PanelRight, PanelLeftOpen, Check, Search, FileText, BookHeart, CalendarDays, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { NAV } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { listNotes, type Note } from "@/lib/notes";

const ORDER: PanelId[] = [
  "today", "week", "month", "year",
  "inbox", "agenda", "calendar", "projects", "goals", "areas",
  "notes", "journal", "routines", "meals", "focus",
];

function parseDateQuery(q: string): Date | null {
  const s = q.trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower === "today") return new Date();
  if (lower === "tomorrow") { const d = new Date(); d.setDate(d.getDate() + 1); return d; }
  if (lower === "yesterday") { const d = new Date(); d.setDate(d.getDate() - 1); return d; }
  const t = Date.parse(s);
  if (!isNaN(t)) return new Date(t);
  return null;
}

const fmtISO = (d: Date) => d.toISOString().slice(0, 10);

export function PanelPicker() {
  const { layout, openPanel, closePanel } = useWorkspaceLayout();
  const navigate = useNavigate();
  const { state } = useStore();
  const [side, setSide] = useState<"left" | "right">("right");
  const [q, setQ] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);

  useEffect(() => {
    if (!notesLoaded) {
      listNotes().then(n => { setNotes(n); setNotesLoaded(true); }).catch(() => setNotesLoaded(true));
    }
  }, [notesLoaded]);

  const isOpen = (id: PanelId) => layout.left.includes(id) || layout.right.includes(id);
  const query = q.trim().toLowerCase();

  const filteredPanels = useMemo(
    () => ORDER.filter(id => !query || PANELS[id].title.toLowerCase().includes(query)),
    [query],
  );

  const filteredPages = useMemo(() => {
    if (!query) return [];
    const panelRoutes = new Set(ORDER.map(id => `/${id}`));
    return NAV.filter(n => n.label.toLowerCase().includes(query) && !panelRoutes.has(n.to)).slice(0, 6);
  }, [query]);

  const filteredNotes = useMemo(() => {
    if (!query) return [];
    return notes.filter(n => (n.title || "Untitled").toLowerCase().includes(query)).slice(0, 6);
  }, [notes, query]);

  const filteredJournal = useMemo(() => {
    if (!query) return [];
    return state.journal
      .filter(j => (j.title || "").toLowerCase().includes(query) || j.body.toLowerCase().includes(query) || j.date.includes(query))
      .slice(0, 6);
  }, [state.journal, query]);

  const dateMatch = useMemo(() => parseDateQuery(query), [query]);
  const hasAnyResults = filteredPanels.length || filteredPages.length || filteredNotes.length || filteredJournal.length || dateMatch;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open side panel"
              className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card text-foreground/80 hover:bg-muted"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Side panels</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="max-h-[70vh] w-72 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Open panel</span>
          <div className="flex items-center gap-1 rounded-md border border-border/60 p-0.5">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setSide("left"); }}
              className={cn("grid h-6 w-6 place-items-center rounded", side === "left" && "bg-muted text-foreground")}
              aria-label="Dock left"
            >
              <PanelLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setSide("right"); }}
              className={cn("grid h-6 w-6 place-items-center rounded", side === "right" && "bg-muted text-foreground")}
              aria-label="Dock right"
            >
              <PanelRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 pb-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Search panels, pages, notes, dates…"
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>

        {dateMatch && (
          <>
            <DropdownMenuLabel className="px-3 pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              Jump to {dateMatch.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </DropdownMenuLabel>
            {[
              { label: "Today view", to: `/today?date=${fmtISO(dateMatch)}`, icon: CalendarDays },
              { label: "Week view", to: `/week?date=${fmtISO(dateMatch)}`, icon: CalendarDays },
              { label: "Month view", to: "/month", icon: CalendarDays },
            ].map(opt => (
              <DropdownMenuItem
                key={opt.label}
                onSelect={(e) => { e.preventDefault(); navigate(opt.to); }}
                className="flex items-center gap-2"
              >
                <opt.icon className="h-4 w-4 opacity-80" />
                <span className="flex-1 text-sm">{opt.label}</span>
                <ArrowRight className="h-3.5 w-3.5 opacity-60" />
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        {filteredPanels.length > 0 && (
          <DropdownMenuLabel className="px-3 pt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Panels</DropdownMenuLabel>
        )}
        {filteredPanels.map(id => {
          const p = PANELS[id];
          const Icon = p.icon;
          const open = isOpen(id);
          return (
            <DropdownMenuItem
              key={id}
              onSelect={(e) => { e.preventDefault(); open ? closePanel(id) : openPanel(id, side); }}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4 opacity-80" />
              <span className="flex-1">{p.title}</span>
              {open && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}

        {filteredPages.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-3 pt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Pages</DropdownMenuLabel>
            {filteredPages.map(n => (
              <DropdownMenuItem
                key={n.to}
                onSelect={(e) => { e.preventDefault(); navigate(n.to); }}
                className="flex items-center gap-2"
              >
                <n.icon className="h-4 w-4 opacity-80" />
                <span className="flex-1 text-sm">{n.label}</span>
                <ArrowRight className="h-3.5 w-3.5 opacity-60" />
              </DropdownMenuItem>
            ))}
          </>
        )}

        {filteredNotes.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-3 pt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Notes</DropdownMenuLabel>
            {filteredNotes.map(n => (
              <DropdownMenuItem
                key={n.id}
                onSelect={(e) => { e.preventDefault(); navigate(`/notes/${n.id}`); }}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4 opacity-80" />
                <span className="flex-1 truncate text-sm">{n.title || "Untitled"}</span>
                <ArrowRight className="h-3.5 w-3.5 opacity-60" />
              </DropdownMenuItem>
            ))}
          </>
        )}

        {filteredJournal.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-3 pt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Journal</DropdownMenuLabel>
            {filteredJournal.map(j => (
              <DropdownMenuItem
                key={j.id}
                onSelect={(e) => { e.preventDefault(); navigate(`/journal?date=${j.date}`); }}
                className="flex items-center gap-2"
              >
                <BookHeart className="h-4 w-4 opacity-80" />
                <span className="flex-1 truncate text-sm">{j.title || j.body.slice(0, 40) || j.date}</span>
                <span className="text-[10px] text-muted-foreground">{j.date}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {query && !hasAnyResults && (
          <div className="px-3 py-3 text-xs text-muted-foreground">No matches.</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}