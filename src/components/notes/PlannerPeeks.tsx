import type { ReactNode } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { Task } from "@/lib/types";
import type { CosmicCalendarItem } from "@/lib/cosmic/calendar-feed";
import { taskTime } from "@/lib/planner/day-plan";
import { copyForEvent, guidanceForEvent } from "@/lib/cosmic/transit-copy";
import { Sparkles } from "lucide-react";

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
  const copy = copyForEvent(item.event);
  const guidance = guidanceForEvent(item.event);
  return (
    <Peek content={
      <div className="max-h-80 space-y-2 overflow-y-auto overscroll-contain pr-1">
        <p className="font-display font-semibold [overflow-wrap:anywhere]">{item.glyph ? `${item.glyph} ` : ""}{item.title ?? item.label}</p>
        {item.subtitle && <p className="text-muted-foreground [overflow-wrap:anywhere]">{item.subtitle}</p>}
        <p className="[overflow-wrap:anywhere]">{copy.insight}</p>
        <div className="space-y-1.5 rounded-md bg-muted/55 p-2 text-[11px]">
          <p><strong>Work with it:</strong> {guidance.doMore}</p>
          <p><strong>Go gently with:</strong> {guidance.doLess}</p>
          <p className="flex gap-1.5 text-muted-foreground"><Sparkles className="mt-0.5 h-3 w-3 shrink-0" />{guidance.whatToExpect}</p>
          <p><strong>Journal prompt:</strong> {copy.journalPrompt}</p>
        </div>
      </div>
    }>{children}</Peek>
  );
}
