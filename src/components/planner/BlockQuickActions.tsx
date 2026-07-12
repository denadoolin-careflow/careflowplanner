import { useState } from "react";
import { format, addDays, addWeeks, parseISO } from "date-fns";
import { Check, Copy, Pencil, CalendarDays, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { openTaskEditor } from "@/lib/open-task-editor";
import type { Task } from "@/lib/types";
import { toast } from "sonner";

interface Props { task: Task; asMenuItems?: boolean }

export function BlockQuickActions({ task, asMenuItems }: Props) {
  const { toggleTask, updateTask, addTask, deleteTask } = useStore();
  const [confirmUnschedule, setConfirmUnschedule] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const duplicate = async (targetISO?: string) => {
    const { id, createdAt, ...rest } = task as any;
    await addTask({
      ...rest,
      title: task.title,
      dueDate: targetISO ?? task.dueDate,
    });
    toast.success("Duplicated");
  };

  const moveTo = async (targetISO: string) => {
    await updateTask(task.id, { dueDate: targetISO });
    toast.success(`Moved to ${format(parseISO(targetISO), "MMM d")}`);
  };

  const unschedule = async () => {
    await updateTask(task.id, { startTime: undefined, inbox: !task.dueDate });
    toast.success("Unscheduled");
    setConfirmUnschedule(false);
  };

  const actions = [
    { icon: Check, label: task.done ? "Reopen" : "Complete", onClick: () => toggleTask(task.id) },
    { icon: Pencil, label: "Edit", onClick: () => openTaskEditor(task.id) },
    { icon: Copy, label: "Duplicate", onClick: () => duplicate() },
    { icon: CalendarDays, label: "Move to another day", onClick: () => setDatePickerOpen(true) },
    { icon: XCircle, label: "Unschedule", onClick: () => setConfirmUnschedule(true) },
    { icon: Trash2, label: "Delete", danger: true, onClick: () => setConfirmDelete(true) },
  ];

  const dialogs = (
    <>
      <AlertDialog open={confirmUnschedule} onOpenChange={setConfirmUnschedule}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this from your schedule?</AlertDialogTitle>
            <AlertDialogDescription>The task will stay in your task list.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={unschedule}>Unschedule</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTask(task.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <PopoverTrigger asChild><span className="sr-only">Date</span></PopoverTrigger>
        <PopoverContent className="w-auto p-2 pointer-events-auto" align="start">
          <div className="flex flex-col gap-1">
            <Button size="sm" variant="ghost" className="justify-start" onClick={() => { void moveTo(format(addDays(new Date(), 1), "yyyy-MM-dd")); setDatePickerOpen(false); }}>Tomorrow</Button>
            <Button size="sm" variant="ghost" className="justify-start" onClick={() => { void moveTo(format(addWeeks(new Date(), 1), "yyyy-MM-dd")); setDatePickerOpen(false); }}>Next week</Button>
          </div>
          <Calendar mode="single" onSelect={(d) => { if (d) { void moveTo(format(d, "yyyy-MM-dd")); setDatePickerOpen(false); } }}
            className={cn("p-2 pointer-events-auto")} />
        </PopoverContent>
      </Popover>
    </>
  );

  if (asMenuItems) {
    return (
      <>
        {actions.map((a, i) => (
          <ContextMenuItem key={a.label} onSelect={(e) => { e.preventDefault(); void a.onClick(); }}
            className={a.danger ? "text-destructive focus:text-destructive" : ""}>
            <a.icon className="mr-2 h-3.5 w-3.5" />{a.label}
          </ContextMenuItem>
        ))}
        {dialogs}
      </>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {actions.map(a => (
        <Button key={a.label} size="icon" variant="ghost" className="h-6 w-6" aria-label={a.label}
          onClick={(e) => { e.stopPropagation(); void a.onClick(); }}>
          <a.icon className={cn("h-3.5 w-3.5", a.danger && "text-destructive")} />
        </Button>
      ))}
      {dialogs}
    </div>
  );
}
