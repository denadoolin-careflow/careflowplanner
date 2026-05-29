import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2, User, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Appointment } from "@/lib/types";
import { LinkedNotesPanel } from "@/components/notes/LinkedNotesPanel";
import { IconPicker } from "@/components/common/IconPicker";
import { gcalNotifyChange } from "@/lib/google-calendar";
import { LocationAutocomplete } from "@/components/common/LocationAutocomplete";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHousehold } from "@/lib/household";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DURATION_OPTIONS: { label: string; minutes: number }[] = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
];

function addMinutesToTime(date: string, time: string, minutes: number): { date: string; time: string } {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
  d.setMinutes(d.getMinutes() + minutes);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
}

function minutesBetween(startDate: string, startTime: string, endDate: string, endTime: string): number | null {
  if (!startDate || !startTime || !endDate || !endTime) return null;
  const s = new Date(`${startDate}T${startTime}:00`);
  const e = new Date(`${endDate}T${endTime}:00`);
  const diff = (e.getTime() - s.getTime()) / 60000;
  return Number.isFinite(diff) ? diff : null;
}

export function AppointmentEditor({ appointment, open, onOpenChange }: Props) {
  const store = useStore() as any;
  const { state, updateAppointment, deleteAppointment } = store;
  const userId = store.user?.id as string | undefined;
  const projects = (state?.projects ?? []) as any[];
  const areas = (state?.areas ?? []) as any[];
  const recipients = (state?.recipients ?? []) as any[];
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [withName, setWithName] = useState("");
  const [recipientId, setRecipientId] = useState<string | undefined>(undefined);
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [areaName, setAreaName] = useState<string | undefined>(undefined);
  const [color, setColor] = useState<string | undefined>(undefined);
  const [syncToGoogle, setSyncToGoogle] = useState(false);
  const { current: currentHousehold } = useHousehold(userId);
  const [shareWithFamily, setShareWithFamily] = useState(false);

  useEffect(() => {
    if (!appointment) return;
    setTitle(appointment.title ?? "");
    setIcon(appointment.icon ?? undefined);
    setDate(appointment.date ?? "");
    setTime((appointment.time ?? "").slice(0, 5));
    setEndDate(appointment.endDate ?? appointment.date ?? "");
    setEndTime((appointment.endTime ?? "").slice(0, 5));
    setLocation(appointment.location ?? "");
    setWithName(appointment.with ?? "");
    setRecipientId(appointment.recipientId);
    setProjectId(appointment.projectId);
    setAreaName(appointment.areaName);
    setColor(appointment.color);
    setSyncToGoogle(!!appointment.syncToGoogle);
    // Hydrate share state from row
    (async () => {
      const { data } = await supabase
        .from("appointments")
        .select("household_id, visibility")
        .eq("id", appointment.id)
        .maybeSingle();
      setShareWithFamily(!!(data as any)?.household_id && (data as any)?.visibility === "household");
    })();
  }, [appointment]);

  // Auto-color when project changes
  const onPickProject = (val: string) => {
    if (val === "__none") {
      setProjectId(undefined);
      return;
    }
    setProjectId(val);
    const p = projects.find((p) => p.id === val);
    if (p?.color) setColor(p.color);
    if (p?.areaName && !areaName) setAreaName(p.areaName);
  };

  const onPickArea = (val: string) => {
    if (val === "__none") { setAreaName(undefined); return; }
    setAreaName(val);
    if (!color) {
      const a = areas.find((a) => a.name === val);
      if (a?.color) setColor(a.color);
    }
  };

  const currentDuration = useMemo(() => minutesBetween(date, time, endDate || date, endTime), [date, time, endDate, endTime]);

  if (!appointment) return null;

  const applyDuration = (minutes: number) => {
    if (!date || !time) return;
    const r = addMinutesToTime(date, time, minutes);
    setEndDate(r.date);
    setEndTime(r.time);
  };

  const save = async () => {
    await updateAppointment(appointment.id, {
      title: title.trim() || appointment.title,
      icon: icon,
      date,
      time: time || undefined,
      endDate: endDate || undefined,
      endTime: endTime || undefined,
      location: location || undefined,
      with: withName || undefined,
      recipientId: recipientId,
      projectId: projectId,
      areaName: areaName,
      color: color,
      syncToGoogle,
    } as any);
    // Persist sharing fields directly (not in store typings).
    await supabase
      .from("appointments")
      .update({
        household_id: shareWithFamily && currentHousehold ? currentHousehold.id : null,
        visibility: shareWithFamily ? "household" : "private",
      } as any)
      .eq("id", appointment.id);
    if (syncToGoogle) gcalNotifyChange();
    onOpenChange(false);
  };

  const del = async () => {
    await deleteAppointment(appointment.id);
    if (appointment.syncToGoogle) gcalNotifyChange();
    onOpenChange(false);
  };

  const colorSwatch = color ?? "#94a3b8";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: colorSwatch }} />
            Edit appointment
          </DialogTitle>
        </DialogHeader>
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
              <Label className="text-xs">Start date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Start time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">End date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={date || undefined} />
            </div>
            <div>
              <Label className="text-xs">End time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Duration</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={DURATION_OPTIONS.find((d) => d.minutes === currentDuration)?.minutes.toString() ?? ""}
                onValueChange={(v) => applyDuration(Number(v))}
              >
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Quick set" /></SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d.minutes} value={d.minutes.toString()}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentDuration !== null && currentDuration > 0 && (
                <span className="text-xs text-muted-foreground">
                  {currentDuration >= 60
                    ? `${(currentDuration / 60).toFixed(currentDuration % 60 === 0 ? 0 : 1)} hr`
                    : `${currentDuration} min`}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Area</Label>
              <Select value={areaName ?? "__none"} onValueChange={onPickArea}>
                <SelectTrigger><SelectValue placeholder="No area" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No area</SelectItem>
                  {areas.filter((a: any) => !a.isArchived).map((a: any) => (
                    <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Project</Label>
              <Select value={projectId ?? "__none"} onValueChange={onPickProject}>
                <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No project</SelectItem>
                  {projects
                    .filter((p: any) => !p.archivedAt && (!areaName || p.areaName === areaName))
                    .map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="inline-flex items-center gap-2">
                          {p.color && <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />}
                          {p.name}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Color</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={color ?? "#94a3b8"}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-14 cursor-pointer p-1"
              />
              {color && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setColor(undefined)}>
                  Clear
                </Button>
              )}
              <span className="text-xs text-muted-foreground">Defaults to project color</span>
            </div>
          </div>

          <div>
            <Label className="text-xs">Person</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={recipientId ?? "__none"} onValueChange={(v) => setRecipientId(v === "__none" ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Care recipient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No recipient</SelectItem>
                  {recipients.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={withName}
                  onChange={(e) => setWithName(e.target.value)}
                  placeholder="With (free text)"
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs">Location</Label>
            <LocationAutocomplete value={location} onChange={setLocation} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-3 py-2">
            <div>
              <Label className="text-sm">Sync to Google Calendar</Label>
              <p className="text-xs text-muted-foreground">Saves this appointment to your connected Google calendar.</p>
            </div>
            <Switch checked={syncToGoogle} onCheckedChange={setSyncToGoogle} />
          </div>
          {currentHousehold && (
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-3 py-2">
              <div className="min-w-0">
                <Label className="text-sm flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Share with {currentHousehold.name}</Label>
                <p className="text-xs text-muted-foreground">Family members will see this on the shared calendar.</p>
              </div>
              <Switch checked={shareWithFamily} onCheckedChange={setShareWithFamily} />
            </div>
          )}
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