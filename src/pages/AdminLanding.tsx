import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LandingColorEditor } from "@/components/landing/LandingColorEditor";
import { DEFAULT_DOC, LandingContentProvider, SECTIONS, TEXT_FIELDS, useLandingContent, type LandingDoc } from "@/lib/landing-content";

function Dashboard() {
  const { doc, loading, isAdmin, save } = useLandingContent();
  const [draft, setDraft] = useState<LandingDoc>(doc);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(doc), [doc]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) return <div className="p-8 text-sm text-muted-foreground">Only admins can edit the landing page.</div>;

  const dirty = JSON.stringify(draft) !== JSON.stringify(doc);
  const onSave = async () => { setSaving(true); if (await save(draft)) toast.success("Landing page updated"); setSaving(false); };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-32 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-foreground">Landing page editor</h1>
          <p className="text-sm text-muted-foreground">Changes go live as soon as you save.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/landing?edit=1" target="_blank"><ExternalLink className="mr-1 h-4 w-4" /> Edit on page</Link></Button>
          <Button onClick={onSave} disabled={!dirty || saving}><Save className="mr-1 h-4 w-4" /> {saving ? "Saving…" : "Save"}</Button>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 font-display text-xl">Sections</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <Label key={s.id} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border/60 px-3">
              {s.label}
              <Switch checked={draft.sections[s.id] !== false} onCheckedChange={(v) => setDraft({ ...draft, sections: { ...draft.sections, [s.id]: v } })} />
            </Label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 font-display text-xl">Theme & colors</h2>
        <LandingColorEditor value={draft.colors} onChange={(colors) => setDraft({ ...draft, colors })} />
      </section>

      {SECTIONS.map((s) => (
        <section key={s.id} className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 font-display text-xl">{s.label}</h2>
          <div className="space-y-3">
            {TEXT_FIELDS.filter((f) => f.section === s.id).map((f) => {
              const v = draft.text[f.key] ?? "";
              const set = (val: string) => setDraft({ ...draft, text: { ...draft.text, [f.key]: val } });
              return (
                <div key={f.key} className="space-y-1">
                  <Label className="flex items-center justify-between text-xs text-muted-foreground">
                    {f.label}
                    {v !== DEFAULT_DOC.text[f.key] && <button type="button" onClick={() => set(DEFAULT_DOC.text[f.key])} className="inline-flex items-center gap-1 text-primary hover:underline"><RotateCcw className="h-3 w-3" /> Reset</button>}
                  </Label>
                  {f.multiline ? <Textarea value={v} onChange={(e) => set(e.target.value)} rows={3} /> : <Input value={v} onChange={(e) => set(e.target.value)} />}
                </div>
              );
            })}
            {s.id === "community" && (
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-semibold">Testimonials</h3>
                {draft.testimonials.map((t, i) => {
                  const upd = (patch: Partial<typeof t>) => setDraft({ ...draft, testimonials: draft.testimonials.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                  return (
                    <div key={i} className="space-y-2 rounded-xl border border-border/60 p-3">
                      <Textarea value={t.quote} onChange={(e) => upd({ quote: e.target.value })} rows={3} aria-label="Quote" />
                      <div className="flex gap-2">
                        <Input value={t.name} onChange={(e) => upd({ name: e.target.value })} placeholder="Name" aria-label="Name" />
                        <Input value={t.avatar} onChange={(e) => upd({ avatar: e.target.value })} placeholder="Photo link (optional)" aria-label="Photo link" />
                        <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => setDraft({ ...draft, testimonials: draft.testimonials.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  );
                })}
                <Button variant="outline" onClick={() => setDraft({ ...draft, testimonials: [...draft.testimonials, { quote: "", name: "", avatar: "" }] })}><Plus className="mr-1 h-4 w-4" /> Add testimonial</Button>
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function AdminLanding() {
  return <LandingContentProvider><Dashboard /></LandingContentProvider>;
}
