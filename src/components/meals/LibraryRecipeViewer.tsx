import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Heart, Pencil, Copy, Archive, CalendarPlus, Clock, Star } from "lucide-react";
import type { LibraryMeal } from "@/lib/meals-library";

export function LibraryRecipeViewer({
  meal, open, onClose, onEdit, onDuplicate, onToggleFavorite, onToggleArchive, onAddToWeek,
}: {
  meal: LibraryMeal | null;
  open: boolean;
  onClose: () => void;
  onEdit: (m: LibraryMeal) => void;
  onDuplicate: (id: string) => void;
  onToggleFavorite: (m: LibraryMeal) => void;
  onToggleArchive: (m: LibraryMeal) => void;
  onAddToWeek: (m: LibraryMeal) => void;
}) {
  if (!meal) return null;
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="space-y-2 text-left">
          <SheetTitle className="font-display text-2xl flex items-center gap-2">
            <span>{meal.icon ?? "🍽️"}</span>{meal.title}
          </SheetTitle>
          {meal.description && <p className="text-sm text-muted-foreground">{meal.description}</p>}
        </SheetHeader>

        {meal.image_url && (
          <div className="mt-4 overflow-hidden rounded-xl">
            <img src={meal.image_url} alt={meal.title} className="h-48 w-full object-cover" />
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          {meal.slot && <span className="rounded-full bg-muted/50 px-2 py-0.5">{meal.slot}</span>}
          {meal.prep_minutes != null && <span className="inline-flex items-center gap-0.5 rounded-full bg-muted/50 px-2 py-0.5"><Clock className="h-3 w-3" />Prep {meal.prep_minutes}m</span>}
          {meal.cook_minutes != null && <span className="inline-flex items-center gap-0.5 rounded-full bg-muted/50 px-2 py-0.5"><Clock className="h-3 w-3" />Cook {meal.cook_minutes}m</span>}
          {meal.servings != null && <span className="rounded-full bg-muted/50 px-2 py-0.5">{meal.servings} servings</span>}
          <span className="rounded-full bg-muted/50 px-2 py-0.5 capitalize">{meal.energy_level} energy</span>
          {meal.family_rating != null && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-muted/50 px-2 py-0.5">
              {[1,2,3,4,5].map(n => (
                <Star key={n} className={`h-3 w-3 ${n <= meal.family_rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
              ))}
            </span>
          )}
          {(meal.tags ?? []).map(t => <span key={t} className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">{t}</span>)}
        </div>

        {(meal.ingredients?.length ?? 0) > 0 && (
          <section className="mt-5">
            <h3 className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Ingredients</h3>
            <ul className="space-y-1 text-sm">
              {meal.ingredients.map((i, idx) => (
                <li key={idx} className="flex gap-2"><span className="text-primary">•</span>{i}</li>
              ))}
            </ul>
          </section>
        )}

        {(meal.steps?.length ?? 0) > 0 && (
          <section className="mt-5">
            <h3 className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Steps</h3>
            <ol className="space-y-2 text-sm">
              {meal.steps.map((s, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] text-primary">{idx + 1}</span>
                  <span className="leading-snug">{s}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {meal.notes && (
          <section className="mt-5">
            <h3 className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Notes</h3>
            <p className="text-sm text-muted-foreground">{meal.notes}</p>
          </section>
        )}

        <div className="sticky bottom-0 mt-6 flex flex-wrap gap-2 border-t border-border/60 bg-background/95 py-3 backdrop-blur">
          <Button onClick={() => onAddToWeek(meal)} className="rounded-full">
            <CalendarPlus className="mr-1 h-4 w-4" />Add to week
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => onEdit(meal)}>
            <Pencil className="mr-1 h-4 w-4" />Edit
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => onDuplicate(meal.id)}>
            <Copy className="mr-1 h-4 w-4" />Duplicate
          </Button>
          <Button variant="ghost" className="rounded-full" onClick={() => onToggleFavorite(meal)}>
            <Heart className={`mr-1 h-4 w-4 ${meal.is_favorite ? "fill-amber-400 text-amber-400" : ""}`} />
            {meal.is_favorite ? "Favorited" : "Favorite"}
          </Button>
          <Button variant="ghost" className="rounded-full" onClick={() => onToggleArchive(meal)}>
            <Archive className="mr-1 h-4 w-4" />{meal.is_archived ? "Unarchive" : "Archive"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}