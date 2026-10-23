import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { HeartPulse, Pill, Smile, Target, Users, Wand2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { spanFor, spanDates, toISO } from "@/lib/notes/periods";
import { updateNote, type Note, type PeriodKind } from "@/lib/notes";
import { applyPeriodTemplate, usePeriodTemplates } from "@/lib/notes/period-templates";
import { PeriodTemplateEditor } from "@/components/notes/PeriodTemplateEditor";

interface Row { id: string; label: string; sub?: string; href?: string }

/**
 * Live CareFlow connections for a day/week/month note (goals, mood, meds,
 * people check-ins). Appointments, meals and cosmic events show in the plan above.
 */
export function PeriodConnections({ note, onApplied }: { note: Note; onApplied?: (n: Partial<Note>) => void }) {
  const kind = note.kind as PeriodKind;
  const tpls = usePeriodTemplates();
  const tpl = tpls[kind];
  const { state } = useStore();
  const span = useMemo(() => spanFor(kind, note.date!), [kind, note.date]);
  const from = toISO(span.from), to = toISO(span.to);
  const [mood, setMood] = useState<Row[]>([]);
  const [meds, setMeds] = useState<Row[]>([]);
  const [people, setPeople] = useState<Row[]>([]);
  const on = (k: string) => tpl?.connections.includes(k as any);

  useEffect(() => {
    let off = false;
    if (on("mood")) void supabase.from("daily_checkins").select("iso_date,mood").gte("iso_date", from).lte("iso_date", to).not("mood", "is", null).order("iso_date")
      .then(({ data }) => { if (!off) setMood((data ?? []).map((r: any) => ({ id: r.iso_date, label: String(r.mood), sub: format(new Date(`${r.iso_date}T12:00:00`), "EEE MMM d") }))); });
    if (on("meds")) void supabase.from("medication_logs").select("id,scheduled_date,status,medication_id,medications(name)").gte("scheduled_date", from).lte("scheduled_date", to).limit(200)
      .then(({ data }) => {
        if (off) return;
        const by = new Map<string, { taken: number; total: number }>();
        for (const r of (data ?? []) as any[]) {
          const name = r.medications?.name ?? "Medication";
          const v = by.get(name) ?? { taken: 0, total: 0 };
          v.total++; if (r.status === "taken") v.taken++;
          by.set(name, v);
        }
        setMeds([...by.entries()].map(([n, v]) => ({ id: n, label: n, sub: `${v.taken}/${v.total} taken`, href: "/care" })));
      });
    if (on("connections")) void supabase.from("connection_checkins").select("id,person_name,checked_in_at,note").gte("checked_in_at", `${from}T00:00:00`).lte("checked_in_at", `${to}T23:59:59`).order("checked_in_at")
      .then(({ data }) => { if (!off) setPeople((data ?? []).map((r: any) => ({ id: r.id, label: r.person_name || "Check-in", sub: format(new Date(r.checked_in_at), "EEE MMM d") }))); });
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, tpl?.connections.join()]);

  const goals: Row[] = on("goals")
    ? state.goals.filter(g => g.status === "active").slice(0, 8).map(g => ({ id: g.id, label: g.title, sub: `${g.progress}%`, href: "/goals" }))
    : [];

  const apply = async () => {
    const out = applyPeriodTemplate({ body: note.body, properties: note.properties ?? [] }, tpl);
    if (!out.changed) { toast.message("Template already applied"); return; }
    try { await updateNote(note.id, { body: out.body, properties: out.properties }); onApplied?.({ body: out.body, properties: out.properties }); toast.success("Template applied"); }
    catch { toast.error("Couldn't apply the template"); }
  };

  const sections: [string, any, Row[]][] = [
    ["Goals", Target, goals], ["Mood", Smile, mood], ["Meds", Pill, meds], ["Connections", Users, people],
  ];
  const shown = sections.filter(([, , rows], i) => on(["goals", "mood", "meds", "connections"][i]) && rows.length);

  return (
    <section className="mt-4 rounded-2xl border border-border/60 bg-card/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><HeartPulse className="h-3.5 w-3.5" /> Connections</h3>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="ghost" className="h-9 gap-1 text-xs" onClick={() => void apply()}><Wand2 className="h-3.5 w-3.5" /> Apply template</Button>
          <Dialog>
            <DialogTrigger asChild><Button size="sm" variant="ghost" className="h-9 gap-1 text-xs"><Settings2 className="h-3.5 w-3.5" /> Edit template</Button></DialogTrigger>
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
              <DialogHeader><DialogTitle>Note templates</DialogTitle></DialogHeader>
              <PeriodTemplateEditor initialKind={kind} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Nothing connected for this {kind === "daily" ? "day" : kind === "weekly" ? "week" : "month"} yet. Appointments, meals and cosmic events show in the plan above.</p>
      ) : (
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {shown.map(([title, Icon, rows]) => (
            <div key={title}>
              <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><Icon className="h-3 w-3" /> {title}</p>
              <ul className="space-y-1">
                {rows.map(r => (
                  <li key={r.id} className="flex items-start gap-2 rounded-lg bg-muted/40 px-2 py-1.5 text-xs">
                    {r.href ? <Link to={r.href} className="min-w-0 flex-1 break-words hover:underline">{r.label}</Link> : <span className="min-w-0 flex-1 break-words">{r.label}</span>}
                    {r.sub && <span className="shrink-0 text-muted-foreground">{r.sub}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
