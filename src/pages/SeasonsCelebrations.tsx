import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Cake, Heart, Sparkles, Flag, Mountain } from "lucide-react";
import { useCelebrations } from "@/lib/seasons/hooks";
import type { CelebrationKind } from "@/lib/seasons/types";
import { CelebrationEditor } from "@/components/seasons/CelebrationEditor";
import { daysUntilDate } from "@/lib/seasons/season-utils";
import { format, parseISO } from "date-fns";

const ICONS: Record<string, any> = { birthday: Cake, anniversary: Heart, special_event: Sparkles, family_milestone: Mountain, care_milestone: Heart, therapy_win: Sparkles, adoption: Heart, graduation: Flag, custom: Sparkles };

export default function SeasonsCelebrations() {
  const { celebrations, add } = useCelebrations();
  const [filter, setFilter] = useState<"all" | CelebrationKind>("all");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0,10);
    const list = filter === "all" ? celebrations : celebrations.filter(c => c.kind === filter);
    return [...list].sort((a, b) => {
      const ad = a.date >= todayIso ? 0 : 1;
      const bd = b.date >= todayIso ? 0 : 1;
      if (ad !== bd) return ad - bd;
      return a.date.localeCompare(b.date);
    });
  }, [celebrations, filter]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl">Celebrations</h1>
          <p className="text-sm text-muted-foreground">Birthdays, anniversaries, and meaningful milestones.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 rounded-full"><Plus className="h-4 w-4" /> New</Button>
      </div>

      <Tabs value={filter} onValueChange={v => setFilter(v as any)}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="birthday">Birthdays</TabsTrigger>
          <TabsTrigger value="anniversary">Anniversaries</TabsTrigger>
          <TabsTrigger value="family_milestone">Family</TabsTrigger>
          <TabsTrigger value="care_milestone">Care</TabsTrigger>
          <TabsTrigger value="therapy_win">Therapy Wins</TabsTrigger>
          <TabsTrigger value="graduation">Graduations</TabsTrigger>
          <TabsTrigger value="adoption">Adoption</TabsTrigger>
          <TabsTrigger value="special_event">Special</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(c => {
          const Icon = ICONS[c.kind] ?? Sparkles;
          const d = daysUntilDate(c.date);
          return (
            <Link key={c.id} to={`/seasons/celebrations/${c.id}`}>
              <Card className="p-4 hover:shadow-md transition-all h-full">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg grid place-items-center bg-primary/15">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{c.title}</div>
                      <div className="text-xs text-muted-foreground">{format(parseISO(c.date), "MMM d, yyyy")}</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{c.status}</Badge>
                </div>
                <div className="text-3xl font-display mt-3">{d >= 0 ? `${d}` : `${Math.abs(d)}`}</div>
                <div className="text-xs text-muted-foreground">{d >= 0 ? "days to go" : "days ago"}</div>
                {c.theme && <div className="mt-2 text-xs text-muted-foreground">Theme: {c.theme}</div>}
              </Card>
            </Link>
          );
        })}
        {filtered.length === 0 && <Card className="col-span-full p-6 text-center text-sm text-muted-foreground">No celebrations yet.</Card>}
      </div>

      <CelebrationEditor open={open} onOpenChange={setOpen} onSave={async (input) => { await add(input); }} />
    </div>
  );
}