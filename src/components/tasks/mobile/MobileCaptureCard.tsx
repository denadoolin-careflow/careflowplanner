import { useState } from "react";
import { Plus, Calendar as CalIcon, FolderKanban, Layers, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { parseTaskNlp } from "@/lib/nlp-task";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { Area } from "@/lib/types";

/** Mobile-first quick capture card matching the redesign spec. */
export function MobileCaptureCard({ defaultArea }: { defaultArea?: Area }) {
  const { addTask, state } = useStore();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string | undefined>(undefined);
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [area, setArea] = useState<Area | undefined>(defaultArea);
  const [projOpen, setProjOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const submit = async () => {
    const t = title.trim();
    if (!t) return;
    try {
      const parsed = (() => { try { return parseTaskNlp(t); } catch { return null; } })();
      await addTask({
        title: parsed?.title ?? t,
        inbox: true,
        dueDate: date ?? parsed?.dueDate,
        priority: parsed?.priority ?? "medium",
        area: area ?? parsed?.area ?? "Personal",
        projectId,
        tags: parsed?.tags,
      } as any);
      setTitle(""); setDate(undefined); setProjectId(undefined);
      if (!defaultArea) setArea(undefined);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not capture");
    }
  };

  const proj = projectId ? state.projects?.find(p => p.id === projectId) : undefined;

  return (
    <div className="cf-card p-4">
      <div className="flex items-center gap-3">
        <div className="cf-icon-tile shrink-0"><Plus className="h-4 w-4" /></div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Capture anything…"
          className="min-w-0 flex-1 bg-transparent text-[15.5px] outline-none placeholder:text-muted-foreground/70"
        />
      </div>
      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={cn("cf-chip shrink-0", date && "cf-chip-active")}>
              <CalIcon className="h-3.5 w-3.5" />
              {date ? format(parseISO(date), "MMM d") : "Date"}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date ? parseISO(date) : undefined}
              onSelect={(d) => { setDate(d ? format(d, "yyyy-MM-dd") : undefined); setDateOpen(false); }}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <Popover open={projOpen} onOpenChange={setProjOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={cn("cf-chip shrink-0", proj && "cf-chip-active")}>
              <FolderKanban className="h-3.5 w-3.5" />
              {proj?.name ?? "Project"}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="max-h-72 w-56 overflow-auto p-1">
            <button onClick={() => { setProjectId(undefined); setProjOpen(false); }} className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">None</button>
            {(state.projects ?? []).map(p => (
              <button key={p.id} onClick={() => { setProjectId(p.id); setProjOpen(false); }} className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">
                {p.name}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <Popover open={areaOpen} onOpenChange={setAreaOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={cn("cf-chip shrink-0", area && "cf-chip-active")}>
              <Layers className="h-3.5 w-3.5" />
              {area ?? "Area"}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="max-h-72 w-48 overflow-auto p-1">
            <button onClick={() => { setArea(undefined); setAreaOpen(false); }} className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">None</button>
            {(["Personal","Family","Kids","Caregiving","Home","Meals","Appointments","Money","Creative Projects","Holidays & Birthdays"] as Area[]).map(a => (
              <button key={a} onClick={() => { setArea(a); setAreaOpen(false); }} className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">{a}</button>
            ))}
          </PopoverContent>
        </Popover>

        <div className="ml-auto" />
        <Button onClick={submit} disabled={!title.trim()} className="rounded-full shrink-0 px-5 h-9">
          Add
        </Button>
      </div>
    </div>
  );
}