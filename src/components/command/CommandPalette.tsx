import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { NAV } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { Inbox, Search, LayoutGrid, Sparkles, CalendarRange, Target, FolderKanban, FileText } from "lucide-react";

/**
 * Global Cmd-J / Ctrl-J jump palette.
 * Jump straight to any page, area, or project.
 * (Cmd-K is reserved for Universal Search + Brain Dump.)
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { state } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = (fn: () => void) => { setOpen(false); setQ(""); fn(); };

  const askCarey = (prompt: string) => run(() => {
    window.dispatchEvent(new CustomEvent("careflow:carey:open"));
    window.dispatchEvent(new CustomEvent("careflow:carey:ask", { detail: { prompt } }));
  });

  const projects = (state.projects ?? []).filter((p: any) => !p.archivedAt).slice(0, 8);
  const areas = (state.areas ?? []).filter((a: any) => !a.isArchived).slice(0, 12);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput value={q} onValueChange={setQ} placeholder="Jump to a page, area, or project…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>

        <CommandGroup heading="Ask Carey">
          <CommandItem value="carey ask open" onSelect={() => run(() => window.dispatchEvent(new CustomEvent("careflow:carey:open")))}>
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            Ask Carey…
          </CommandItem>
          <CommandItem value="carey plan week" onSelect={() => askCarey("Plan my week. Look at goals, deadlines, and capacity, then propose a realistic week with one anchor per day.")}>
            <CalendarRange className="mr-2 h-4 w-4 text-muted-foreground" />
            Plan my week
          </CommandItem>
          <CommandItem value="carey review goals" onSelect={() => askCarey("Review my goals. Which are on track, which are stalled, and which deserve attention this week?")}>
            <Target className="mr-2 h-4 w-4 text-muted-foreground" />
            Review my goals
          </CommandItem>
          <CommandItem value="carey summarize project" onSelect={() => askCarey("Pick my most active project and summarize where it stands, what's blocked, and the next 1-2 steps.")}>
            <FolderKanban className="mr-2 h-4 w-4 text-muted-foreground" />
            Summarize a project
          </CommandItem>
          <CommandItem value="carey find notes" onSelect={() => askCarey("Search my notes and surface 3-5 that feel most relevant to what I'm working on right now. Briefly say why each matters.")}>
            <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
            Find relevant notes
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Go to">
          {NAV.map((n) => (
            <CommandItem
              key={n.to}
              value={`nav ${n.label} ${n.to}`}
              onSelect={() => run(() => navigate(n.to))}
            >
              <n.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {n.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {areas.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Areas">
              {areas.map((a: any) => (
                <CommandItem
                  key={a.id}
                  value={`area ${a.name}`}
                  onSelect={() => run(() => navigate(`/areas/${encodeURIComponent(a.name)}`))}
                >
                  <LayoutGrid className="mr-2 h-4 w-4 text-muted-foreground" />
                  {a.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.map((p: any) => (
                <CommandItem
                  key={p.id}
                  value={`project ${p.name}`}
                  onSelect={() => run(() => navigate(`/projects/${p.id}`))}
                >
                  <Inbox className="mr-2 h-4 w-4 text-muted-foreground" />
                  {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Tips">
          <CommandItem disabled value="__tip__">
            <Search className="mr-2 h-4 w-4" />
            ⌘J jumps · ⌘K opens search + brain dump
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}