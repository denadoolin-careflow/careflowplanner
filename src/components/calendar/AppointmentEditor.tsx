import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Appointment } from "@/lib/types";
import { LinkedNotesPanel } from "@/components/notes/LinkedNotesPanel";
import { IconPicker } from "@/components/common/IconPicker";
import { gcalNotifyChange } from "@/lib/google-calendar";

interface Props {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentEditor({ appointment, open, onOpenChange }: Props) {
  const { updateAppointment, deleteAppointment } = useStore();
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [syncToGoogle, setSyncToGoogle] = useState(false);

  useEffect(() => {
    if (!appointment) return;
    setTitle(appointment.title ?? "");
    setIcon(appointment.icon ?? undefined);
    setDate(appointment.date ?? "");
    setTime((appointment.time ?? "").slice(0, 5));
    setLocation(appointment.location ?? "");
    setSyncToGoogle(!!appointment.syncToGoogle);
  }, [appointment]);

  if (!appointment) return null;

  const save = async () => {
    await updateAppointment(appointment.id, {
      title: title.trim() || appointment.title,
      icon: icon,
      date,
      time: time || undefined,
      location: location || undefined,
      syncToGoogle,
    });
    if (syncToGoogle) gcalNotifyChange();
    onOpenChange(false);
  };

  const del = async () => {
    await deleteAppointment(appointment.id);
    if (appointment.syncToGoogle) gcalNotifyChange();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit appointment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <div className="flex items-center gap-2">
              <IconPicker value={icon} onChange={setIcon} />
              <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className="flex-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-3 py-2">
            <div>
              <Label className="text-sm">Sync to Google Calendar</Label>
              <p className="text-xs text-muted-foreground">Saves this appointment to your connected Google calendar.</p>
            </div>
            <Switch checked={syncToGoogle} onCheckedChange={setSyncToGoogle} />
          </div>
          <LinkedNotesPanel entityType="appointment" entityId={appointment.id} contextTitle={appointment.title} compact />
        </div>
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={del} className="text-destructive hover:text-destructive">
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}