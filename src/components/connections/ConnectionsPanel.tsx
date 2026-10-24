import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Link2, Plus, Sparkles, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useConnections, suggestLinks, TYPE_LABEL, type EntityType, type EntityRef } from "@/lib/connections";

/** Everything linked to one item, a "Link…" search, and suggested (never automatic) links. */
export function ConnectionsPanel({ type, id, className }: { type: EntityType; id: string; className?: string }) {
  const { byKey, items, linksFor, link, unlink } = useConnections();
  const self = byKey.get(`${type}:${id}`);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const connected = linksFor(type, id);
  const keys = useMemo(() => new Set(connected.map(c => `${c.other.type}:${c.other.id}`)), [connected]);
  const suggestions = self ? suggestLinks(self, items, keys, 4) : [];
  const results = q.trim()
    ? items.filter(i => !(i.type === type && i.id === id) && !keys.has(`${i.type}:${i.id}`) && i.title.toLowerCase().includes(q.toLowerCase())).slice(0, 12)
    : [];
  if (!self) return null;
  const doLink = (o: EntityRef) => { void link(self, o); setQ(""); setOpen(false); };

  return (
    <section aria-label="Connections" className={`space-y-2 rounded-xl border border-border/60 bg-card/60 p-3 ${className ?? ""}`}>
      <header className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <h4 className="flex-1 font-display text-sm">Connections</h4>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild><Button size="sm" variant="outline" className="h-9"><Plus className="mr-1 h-3.5 w-3.5" />Link…</Button></PopoverTrigger>
          <PopoverContent className="z-[90] w-[min(22rem,calc(100vw-2rem))] p-2" collisionPadding={16}>
            <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search goals, tasks, notes, library…" className="h-11" />
            <ul className="mt-2 max-h-72 overflow-y-auto">
              {results.map(r => <li key={`${r.type}:${r.id}`}>
                <button type="button" onClick={() => doLink(r)} className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted">
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">{TYPE_LABEL[r.type]}</span>
                  <span className="min-w-0 break-words">{r.title}</span>
                </button>
              </li>)}
              {q.trim() && !results.length && <li className="px-2 py-2 text-xs text-muted-foreground">Nothing found.</li>}
            </ul>
          </PopoverContent>
        </Popover>
      </header>
      {connected.length === 0 && <p className="text-xs text-muted-foreground">Nothing linked yet.</p>}
      <ul className="flex flex-wrap gap-1.5">
        {connected.map(({ other, link: l }) => <li key={`${other.type}:${other.id}`} className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 py-1 pl-2.5 pr-1 text-xs text-primary">
          <span className="text-[10px] uppercase opacity-70">{TYPE_LABEL[other.type]}</span>
          <RouterLink to={other.href} className="min-w-0 break-words hover:underline">{other.title}</RouterLink>
          {l.source === "linked" && l.rowId
            ? <button type="button" aria-label={`Unlink ${other.title}`} onClick={() => unlink(l.rowId!)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-primary/15"><X className="h-3 w-3" /></button>
            : <span className="w-1.5" />}
        </li>)}
      </ul>
      {suggestions.length > 0 && <div className="space-y-1">
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Sparkles className="h-3 w-3" />Suggested</p>
        <ul className="flex flex-wrap gap-1.5">
          {suggestions.map(s => <li key={`${s.type}:${s.id}`}>
            <button type="button" onClick={() => doLink(s)} className="inline-flex min-h-9 max-w-full items-center gap-1 rounded-full border border-dashed border-border px-2.5 text-xs hover:border-primary hover:text-primary">
              <Plus className="h-3 w-3 shrink-0" /><span className="text-[10px] uppercase opacity-70">{TYPE_LABEL[s.type]}</span><span className="min-w-0 break-words">{s.title}</span>
            </button>
          </li>)}
        </ul>
      </div>}
    </section>
  );
}

/** All items connected to a life area's goals, grouped by kind. */
export function LifeAreaRollup({ house }: { house: number }) {
  const { items, linksFor } = useConnections();
  const goals = items.filter(i => i.type === "goal" && i.lifeHouse === house);
  const seen = new Map<string, EntityRef>();
  for (const g of goals) for (const { other } of linksFor("goal", g.id)) seen.set(`${other.type}:${other.id}`, other);
  const groups = (["project", "task", "habit", "note", "library"] as EntityType[]).map(t => [t, [...seen.values()].filter(i => i.type === t)] as const).filter(([, v]) => v.length);
  if (!groups.length) return null;
  return <div className="space-y-2 border-t border-border/60 pt-3">
    <h4 className="font-display text-sm">Connected in this area</h4>
    {groups.map(([t, list]) => <div key={t}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{TYPE_LABEL[t]}s · {list.length}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">{list.slice(0, 12).map(i => <RouterLink key={i.id} to={i.href} className="rounded-full bg-muted px-2.5 py-1 text-xs hover:text-primary">{i.title}</RouterLink>)}</div>
    </div>)}
  </div>;
}
