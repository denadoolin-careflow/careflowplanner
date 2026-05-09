import { useState } from "react";
import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb, Trash2, Target, Check } from "lucide-react";
import { toast } from "sonner";

const CATS = ["app ideas","family ideas","home ideas","creative ideas","money ideas","meal ideas","gift ideas","future plans"];

export default function Ideas() {
  const { state, addIdea, deleteIdea, addGoal, addTask } = useStore();
  const [title, setTitle] = useState(""); const [cat, setCat] = useState("future plans");

  return (
    <div className="space-y-6">
      <div className="cozy-card gradient-sage p-6">
        <h2 className="font-display text-3xl font-semibold">Idea inbox</h2>
        <p className="mt-1 text-sm text-muted-foreground">Catch the spark. Sort it later.</p>
      </div>

      <SectionCard title="Capture" accent="sage">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="A new spark…" value={title} onChange={e => setTitle(e.target.value)} />
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => { if (!title.trim()) return; addIdea({ title, category: cat }); setTitle(""); }}>Add</Button>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CATS.map(c => {
          const items = state.ideas.filter(i => i.category === c);
          if (items.length === 0) return null;
          return (
            <SectionCard key={c} title={c} accent="warm">
              <ul className="space-y-2">
                {items.map(i => (
                  <li key={i.id} className="group flex items-start gap-2 rounded-xl bg-muted/40 p-3">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
                    <span className="flex-1 text-sm">{i.title}</span>
                    <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Convert to goal" onClick={() => { addGoal({ title: i.title }); deleteIdea(i.id); toast.success("Converted to goal."); }}><Target className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Convert to task" onClick={() => { addTask({ title: i.title }); deleteIdea(i.id); toast.success("Converted to task."); }}><Check className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteIdea(i.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
