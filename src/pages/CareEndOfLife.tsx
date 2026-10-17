/** End-of-life guide, planning checklists and a private document vault. General guidance only. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Eye, FileText, Plus, Trash2, Upload, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { DOC_CATEGORIES, EOL_GROUPS, EOL_PHASES, progress, seedRows } from "@/lib/eol-checklists";

const GUIDE = [
  { t: "What to expect in the final weeks, days and hours", b: ["Sleeping more, eating and drinking less, and withdrawing gently are common and natural.", "Breathing may change — pauses, or a rattling sound. Repositioning and mouth care help comfort.", "Hands and feet may cool or look mottled. Hearing is thought to stay, so keep speaking softly."], n: "Ask the hospice nurse which signs to call about, day or night." },
  { t: "Caring for yourself during hospice", b: ["You don't have to do it all. Hospice offers respite care and volunteers.", "Eat, drink water and rest in short shifts. Take turns with others for nights.", "Mixed feelings — love, exhaustion, even relief — are all normal."], n: "Name one person who can take a shift this week." },
  { t: "Talking with family and children", b: ["Use simple, honest words. Children do best with clear language like \"dying\".", "Let people say what matters: thank you, I'm sorry, I forgive you, I love you, goodbye.", "Visits can be short. Quiet presence counts."], n: "Share a short update with family so you only explain once." },
  { t: "The first hours after a death", b: ["There is no rush. You may sit, pray, or hold their hand as long as you need.", "Call the hospice nurse first — not 911. They confirm the death and help with next calls.", "The funeral home comes when you are ready."], n: "Keep the hospice and funeral home numbers in your Documents tab." },
  { t: "Grief guide", b: ["Grief comes in waves — tiredness, fog, anger, numbness, and moments of laughter are all part of it.", "The first weeks are often busy; the hardest days may come later, when things go quiet.", "Birthdays, holidays and anniversaries can bring grief back. Plan something gentle for those days.", "If grief stops you from functioning for a long time, or you feel unsafe, reach out to a grief counselor, hospice bereavement team or your doctor. In the US, call or text 988 in a crisis."], n: "Hospice offers free bereavement support for about 13 months — ask about it.", link: true },
];

interface Item { id: string; group: string; phase: string; title: string; done: boolean; notes: string | null; document_id: string | null; sort: number }
interface Doc { id: string; category: string; title: string; file_path: string; mime: string | null; original_location: string | null; notes: string | null; doc_date: string | null; recipient_id: string | null }

export default function CareEndOfLife() {
  const { state, addTask } = useStore() as any;
  const recipients: { id: string; name: string }[] = state.recipients ?? [];
  const [personId, setPersonId] = useState<string>(() => localStorage.getItem("careflow:eol-person") ?? "");
  useEffect(() => { if (!personId && recipients[0]) setPersonId(recipients[0].id); }, [recipients, personId]);
  useEffect(() => { if (personId) localStorage.setItem("careflow:eol-person", personId); }, [personId]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 pb-28">
      <header className="space-y-1">
        <h1 className="font-display text-3xl text-foreground">End-of-life support</h1>
        <p className="text-sm text-muted-foreground">A gentle guide, planning checklists and a private place for important papers. General guidance — not medical or legal advice.</p>
        {recipients.length > 0 && (
          <label className="flex items-center gap-2 pt-2 text-sm">For
            <select className="rounded-md border border-input bg-card px-2 py-1" value={personId} onChange={(e) => setPersonId(e.target.value)}>
              {recipients.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
        )}
      </header>
      <Tabs defaultValue="guide">
        <TabsList><TabsTrigger value="guide">Guide</TabsTrigger><TabsTrigger value="check">Checklists</TabsTrigger><TabsTrigger value="docs">Documents</TabsTrigger></TabsList>
        <TabsContent value="guide"><Guide /></TabsContent>
        <TabsContent value="check"><Checklists personId={personId || null} addTask={addTask} /></TabsContent>
        <TabsContent value="docs"><Documents personId={personId || null} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Guide() {
  return (
    <SectionCard title="Caregiver & grief guide">
      <Accordion type="multiple" className="w-full">
        {GUIDE.map((g) => (
          <AccordionItem key={g.t} value={g.t}>
            <AccordionTrigger className="text-left font-display text-lg">{g.t}</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <ul className="list-disc space-y-1 pl-5">{g.b.map((x) => <li key={x}>{x}</li>)}</ul>
              <p className="rounded-md bg-secondary-soft p-2 text-secondary-foreground">Gentle next step: {g.n}</p>
              {g.link && <Link to="/seasons" className="text-primary underline">Open Remembrance in Seasons</Link>}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </SectionCard>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 14, c = 2 * Math.PI * r;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-label={`${pct}% done`}>
      <circle cx="18" cy="18" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
      <circle cx="18" cy="18" r={r} fill="none" stroke="hsl(var(--secondary-foreground))" strokeWidth="4" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 18 18)" strokeLinecap="round" />
    </svg>
  );
}

function Checklists({ personId, addTask }: { personId: string | null; addTask: any }) {
  const [items, setItems] = useState<Item[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    let q = supabase.from("eol_checklist_items").select("*").order("sort");
    q = personId ? q.eq("recipient_id", personId) : q.is("recipient_id", null);
    const { data } = await q;
    if (data && data.length === 0) {
      await supabase.from("eol_checklist_items").insert(seedRows(personId) as any);
      return load();
    }
    setItems((data as any) ?? []);
    const { data: d } = await supabase.from("eol_documents").select("*").order("created_at", { ascending: false });
    setDocs((d as any) ?? []);
  }, [personId]);
  useEffect(() => { load(); }, [load]);

  const patch = async (id: string, p: Partial<Item>) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
    await supabase.from("eol_checklist_items").update(p as any).eq("id", id);
  };
  const add = async (group: string) => {
    const title = draft[group]?.trim(); if (!title) return;
    await supabase.from("eol_checklist_items").insert({ group, phase: "before", title, recipient_id: personId, sort: items.length } as any);
    setDraft((d) => ({ ...d, [group]: "" })); load();
  };
  const remove = async (id: string) => { await supabase.from("eol_checklist_items").delete().eq("id", id); load(); };
  const toPlanner = async (it: Item, days: number) => {
    const d = new Date(); d.setDate(d.getDate() + days);
    await addTask({ title: it.title, area: "Caregiving", dueDate: d.toISOString().slice(0, 10), recipientId: personId ?? undefined });
    toast.success(days ? "Added to tomorrow" : "Added to today");
  };

  return (
    <div className="space-y-3">
      {EOL_GROUPS.map((g) => {
        const gi = items.filter((i) => i.group === g.id);
        const p = progress(gi);
        return (
          <SectionCard key={g.id} title={g.label} action={<div className="flex items-center gap-2 text-xs text-muted-foreground"><Ring pct={p.pct} />{p.done}/{p.total}</div>}>
            {EOL_PHASES.map((ph) => {
              const pi = gi.filter((i) => i.phase === ph.id);
              if (!pi.length) return null;
              return (
                <div key={ph.id} className="mb-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{ph.label}</p>
                  <ul className="space-y-2">
                    {pi.map((it) => (
                      <li key={it.id} className="rounded-md border border-border p-2">
                        <div className="flex items-start gap-2">
                          <Checkbox className="mt-0.5" checked={it.done} onCheckedChange={(v) => patch(it.id, { done: !!v })} aria-label={it.title} />
                          <span className={it.done ? "flex-1 text-muted-foreground line-through" : "flex-1"}>{it.title}</span>
                          <Button size="sm" variant="ghost" onClick={() => toPlanner(it, 0)} title="Add to today"><CalendarPlus className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => toPlanner(it, 1)}>Tmrw</Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(it.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 pl-6">
                          <Input className="h-8 flex-1 text-xs" placeholder="Notes" defaultValue={it.notes ?? ""} onBlur={(e) => e.target.value !== (it.notes ?? "") && patch(it.id, { notes: e.target.value })} />
                          <select className="h-8 rounded-md border border-input bg-card px-1 text-xs" value={it.document_id ?? ""} onChange={(e) => patch(it.id, { document_id: e.target.value || null })}>
                            <option value="">Link a document…</option>
                            {docs.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                          </select>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            <div className="flex gap-2">
              <Input placeholder="Add your own item" value={draft[g.id] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [g.id]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add(g.id)} />
              <Button onClick={() => add(g.id)} aria-label="Add item"><Plus className="h-4 w-4" /></Button>
            </div>
          </SectionCard>
        );
      })}
    </div>
  );
}

function Documents({ personId }: { personId: string | null }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [cat, setCat] = useState("eol");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase.from("eol_documents").select("*").order("created_at", { ascending: false });
    setDocs((data as any) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id; if (!uid) { setBusy(false); return toast.error("Please sign in"); }
    for (const f of Array.from(files)) {
      const path = `${uid}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("eol-documents").upload(path, f);
      if (error) { toast.error(`Couldn't upload ${f.name}`); continue; }
      await supabase.from("eol_documents").insert({ category: cat, title: f.name, file_path: path, mime: f.type, size: f.size, recipient_id: personId } as any);
    }
    setBusy(false); toast.success("Saved privately"); load();
  };
  const patch = async (id: string, p: Partial<Doc>) => {
    setDocs((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
    await supabase.from("eol_documents").update(p as any).eq("id", id);
  };
  const open = async (d: Doc, download = false) => {
    const { data } = await supabase.storage.from("eol-documents").createSignedUrl(d.file_path, 300, download ? { download: d.title } : undefined);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };
  const remove = async (d: Doc) => {
    if (!confirm(`Delete "${d.title}"?`)) return;
    await supabase.storage.from("eol-documents").remove([d.file_path]);
    await supabase.from("eol_documents").delete().eq("id", d.id); load();
  };
  const grouped = useMemo(() => DOC_CATEGORIES.map((c) => ({ ...c, docs: docs.filter((d) => d.category === c.id) })), [docs]);

  return (
    <div className="space-y-3">
      <SectionCard title="Add documents">
        <p className="mb-2 text-sm text-muted-foreground">PDFs, photos or Word files. Only you can see them.</p>
        <div className="flex flex-wrap items-center gap-2">
          <select className="h-10 rounded-md border border-input bg-card px-2 text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>
            {DOC_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm text-primary-foreground">
            <Upload className="h-4 w-4" />{busy ? "Uploading…" : "Upload"}
            <input type="file" multiple className="hidden" accept=".pdf,image/*,.doc,.docx" onChange={(e) => upload(e.target.files)} />
          </label>
        </div>
      </SectionCard>
      {grouped.filter((g) => g.docs.length).map((g) => (
        <SectionCard key={g.id} title={`${g.label} (${g.docs.length})`}>
          <ul className="space-y-2">
            {g.docs.map((d) => (
              <li key={d.id} className="space-y-1 rounded-md border border-border p-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input className="h-8 flex-1" defaultValue={d.title} onBlur={(e) => e.target.value && e.target.value !== d.title && patch(d.id, { title: e.target.value })} aria-label="Title" />
                  <Button size="sm" variant="ghost" onClick={() => open(d)} aria-label="Preview"><Eye className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => open(d, true)} aria-label="Download"><Download className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(d)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="grid gap-2 pl-6 sm:grid-cols-3">
                  <select className="h-8 rounded-md border border-input bg-card px-1 text-xs" value={d.category} onChange={(e) => patch(d.id, { category: e.target.value })}>
                    {DOC_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <Input type="date" className="h-8 text-xs" defaultValue={d.doc_date ?? ""} onBlur={(e) => patch(d.id, { doc_date: e.target.value || null })} />
                  <Input className="h-8 text-xs" placeholder="Original kept where?" defaultValue={d.original_location ?? ""} onBlur={(e) => patch(d.id, { original_location: e.target.value })} />
                  <Input className="h-8 text-xs sm:col-span-3" placeholder="Notes" defaultValue={d.notes ?? ""} onBlur={(e) => patch(d.id, { notes: e.target.value })} />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      ))}
    </div>
  );
}
