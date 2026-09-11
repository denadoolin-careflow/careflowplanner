import type { ReactNode } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { Task } from "@/lib/types";
import type { CosmicCalendarItem } from "@/lib/cosmic/calendar-feed";
import { taskTime } from "@/lib/planner/day-plan";

function Peek({ children, content }: { children: ReactNode; content: ReactNode }) {
  return (
    <HoverCard openDelay={180} closeDelay={80}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent align="start" className="w-64 text-[11.5px] leading-relaxed">{content}</HoverCardContent>
    </HoverCard>
  );
}

export function TaskPeek({ task, children }: { task: Task; children: ReactNode }) {
  const time = taskTime(task);
  return (
    <Peek content={
      <div className="space-y-1">
        <p className="font-medium [overflow-wrap:anywhere]">{task.title}</p>
        <p className="text-muted-foreground">
          {task.area}{time ? ` · ${time}` : ""}{task.done ? " · done" : ""}
        </p>
        {(task as any).notes && <p className="text-muted-foreground [overflow-wrap:anywhere]">{(task as any).notes}</p>}
      </div>
    }>{children}</Peek>
  );
}

export function EventPeek({ event, children }: { event: any; children: ReactNode }) {
  return (
    <Peek content={
      <div className="space-y-1">
        <p className="font-medium [overflow-wrap:anywhere]">{event.title}</p>
        <p className="text-muted-foreground">
          {[event.time, event.location].filter(Boolean).join(" · ") || "No time set"}
        </p>
        {event.notes && <p className="text-muted-foreground [overflow-wrap:anywhere]">{event.notes}</p>}
      </div>
    }>{children}</Peek>
  );
}

export function CosmicPeek({ item, children }: { item: CosmicCalendarItem; children: ReactNode }) {
  return (
    <Peek content={
      <div className="space-y-1">
        <p className="font-medium [overflow-wrap:anywhere]">{item.glyph ? `${item.glyph} ` : ""}{item.title ?? item.label}</p>
        {item.subtitle && <p className="text-muted-foreground [overflow-wrap:anywhere]">{item.subtitle}</p>}
      </div>
    }>{children}</Peek>
  );
}
