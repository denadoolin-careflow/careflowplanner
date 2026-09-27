import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRitualSteps, type RitualKind } from "@/lib/ritual-steps";
import { cn } from "@/lib/utils";

export function RitualStepsEditor({ kind, iso }: { kind: RitualKind; iso: string }) {
  const { steps, done, add, remove, move, rename, toggle } = useRitualSteps(kind, iso);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const label = kind === "morning" ? "Morning Reset steps" : "Evening Reflection steps";

  return (
    <div className="mt-3 border-t border-border/40 pt-2">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          My steps · {steps.filter(s => done.includes(s.id)).length}/{steps.length}
        </p>
        <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2 text-[11px]" onClick={() => setEditing(e => !e)} aria-pressed={editing} aria-label={`Edit ${label}`}>
          {editing ? <><Check className="h-3 w-3" /> Done</> : <><Pencil className="h-3 w-3" /> Edit</>}
        </Button>
      </div>
      <ul className="space-y-1">
        {steps.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2 text-[13px]">
            {editing ? (
              <>
                <Input value={s.label} onChange={e => rename(s.id, e.target.value)} aria-label={`Step ${i + 1}`} className="h-8 flex-1 text-[13px]" />
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={i === 0} onClick={() => move(s.id, -1)} aria-label="Move step up"><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={i === steps.length - 1} onClick={() => move(s.id, 1)} aria-label="Move step down"><ArrowDown className="h-3.5 w-3.5" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(s.id)} aria-label="Remove step"><Trash2 className="h-3.5 w-3.5" /></Button>
              </>
            ) : (
              <button type="button" onClick={() => toggle(s.id)} className="flex min-h-[32px] w-full items-center gap-2 text-left">
                <span className={cn("grid h-4 w-4 shrink-0 place-items-center rounded-full border border-primary/60", done.includes(s.id) && "bg-primary text-primary-foreground")}>
                  {done.includes(s.id) && <Check className="h-3 w-3" />}
                </span>
                <span className={cn(done.includes(s.id) && "text-muted-foreground line-through")}>{s.label}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
      {editing && (
        <form className="mt-2 flex gap-2" onSubmit={e => { e.preventDefault(); add(text); setText(""); }}>
          <Input value={text} onChange={e => setText(e.target.value)} placeholder="Add a step…" aria-label={`Add to ${label}`} className="h-8 text-[13px]" />
          <Button type="submit" size="sm" className="h-8 gap-1"><Plus className="h-3.5 w-3.5" /> Add</Button>
        </form>
      )}
    </div>
  );
}
