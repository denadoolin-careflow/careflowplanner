import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShoppingBasket, Plus, Mic, Tag as TagIcon } from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VoiceCaptureDialog } from "@/components/voice/VoiceCaptureDialog";
import { useTags } from "@/hooks/use-tags";
import { getTopTags } from "@/lib/tags";
import { tagIconFor } from "@/components/tags/tag-icon";
import { readableTextOn } from "@/lib/tags";

type NoteHit = { id: string; title: string; body: string };

export function UniversalSearchBar() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [notes, setNotes] = useState<NoteHit[]>([]);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const { state, addGrocery } = useStore();
  const navigate = useNavigate();
  const { tags } = useTags();
  const recentTags = useMemo(
    () => getTopTags(tags, (state.tasks ?? []) as any, 5),
    [tags, state.tasks],
  );

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
  const groceries = useMemo(() => term ? (state.grocery ?? []).filter((g: any) => match(g.name)).slice(0, 6) : [], [state.grocery, term]);

  const go = (to: string) => { setOpen(false); navigate(to); };

  const addToGrocery = async () => {
    const name = q.trim();
    if (!name) return;
    await addGrocery(name);
    toast(`Added “${name}” to grocery list`);
    setQ("");
    setOpen(false);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card/70 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            aria-label="Search everything"
          >
            <Search className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="flex items-center gap-2">
          Search & brain dump
          <kbd className="rounded border border-border/60 bg-muted/50 px-1.5 text-[10px] font-mono">⌘K</kbd>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">⌘J jump</span>
        </TooltipContent>
      </Tooltip>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search tasks, notes, projects, events, meals…" value={q} onValueChange={setQ} />
        <CommandList>
          <CommandEmpty>{term ? "Nothing found." : "Type to search across everything."}</CommandEmpty>

          {!term && recentTags.length > 0 && (
            <CommandGroup heading="Recent tags">
              {recentTags.map(t => {
                const Icon = tagIconFor(t.icon);
                return (
                  <CommandItem
                    key={`tag-${t.id}`}
                    value={`tag-${t.id}-${t.name}`}
                    onSelect={() => go(`/tags/${encodeURIComponent(t.name)}`)}
                  >
                    <span
                      className="mr-2 grid h-5 w-5 place-items-center rounded-full"
                      style={{ backgroundColor: t.color, color: readableTextOn(t.color) }}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                    <span className="truncate">{t.name}</span>
                    <TagIcon className="ml-auto h-3.5 w-3.5 opacity-50" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          <CommandGroup heading="Capture">
            <CommandItem
              value="__brain-dump"
              onSelect={() => { setOpen(false); setVoiceOpen(true); }}
            >
              <Mic className="mr-2 h-4 w-4 text-primary" />
              <span>Brain dump (voice capture)</span>
              <kbd className="ml-auto rounded border border-border/60 bg-muted/50 px-1.5 text-[10px] font-mono">⌘K</kbd>
            </CommandItem>
          </CommandGroup>

          {term && (
            <CommandGroup heading="Quick add">
              <CommandItem value={`__add-grocery-${term}`} onSelect={addToGrocery}>
                <ShoppingBasket className="mr-2 h-4 w-4 text-secondary-foreground" />
                <span>Add “{q.trim()}” to grocery list</span>
                <Plus className="ml-auto h-3.5 w-3.5 opacity-60" />
              </CommandItem>
            </CommandGroup>
          )}

          {groceries.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Grocery list">
                {groceries.map((g: any) => (
                  <CommandItem key={g.id} value={`grocery-${g.id}-${g.name}`} onSelect={() => go("/meals")}>
                    <ShoppingBasket className="mr-2 h-4 w-4 opacity-60" />
                    <span className="truncate">{g.name}</span>
                    {g.qty && <span className="ml-auto text-[10px] text-muted-foreground">{g.qty}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

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
      <VoiceCaptureDialog open={voiceOpen} onOpenChange={setVoiceOpen} />
    </>
  );
}