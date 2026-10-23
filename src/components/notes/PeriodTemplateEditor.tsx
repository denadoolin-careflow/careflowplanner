import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NotePropertyType, PeriodKind } from "@/lib/notes";
import {
  ALL_CONNECTIONS, CONNECTION_LABEL, DEFAULT_PERIOD_TEMPLATES, savePeriodTemplates, usePeriodTemplates,
  type PeriodTemplate, type PeriodTemplates,
} from "@/lib/notes/period-templates";

const KINDS: [PeriodKind, string][] = [["daily", "Day"], ["weekly", "Week"], ["monthly", "Month"]];
const TYPES: [NotePropertyType, string][] = [["text", "Text"], ["select", "Choice"], ["multi", "Multi"], ["number", "Number"], ["checkbox", "Checkbox"], ["date", "Date"]];

export function PeriodTemplateEditor({ initialKind = "daily" }: { initialKind?: PeriodKind }) {
  const saved = usePeriodTemplates();
  const [kind, setKind] = useState<PeriodKind>(initialKind);
  const [draft, setDraft] = useState<PeriodTemplates>(saved);
  const [prompt, setPrompt] = useState("");
  const [propName, setPropName] = useState("");
  const [propType, setPropType] = useState<NotePropertyType>("text");
  useEffect(() => { setDraft(saved); }, [saved]);
  const t = draft[kind];
  const patch = (p: Partial<PeriodTemplate>) => setDraft(d => ({ ...d, [kind]: { ...d[kind], ...p } }));

  const save = async () => {
    try { await savePeriodTemplates(draft); toast.success("Templates saved"); }
    catch { toast.error("Couldn't save templates"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {KINDS.map(([k, l]) => <Button key={k} type="button" size="sm" variant={kind === k ? "default" : "outline"} className="h-9 flex-1" onClick={() => setKind(k)}>{l}</Button>)}
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold text-muted-foreground">Prompts (become headings)</p>
        <div className="flex flex-wrap gap-1">
          {t.prompts.map((p, i) => (
            <span key={`${p}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">
              {p}<button type="button" aria-label={`Remove ${p}`} onClick={() => patch({ prompts: t.prompts.filter((_, j) => j !== i) })}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        <form className="mt-2 flex gap-1" onSubmit={e => { e.preventDefault(); if (prompt.trim()) { patch({ prompts: [...t.prompts, prompt.trim()] }); setPrompt(""); } }}>
          <Input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g. Intention for the week" className="h-9 text-sm" />
          <Button type="submit" size="sm" variant="outline" className="h-9"><Plus className="h-4 w-4" /></Button>
        </form>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold text-muted-foreground">Properties</p>
        <ul className="space-y-1">
          {t.properties.map((p, i) => (
            <li key={`${p.name}-${i}`} className="flex items-center gap-2 rounded-lg bg-muted/50 px-2 py-1 text-xs">
              <span className="min-w-0 flex-1 break-words">{p.name}</span>
              <span className="text-muted-foreground">{TYPES.find(x => x[0] === p.type)?.[1]}</span>
              <button type="button" aria-label={`Remove ${p.name}`} onClick={() => patch({ properties: t.properties.filter((_, j) => j !== i) })}><X className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
        <form className="mt-2 flex gap-1" onSubmit={e => { e.preventDefault(); if (propName.trim()) { patch({ properties: [...t.properties, { name: propName.trim(), type: propType }] }); setPropName(""); } }}>
          <Input value={propName} onChange={e => setPropName(e.target.value)} placeholder="e.g. Goal" className="h-9 text-sm" />
          <select value={propType} onChange={e => setPropType(e.target.value as NotePropertyType)} aria-label="Property type" className="h-9 rounded-md border border-input bg-background px-2 text-xs">
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <Button type="submit" size="sm" variant="outline" className="h-9"><Plus className="h-4 w-4" /></Button>
        </form>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold text-muted-foreground">Connections to show</p>
        <div className="flex flex-wrap gap-1">
          {ALL_CONNECTIONS.map(c => {
            const active = t.connections.includes(c);
            return <button key={c} type="button" aria-pressed={active}
              onClick={() => patch({ connections: active ? t.connections.filter(x => x !== c) : [...t.connections, c] })}
              className={cn("min-h-9 rounded-full border px-3 text-xs", active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{CONNECTION_LABEL[c]}</button>;
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => patch(DEFAULT_PERIOD_TEMPLATES[kind])}>Reset {KINDS.find(k => k[0] === kind)?.[1].toLowerCase()}</Button>
        <Button type="button" size="sm" className="ml-auto" onClick={() => void save()}>Save templates</Button>
      </div>
      <p className="text-[11px] text-muted-foreground">New notes use these automatically. Use "Apply template" on older notes — it only adds what's missing.</p>
    </div>
  );
}
