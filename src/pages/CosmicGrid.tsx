import { useMemo, useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AstroPageHeader, NeedsChart } from "@/components/cosmic/AstroPageHeader";
import { OrbPeakChart } from "@/components/cosmic/OrbPeakChart";
import { SkyRowActions } from "@/components/cosmic/SkyRowActions";
import { BODY_GLYPHS } from "@/lib/cosmic/astro/bodies";
import { ASPECT_GLYPH } from "@/lib/cosmic/glyphs";
import { MAJOR_ASPECTS, transitGrid, type TransitRow } from "@/lib/cosmic/sky";
import { useMyChart } from "@/lib/cosmic/use-my-chart";

type SortKey = "orb" | "transit" | "natal" | "exact";
const FAST = new Set(["Moon"]);

export default function CosmicGrid() {
  const { chart } = useMyChart();
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [sort, setSort] = useState<SortKey>("orb");
  const [hideMoon, setHideMoon] = useState(true);
  const [tone, setTone] = useState<"all" | "harmonious" | "dynamic">("all");
  const [open, setOpen] = useState<TransitRow | null>(null);

  const on = useMemo(() => new Date(date + "T12:00:00"), [date]);
  const rows = useMemo(() => chart ? transitGrid(chart, on) : [], [chart, on]);
  const shown = useMemo(() => rows
    .filter(r => !(hideMoon && FAST.has(r.transit)) && (tone === "all" || r.tone === tone))
    .sort((a, b) => sort === "orb" ? a.orb - b.orb : sort === "exact" ? (a.exactDate?.getTime() ?? 9e15) - (b.exactDate?.getTime() ?? 9e15) : String(a[sort]).localeCompare(String(b[sort]))),
  [rows, hideMoon, tone, sort]);

  const natalLon = (id: string) => id === "Ascendant" ? chart?.houses?.ascendant : id === "Midheaven" ? chart?.houses?.midheaven : chart?.planets.find(p => p.body === id)?.longitude;

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 pb-28">
      <AstroPageHeader title="Transit grid" subtitle="Every transit touching your chart, sortable and filterable." />
      {!chart ? <NeedsChart /> : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input type="date" value={date} onChange={e => setDate(e.target.value || date)} className="rounded-md border border-border bg-background px-2 py-1.5" aria-label="Date" />
            <select value={sort} onChange={e => setSort(e.target.value as SortKey)} className="rounded-md border border-border bg-background px-2 py-1.5" aria-label="Sort by">
              <option value="orb">Tightest first</option><option value="exact">Exact date</option><option value="transit">Transiting planet</option><option value="natal">Natal point</option>
            </select>
            <select value={tone} onChange={e => setTone(e.target.value as any)} className="rounded-md border border-border bg-background px-2 py-1.5" aria-label="Tone">
              <option value="all">All aspects</option><option value="harmonious">Flowing</option><option value="dynamic">Challenging</option>
            </select>
            <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={hideMoon} onChange={e => setHideMoon(e.target.checked)} />Hide Moon</label>
            <span className="text-muted-foreground">{shown.length} transits</span>
          </div>
          <div className="cozy-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr><th className="px-3 py-2">Transit</th><th className="px-3 py-2">Aspect</th><th className="px-3 py-2">Natal</th><th className="px-3 py-2">House</th><th className="px-3 py-2">Orb</th><th className="px-3 py-2">Phase</th><th className="px-3 py-2">Exact</th><th /></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map(r => {
                  const key = `${r.transit}-${r.aspect}-${r.natal}`;
                  const title = `${r.transit} ${r.aspect} natal ${r.natal}`;
                  return (
                    <tr key={key} className={cn("cursor-pointer hover:bg-muted/50", open && `${open.transit}-${open.aspect}-${open.natal}` === key && "bg-muted/60")} onClick={() => setOpen(r)}>
                      <td className="px-3 py-2 whitespace-nowrap">{BODY_GLYPHS[r.transit]} {r.transit}</td>
                      <td className="px-3 py-2 whitespace-nowrap"><span className={r.tone === "dynamic" ? "text-destructive" : r.tone === "harmonious" ? "text-secondary" : ""}>{ASPECT_GLYPH[r.aspect] ?? ""}</span> <span className="capitalize">{r.aspect}</span></td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.natal}</td>
                      <td className="px-3 py-2">{r.house ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{r.orb.toFixed(1)}°</td>
                      <td className="px-3 py-2 text-xs">{r.applying ? "Building" : "Easing"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{r.exactDate ? format(r.exactDate, "MMM d") : "—"}</td>
                      <td className="px-1 py-1" onClick={e => e.stopPropagation()}><SkyRowActions title={title} date={r.exactDate ?? on} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {open && natalLon(open.natal) != null && (
            <section className="cozy-card p-4">
              <p className="font-display text-base capitalize">{open.transit} {open.aspect} your {open.natal}</p>
              <p className="text-xs text-muted-foreground">How this transit tightens and eases over the next {open.transit === "Moon" ? "week" : "6 months"}. Dots mark exact passes.</p>
              <OrbPeakChart body={open.transit} natalLon={natalLon(open.natal)!} angle={MAJOR_ASPECTS.find(a => a.name === open.aspect)!.angle} from={on} days={open.transit === "Moon" ? 7 : 180} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
