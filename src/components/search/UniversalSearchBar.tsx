import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

type NoteHit = { id: string; title: string; body: string };

export function UniversalSearchBar() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [notes, setNotes] = useState<NoteHit[]>([]);
  const { state } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Async notes search (small, debounced)
  useEffect(() => {
    if (!open || q.trim().length < 2) { setNotes([]); return; }
    let cancelled = false;
    const id = setTimeout(async () => {
      const term = q.trim();
      const { data } = await supabase
        .from("notes")
        .select("id,title,body")
        .or(`title.ilike.%${term}%,body.ilike.%${term}%`)
        .limit(8);
      if (!cancelled) setNotes((data ?? []) as NoteHit[]);
    }, 180);
    return () => { cancelled = true; clearTimeout(id); };
  }, [q, open]);

  const term = q.trim().toLowerCase();
  const match = (s?: string) => !!s && s.toLowerCase().includes(term);

  const tasks = useMemo(() => term ? state.tasks.filter(t => match(t.title) || match(t.notes)).slice(0, 8) : [], [state.tasks, term]);
  const projects = useMemo(() => term ? (state.projects ?? []).filter(p => match(p.name) || match(p.notes)).slice(0, 6) : [], [state.projects, term]);
  const meals = useMemo(() => term ? state.meals.filter(m => match(m.name)).slice(0, 6) : [], [state.meals, term]);
  const appts = useMemo(() => term ? state.appointments.filter(a => match(a.title) || match(a.location ?? "")).slice(0, 6) : [], [state.appointments, term]);
  const ideas = useMemo(() => term ? (state.ideas ?? []).filter((i: any) => match(i.title) || match(i.notes)).slice(0, 6) : [], [state.ideas, term]);

  const go = (to: string) => { setOpen(false); navigate(to); };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-card transition-colors md:flex"
        aria-label="Search everything"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search…</span>
        <kbd className="ml-2 rounded border border-border/60 bg-muted/50 px-1.5 text-[10px] font-mono">⌘K</kbd>
      </button>
      <button
        onClick={() => setOpen(true)}
        className="grid h-8 w-8 place-items-center rounded-full border border-border/60 bg-card text-muted-foreground hover:text-foreground md:hidden"
        aria-label="Search"
      >
        <Search className="h-3.5 w-3.5" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search tasks, notes, projects, events, meals…" value={q} onValueChange={setQ} />
        <CommandList>
          <CommandEmpty>{term ? "Nothing found." : "Type to search across everything."}</CommandEmpty>

          {tasks.length > 0 && (
            <CommandGroup heading="Tasks">
              {tasks.map(t => (
                <CommandItem key={t.id} value={`task-${t.id}-${t.title}`} onSelect={() => go(t.inbox ? "/inbox" : t.dueDate ? "/upcoming" : "/anytime")}>
                  <span className="truncate">{t.title}</span>
                  {t.dueDate && <span className="ml-auto text-[10px] text-muted-foreground">{t.dueDate.slice(5)}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {notes.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Notes">
                {notes.map(n => (
                  <CommandItem key={n.id} value={`note-${n.id}-${n.title}`} onSelect={() => go(`/notes/${n.id}`)}>
                    <span className="truncate">{n.title || "Untitled"}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {projects.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Projects">
                {projects.map(p => (
                  <CommandItem key={p.id} value={`proj-${p.id}-${p.name}`} onSelect={() => go(`/projects/${p.id}`)}>
                    <span className="truncate">{p.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {appts.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Events">
                {appts.map(a => (
                  <CommandItem key={a.id} value={`appt-${a.id}-${a.title}`} onSelect={() => go("/calendar")}>
                    <span className="truncate">{a.title}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{a.date.slice(5)} {a.time ?? ""}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {meals.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Meals">
                {meals.map(m => (
                  <CommandItem key={m.id} value={`meal-${m.id}-${m.name}`} onSelect={() => go("/meals")}>
                    <span className="truncate">{m.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{m.slot}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {ideas.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Ideas">
                {ideas.map((i: any) => (
                  <CommandItem key={i.id} value={`idea-${i.id}-${i.title}`} onSelect={() => go("/ideas")}>
                    <span className="truncate">{i.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}