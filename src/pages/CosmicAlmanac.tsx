import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SIGN_ENTRIES, PLANET_ENTRIES, HOUSE_ENTRIES, ASPECT_ENTRIES, findAlmanacEntry, type AlmanacEntry, type Element } from "@/lib/astro-suite/almanac";

const CATS = [
  { key: "sign", label: "Signs", items: SIGN_ENTRIES },
  { key: "planet", label: "Planets", items: PLANET_ENTRIES },
  { key: "house", label: "Houses", items: HOUSE_ENTRIES },
  { key: "aspect", label: "Aspects", items: ASPECT_ENTRIES },
] as const;
const ELEMENTS: (Element | "All")[] = ["All", "Fire", "Earth", "Air", "Water"];

export default function CosmicAlmanac() {
  const [params, setParams] = useSearchParams();
  const [cat, setCat] = useState<(typeof CATS)[number]["key"]>("sign");
  const [el, setEl] = useState<Element | "All">("All");
  const [q, setQ] = useState("");
  const focus = params.get("focus");
  const [open, setOpen] = useState<AlmanacEntry | null>(null);

  useEffect(() => {
    if (!focus) return;
    const hit = findAlmanacEntry(focus);
    if (hit) { setCat(hit.category); setOpen(hit.entry); }
  }, [focus]);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    const pool = term ? CATS.flatMap(c => c.items) : CATS.find(c => c.key === cat)!.items;
    return pool.filter(e => (el === "All" || e.element === el) &&
      (!term || `${e.name} ${e.meaning} ${e.description}`.toLowerCase().includes(term)));
  }, [cat, el, q]);

  const close = () => { setOpen(null); if (focus) { params.delete("focus"); setParams(params, { replace: true }); } };

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
      <header className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon"><Link to="/cosmic-flow" aria-label="Back to Cosmic Flow"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="font-display text-2xl">Almanac</h1>
          <p className="text-sm text-muted-foreground">A pocket guide to signs, planets, houses and aspects.</p>
        </div>
      </header>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search the almanac…" className="pl-9" aria-label="Search the almanac" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CATS.map(c => (
          <button key={c.key} onClick={() => { setCat(c.key); setQ(""); }} className={cn("rounded-full border px-3 py-1.5 text-sm min-h-9",
            cat === c.key && !q ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted")}>{c.label}</button>
        ))}
        <span className="mx-1 w-px bg-border" />
        {ELEMENTS.map(e => (
          <button key={e} onClick={() => setEl(e)} className={cn("rounded-full border px-3 py-1.5 text-xs min-h-9",
            el === e ? "border-secondary bg-secondary text-secondary-foreground" : "border-border bg-card hover:bg-muted")}>{e}</button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map(e => (
          <button key={e.slug} onClick={() => setOpen(e)} className="rounded-2xl border border-border bg-card p-4 text-left shadow-soft hover:border-primary/40">
            <p className="font-display text-lg">{e.glyph} {e.name} <span className="text-sm">{e.elementGlyph}</span></p>
            <p className="text-sm text-muted-foreground">{e.meaning}</p>
          </button>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">No matches.</p>}
      </div>

      <Sheet open={!!open} onOpenChange={o => !o && close()}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          {open && (
            <div className="space-y-3 text-sm">
              <SheetHeader><SheetTitle className="font-display text-xl">{open.glyph} {open.name}</SheetTitle></SheetHeader>
              <p className="text-foreground/85">{open.description}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><p className="text-xs uppercase tracking-wider text-muted-foreground">In balance</p><ul className="list-disc pl-4">{open.positive.map(x => <li key={x}>{x}</li>)}</ul></div>
                <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Shadow side</p><ul className="list-disc pl-4">{open.negative.map(x => <li key={x}>{x}</li>)}</ul></div>
              </div>
              <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Try</p><ul className="list-disc pl-4">{open.activities.map(x => <li key={x}>{x}</li>)}</ul></div>
              <p><span className="text-muted-foreground">Tarot:</span> <Link className="text-primary hover:underline" to="/cosmic-flow/tarot">{open.tarot}</Link> · <span className="text-muted-foreground">Element:</span> {open.element}</p>
              <blockquote className="border-l-2 border-accent pl-3 font-display italic">“{open.affirmation}”</blockquote>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
