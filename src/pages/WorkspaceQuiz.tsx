import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { useTodayPrefs } from "@/lib/today-view";
import { recommendWorkspace, type QuizAnswers } from "@/lib/workspace-quiz";
import { LIFE_AREAS, LIFE_HOUSES } from "@/lib/goals/life-areas";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type Opt = { v: any; label: string };
const STEPS: { key: keyof QuizAnswers; q: string; opts?: Opt[]; multi?: boolean }[] = [
  { key: "season", q: "How does this season of life feel?", opts: [
    { v: "steady", label: "Fairly steady" }, { v: "busy", label: "Very full and busy" },
    { v: "transition", label: "In transition" }, { v: "recovering", label: "Recovering or resting" }] },
  { key: "role", q: "Who are you caring for right now?", opts: [
    { v: "self", label: "Mostly myself" }, { v: "parent", label: "Kids or family at home" },
    { v: "caregiver", label: "A loved one who needs care" }, { v: "both", label: "Family and a loved one" }] },
  { key: "areas", q: "Which life areas matter most right now? (up to 3)", multi: true },
  { key: "energy", q: "How does your energy move?", opts: [
    { v: "morning", label: "Best in the morning" }, { v: "evening", label: "Best later in the day" },
    { v: "cycle", label: "It follows my cycle" }, { v: "varies", label: "It changes with the moon or mood" }] },
  { key: "start", q: "What would you like to see first when you open CareFlow?", opts: [
    { v: "/", label: "Today" }, { v: "/planner", label: "Planner" }, { v: "/notes", label: "Notes" }, { v: "/goals", label: "Goals" }] },
  { key: "quickAdd", q: "Show a quick-add bar on Today?", opts: [{ v: true, label: "Yes, keep it handy" }, { v: false, label: "No, keep Today calm" }] },
  { key: "nudges", q: "Would you like gentle nudges from Carey on Today?", opts: [{ v: true, label: "Yes please" }, { v: false, label: "Not right now" }] },
];

export default function WorkspaceQuiz() {
  const { addGoal, updateProfile } = useStore();
  const [, setTodayPrefs] = useTodayPrefs();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [a, setA] = useState<QuizAnswers>({});
  const [pick, setPick] = useState({ goals: true, start: true, today: true });
  const done = step >= STEPS.length;
  const rec = recommendWorkspace(a);
  const cur = STEPS[step];

  const save = async (applied: boolean) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("workspace_profiles").upsert({ user_id: u.user.id, answers: a as any, recommendations: rec as any,
      completed_at: applied ? new Date().toISOString() : null, dismissed_at: applied ? null : new Date().toISOString(), updated_at: new Date().toISOString() });
  };
  const apply = async () => {
    if (pick.goals) for (const g of rec.goals) await addGoal({ title: g.title, lifeHouse: g.lifeHouse, timeline: "Year" } as any);
    if (pick.today) setTodayPrefs(rec.todayPrefs);
    if (pick.start) await updateProfile({ default_route: rec.startRoute });
    await save(true);
    toast.success("Your workspace is set up");
    nav("/goals");
  };

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-6 pb-28">
      <header className="space-y-1">
        <p className="flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground"><Sparkles className="h-3.5 w-3.5" />Workspace quiz</p>
        <h1 className="font-display text-3xl">Shape CareFlow around you</h1>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(Math.min(step, STEPS.length) / STEPS.length) * 100}%` }} /></div>
      </header>

      {!done ? (
        <section className="cozy-card space-y-4 p-4">
          <h2 className="font-display text-xl">{cur.q}</h2>
          {cur.multi ? (
            <div className="grid grid-cols-2 gap-2">
              {LIFE_HOUSES.map(h => {
                const on = a.areas?.includes(h) ?? false;
                return <button key={h} type="button" aria-pressed={on} disabled={!on && (a.areas?.length ?? 0) >= 3}
                  onClick={() => setA(x => ({ ...x, areas: on ? x.areas!.filter(y => y !== h) : [...(x.areas ?? []), h] }))}
                  className={`min-h-12 rounded-xl border px-3 py-2 text-left text-sm disabled:opacity-40 ${on ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                  {LIFE_AREAS[h].label}
                </button>;
              })}
            </div>
          ) : (
            <div className="grid gap-2">
              {cur.opts!.map(o => <button key={String(o.v)} type="button" onClick={() => { setA(x => ({ ...x, [cur.key]: o.v })); setStep(s => s + 1); }}
                className={`min-h-12 rounded-xl border px-3 text-left text-sm ${a[cur.key] === o.v ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}>{o.label}</button>)}
            </div>
          )}
          <div className="flex justify-between">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(s => s - 1)}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
            {cur.multi && <Button onClick={() => setStep(s => s + 1)}>Next<ArrowRight className="ml-1 h-4 w-4" /></Button>}
          </div>
        </section>
      ) : (
        <section className="cozy-card space-y-4 p-4">
          <h2 className="font-display text-xl">Your suggested workspace</h2>
          <label className="flex items-start gap-3"><Checkbox className="mt-1" checked={pick.goals} onCheckedChange={v => setPick(p => ({ ...p, goals: !!v }))} />
            <span className="text-sm"><b>Starter goals</b>{rec.goals.length ? rec.goals.map(g => <span key={g.lifeHouse} className="block text-muted-foreground">{LIFE_AREAS[g.lifeHouse].label}: {g.title}</span>) : <span className="block text-muted-foreground">None — pick life areas to get some.</span>}</span></label>
          <label className="flex items-start gap-3"><Checkbox className="mt-1" checked={pick.start} onCheckedChange={v => setPick(p => ({ ...p, start: !!v }))} />
            <span className="text-sm"><b>Start page</b><span className="block text-muted-foreground">{STEPS[4].opts!.find(o => o.v === rec.startRoute)?.label ?? "Today"}</span></span></label>
          <label className="flex items-start gap-3"><Checkbox className="mt-1" checked={pick.today} onCheckedChange={v => setPick(p => ({ ...p, today: !!v }))} />
            <span className="text-sm"><b>Today</b><span className="block text-muted-foreground">Quick add {rec.todayPrefs.showQuickAdd ? "on" : "off"} · Carey nudges {rec.todayPrefs.showCareyNudges ? "on" : "off"}</span></span></label>
          <div className="text-sm"><b>Pages worth visiting</b>
            <div className="mt-1 flex flex-wrap gap-1.5">{rec.pages.map(p => <Link key={p.to} to={p.to} className="rounded-full bg-muted px-3 py-1.5 text-xs hover:text-primary">{p.label}</Link>)}</div></div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={apply}><Check className="mr-1 h-4 w-4" />Apply selected</Button>
            <Button variant="outline" onClick={() => setStep(0)}>Retake</Button>
            <Button variant="ghost" onClick={async () => { await save(false); nav("/"); }}>Skip</Button>
          </div>
        </section>
      )}
    </div>
  );
}

/** One-time Today invitation to take the quiz; hidden once taken or dismissed. */
export function WorkspaceQuizInvite() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    void supabase.from("workspace_profiles").select("user_id").maybeSingle().then(({ data, error }) => { if (!error && !data) setShow(true); });
  }, []);
  if (!show) return null;
  const dismiss = async () => {
    setShow(false);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) await supabase.from("workspace_profiles").upsert({ user_id: u.user.id, dismissed_at: new Date().toISOString() });
  };
  return <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/25 bg-primary/5 p-3 text-sm">
    <Sparkles className="h-4 w-4 text-primary" /><span className="min-w-0 flex-1">Take a 2-minute quiz to shape CareFlow around you.</span>
    <Button asChild size="sm"><Link to="/workspace-quiz">Start</Link></Button>
    <Button size="sm" variant="ghost" onClick={dismiss}>Not now</Button>
  </div>;
}
