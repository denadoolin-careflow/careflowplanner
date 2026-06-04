import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Gift } from "lucide-react";
import { useHolidayPlans } from "@/lib/seasons/hooks";
import type { HolidayPlanCategory } from "@/lib/seasons/types";
import { usHolidaysFor } from "@/lib/us-holidays";
import { daysUntilDate, DEFAULT_HOLIDAY_TIMELINE } from "@/lib/seasons/season-utils";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const CATS: Array<{ value: HolidayPlanCategory; label: string }> = [
  { value: "federal", label: "Federal" },
  { value: "religious", label: "Religious" },
  { value: "family", label: "Family" },
  { value: "seasonal", label: "Seasonal" },
  { value: "custom", label: "Custom" },
];

export default function SeasonsHolidays() {
  const { plans, add } = useHolidayPlans();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [cat, setCat] = useState<HolidayPlanCategory>("family");
  const [budget, setBudget] = useState("");

  const suggestions = useMemo(() => usHolidaysFor(new Date().getFullYear()).slice(0, 8), []);

  const create = async () => {
    if (!name.trim()) return;
    const plan = await add({ customName: name.trim(), customDate: date, category: cat, budgetCents: budget ? Math.round(parseFloat(budget)*100) : 0 });
    if (plan) {
      // Seed default timeline
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase.from("holiday_timeline_steps").insert(
          DEFAULT_HOLIDAY_TIMELINE.map((s, i) => ({ user_id: u.user!.id, holiday_plan_id: plan.id, days_before: s.daysBefore, title: s.title, sort_order: i }))
        );
      }
    }
    setOpen(false); setName(""); setBudget("");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl">Holiday Planner</h1>
          <p className="text-sm text-muted-foreground">Track every holiday with its own prep timeline and budget.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 rounded-full"><Plus className="h-4 w-4" /> New holiday</Button>
      </div>

      <section>
        <h3 className="text-sm font-semibold mb-3">Your plans</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map(p => {
            const d = p.customDate ? daysUntilDate(p.customDate) : null;
            return (
              <Link key={p.id} to={`/seasons/holidays/${p.id}`}>
                <Card className="p-4 hover:shadow-md transition-all h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="h-4 w-4 text-primary" />
                    <div className="font-semibold">{p.customName ?? "Holiday"}</div>
                  </div>
                  {p.customDate && <div className="text-xs text-muted-foreground">{format(parseISO(p.customDate), "MMMM d, yyyy")}</div>}
                  {d !== null && <div className="mt-3 text-3xl font-display">{d}<span className="text-xs text-muted-foreground ml-1">days</span></div>}
                </Card>
              </Link>
            );
          })}
          {plans.length === 0 && <Card className="p-6 col-span-full text-center text-sm text-muted-foreground">No holiday plans yet.</Card>}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-3">Upcoming US holidays</h3>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {suggestions.map(h => (
            <Card key={h.name} className="p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{h.name}</div>
                <div className="text-xs text-muted-foreground">{format(parseISO(h.date), "MMM d")}</div>
              </div>
              <Button variant="outline" size="sm" onClick={async () => {
                const plan = await add({ customName: h.name, customDate: h.date, category: "federal" });
                if (plan) {
                  const { data: u } = await supabase.auth.getUser();
                  if (u.user) {
                    await supabase.from("holiday_timeline_steps").insert(
                      DEFAULT_HOLIDAY_TIMELINE.map((s, i) => ({ user_id: u.user!.id, holiday_plan_id: plan.id, days_before: s.daysBefore, title: s.title, sort_order: i }))
                    );
                  }
                }
              }}>Add</Button>
            </Card>
          ))}
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New holiday plan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              <div>
                <Label>Category</Label>
                <Select value={cat} onValueChange={v => setCat(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Budget ($)</Label><Input type="number" value={budget} onChange={e => setBudget(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={!name.trim()}>Create with default timeline</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}