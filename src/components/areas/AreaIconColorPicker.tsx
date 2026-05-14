import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Folder, Home, Heart, Briefcase, Users, Sparkles, Star, Sun, Moon, Leaf,
  BookOpen, Coffee, Music, Palette, Plane, Camera, Dumbbell, Brain,
  DollarSign, ShoppingCart, Utensils, Baby, PawPrint, Globe, Rocket,
  Target, Flame, Lightbulb, Map, Mountain, type LucideIcon,
} from "lucide-react";
import { useState } from "react";

export const AREA_ICONS: { name: string; Icon: LucideIcon }[] = [
  { name: "folder", Icon: Folder }, { name: "home", Icon: Home },
  { name: "heart", Icon: Heart }, { name: "briefcase", Icon: Briefcase },
  { name: "users", Icon: Users }, { name: "sparkles", Icon: Sparkles },
  { name: "star", Icon: Star }, { name: "sun", Icon: Sun },
  { name: "moon", Icon: Moon }, { name: "leaf", Icon: Leaf },
  { name: "book-open", Icon: BookOpen }, { name: "coffee", Icon: Coffee },
  { name: "music", Icon: Music }, { name: "palette", Icon: Palette },
  { name: "plane", Icon: Plane }, { name: "camera", Icon: Camera },
  { name: "dumbbell", Icon: Dumbbell }, { name: "brain", Icon: Brain },
  { name: "dollar-sign", Icon: DollarSign }, { name: "shopping-cart", Icon: ShoppingCart },
  { name: "utensils", Icon: Utensils }, { name: "baby", Icon: Baby },
  { name: "paw-print", Icon: PawPrint }, { name: "globe", Icon: Globe },
  { name: "rocket", Icon: Rocket }, { name: "target", Icon: Target },
  { name: "flame", Icon: Flame }, { name: "lightbulb", Icon: Lightbulb },
  { name: "map", Icon: Map }, { name: "mountain", Icon: Mountain },
];

export const AREA_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#78716c",
];

export function getAreaIcon(name?: string): LucideIcon {
  return AREA_ICONS.find(i => i.name === name)?.Icon ?? Folder;
}

interface Props {
  icon?: string;
  color?: string;
  onChange: (patch: { icon?: string; color?: string }) => void;
  trigger?: React.ReactNode;
  align?: "start" | "center" | "end";
}

export function AreaIconColorPicker({ icon, color, onChange, trigger, align = "start" }: Props) {
  const [customColor, setCustomColor] = useState(color ?? "#6366f1");
  const Current = getAreaIcon(icon);
  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-md hover:bg-muted"
            aria-label="Edit icon and color"
          >
            <Current className="h-4 w-4" style={color ? { color } : undefined} />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-72 p-3">
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Icon</div>
            <div className="grid grid-cols-8 gap-1">
              {AREA_ICONS.map(({ name, Icon }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onChange({ icon: name })}
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-md hover:bg-muted",
                    icon === name && "bg-primary/15 ring-1 ring-primary",
                  )}
                  aria-label={name}
                >
                  <Icon className="h-3.5 w-3.5" style={color ? { color } : undefined} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Color</div>
            <div className="grid grid-cols-9 gap-1">
              {AREA_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCustomColor(c); onChange({ color: c }); }}
                  className={cn(
                    "h-6 w-6 rounded-full border border-border/40 transition hover:scale-110",
                    color === c && "ring-2 ring-foreground ring-offset-1 ring-offset-background",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="color"
                value={customColor}
                onChange={e => setCustomColor(e.target.value)}
                className="h-7 w-12 cursor-pointer p-0.5"
              />
              <Input
                value={customColor}
                onChange={e => setCustomColor(e.target.value)}
                placeholder="#hex"
                className="h-7 flex-1 text-xs"
              />
              <Button size="sm" variant="outline" className="h-7" onClick={() => onChange({ color: customColor })}>Set</Button>
            </div>
            <button
              type="button"
              onClick={() => onChange({ color: undefined })}
              className="mt-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Clear color
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}