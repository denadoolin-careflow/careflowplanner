import { useEffect, useState } from "react";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Supply = { id: string; name: string; needed: boolean };
const KEY = "careflow:reset:supplies:v1";

const DEFAULTS: Supply[] = [
  { id: "s1", name: "All-purpose spray", needed: false },
  { id: "s2", name: "Microfiber cloths", needed: false },
  { id: "s3", name: "Dish soap", needed: false },
  { id: "s4", name: "Trash bags", needed: false },
  { id: "s5", name: "Sponges", needed: false },
  { id: "s6", name: "Paper towels", needed: false },
];

function read(): Supply[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : DEFAULTS;
  } catch { return DEFAULTS; }
}

export function SuppliesChecklist() {
  const [items, setItems] = useState<Supply[]>(read);
  const [name, setName] = useState("");

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const add = () => {
    const n = name.trim();
    if (!n) return;
    setItems(prev => [...prev, { id: crypto.randomUUID(), name: n, needed: false }]);
    setName("");
  };
  const toggle = (id: string) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, needed: !i.needed } : i));
  const remove = (id: string) =>
    setItems(prev => prev.filter(i => i.id !== id));

  const needed = items.filter(i => i.needed).length;

  return (
    <section className="reset-glass p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--reset-sage-soft))] text-[hsl(var(--reset-sage-deep))]">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-display text-sm font-semibold text-[hsl(var(--reset-charcoal))]">Cleaning supplies</h3>
            <p className="text-[11px] text-[hsl(var(--reset-ink))]/60">
              {needed > 0 ? `${needed} to restock` : "All stocked"}
            </p>
          </div>
        </div>
      </header>

      <ul className="space-y-1">
        {items.map(i => (
          <li
            key={i.id}
            className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
          >
            <input
              type="checkbox"
              checked={i.needed}
              onChange={() => toggle(i.id)}
              className="h-4 w-4 rounded border-[hsl(var(--reset-ink))]/30"
              aria-label={`Mark ${i.name} as needed`}
            />
            <span className={cn(
              "flex-1 text-[hsl(var(--reset-charcoal))]",
              i.needed && "text-amber-700 dark:text-amber-300 font-medium",
            )}>
              {i.name}
            </span>
            <button
              type="button"
              onClick={() => remove(i.id)}
              className="rounded p-1 text-[hsl(var(--reset-ink))]/40 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
              aria-label={`Remove ${i.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-[hsl(var(--reset-ink))]/20 px-2 py-1.5">
        <Plus className="h-3.5 w-3.5 text-[hsl(var(--reset-ink))]/50" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Add supply…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[hsl(var(--reset-ink))]/40"
        />
        {name && (
          <button
            type="button"
            onClick={add}
            className="rounded-full bg-[hsl(var(--reset-sage))] px-2.5 py-0.5 text-[11px] font-medium text-white"
          >
            Add
          </button>
        )}
      </div>
    </section>
  );
}