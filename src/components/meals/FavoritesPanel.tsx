import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { FavoriteMeal, listFavorites, removeFavorite } from "@/lib/meal-ai";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function FavoritesPanel() {
  const { user } = useStore();
  const [items, setItems] = useState<FavoriteMeal[]>([]);

  useEffect(() => { if (user) listFavorites(user.id).then(setItems); }, [user]);

  if (!items.length) {
    return <p className="text-xs text-muted-foreground">Tap the heart on any meal to keep it here for later.</p>;
  }
  const del = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    await removeFavorite(id);
  };
  return (
    <ul className="space-y-1.5">
      {items.map(f => (
        <li key={f.id} className="group flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
          <span className="font-medium">{f.name}</span>
          {f.slot && <span className="text-[11px] text-muted-foreground">· {f.slot}</span>}
          {f.prep_minutes ? <span className="text-[11px] text-muted-foreground">· {f.prep_minutes}m</span> : null}
          <Button size="sm" variant="ghost" className="ml-auto h-7 w-7 p-0 opacity-0 transition group-hover:opacity-60" onClick={() => del(f.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}