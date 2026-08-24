/**
 * Merged people picker — care recipients and loved ones in one list.
 * Used for the task "connection" context.
 */
import { useMemo, useState } from "react";
import { Check, Search, UserRound, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePeopleDirectory, personInitial, type DirectoryPerson } from "@/lib/people-directory";

export function PersonAvatar({ person, className }: { person: DirectoryPerson; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-5 w-5 shrink-0 place-items-center rounded-full bg-care-capture-soft text-[10px] font-semibold text-care-capture",
        className,
      )}
      style={person.color ? { background: `${person.color}22`, color: person.color } : undefined}
    >
      {personInitial(person)}
    </span>
  );
}

export function PersonPicker({
  value, onChange, placeholder = "Add a connection", className, align = "start",
}: {
  value?: string | null;
  onChange: (person: DirectoryPerson | null) => void;
  placeholder?: string;
  className?: string;
  align?: "start" | "center" | "end";
}) {
  const people = usePeopleDirectory();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = useMemo(() => people.find(p => p.id === value) ?? null, [people, value]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return people;
    return people.filter(p => p.name.toLowerCase().includes(s) || (p.relation ?? "").toLowerCase().includes(s));
  }, [people, q]);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={selected ? `Connection: ${selected.name}. Change` : placeholder}
          className={cn(
            "inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-muted",
            selected && "text-foreground",
            className,
          )}
        >
          {selected ? <PersonAvatar person={selected} /> : <UserRound className="h-3.5 w-3.5" aria-hidden />}
          <span className="max-w-[10rem] truncate">{selected ? selected.name : placeholder}</span>
          {selected && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear connection"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onChange(null); } }}
              className="rounded-full p-0.5 hover:bg-muted"
            >
              <X className="h-3 w-3" aria-hidden />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-64 p-2">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people…"
            aria-label="Search people"
            className="h-8 pl-7 text-[12.5px]"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-[12px] text-muted-foreground">
              No people yet — add loved ones or care recipients first.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map(p => (
                <li key={`${p.kind}:${p.id}`}>
                  <button
                    type="button"
                    onClick={() => { onChange(p); setOpen(false); setQ(""); }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] hover:bg-muted"
                  >
                    <PersonAvatar person={p} />
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    {p.relation && <span className="shrink-0 text-[10.5px] capitalize text-muted-foreground">{p.relation}</span>}
                    {value === p.id && <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
