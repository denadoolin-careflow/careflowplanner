import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PomodoroPanel } from "./PomodoroPanel";
import { pomodoro, usePomodoro } from "@/lib/pomodoro-store";
import { toast } from "sonner";
import type { Task } from "@/lib/types";

// Wire toast notifications to session boundaries (mounted once globally too).
let wired = false;
function wireToasts() {
  if (wired) return;
  wired = true;
  pomodoro.setOnSessionEnd((mode) => {
    if (mode === "focus") {
      toast.success("Focus session done — take a soft break.", {
        description: "5 minutes of breath, water, stretch.",
      });
    } else {
      toast("Break over. Ready when you are.");
    }
  });
}

export function PomodoroTimer({
  open,
  onOpenChange,
  task,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task: Task;
}) {
  const session = usePomodoro();

  useEffect(() => { wireToasts(); }, []);

  // When the dialog opens for a task, switch the active session if it's a different task.
  useEffect(() => {
    if (!open) return;
    if (session.taskId !== task.id) {
      pomodoro.startForTask({ id: task.id, title: task.title });
      pomodoro.pause(); // open in a ready-but-paused state
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Pomodoro</DialogTitle>
        </DialogHeader>
        <PomodoroPanel className="border-0 bg-transparent p-0 shadow-none" />
        <p className="text-center text-[11px] italic text-muted-foreground">
          25 minutes of soft attention. 5 minutes to breathe.
        </p>
      </DialogContent>
    </Dialog>
  );
}

// Mount this once globally to ensure toasts fire even if dialog never opened.
export function PomodoroToastsBridge() {
  useEffect(() => { wireToasts(); }, []);
  return null;
}
