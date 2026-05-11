import { useState, useMemo } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Heart, Clock, Sparkles, Baby, Zap, Plus, BookOpen, History } from "lucide-react";
import { useMealsLibrary, type LibraryMeal } from "@/lib/meals-library";
import { listFavorites, type FavoriteMeal } from "@/lib/meal-ai";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import type { Meal } from "@/lib/types";

interface PickedMeal {
  name: string;
  prep_minutes?: number | null;
  ingredients?: string[];
  steps?: string[];
  tags?: string[];
}

export function MealPickerPopover({
  trigger, onPick, onCreateNew,
}: {
  trigger: React.ReactNode;
  onPick: (m: PickedMeal) => void;
  onCreateNew?: () => void;
}) {
  const { state, user } = useStore();
  const { items: library } = useMealsLibrary();
  const [favs, setFavs] = useState<FavoriteMeal[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && user?.id) listFavorites(user.id).then(setFavs);
  }, [open, user?.id]);

  const recent: Meal[] = useMemo(() => {
    const seen = new Set<string>();
    const out: Meal[] = [];
    for (const m of state.meals) {
      const k = m.name.toLowerCase();
      if (!seen.has(k)) { seen.add(k); out.push(m); }
      if (out.length >= 30) break;
    }
    return out;
  }, [state.meals]);

  const match = (s: string) => s.toLowerCase().includes(q.toLowerCase());

  const tabs = {
    favorites: favs.filter(f => match(f.name)),
    recent: recent.filter(m => match(m.name)),
    library: library.filter(l => !l.is_archived && match(l.title)),
    quick: library.filter(l => !l.is_archived && (l.prep_minutes ?? 99) <= 15 && match(l.title)),
    low: library.filter(l => !l.is_archived && l.energy_level === "low" && match(l.title)),
    kid: library.filter(l => !l.is_archived && (l.tags ?? []).some(t => /kid/i.test(t)) && match(l.title)),
  };

  const pick = (m: PickedMeal) => { onPick(m); setOpen(false); };

  const Item = ({ name, sub, onClick }: { name: string; sub?: string; onClick: () => void }) => (
    <button onClick={onClick}
      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-primary/10">
      <span className="truncate">{name}</span>
      {sub && <span className="shrink-0 text-[10px] text-muted-foreground">{sub}</span>}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <Input placeholder="Search meals…" value={q} onChange={e => setQ(e.target.value)} className="mb-2 h-8" />
        <Tabs defaultValue="favorites">
          <TabsList className="grid w-full grid-cols-6 h-8">
            <TabsTrigger value="favorites" className="px-1"><Heart className="h-3 w-3" /></TabsTrigger>
            <TabsTrigger value="recent" className="px-1"><History className="h-3 w-3" /></TabsTrigger>
            <TabsTrigger value="library" className="px-1"><BookOpen className="h-3 w-3" /></TabsTrigger>
            <TabsTrigger value="quick" className="px-1"><Clock className="h-3 w-3" /></TabsTrigger>
            <TabsTrigger value="low" className="px-1"><Zap className="h-3 w-3" /></TabsTrigger>
            <TabsTrigger value="kid" className="px-1"><Baby className="h-3 w-3" /></TabsTrigger>
          </TabsList>
          <div className="mt-2 max-h-64 overflow-y-auto">
            <TabsContent value="favorites" className="mt-0 space-y-0.5">
              {tabs.favorites.length === 0 ? <Empty msg="No favorites yet." /> :
                tabs.favorites.map(f => <Item key={f.id} name={f.name} sub={f.prep_minutes ? `${f.prep_minutes}m` : undefined}
                  onClick={() => pick({ name: f.name, prep_minutes: f.prep_minutes, ingredients: f.ingredients, steps: f.steps, tags: f.tags })} />)}
            </TabsContent>
            <TabsContent value="recent" className="mt-0 space-y-0.5">
              {tabs.recent.length === 0 ? <Empty msg="Nothing planned yet." /> :
                tabs.recent.map(m => <Item key={m.id} name={m.name} sub={m.prepMinutes ? `${m.prepMinutes}m` : undefined}
                  onClick={() => pick({ name: m.name, prep_minutes: m.prepMinutes, ingredients: m.ingredients, steps: m.steps, tags: m.tags })} />)}
            </TabsContent>
            <TabsContent value="library" className="mt-0 space-y-0.5">
              {tabs.library.length === 0 ? <Empty msg="Your library is empty." /> :
                tabs.library.map(l => <LibItem key={l.id} l={l} onPick={pick} />)}
            </TabsContent>
            <TabsContent value="quick" className="mt-0 space-y-0.5">
              {tabs.quick.length === 0 ? <Empty msg="No quick meals yet." /> :
                tabs.quick.map(l => <LibItem key={l.id} l={l} onPick={pick} />)}
            </TabsContent>
            <TabsContent value="low" className="mt-0 space-y-0.5">
              {tabs.low.length === 0 ? <Empty msg="No low-energy meals saved." /> :
                tabs.low.map(l => <LibItem key={l.id} l={l} onPick={pick} />)}
            </TabsContent>
            <TabsContent value="kid" className="mt-0 space-y-0.5">
              {tabs.kid.length === 0 ? <Empty msg="No kid-friendly meals tagged." /> :
                tabs.kid.map(l => <LibItem key={l.id} l={l} onPick={pick} />)}
            </TabsContent>
          </div>
        </Tabs>
        <div className="mt-2 flex gap-1 border-t border-border/60 pt-2">
          <Button size="sm" variant="ghost" className="h-7 flex-1 justify-start text-xs"
            onClick={() => { setOpen(false); onCreateNew?.(); }}>
            <Plus className="mr-1 h-3 w-3" />Create new
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LibItem({ l, onPick }: { l: LibraryMeal; onPick: (m: PickedMeal) => void }) {
  return (
    <button onClick={() => onPick({ name: l.title, prep_minutes: l.prep_minutes, ingredients: l.ingredients, steps: l.steps, tags: l.tags })}
      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-primary/10">
      <span className="truncate flex items-center gap-1">
        {l.is_favorite && <Heart className="h-3 w-3 fill-amber-400 text-amber-400" />}
        {l.title}
      </span>
      <span className="shrink-0 text-[10px] text-muted-foreground">
        {l.prep_minutes ? `${l.prep_minutes}m` : ""}
      </span>
    </button>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="px-2 py-4 text-center text-xs text-muted-foreground">{msg}</div>;
}
