import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import * as Lucide from "lucide-react";

/** Curated emoji palette for routines/habits — searchable by keyword. */
const EMOJI_LIBRARY: { e: string; tags: string }[] = [
  { e: "🌅", tags: "sunrise morning dawn" }, { e: "☀️", tags: "sun day light" },
  { e: "🌙", tags: "moon night sleep" }, { e: "⭐", tags: "star favorite" },
  { e: "✨", tags: "sparkle magic shine" }, { e: "🌿", tags: "leaf plant grow" },
  { e: "🌱", tags: "sprout grow seed" }, { e: "🌸", tags: "blossom flower bloom" },
  { e: "🌻", tags: "sunflower yellow" }, { e: "🌼", tags: "flower daisy" },
  { e: "🌷", tags: "tulip flower" }, { e: "🍀", tags: "clover luck" },
  { e: "🪴", tags: "plant pot" }, { e: "🌳", tags: "tree outside" },
  { e: "☕", tags: "coffee morning drink" }, { e: "🍵", tags: "tea calm" },
  { e: "🥣", tags: "bowl oats breakfast" }, { e: "🥐", tags: "croissant breakfast" },
  { e: "🍳", tags: "eggs cook breakfast" }, { e: "🥑", tags: "avocado food" },
  { e: "🍎", tags: "apple fruit" }, { e: "🍌", tags: "banana fruit" },
  { e: "🥗", tags: "salad veg lunch" }, { e: "🍱", tags: "bento lunch" },
  { e: "🍲", tags: "soup dinner" }, { e: "🍞", tags: "bread food" },
  { e: "🥛", tags: "milk drink" }, { e: "💧", tags: "water hydrate drink" },
  { e: "🍷", tags: "wine evening" }, { e: "🍫", tags: "chocolate sweet" },
  { e: "🧴", tags: "lotion skincare" }, { e: "🧼", tags: "soap wash clean" },
  { e: "🪥", tags: "brush teeth dental" }, { e: "🚿", tags: "shower wash" },
  { e: "🛁", tags: "bath relax" }, { e: "💆", tags: "massage relax" },
  { e: "👕", tags: "shirt clothes dress" }, { e: "👟", tags: "shoes run walk" },
  { e: "🎒", tags: "bag school" }, { e: "🚗", tags: "car drive" },
  { e: "🏫", tags: "school" }, { e: "📚", tags: "books read study" },
  { e: "📖", tags: "book read" }, { e: "✏️", tags: "pencil write" },
  { e: "💼", tags: "work job" }, { e: "💻", tags: "laptop work" },
  { e: "🧘", tags: "meditate calm yoga" }, { e: "🧎", tags: "pray rest" },
  { e: "🚶", tags: "walk move" }, { e: "🏃", tags: "run exercise" },
  { e: "🚴", tags: "bike cycle" }, { e: "🏋️", tags: "lift gym" },
  { e: "💊", tags: "pill meds" }, { e: "💉", tags: "shot vaccine" },
  { e: "🩹", tags: "bandage hurt" }, { e: "🧠", tags: "brain mind" },
  { e: "❤️", tags: "heart love" }, { e: "💗", tags: "heart love care" },
  { e: "🫂", tags: "hug comfort" }, { e: "🙏", tags: "thanks pray" },
  { e: "🎵", tags: "music note" }, { e: "🎶", tags: "music play" },
  { e: "🎨", tags: "art paint" }, { e: "🖍️", tags: "crayon draw kids" },
  { e: "🧺", tags: "laundry basket" }, { e: "🧹", tags: "broom clean" },
  { e: "🧽", tags: "sponge clean" }, { e: "🪣", tags: "bucket clean" },
  { e: "🛌", tags: "bed sleep rest" }, { e: "🌜", tags: "night moon" },
  { e: "📞", tags: "call phone" }, { e: "💌", tags: "letter love" },
  { e: "🎁", tags: "gift present" }, { e: "🐶", tags: "dog pet" },
  { e: "🐱", tags: "cat pet" }, { e: "🐰", tags: "rabbit pet" },
  { e: "🐟", tags: "fish pet" }, { e: "👶", tags: "baby infant" },
  { e: "🧒", tags: "child kid" }, { e: "👧", tags: "girl child" },
  { e: "👦", tags: "boy child" }, { e: "👩", tags: "woman" },
  { e: "👨", tags: "man" }, { e: "🧓", tags: "elder grandparent" },
  { e: "🎯", tags: "goal target" }, { e: "🔥", tags: "fire streak" },
  { e: "🏆", tags: "trophy win" }, { e: "📝", tags: "note write" },
];

/** Curated lucide icon set for richer icons. */
const LUCIDE_NAMES = [
  "Sun", "Moon", "Cloud", "CloudRain", "Star", "Sparkles", "Flame", "Heart",
  "Leaf", "Flower2", "TreePine", "Sprout", "Apple", "Carrot", "Egg",
  "Coffee", "CupSoda", "Wine", "Pizza", "Cookie", "Soup", "Salad",
  "Bed", "Bath", "ShowerHead", "Toothbrush", "Shirt", "GraduationCap",
  "Backpack", "BookOpen", "Pencil", "Book", "School", "Briefcase",
  "Laptop", "Smartphone", "Phone", "Mail", "MessageCircle", "Music",
  "Music2", "Headphones", "Camera", "Image", "Film", "Gamepad2",
  "Dumbbell", "Bike", "Footprints", "Activity", "Pill", "Stethoscope",
  "Brain", "HeartHandshake", "Smile", "Hand", "ThumbsUp",
  "Baby", "Dog", "Cat", "Bird", "Fish",
  "Car", "Bus", "Plane", "MapPin", "Compass",
  "Home", "DoorOpen", "Sofa", "Lamp", "Plug", "Lightbulb",
  "Trash2", "WashingMachine", "Sparkle", "Wrench", "Hammer",
  "Clock", "AlarmClock", "Timer", "CalendarDays", "Bell",
  "Target", "Trophy", "Award", "Flag", "Bookmark", "Tag",
];

const RECENTS_KEY = "careflow:icon-recents:v1";

function loadRecents(): string[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]"); } catch { return []; }
}
function saveRecents(arr: string[]) {
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify(arr.slice(0, 16))); } catch { /* */ }
}

/** Render an icon value — supports emoji or `lc:Name` lucide refs. */
export function IconView({ value, className }: { value?: string; className?: string }) {
  if (!value) return null;
  if (value.startsWith("lc:")) {
    const I = (Lucide as any)[value.slice(3)];
    if (!I) return null;
    return <I className={className ?? "h-4 w-4"} />;
  }
  return <span className={className} aria-hidden>{value}</span>;
}

export function SearchableIconPicker({
  value, onChange, triggerClassName, placeholder = "+",
}: {
  value?: string;
  onChange: (icon: string) => void;
  triggerClassName?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<string[]>(() => loadRecents());

  useEffect(() => { if (!open) setQuery(""); }, [open]);

  const filteredEmoji = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EMOJI_LIBRARY;
    return EMOJI_LIBRARY.filter(x => x.tags.includes(q) || x.e.includes(q));
  }, [query]);
  const filteredLucide = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LUCIDE_NAMES;
    return LUCIDE_NAMES.filter(n => n.toLowerCase().includes(q));
  }, [query]);

  const pick = (v: string) => {
    onChange(v);
    const next = [v, ...recents.filter(r => r !== v)];
    setRecents(next);
    saveRecents(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-card text-base leading-none transition-colors hover:bg-muted/60",
            !value && "text-muted-foreground text-xs",
            triggerClassName,
          )}
          aria-label="Pick icon"
        >
          {value ? <IconView value={value} className="h-4 w-4" /> : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="z-[70] w-72 p-2" align="start" collisionPadding={12}>
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search icons…"
          className="mb-2 h-8 text-xs"
        />
        <div className="max-h-72 overflow-y-auto">
          {recents.length > 0 && !query && (
            <div className="mb-2">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Recent</div>
              <div className="grid grid-cols-8 gap-1">
                {recents.map(v => (
                  <button key={"r:" + v} type="button" onClick={() => pick(v)}
                    className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted/60"
                    title={v}>
                    <IconView value={v} className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {filteredEmoji.length > 0 && (
            <>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Emoji</div>
              <div className="grid grid-cols-8 gap-1">
                {filteredEmoji.map(({ e }) => (
                  <button key={e} type="button" onClick={() => pick(e)}
                    className={cn("grid h-8 w-8 place-items-center rounded-md text-lg hover:bg-muted/60",
                      value === e && "bg-primary/15 ring-1 ring-primary/40")}>
                    {e}
                  </button>
                ))}
              </div>
            </>
          )}
          {filteredLucide.length > 0 && (
            <>
              <div className="mt-2 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Icons</div>
              <div className="grid grid-cols-8 gap-1">
                {filteredLucide.map(name => {
                  const I = (Lucide as any)[name];
                  if (!I) return null;
                  const v = `lc:${name}`;
                  return (
                    <button key={name} type="button" onClick={() => pick(v)} title={name}
                      className={cn("grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        value === v && "bg-primary/15 text-primary ring-1 ring-primary/40")}>
                      <I className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {filteredEmoji.length === 0 && filteredLucide.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">No matches.</p>
          )}
        </div>
        {value && (
          <button type="button" onClick={() => { onChange(""); setOpen(false); }}
            className="mt-1 w-full rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/40">
            Clear icon
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}