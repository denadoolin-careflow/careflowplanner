import { useEffect, useMemo, useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Layers, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { useDashboardLayout, type PageKey } from "@/lib/dashboard-layouts";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

/**
 * ⌘K / Ctrl+K quick switcher for dashboard layout presets.
 * Renders nothing visible until invoked via the keyboard shortcut.
 */
export function QuickPresetSwitcher({ pageKey }: { pageKey: PageKey }) {
  const [open, setOpen] = useState(false);
  const { preset, presets, switchPreset, createPreset, deletePreset } = useDashboardLayout(pageKey);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = useMemo(() => presets ?? [], [presets]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <VisuallyHidden>
          <DialogTitle>Quick layout switcher</DialogTitle>
        </VisuallyHidden>
        <Command>
          <CommandInput placeholder="Jump to layout… (⌘K)" autoFocus />
          <CommandList className="max-h-[420px]">
            <CommandEmpty>No layouts found.</CommandEmpty>
            <CommandGroup heading="Your layouts">
              {items.map((name) => (
                <CommandItem
                  key={name}
                  value={name}
                  onSelect={() => {
                    switchPreset(name);
                    haptics.tap();
                    toast.success(`Switched to ${name}`);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <Layers className="h-3.5 w-3.5 opacity-60" />
                  <span className="flex-1">{name}</span>
                  {name === preset && (
                    <span className="text-[10px] uppercase tracking-wider text-primary/80">active</span>
                  )}
                  {name !== "Default" && name !== preset && (
                    <button
                      type="button"
                      className="rounded p-1 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete layout "${name}"?`)) {
                          deletePreset(name);
                          haptics.delete();
                          toast(`Deleted "${name}".`);
                        }
                      }}
                      aria-label={`Delete ${name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Actions">
              <CommandItem
                value="__new_layout__"
                onSelect={() => {
                  const name = prompt("Name this layout (e.g. Mom mode, Focus, Lunar):");
                  if (name?.trim()) {
                    createPreset(name.trim(), true);
                    haptics.snap();
                    toast.success(`Created "${name.trim()}"`);
                    setOpen(false);
                  }
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-3.5 w-3.5 opacity-60" /> Save current as new layout…
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}