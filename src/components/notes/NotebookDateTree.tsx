import { useId, useMemo, useState } from "react";
import { format, getDaysInMonth, isValid, parseISO } from "date-fns";
import { BookOpen, ChevronDown, Flower2, Leaf, Snowflake, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Note } from "@/lib/notes";
import { monthKeyFor } from "@/lib/notes/periods";
import { cn } from "@/lib/utils";

const SEASONS = [
  { name: "Winter", icon: Snowflake, months: [0, 1, 11] },
  { name: "Spring", icon: Flower2, months: [2, 3, 4] },
  { name: "Summer", icon: Sun, months: [5, 6, 7] },
  { name: "Autumn", icon: Leaf, months: [8, 9, 10] },
];

export function NotebookDateTree({ notes, selectedMonth, onSelectMonth, filter = "" }: {
  notes: Note[]; selectedMonth?: string | null; onSelectMonth: (key: string) => void; filter?: string;
}) {
  const treeId = useId();
  const current = monthKeyFor(new Date());
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("careflow:notes:notebook-tree") ?? "{}"); } catch { return {}; }
  });
  const toggle = (key: string, defaultOpen: boolean) => setCollapsed(prev => {
    const next = { ...prev, [key]: !(prev[key] ?? !defaultOpen) };
    try { localStorage.setItem("careflow:notes:notebook-tree", JSON.stringify(next)); } catch {}
    return next;
  });
  const years = useMemo(() => {
    const found = new Set([new Date().getFullYear()]);
    notes.forEach(n => { if (n.date && ["daily", "weekly", "monthly"].includes(n.kind)) { const d = parseISO(n.date); if (isValid(d)) found.add(d.getFullYear()); } });
    return [...found].sort((a, b) => b - a);
  }, [notes]);
  const q = filter.trim().toLowerCase();
  const matches = (text: string) => !q || text.toLowerCase().includes(q);
  const open = (key: string, defaultOpen: boolean) => Boolean(q) || !(collapsed[key] ?? !defaultOpen);
  const branch = (key: string, label: string, defaultOpen: boolean, icon?: React.ReactNode) => (
    <Button variant="ghost" onClick={() => toggle(key, defaultOpen)} aria-expanded={open(key, defaultOpen)} aria-controls={`${treeId}-notebook-${key}`}
      className="min-h-11 w-full justify-start gap-1.5 rounded-lg px-2 text-xs">
      <ChevronDown aria-hidden className={cn("h-3.5 w-3.5", !open(key, defaultOpen) && "-rotate-90")} />{icon}{label}
    </Button>
  );
  if (!years.some(year => SEASONS.some(s => s.months.some(m => matches(`Notebooks ${year} ${s.name} ${format(new Date(year, m, 1), "MMMM yyyy")}`))))) return null;
  return <section aria-label="Notebooks by date">
    {branch("root", "Notebooks", true, <BookOpen aria-hidden className="h-4 w-4 text-primary" />)}
    {open("root", true) && <div id={`${treeId}-notebook-root`} className="ml-2 border-l border-border/60 pl-1">
      {years.map(year => {
        const yearCurrent = year === Number(current.slice(0, 4));
        const seasons = SEASONS.filter(s => s.months.some(m => matches(`Notebooks ${year} ${s.name} ${format(new Date(year, m, 1), "MMMM yyyy")}`)));
        if (!seasons.length) return null;
        return <div key={year}>
          {branch(String(year), String(year), yearCurrent || selectedMonth?.startsWith(String(year)) === true)}
          {open(String(year), yearCurrent || selectedMonth?.startsWith(String(year)) === true) && <div id={`${treeId}-notebook-${year}`} className="ml-2 border-l border-border/60 pl-1">
            {seasons.map(season => {
              const key = `${year}-${season.name}`;
              const contains = season.months.some(m => monthKeyFor(new Date(year, m, 1)) === (selectedMonth ?? current));
              return <div key={key}>
                {branch(key, season.name, contains, <season.icon aria-hidden className="h-3.5 w-3.5 text-primary" />)}
                {open(key, contains) && <ul id={`${treeId}-notebook-${key}`} className="ml-2 border-l border-border/60 pl-1">
                  {season.months.filter(m => matches(`Notebooks ${year} ${season.name} ${format(new Date(year, m, 1), "MMMM yyyy")}`)).map(m => {
                    const date = new Date(year, m, 1); const month = monthKeyFor(date);
                    const written = new Set(notes.filter(n => n.kind === "daily" && n.date?.startsWith(month.slice(0, 7)) && n.body.trim()).map(n => n.date)).size;
                    const isCurrent = month === current; const active = month === selectedMonth;
                    return <li key={month}><Button variant="ghost" onClick={() => onSelectMonth(month)} aria-current={active ? "page" : isCurrent ? "date" : undefined}
                      aria-label={`Open ${format(date, "MMMM yyyy")} notebook${isCurrent ? ", current month" : ""}, ${written} written daily entries`}
                      className={cn("min-h-11 w-full justify-start gap-1 rounded-lg px-2 text-xs", isCurrent && "border border-primary/40 bg-primary/10 font-semibold text-foreground", active && "ring-2 ring-ring ring-inset")}>
                      <span className="min-w-0 flex-1 truncate text-left">{format(date, "MMMM")}</span>
                      {isCurrent && <span className="text-[9px] text-primary">Now</span>}
                      <span aria-hidden className="text-[10px] text-muted-foreground">{written}/{getDaysInMonth(date)}</span>
                    </Button></li>;
                  })}
                </ul>}
              </div>;
            })}
          </div>}
        </div>;
      })}
    </div>}
  </section>;
}