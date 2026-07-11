import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TODAY_TEMPLATES, applyTodayTemplate, type TodayTemplate } from "@/lib/today-templates";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Called after a template is applied, so the parent can switch to the Custom board and remount the grid. */
  onApplied?: (templateId: string) => void;
}

/** Full gallery modal for choosing a Today page template. */
export function TemplateGallery({ open, onOpenChange, onApplied }: Props) {
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const handleApply = async (t: TodayTemplate) => {
    setApplyingId(t.id);
    try {
      const ok = await applyTodayTemplate(t.id);
      if (!ok) {
        toast.error("Couldn't apply that template");
        return;
      }
      toast.success(`Applied "${t.name}" — edit anytime on the Custom board.`);
      onApplied?.(t.id);
      onOpenChange(false);
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Choose a Today template
          </DialogTitle>
          <DialogDescription>
            Pick a starting layout for your Custom board. You can add, remove, and rearrange widgets afterward.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {TODAY_TEMPLATES.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              applying={applyingId === t.id}
              onApply={() => handleApply(t)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({
  template,
  applying,
  onApply,
}: {
  template: TodayTemplate;
  applying: boolean;
  onApply: () => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm">
      <div className={cn("relative h-32 bg-gradient-to-br p-3", template.accent)}>
        <TemplatePreview template={template} />
      </div>
      <div className="flex-1 space-y-2 p-4">
        <div>
          <div className="font-display text-sm font-semibold text-foreground">{template.name}</div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{template.tagline}</div>
        </div>
        <p className="text-xs leading-snug text-muted-foreground">{template.description}</p>
        <Button
          size="sm"
          className="mt-2 w-full rounded-full"
          onClick={onApply}
          disabled={applying}
        >
          {applying ? (
            "Applying…"
          ) : (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5" /> Use this template
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/** Tiny wireframe preview built from the template's widget footprints on a 12-col grid. */
function TemplatePreview({ template }: { template: TodayTemplate }) {
  const cols = 12;
  // Pack left-to-right, top-to-bottom.
  let x = 0;
  let y = 0;
  let rowH = 0;
  const cells: { x: number; y: number; w: number; h: number }[] = [];
  for (const it of template.items) {
    if (x + it.w > cols) {
      x = 0;
      y += rowH;
      rowH = 0;
    }
    cells.push({ x, y, w: it.w, h: it.h });
    x += it.w;
    rowH = Math.max(rowH, it.h);
  }
  const totalRows = cells.reduce((m, c) => Math.max(m, c.y + c.h), 1);
  return (
    <div className="absolute inset-3">
      <div
        className="grid h-full w-full gap-[3px]"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${totalRows}, minmax(0, 1fr))`,
        }}
      >
        {cells.map((c, i) => (
          <div
            key={i}
            className="rounded-[3px] bg-white/70 shadow-[0_1px_0_rgba(0,0,0,0.03)] dark:bg-white/20"
            style={{
              gridColumn: `${c.x + 1} / span ${c.w}`,
              gridRow: `${c.y + 1} / span ${c.h}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}