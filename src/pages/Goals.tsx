import { useState } from "react";
import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Trash2 } from "lucide-react";
import { Goal } from "@/lib/types";

const CATS: Goal["category"][] = ["Family","Home","Health","Creative","Financial","Relationship","Personal","Caregiving"];

export default function Goals() {
  const { state, addGoal, updateGoal, deleteGoal } = useStore();
  const [title, setTitle] = useState(""); const [cat, setCat] = useState<Goal["category"]>("Family");

  return (
    <div className="space-y-6">
      <SectionCard title="A new gentle goal" accent="calm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="What matters this season?" value={title} onChange={e => setTitle(e.target.value)} />
          <Select value={cat} onValueChange={(v: any) => setCat(v)}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => { if (!title.trim()) return; addGoal({ title, category: cat }); setTitle(""); }}>Add goal</Button>
        </div>
      </SectionCard>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="quarter">Quarterly</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-3">
          {state.goals.map(g => (
            <div key={g.id} className="cozy-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{g.category} · {g.timeline}</div>
                  <div className="font-display text-lg">{g.title}</div>
                  {g.description && <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteGoal(g.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Progress</span><span>{g.progress}%</span></div>
                <Slider value={[g.progress]} max={100} step={5} onValueChange={(v) => updateGoal(g.id, { progress: v[0] })} />
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(["Family","Home","Health","Creative","Personal","Caregiving","Financial","Relationship"] as Goal["category"][]).map(c => (
              <div key={c} className="cozy-card p-3">
                <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{c}</div>
                <div className="space-y-2">
                  {state.goals.filter(g => g.category === c).map(g => (
                    <div key={g.id} className="rounded-lg bg-muted/40 p-2">
                      <div className="text-sm font-medium">{g.title}</div>
                      <Progress value={g.progress} className="mt-1.5 h-1" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="quarter" className="mt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {(["Q1","Q2","Q3","Q4"] as const).map(q => (
              <SectionCard key={q} title={q} accent="warm">
                {state.goals.filter(g => g.timeline === q).map(g => (
                  <div key={g.id} className="mb-2 rounded-lg bg-muted/40 p-2 text-sm">{g.title}</div>
                ))}
              </SectionCard>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
