import { useMemo, useState } from "react";
import { useStore, todayISO } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Plus, Heart, Baby, Dog, User, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { openTaskEditor } from "@/lib/open-task-editor";

type Scope = "today" | "week" | "upcoming";

function iconFor(kind: string) {
  if (kind === "child") return Baby;
  if (kind === "pet") return Dog;
  if (kind === "partner") return Heart;
  if (kind === "elder") return UserRound;
  return User;
}

export function WhoNeedsMeWidget() {
  const { state } = useStore();
  const [scope, setScope] = useState<Scope>("today");
  const T = todayISO();

  const rangeMatcher = useMemo(() => {
    if (scope === "today") return (d?: string) => d === T;
    if (scope === "week") {
      const now = new Date();
      const end = new Date(now); end.setDate(now.getDate() + 7);
      const endISO = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
      return (d?: string) => !!d && d >= T && d <= endISO;
    }
    return (d?: string) => !!d && d >= T;
  }, [scope, T]);

  const grouped = useMemo(() => {
    const recipients = state.recipients ?? [];
    return recipients.map((r) => {
      const tasks = state.tasks
        .filter((t) => !t.done && t.recipientId === r.id && rangeMatcher(t.dueDate ?? undefined))
        .slice(0, 4);
      const appts = state.appointments
        .filter((a) => a.recipientId === r.id && rangeMatcher(a.date))
        .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
        .slice(0, 4);
      return { recipient: r, tasks, appts };
    }).filter((g) => g.tasks.length || g.appts.length || scope === "today");
  }, [state.recipients, state.tasks, state.appointments, rangeMatcher, scope]);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-full bg-muted/60 p-1 text-xs">
        {(["today", "week", "upcoming"] as Scope[]).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={cn(
              "flex-1 rounded-full px-2 py-1 capitalize transition-colors",
              scope === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {grouped.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Add people you care for in <span className="italic">Caregiving</span> to see their day at a glance.
        </p>
      )}

      <div className="space-y-3">
        {grouped.map(({ recipient, tasks, appts }) => {
          const Icon = iconFor(recipient.kind);
          return (
            <div key={recipient.id} className="rounded-2xl bg-muted/40 p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-primary-foreground/80">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{recipient.name}</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label={`Add task for ${recipient.name}`}
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent("careflow:quick-add", {
                      detail: { tab: "task", recipientId: recipient.id },
                    }))
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {appts.length === 0 && tasks.length === 0 ? (
                <p className="pl-10 text-xs text-muted-foreground">Nothing on the schedule.</p>
              ) : (
                <ul className="space-y-1 pl-10">
                  {appts.map((a) => (
                    <li key={a.id} className="truncate text-xs text-foreground/80">
                      • {a.time ?? ""} {a.title}
                    </li>
                  ))}
                  {tasks.map((t) => (
                    <li
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openTaskEditor(t.id)}
                      className="cursor-pointer truncate text-xs text-foreground/80 hover:text-foreground"
                    >
                      • {t.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}