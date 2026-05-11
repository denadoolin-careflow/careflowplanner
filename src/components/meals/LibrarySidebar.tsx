import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useDraggable } from "@dnd-kit/core";
import { Search, GripVertical, Heart } from "lucide-react";
import { useMealsLibrary, type LibraryMeal } from "@/lib/meals-library";
import { Link } from "react-router-dom";

export function LibrarySidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { items } = useMealsLibrary();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"favorites" | "all">("favorites");

  const filtered = useMemo(() => {
    return items
      .filter(i => !i.is_archived)
      .filter(i => tab === "all" || i.is_favorite)
      .filter(i => !q || i.title.toLowerCase().includes(q.toLowerCase()));
  }, [items, q, tab]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent side="right" className="flex w-full flex-col gap-3 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">Drag from library</SheetTitle>
          <p className="text-xs text-muted-foreground">Drag any recipe onto a slot in your weekly plan.</p>
        </SheetHeader>

        <div className="flex gap-1">
          <button onClick={() => setTab("favorites")}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${tab === "favorites" ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}>
            <Heart className="mr-1 inline h-3 w-3" />Favorites
          </button>
          <button onClick={() => setTab("all")}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${tab === "all" ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40"}`}>
            All
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search recipes…" className="h-9 pl-7" />
        </div>

        <div className="-mx-2 flex-1 space-y-1.5 overflow-y-auto px-2">
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
              No recipes here yet. <Link to="/meals/library" className="text-primary underline">Open library →</Link>
            </div>
          ) : filtered.map(m => <DraggableLibraryRow key={m.id} m={m} />)}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DraggableLibraryRow({ m }: { m: LibraryMeal }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lib-${m.id}`,
    data: { libraryMealId: m.id },
  });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      className={`group flex cursor-grab items-center gap-2 rounded-lg border border-border/60 bg-card/40 p-2 transition hover:border-primary/40 hover:bg-primary/5
        ${isDragging ? "opacity-50" : ""}`}>
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-gradient-to-br from-primary/15 to-accent/15 text-lg">
        {m.image_url ? <img src={m.image_url} alt="" className="h-full w-full object-cover" /> : <span>{m.icon ?? "🍽️"}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{m.title}</div>
        <div className="flex gap-1 text-[10px] text-muted-foreground">
          {m.slot && <span>{m.slot}</span>}
          {m.prep_minutes != null && <span>· {m.prep_minutes}m</span>}
        </div>
      </div>
      {m.is_favorite && <Heart className="h-3 w-3 fill-amber-400 text-amber-400" />}
    </div>
  );
}