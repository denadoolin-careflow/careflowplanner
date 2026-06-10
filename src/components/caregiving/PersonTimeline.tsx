import { useMemo } from "react";
import { useStore } from "@/lib/store";
import type { CareRecipient } from "@/lib/types";
import { SectionCard } from "@/components/cards/SectionCard";
import { format, parseISO } from "date-fns";
import { CheckCircle2, Circle, HeartHandshake, CalendarClock, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

type Item = {
  id: string;
  date: string; // ISO date or datetime
  kind: "task" | "note" | "appointment" | "journal";
  title: string;
  detail?: string;
  done?: boolean;
  href?: string;
};

const KIND_META: Record<Item["kind"], { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  task:        { label: "Care task",   icon: CheckCircle2,   tone: "bg-primary/10 text-primary" },
  note:        { label: "Care note",   icon: HeartHandshake, tone: "bg-accent/20 text-accent-foreground" },
  appointment: { label: "Appointment", icon: CalendarClock,  tone: "bg-secondary/30 text-secondary-foreground" },
  journal:     { label: "Journal",     icon: BookOpen,       tone: "bg-muted text-foreground" },
};

export function PersonTimeline({ recipient }: { recipient: CareRecipient }) {
  const { state } = useStore();

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const rid = recipient.id;
    const nameFull = (recipient.name || "").toLowerCase().trim();
    const nameFirst = nameFull.split(/\s+/)[0] ?? "";

    for (const t of state.tasks ?? []) {
      if (t.recipientId !== rid) continue;
      const date = t.dueDate ?? (t as any).createdAt ?? new Date().toISOString().slice(0,10);
      out.push({
        id: `task:${t.id}`, date, kind: "task",
        title: t.title, detail: t.notes, done: !!t.done,
        href: "/tasks",
      });
    }

    for (const n of state.careNotes ?? []) {
      if (n.recipientId !== rid) continue;
      out.push({
        id: `note:${n.id}`, date: n.date, kind: "note",
        title: n.body, detail: n.tag,
        href: `/caregiving?recipient=${rid}`,
      });
    }

    for (const a of state.appointments ?? []) {
      if (a.recipientId !== rid) continue;
      const date = a.time ? `${a.date}T${a.time}` : a.date;
      out.push({
        id: `appt:${a.id}`, date, kind: "appointment",
        title: a.title,
        detail: [a.time, (a as any).location].filter(Boolean).join(" · ") || undefined,
        href: "/calendar",
      });
    }

    if (nameFirst.length >= 2) {
      for (const j of state.journal ?? []) {
        const hay = `${j.title ?? ""} ${j.body ?? ""}`.toLowerCase();
        const linked = (j.linkedIds ?? []).some(l => l.type === "recipient" && l.id === rid);
        const tokens = hay.replace(/[^a-z0-9\s]+/g, " ").split(/\s+/);
        const mentioned = linked || tokens.includes(nameFirst) || (nameFull.length >= 3 && hay.includes(nameFull));
        if (!mentioned) continue;
        out.push({
          id: `journal:${j.id}`, date: j.date, kind: "journal",
          title: j.title || `${j.type} entry`,
          detail: (j.body || "").slice(0, 140),
          href: "/journal",
        });
      }
    }

    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [state.tasks, state.careNotes, state.appointments, state.journal, recipient.id, recipient.name]);

  // Group by day for a clean chronological feed.
  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const day = it.date.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(it);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <SectionCard
      title={`${recipient.name}'s timeline`}
      subtitle="Care tasks, notes, appointments, and journal mentions — newest first."
      accent="calm"
    >
      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing linked yet. Tasks, notes, appointments, and journal entries that mention {recipient.name} will appear here automatically.
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, list]) => {
            const d = parseISO(day);
            const label = isNaN(d.getTime()) ? day : format(d, "EEEE, MMM d");
            return (
              <div key={day}>
                <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
                <ul className="space-y-2">
                  {list.map(it => {
                    const meta = KIND_META[it.kind];
                    const Icon = meta.icon;
                    const TaskIcon = it.kind === "task" ? (it.done ? CheckCircle2 : Circle) : Icon;
                    return (
                      <li key={it.id} className="flex items-start gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
                        <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${meta.tone}`}>
                          <TaskIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{meta.label}</span>
                            {it.kind === "task" && it.done && (
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">· done</span>
                            )}
                          </div>
                          <div className={`break-words text-sm ${it.kind === "task" && it.done ? "text-muted-foreground line-through" : ""}`}>
                            {it.href ? <Link to={it.href} className="hover:underline">{it.title}</Link> : it.title}
                          </div>
                          {it.detail && (
                            <p className="mt-0.5 break-words text-xs text-muted-foreground">{it.detail}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}