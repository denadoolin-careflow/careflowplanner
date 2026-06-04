import { Link } from "react-router-dom";
import { Moon, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EndOfDayCard() {
  return (
    <section className="cozy-card overflow-hidden">
      <div className="relative flex flex-col items-start gap-3 bg-gradient-to-br from-violet-100/70 via-rose-50/40 to-transparent p-5 sm:flex-row sm:items-center sm:justify-between dark:from-violet-900/30 dark:via-rose-900/10">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card/70 text-primary shadow-soft">
            <Moon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold text-foreground">Before today ends…</h3>
            <p className="text-sm italic text-muted-foreground">
              "What would make today feel successful?"
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="rounded-full">
          <Link to="/journal">
            <BookOpen className="mr-1.5 h-3.5 w-3.5" />
            Open Journal
          </Link>
        </Button>
      </div>
    </section>
  );
}