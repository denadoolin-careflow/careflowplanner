import { useStore } from "@/lib/store";
import { TaskRow } from "@/components/cards/TaskRow";
import { Inbox as InboxIcon } from "lucide-react";

export default function Inbox() {
  const { state } = useStore();
  const items = state.tasks.filter(t => t.inbox && !t.done && !t.parentTaskId);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <InboxIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
          <p className="text-sm text-muted-foreground">Capture now, organize later. {items.length} waiting.</p>
        </div>
      </header>
      <div className="rounded-2xl border border-border/60 bg-card/60 p-2">
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Your inbox is clear ✨</div>
        ) : (
          <div className="space-y-1">
            {items.map(t => <TaskRow key={t.id} task={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}