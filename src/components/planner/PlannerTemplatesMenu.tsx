import { useState } from "react";
import { LayoutTemplate, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlannerTemplates, type PlannerTemplate, type TemplateItem } from "@/lib/planner-templates";
import { toast } from "sonner";
import { useCycleSuggestion } from "@/lib/planner/cycle-templates";

interface Props {
  onApply: (tpl: PlannerTemplate) => void | Promise<void>;
  /** Snapshot of the current day's scheduled items, used for "Save this day". */
  buildCurrentItems: () => TemplateItem[];
  /** Day the templates apply to — drives the cycle-phase suggestion. */
  date?: Date;
}

export function PlannerTemplatesMenu({ onApply, buildCurrentItems, date }: Props) {
  const { templates, saved, create, remove } = usePlannerTemplates();
  const suggestion = useCycleSuggestion(date ?? new Date());
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  const saveCurrent = async () => {
    const items = buildCurrentItems();
    if (!items.length) { toast.info("Schedule a few tasks first"); return; }
    const tpl = await create(name.trim() || "My day", items);
    if (tpl) toast.success(`Saved template “${tpl.name}”`);
    else toast.error("Could not save template");
    setName(""); setSaving(false); setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSaving(false); }}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost" size="sm"
          className="h-7 shrink-0 gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium"
          title="Schedule templates"
          aria-label="Schedule templates"
        >
          <LayoutTemplate className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Templates</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {suggestion && (
          <>
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Suggested for this phase
            </DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={(e) => { e.preventDefault(); setOpen(false); void onApply(suggestion.template); }}
              className="flex flex-col items-start gap-0.5"
            >
              <span className="flex w-full items-center gap-2">
                <span aria-hidden>{suggestion.template.icon}</span>
                <span className="min-w-0 flex-1 truncate">{suggestion.template.name}</span>
                <span className="text-[10px] text-muted-foreground">{suggestion.template.items.length}</span>
              </span>
              <span className="whitespace-normal text-[10.5px] leading-snug text-muted-foreground">
                {suggestion.dayNudge}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Fill the day with…
        </DropdownMenuLabel>
        {templates.map(t => (
          <DropdownMenuItem
            key={t.id}
            onSelect={(e) => { e.preventDefault(); setOpen(false); void onApply(t); }}
            className="flex items-center gap-2"
          >
            <span aria-hidden>{t.icon ?? "🗓️"}</span>
            <span className="min-w-0 flex-1 truncate">{t.name}</span>
            <span className="text-[10px] text-muted-foreground">{t.items.length}</span>
            {saved.some(s => s.id === t.id) && (
              <button
                aria-label={`Delete ${t.name}`}
                className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); void remove(t.id); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {saving ? (
          <div className="flex items-center gap-1.5 p-1.5">
            <Input
              autoFocus value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void saveCurrent(); } }}
              placeholder="Template name" className="h-8 text-xs"
            />
            <Button size="sm" className="h-8 px-2 text-xs" onClick={() => void saveCurrent()}>Save</Button>
          </div>
        ) : (
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSaving(true); }} className="gap-2">
            <Save className="h-3.5 w-3.5" /> Save this day as template
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}