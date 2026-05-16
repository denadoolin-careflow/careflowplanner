import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { NAV } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { Plus, Inbox, Search } from "lucide-react";
import { toast } from "sonner";

/**
 * Global Cmd-K / Ctrl-K command palette.
 * Navigate anywhere, quick-add a task to the Inbox, or jump to a project.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { state, addTask } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = (fn: () => void) => { setOpen(false); setQ(""); fn(); };

  const quickAdd = async () => {
    const title = q.trim();
    if (!title) return;
    await addTask({ title, inbox: true });
    toast.success(`Added to Inbox: ${title}`);
    run(() => navigate("/inbox"));
  };

  const projects = (state.projects ?? []).filter((p: any) => !p.archivedAt).slice(0, 8);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput value={q} onValueChange={setQ} placeholder="Search, jump, or add a task…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>

        {q.trim() && (
          <CommandGroup heading="Quick add">
            <CommandItem value={`__add__ ${q}`} onSelect={quickAdd}>
              <Plus className="mr-2 h-4 w-4 text-primary" />
              Add task to Inbox: <span className="ml-1 font-medium">"{q.trim()}"</span>
            </CommandItem>
          </CommandGroup>
        )}

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
            Press ⌘K / Ctrl-K anywhere to open this palette
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}