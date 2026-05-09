import { useState } from "react";
import { BookOpen, Brain, Coffee, Heart, Home, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  pomodoroTemplates,
  usePomodoroTemplatesList,
  TEMPLATE_ICONS,
  type TemplateIcon,
} from "@/lib/pomodoro-templates";
import { pomodoro } from "@/lib/pomodoro-store";

const ICONS = { Sparkles, BookOpen, Home, Brain, Heart, Coffee } as const;

function describe(focus: number, brk: number) {
  return `${focus} on · ${brk} off`;
}

export function PomodoroTemplatesEditor() {
  const list = usePomodoroTemplatesList();

  const handleAdd = () => {
    pomodoroTemplates.add({
      label: "New template",
      description: describe(20, 5),
      focusSeconds: 20 * 60,
      breakSeconds: 5 * 60,
      icon: "Sparkles",
    });
  };

  return (
    <div className="space-y-3">
      {list.map((t) => (
        <TemplateRow key={t.id} template={t} />
      ))}
      <Button
        variant="outline"
        size="sm"
        className="rounded-full"
        onClick={handleAdd}
      >
        <Plus className="mr-1 h-3.5 w-3.5" /> Add template
      </Button>
    </div>
  );
}

function TemplateRow({ template }: { template: ReturnType<typeof usePomodoroTemplatesList>[number] }) {
  const [label, setLabel] = useState(template.label);
  const [focus, setFocus] = useState(Math.round(template.focusSeconds / 60));
  const [brk, setBrk] = useState(Math.round(template.breakSeconds / 60));
  const [icon, setIcon] = useState<TemplateIcon>(template.icon);

  const dirty =
    label !== template.label ||
    focus !== Math.round(template.focusSeconds / 60) ||
    brk !== Math.round(template.breakSeconds / 60) ||
    icon !== template.icon;

  const save = () => {
    if (!label.trim()) return;
    const f = Math.max(1, Math.min(180, Math.round(focus)));
    const b = Math.max(1, Math.min(60, Math.round(brk)));
    pomodoroTemplates.update(template.id, {
      label: label.trim(),
      focusSeconds: f * 60,
      breakSeconds: b * 60,
      icon,
      description: describe(f, b),
    });
  };

  const Icon = ICONS[icon] ?? Sparkles;

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <Input
          value={label}
          onChange={e => setLabel(e.target.value)}
          className="h-8 flex-1 text-sm"
          placeholder="Label"
        />
        {template.builtin ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            built-in
          </span>
        ) : (
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => pomodoroTemplates.remove(template.id)}
            aria-label="Delete template"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Focus (min)
          </Label>
          <Input
            type="number" min={1} max={180}
            value={focus}
            onChange={e => setFocus(Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Break (min)
          </Label>
          <Input
            type="number" min={1} max={60}
            value={brk}
            onChange={e => setBrk(Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Icon
        </Label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {TEMPLATE_ICONS.map(name => {
            const I = ICONS[name];
            const active = icon === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setIcon(name)}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full border transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
                )}
                aria-label={name}
              >
                <I className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          className="h-7 rounded-full px-3 text-xs"
          onClick={save}
          disabled={!dirty || !label.trim()}
        >
          Save
        </Button>
        <Button
          size="sm" variant="ghost"
          className="h-7 rounded-full px-3 text-xs"
          onClick={() => pomodoro.startTemplate({
            label: template.label,
            focusSeconds: template.focusSeconds,
            breakSeconds: template.breakSeconds,
            templateId: template.id,
          })}
        >
          Try it
        </Button>
        {template.builtin && (
          <Button
            size="sm" variant="ghost"
            className="h-7 rounded-full px-3 text-xs text-muted-foreground"
            onClick={() => {
              pomodoroTemplates.reset(template.id);
              setLabel(template.label);
              setFocus(Math.round(template.focusSeconds / 60));
              setBrk(Math.round(template.breakSeconds / 60));
              setIcon(template.icon);
            }}
          >
            <RotateCcw className="mr-1 h-3 w-3" /> Reset
          </Button>
        )}
      </div>
    </div>
  );
}
