import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AstroPageHeader, NeedsChart } from "@/components/cosmic/AstroPageHeader";
import { computeNatalV2 } from "@/lib/cosmic/chart";
import { BODY_GLYPHS } from "@/lib/cosmic/astro/bodies";
import { ASPECT_GLYPH } from "@/lib/cosmic/glyphs";
import { overlay, synastry } from "@/lib/cosmic/sky";
import { useMyChart } from "@/lib/cosmic/use-my-chart";

interface Saved { id: string; label: string; birth_date: string; birth_time: string | null; birth_tz: string | null; birth_place: string | null }

export default function CosmicCompare() {
  const { chart } = useMyChart();
  const [saved, setSaved] = useState<Saved[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", date: "", time: "" });

  const load = async () => {
    const { data } = await (supabase as any).from("cosmic_compare_charts").select("*").order("created_at");
    setSaved(data ?? []); if (!sel && data?.[0]) setSel(data[0].id);
  };
  useEffect(() => { void load(); }, []);

  const other = saved.find(s => s.id === sel);
  const otherChart = useMemo(() => other ? computeNatalV2({ date: other.birth_date, time: other.birth_time, tz: other.birth_tz, house_system: "whole-sign" }) : null, [other]);
  const hits = useMemo(() => chart && otherChart ? synastry(chart, otherChart) : [], [chart, otherChart]);
  const mineInTheirs = useMemo(() => chart && otherChart ? overlay(chart, otherChart) : [], [chart, otherChart]);
  const theirsInMine = useMemo(() => chart && otherChart ? overlay(otherChart, chart) : [], [chart, otherChart]);

  const add = async () => {
    if (!form.label.trim() || !form.date) { toast.error("Add a name and birth date"); return; }
    const { data: u } = await supabase.auth.getUser(); if (!u.user) return;
    const { data, error } = await (supabase as any).from("cosmic_compare_charts").insert({
      user_id: u.user.id, label: form.label.trim(), birth_date: form.date, birth_time: form.time || null,
      birth_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).select("*").single();
    if (error) { toast.error("Couldn't save that chart"); return; }
    setForm({ label: "", date: "", time: "" }); setSel(data.id); void load();
  };
  const remove = async (id: string) => { await (supabase as any).from("cosmic_compare_charts").delete().eq("id", id); if (sel === id) setSel(null); void load(); };

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 pb-28">
      <AstroPageHeader title="Compare charts" subtitle="See how your chart meets someone you love." />
      {!chart ? <NeedsChart /> : (
        <>
          <section className="cozy-card space-y-3 p-4">
            <div className="flex flex-wrap gap-1.5">
              {saved.map(s => (
                <span key={s.id} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm ${sel === s.id ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                  <button onClick={() => setSel(s.id)}>{s.label}</button>
                  <button aria-label={`Remove ${s.label}`} onClick={() => remove(s.id)}><Trash2 className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-2 text-sm">
              <Input placeholder="Name" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="w-40" aria-label="Name" />
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-40" aria-label="Birth date" />
              <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="w-32" aria-label="Birth time (optional)" />
              <Button onClick={add}>Add person</Button>
            </div>
            <p className="text-xs text-muted-foreground">Birth time is optional; without it, houses use whole signs from noon.</p>
          </section>

          {other && otherChart && (
            <div className="grid gap-3 md:grid-cols-2">
              <section className="cozy-card p-4 md:col-span-2">
                <p className="font-display text-base">Aspects between you and {other.label}</p>
                <ul className="mt-2 grid gap-1 sm:grid-cols-2 text-sm">
                  {hits.slice(0, 30).map(h => (
                    <li key={`${h.a}-${h.aspect}-${h.b}`} className="flex items-center gap-2">
                      <span>{BODY_GLYPHS[h.a as keyof typeof BODY_GLYPHS]} Your {h.a}</span>
                      <span className={h.tone === "dynamic" ? "text-destructive" : "text-secondary"}>{ASPECT_GLYPH[h.aspect] ?? h.aspect}</span>
                      <span>their {h.b}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{h.orb.toFixed(1)}°</span>
                    </li>
                  ))}
                  {hits.length === 0 && <li className="text-muted-foreground">No close aspects.</li>}
                </ul>
              </section>
              <section className="cozy-card p-4 text-sm">
                <p className="font-display text-base">Your planets in their houses</p>
                <ul className="mt-2 space-y-0.5">{mineInTheirs.map(o => <li key={o.body}>{o.body} → house {o.house}</li>)}</ul>
              </section>
              <section className="cozy-card p-4 text-sm">
                <p className="font-display text-base">Their planets in your houses</p>
                <ul className="mt-2 space-y-0.5">{theirsInMine.map(o => <li key={o.body}>{o.body} → house {o.house}</li>)}</ul>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
