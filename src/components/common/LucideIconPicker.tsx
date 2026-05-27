import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckSquare, Phone, Mail, MessageCircle, Send, ShoppingCart, Utensils, ChefHat, Coffee,
  Cake, Gift, PartyPopper, Stethoscope, Hospital, Pill, Heart, Dumbbell, Bike, Footprints,
  Baby, Dog, Cat, WashingMachine, Sparkles, Trash2, Bed, Home, Wrench, Hammer, Paintbrush,
  Scissors, Shirt, Droplet, Flower2, TreePine, Car, Plane, Train, Bus, Truck, MapPin,
  Map as MapIcon, Mountain, Tent, Sailboat, Anchor, CreditCard, DollarSign, Banknote,
  PiggyBank, Receipt, Briefcase, Laptop, Smartphone, Printer, Wifi, Globe, BookOpen,
  GraduationCap, School, Pencil, FileText, Camera, Image as ImageIcon, Music, Film, Tv,
  Gamepad2, Bookmark, Calendar, Clock, AlarmClock, Timer, Bell, Package, Box, Church,
  Building2, Sun, Moon, CloudRain, Star, Smile, Leaf, Feather, Compass, Flame, Cloud,
  Lightbulb, Rocket, Gem, Sparkle,
  Shapes, X,
  type LucideIcon,
} from "lucide-react";

const LUCIDE_MAP: Record<string, LucideIcon> = {
  CheckSquare, Phone, Mail, MessageCircle, Send, ShoppingCart, Utensils, ChefHat, Coffee,
  Cake, Gift, PartyPopper, Stethoscope, Hospital, Pill, Heart, Dumbbell, Bike, Footprints,
  Baby, Dog, Cat, WashingMachine, Sparkles, Trash2, Bed, Home, Wrench, Hammer, Paintbrush,
  Scissors, Shirt, Droplet, Flower2, TreePine, Car, Plane, Train, Bus, Truck, MapPin,
  MapIcon, Mountain, Tent, Sailboat, Anchor, CreditCard, DollarSign, Banknote,
  PiggyBank, Receipt, Briefcase, Laptop, Smartphone, Printer, Wifi, Globe, BookOpen,
  GraduationCap, School, Pencil, FileText, Camera, ImageIcon, Music, Film, Tv,
  Gamepad2, Bookmark, Calendar, Clock, AlarmClock, Timer, Bell, Package, Box, Church,
  Building2, Sun, Moon, CloudRain, Star, Smile, Leaf, Feather, Compass, Flame, Cloud,
  Lightbulb, Rocket, Gem, Sparkle,
};

const LUCIDE_NAMES = Object.keys(LUCIDE_MAP);

/** Render any task icon string — supports `lc:Name` lucide refs and emoji. */
export function TaskIconView({ value, className }: { value?: string; className?: string }) {
  if (!value) return null;
  if (value.startsWith("lc:")) {
    const I = LUCIDE_MAP[value.slice(3)];
    if (!I) return null;
    return <I className={className ?? "h-4 w-4"} />;
  }
  return <span className={className} aria-hidden>{value}</span>;
}

/** Strip lucide prefix for plain text contexts (calendar event labels, etc). */
export function taskIconText(value?: string): string {
  if (!value) return "";
  if (value.startsWith("lc:")) return "";
  return value;
}

interface Props {
  value?: string;
  onChange: (v: string | undefined) => void;
  label?: string;
  className?: string;
  /** Icon to display in the trigger when no explicit value is set. */
  fallbackIcon?: LucideIcon;
}

export function LucideIconPicker({ value, onChange, label = "Icon", className, fallbackIcon }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LUCIDE_NAMES;
    return LUCIDE_NAMES.filter(n => n.toLowerCase().includes(q));
  }, [query]);

  const Current = value?.startsWith("lc:") ? LUCIDE_MAP[value.slice(3)] : undefined;
  const Display = Current ?? fallbackIcon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={label}
          title={label}
          className={cn("h-9 w-9 shrink-0", className)}
        >
          {Display ? <Display className={cn("h-4 w-4", !Current && "opacity-70")} /> : <Shapes className="h-4 w-4 opacity-60" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[70] w-72 p-3" align="start" collisionPadding={12}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          {value && (
            <button
              type="button"
              onClick={() => { onChange(undefined); setOpen(false); }}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search icons…"
          className="mb-2 h-8 text-xs"
        />
        <div className="grid max-h-60 grid-cols-8 gap-1 overflow-y-auto">
          {filtered.map(name => {
            const I = LUCIDE_MAP[name];
            const active = value === `lc:${name}`;
            return (
              <button
                key={name}
                type="button"
                onClick={() => { onChange(`lc:${name}`); setOpen(false); }}
                title={name}
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground",
                  active && "bg-primary/15 text-primary ring-1 ring-primary",
                )}
              >
                <I className="h-3.5 w-3.5" />
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-8 py-4 text-center text-xs text-muted-foreground">No matches.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
