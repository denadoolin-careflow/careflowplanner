import { useState } from "react";
import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO } from "date-fns";
import { Trash2, Search } from "lucide-react";
import { JournalEntry } from "@/lib/types";

const TYPES: JournalEntry["type"][] = ["daily","weekly","monthly","yearly","gratitude","brain-dump","burnout"];
const PROMPTS = ["A small thing already going right…", "What I'm letting go of…", "What I need more of…", "Caregiver burnout check: what is full, what is empty?", "Something that made me laugh this week", "What would 'enough' look like today?"];

export default function Journal() {
  const { state, addJournal, deleteJournal } = useStore();
  const [body, setBody] = useState(""); const [type, setType] = useState<JournalEntry["type"]>("daily"); const [title, setTitle] = useState(""); const [filter, setFilter] = useState<"all" | JournalEntry["type"]>("all"); const [q, setQ] = useState("");

  const filtered = state.journal.filter(e =>
    (filter === "all" || e.type === filter) &&
    (q === "" || (e.body + (e.title ?? "")).toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-warm p-6">
        <h2 className="font-display text-3xl font-semibold">Journal</h2>
        <p className="mt-1 text-sm text-muted-foreground">Soft pages. No pressure.</p>
      </div>

      <SectionCard title="New entry" accent="warm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} />
          <Select value={type} onValueChange={(v: any) => setType(v)}>
            <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Textarea rows={5} placeholder="Write a sentence. That's enough." className="mt-2" value={body} onChange={e => setBody(e.target.value)} />
        <Button className="mt-2" onClick={() => { if (!body.trim()) return; addJournal({ body, type, title: title || undefined }); setBody(""); setTitle(""); }}>Save</Button>
      </SectionCard>

      <SectionCard title="Prompts" accent="sage">
        <ul className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          {PROMPTS.map(p => <li key={p} className="rounded-lg bg-muted/40 px-3 py-2 font-display">{p}</li>)}
        </ul>
      </SectionCard>

      <SectionCard
        title="Entries"
        accent="calm"
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-8 w-44 pl-7 text-xs" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} />
            </div>
          </div>
        }
      >
        <Tabs value={filter} onValueChange={(v: any) => setFilter(v)} className="mb-3">
          <TabsList className="flex-wrap">
            <TabsTrigger value="all">All</TabsTrigger>
            {TYPES.map(t => <TabsTrigger key={t} value={t}>{t}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <ul className="space-y-3">
          {filtered.map(e => (
            <li key={e.id} className="group rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{format(parseISO(e.date), "MMM d, yyyy")} · {e.type}</span>
                <button onClick={() => deleteJournal(e.id)} className="opacity-0 group-hover:opacity-60"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              {e.title && <div className="mt-1 font-display text-base">{e.title}</div>}
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{e.body}</p>
            </li>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
        </ul>
      </SectionCard>
    </div>
  );
}
