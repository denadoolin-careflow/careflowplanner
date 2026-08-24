/**
 * Add a friend or family member without leaving the page. Writes to the loved
 * ones list so they appear everywhere the people directory is used.
 */
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDirectoryPerson, type DirectoryPerson } from "@/lib/people-directory";
import { haptics } from "@/lib/haptics";

const EMOJI = ["🙂", "💛", "🌿", "☕", "🐾", "👵", "👶", "🌻"];

export function AddPersonPopover({
  onAdded, label = "Add person", trigger,
}: {
  onAdded?: (p: DirectoryPerson) => void;
  label?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [emoji, setEmoji] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    try {
      const person = await addDirectoryPerson({ name: n, relation, emoji });
      haptics.success?.();
      onAdded?.(person);
      setName(""); setRelation(""); setEmoji(undefined);
      setOpen(false);
    } finally { setBusy(false); }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            aria-label={label}
            className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-dashed border-border/70 bg-background/60 px-2.5 text-[11.5px] text-muted-foreground hover:text-foreground"
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden /> {label}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <form onSubmit={submit} className="space-y-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            aria-label="Person's name"
            className="w-full rounded-xl border border-border/60 bg-background px-2.5 py-1.5 text-[12.5px] outline-none focus:border-primary/50"
          />
          <input
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
            placeholder="Friend, sister, neighbour…"
            aria-label="Relation"
            className="w-full rounded-xl border border-border/60 bg-background px-2.5 py-1.5 text-[12.5px] outline-none focus:border-primary/50"
          />
          <div className="flex flex-wrap gap-1">
            {EMOJI.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(prev => (prev === e ? undefined : e))}
                aria-label={`Use ${e} as avatar`}
                aria-pressed={emoji === e}
                className={`grid h-7 w-7 place-items-center rounded-full border text-[13px] ${
                  emoji === e ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={!name.trim() || busy}
            className="w-full rounded-xl bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground disabled:opacity-40"
          >
            Add person
          </button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
