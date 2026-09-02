import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BellRing, CalendarHeart, Download, Syringe, TrendingUp, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { TodayTab } from "@/components/wellflow/TodayTab";
import { FoodTab } from "@/components/wellflow/FoodTab";
import { ProgressTab } from "@/components/wellflow/ProgressTab";
import { Glp1Tab } from "@/components/wellflow/Glp1Tab";
import { GoalsEditor } from "@/components/wellflow/GoalsEditor";
import { LogFoodSheet } from "@/components/wellflow/LogFoodSheet";
import { RemindersSheet } from "@/components/wellflow/RemindersSheet";
import { ExportSheet } from "@/components/wellflow/ExportSheet";
import { CheckInSheet, InjectionSheet, WaterSheet, WeightSheet } from "@/components/wellflow/QuickSheets";
import { initWellflowReminders } from "@/lib/wellflow/reminders";
import { todayISO } from "@/lib/wellflow/types";


const TABS = [
  { key: "today", label: "Today", icon: CalendarHeart, path: "/wellflow" },
  { key: "food", label: "Food", icon: UtensilsCrossed, path: "/wellflow/food" },
  { key: "progress", label: "Progress", icon: TrendingUp, path: "/wellflow/progress" },
  { key: "glp1", label: "GLP-1", icon: Syringe, path: "/wellflow/glp1" },
];

export default function WellFlow() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const active = TABS.some(t => t.key === tab) ? (tab as string) : "today";
  const date = todayISO();

  const [food, setFood] = useState(false);
  const [water, setWater] = useState(false);
  const [weight, setWeight] = useState(false);
  const [injection, setInjection] = useState(false);
  const [checkin, setCheckin] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  /* Keep reminder notifications scheduled while the app is open. */
  useEffect(() => { void initWellflowReminders(); }, []);


  /* Deep links from the global quick-capture FAB: /wellflow?log=food */
  useEffect(() => {
    const log = params.get("log");
    if (!log) return;
    if (log === "food") setFood(true);
    if (log === "water") setWater(true);
    if (log === "weight") setWeight(true);
    if (log === "injection") setInjection(true);
    if (log === "checkin") setCheckin(true);
    const next = new URLSearchParams(params);
    next.delete("log");
    setParams(next, { replace: true });
  }, [params, setParams]);

  const go = (key: string) => {
    const t = TABS.find(x => x.key === key);
    if (t) navigate(t.path);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-28 pt-4 sm:px-4 md:pb-8">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">WellFlow</p>
          <h1 className="font-display text-2xl font-semibold">Nutrition, weight & GLP-1</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track what helps you understand yourself. Let the rest be simple.
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" aria-label="Reminders" onClick={() => setRemindersOpen(true)}>
            <BellRing className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Export my data" onClick={() => setExportOpen(true)}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </header>


      <Tabs value={active} onValueChange={go}>
        <TabsList className="hidden w-full md:grid md:grid-cols-4">
          {TABS.map(t => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="today" className="mt-4">
          <TodayTab
            date={date}
            onLogFood={() => setFood(true)}
            onWater={() => setWater(true)}
            onWeight={() => setWeight(true)}
            onInjection={() => setInjection(true)}
            onGoals={() => setGoalsOpen(true)}
          />
        </TabsContent>
        <TabsContent value="food" className="mt-4">
          <FoodTab date={date} onLogFood={() => setFood(true)} />
        </TabsContent>
        <TabsContent value="progress" className="mt-4">
          <ProgressTab onWeight={() => setWeight(true)} onGoals={() => setGoalsOpen(true)} />
        </TabsContent>
        <TabsContent value="glp1" className="mt-4">
          <Glp1Tab onInjection={() => setInjection(true)} />
        </TabsContent>
      </Tabs>

      {/* Mobile bottom bar */}
      <nav aria-label="WellFlow sections"
           className="fixed inset-x-0 bottom-16 z-30 mx-auto flex max-w-md items-center justify-around rounded-2xl border border-border/50 bg-card/90 px-2 py-1.5 shadow-soft backdrop-blur-xl md:hidden">
        {TABS.map(t => {
          const Icon = t.icon;
          const on = active === t.key;
          return (
            <button key={t.key} type="button" onClick={() => go(t.key)}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] transition-colors",
                      on ? "bg-primary/15 font-semibold text-foreground" : "text-muted-foreground",
                    )}>
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      <LogFoodSheet open={food} onOpenChange={setFood} date={date} />
      <WaterSheet open={water} onOpenChange={setWater} date={date} />
      <WeightSheet open={weight} onOpenChange={setWeight} date={date} />
      <InjectionSheet open={injection} onOpenChange={setInjection} date={date} />
      <CheckInSheet open={checkin} onOpenChange={setCheckin} date={date} />
      <GoalsEditor open={goalsOpen} onOpenChange={setGoalsOpen} />
      <RemindersSheet open={remindersOpen} onOpenChange={setRemindersOpen} />
      <ExportSheet open={exportOpen} onOpenChange={setExportOpen} />

    </div>
  );
}
