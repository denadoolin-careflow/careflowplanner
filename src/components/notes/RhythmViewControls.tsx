import { useMemo } from "react";
import { Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/notes";
import { OptionChip, PropertyStyleMark } from "./PropertyStyleDisplay";
import {
  RHYTHM_FIELDS, EMPTY_RHYTHM_VIEW, activeRhythmCount, rhythmOptions, collectPropFields,
  type RhythmField, type RhythmViewState,
} from "@/lib/notes/rhythm-view";

interface Props { notes: Note[]; value: RhythmViewState; onChange: (v: RhythmViewState) => void }

const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <Button type="button" variant="ghost" onClick={onClick} aria-pressed={on}
    className={cn("h-auto min-h-9 max-w-full whitespace-normal rounded-full border px-2 py-1 text-xs transition-colors",
      on ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-background text-muted-foreground hover:text-foreground")}>
    {children}
  </Button>
);

export function RhythmViewControls({ notes, value, onChange }: Props) {
  const count = activeRhythmCount(value);
  const propFields = useMemo(() => collectPropFields(notes), [notes]);
  const activePropKeys = Object.entries(value.props ?? {}).filter(([, v]) => v?.length);
  const activeOnlyProps = activePropKeys.filter(([k]) => !propFields.some(f => f.key === k));
  const choice = (name: string, option: string) => {
    const prop = notes.flatMap(n => n.properties ?? []).find(p =>
      p.name.trim().toLowerCase() === name.trim().toLowerCase() && p.colors?.[option]);
    return <OptionChip prop={prop ?? { name }} option={option} />;
  };
  const pick = (k: "group" | "sort", f: RhythmField | null) => onChange({ ...value, [k]: value[k] === f ? null : f });
  const toggle = (f: RhythmField, v: string) => {
    const cur = value.filters[f] ?? [];
    onChange({ ...value, filters: { ...value.filters, [f]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] } });
  };
  const toggleProp = (key: string, v: string) => {
    const cur = (value.props ?? {})[key] ?? [];
    const next = { ...(value.props ?? {}), [key]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] };
    if (!next[key].length) delete next[key];
    onChange({ ...value, props: next });
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="notes-round-control relative h-10 w-10" aria-label="Group, sort and filter by rhythm">
          <Moon className="h-4 w-4" />
          {count > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">{count}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70dvh] w-[min(92vw,340px)] overflow-y-auto p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-display text-base">Rhythm view</p>
          {count > 0 && <Button variant="ghost" size="sm" className="h-8" onClick={() => onChange(EMPTY_RHYTHM_VIEW)}>Clear</Button>}
        </div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Group by</p>
        <div className="mb-3 flex flex-wrap gap-1.5">{RHYTHM_FIELDS.map(f => <Chip key={f.id} on={value.group === f.id} onClick={() => pick("group", f.id)}><PropertyStyleMark name={f.propName} />{f.label}</Chip>)}</div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Sort by</p>
        <div className="mb-3 flex flex-wrap gap-1.5">{RHYTHM_FIELDS.map(f => <Chip key={f.id} on={value.sort === f.id} onClick={() => pick("sort", f.id)}><PropertyStyleMark name={f.propName} />{f.label}</Chip>)}</div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Filter</p>
        {RHYTHM_FIELDS.map(f => {
          const opts = rhythmOptions(notes, f.id);
          return (
            <div key={f.id} className="mb-2">
              <p className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground"><PropertyStyleMark name={f.propName} />{f.label}</p>
              <div className="flex flex-wrap gap-1.5">{opts.map(o => <Chip key={o} on={(value.filters[f.id] ?? []).includes(o)} onClick={() => toggle(f.id, o)}>{choice(f.propName, o)}</Chip>)}</div>
            </div>
          );
        })}
        {(propFields.length > 0 || activeOnlyProps.length > 0) && (
          <>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Properties</p>
            {propFields.map(f => (
              <div key={f.key} className="mb-2">
                <p className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground"><PropertyStyleMark name={f.name} />{f.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {f.values.map(o => <Chip key={o} on={(value.props?.[f.key] ?? []).includes(o)} onClick={() => toggleProp(f.key, o)}>{choice(f.name, o)}</Chip>)}
                </div>
              </div>
            ))}
            {activeOnlyProps.map(([k, vals]) => (
              <div key={k} className="mb-2">
                <p className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground"><PropertyStyleMark name={k} />{k}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(vals ?? []).map(o => <Chip key={o} on onClick={() => toggleProp(k, o)}>{choice(k, o)}</Chip>)}
                </div>
              </div>
            ))}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
