import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { NAV } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { Inbox, Search, LayoutGrid } from "lucide-react";

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

  const projects = (state.projects ?? []).filter((p: any) => !p.archivedAt).slice(0, 8);
  const areas = (state.areas ?? []).filter((a: any) => !a.isArchived).slice(0, 12);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput value={q} onValueChange={setQ} placeholder="Jump to a page, area, or project…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>

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