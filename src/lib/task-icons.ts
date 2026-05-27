import {
  CheckSquare, Phone, Mail, ShoppingCart, Car, Plane, Train, Home, Wrench,
  Stethoscope, Pill, Heart, Dumbbell, Bike, Coffee, Utensils, ChefHat,
  Baby, Dog, Cat, Sparkles, Trash2, WashingMachine, Bed, Briefcase,
  Calendar, Clock, CreditCard, DollarSign, Receipt, Banknote, PiggyBank,
  BookOpen, GraduationCap, Pencil, FileText, Camera, Image as ImageIcon,
  Music, Film, Gift, PartyPopper, Cake, MapPin, Hammer, Paintbrush,
  Scissors, Shirt, Droplet, TreePine, Flower2, Sun, Moon, CloudRain,
  Bus, Truck, Building2, School, Hospital, Church, Globe, Wifi,
  MessageCircle, Send, Bell, AlarmClock, Timer, Tv, Gamepad2, Bookmark,
  Map as MapIcon, Star, Tag, Smile, Laptop, Smartphone, Printer,
  Package, Box, Hand, Footprints, Anchor, Sailboat, Mountain, Tent,
  Leaf, Feather, Compass, Flame, Cloud, Lightbulb, Rocket, Gem, Sparkle,
  type LucideIcon,
} from "lucide-react";

import type { Task } from "./types";

type Rule = { icon: LucideIcon; words: string[] };

/**
 * Keyword-to-icon rules. Order matters loosely — first match wins, so put
 * more specific keywords earlier. Matching is case-insensitive, whole-word
 * where the pattern is a word, substring otherwise.
 */
const RULES: Rule[] = [
  { icon: Phone,         words: ["call", "ring up", "phone", "ph "] },
  { icon: MessageCircle, words: ["text", "message", "sms", "whatsapp", "imessage", "dm "] },
  { icon: Mail,          words: ["email", "reply", "inbox", "respond", "send mail"] },
  { icon: Send,          words: ["send", "forward", "mail "] },
  { icon: ShoppingCart,  words: ["buy", "grocer", "shop", "purchase", "order ", "amazon", "target", "costco", "trader"] },
  { icon: Utensils,      words: ["lunch", "dinner", "breakfast", "brunch", "eat", "restaurant"] },
  { icon: ChefHat,       words: ["cook", "bake", "prep meal", "meal prep", "recipe"] },
  { icon: Coffee,        words: ["coffee", "tea", "starbucks", "espresso", "latte"] },
  { icon: Cake,          words: ["birthday", "cake"] },
  { icon: Gift,          words: ["gift", "present ", "wrap"] },
  { icon: PartyPopper,   words: ["party", "celebrate", "celebration", "rsvp"] },
  { icon: Stethoscope,   words: ["doctor", "dr.", "physician", "checkup", "appt", "appointment", "clinic"] },
  { icon: Hospital,      words: ["hospital", "er ", "urgent care", "surgery"] },
  { icon: Pill,           words: ["pill", "med ", "meds", "prescription", "refill", "pharmacy", "rx"] },
  { icon: Heart,          words: ["love", "hug", "kiss", "anniversary"] },
  { icon: Dumbbell,       words: ["gym", "workout", "lift", "exercise", "train ", "fitness"] },
  { icon: Bike,           words: ["bike", "cycle", "ride"] },
  { icon: Footprints,     words: ["walk", "stroll", "steps"] },
  { icon: Baby,           words: ["baby", "diaper", "bottle", "nursery", "infant"] },
  { icon: Dog,            words: ["dog", "walk dog", "puppy"] },
  { icon: Cat,            words: ["cat", "kitten", "litter"] },
  { icon: WashingMachine, words: ["laundry", "wash ", "fold", "dryer"] },
  { icon: Sparkles,       words: ["clean", "tidy", "wipe", "vacuum", "mop", "sweep", "scrub", "dust"] },
  { icon: Trash2,         words: ["trash", "garbage", "recycle", "throw out", "take out"] },
  { icon: Bed,            words: ["sleep", "nap", "rest", "bedtime", "make bed"] },
  { icon: Home,           words: ["home", "house"] },
  { icon: Wrench,         words: ["fix", "repair", "broken", "tighten", "leak"] },
  { icon: Hammer,         words: ["build", "install", "mount", "hang"] },
  { icon: Paintbrush,     words: ["paint"] },
  { icon: Scissors,       words: ["cut", "haircut", "trim", "barber", "salon"] },
  { icon: Shirt,          words: ["clothes", "wear ", "outfit", "dress "] },
  { icon: Droplet,        words: ["water plants", "hydrate", "drink water"] },
  { icon: Flower2,        words: ["flower", "bouquet", "garden"] },
  { icon: TreePine,       words: ["tree", "yard", "lawn", "mow"] },
  { icon: Car,            words: ["drive", "uber", "lyft", "gas", "park car", "car wash"] },
  { icon: Plane,          words: ["fly", "flight", "airport", "plane"] },
  { icon: Train,          words: ["train", "metro", "subway"] },
  { icon: Bus,            words: ["bus "] },
  { icon: Truck,          words: ["truck", "moving"] },
  { icon: MapPin,         words: ["pickup", "drop off", "drop-off", "errand"] },
  { icon: MapIcon,        words: ["trip", "travel", "vacation", "itinerary"] },
  { icon: Mountain,       words: ["hike", "climb"] },
  { icon: Tent,           words: ["camp"] },
  { icon: Sailboat,       words: ["sail", "boat"] },
  { icon: Anchor,         words: ["dock", "marina"] },
  { icon: CreditCard,     words: ["pay ", "bill", "subscription", "renew "] },
  { icon: DollarSign,     words: ["budget", "money", "expense", "spend"] },
  { icon: Banknote,       words: ["cash", "withdraw", "deposit"] },
  { icon: PiggyBank,      words: ["save", "savings", "invest"] },
  { icon: Receipt,        words: ["receipt", "expense report", "reimburse"] },
  { icon: Briefcase,      words: ["meeting", "standup", "1:1", "work ", "interview", "client"] },
  { icon: Laptop,         words: ["laptop", "computer", "macbook", "pc "] },
  { icon: Smartphone,     words: ["phone setup", "iphone", "android"] },
  { icon: Printer,        words: ["print"] },
  { icon: Wifi,           words: ["wifi", "router", "internet"] },
  { icon: Globe,          words: ["website", "domain"] },
  { icon: BookOpen,       words: ["read ", "book", "chapter"] },
  { icon: GraduationCap,  words: ["study", "school", "exam", "homework", "class"] },
  { icon: School,         words: ["school pickup", "drop off", "parent teacher"] },
  { icon: Pencil,         words: ["write", "draft", "edit"] },
  { icon: FileText,       words: ["form", "document", "doc ", "paperwork", "sign "] },
  { icon: Camera,         words: ["photo", "picture", "snap"] },
  { icon: ImageIcon,      words: ["image", "design"] },
  { icon: Music,          words: ["music", "song", "playlist", "practice "] },
  { icon: Film,           words: ["movie", "film", "watch "] },
  { icon: Tv,             words: ["tv", "show "] },
  { icon: Gamepad2,       words: ["game", "play "] },
  { icon: Bookmark,       words: ["save link", "bookmark"] },
  { icon: Calendar,       words: ["schedule", "book ", "calendar", "reserve"] },
  { icon: Clock,          words: ["time ", "deadline"] },
  { icon: AlarmClock,     words: ["alarm", "wake "] },
  { icon: Timer,          words: ["timer", "pomodoro"] },
  { icon: Bell,           words: ["remind", "reminder", "notify"] },
  { icon: Package,        words: ["package", "delivery", "ship "] },
  { icon: Box,            words: ["box", "pack "] },
  { icon: Church,         words: ["church", "pray", "service"] },
  { icon: Building2,      words: ["office", "bank "] },
  { icon: Sun,            words: ["morning", "sunrise"] },
  { icon: Moon,           words: ["evening", "night"] },
  { icon: CloudRain,      words: ["weather", "rain"] },
  { icon: Star,           words: ["important", "priority", "must "] },
  { icon: Smile,          words: ["self care", "self-care", "treat", "rest day"] },
];

/**
 * Detects a Lucide icon for a task based on its title and (optionally) notes.
 * Always returns a sensible default so callers never have to null-check.
 */
export function inferTaskIcon(title: string, notes?: string): LucideIcon {
  const hay = ` ${(title || "").toLowerCase()} ${(notes || "").toLowerCase()} `;
  for (const rule of RULES) {
    for (const w of rule.words) {
      const needle = w.toLowerCase();
      // Wrap word patterns in spaces so "ride" doesn't match "pride".
      if (hay.includes(` ${needle}`) || hay.includes(`${needle} `) || hay.includes(needle)) {
        return rule.icon;
      }
    }
  }
  return CheckSquare;
}

/** Map of lucide icon name → component for `lc:Name` task.icon refs.
 *  Mirrors LucideIconPicker so any picked icon resolves consistently across views. */
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

/** Resolves the saved task icon (lucide or emoji) into a kind we can render. */
export function resolveTaskIcon(task: Pick<Task, "icon" | "title" | "notes">):
  | { kind: "lucide"; Icon: LucideIcon }
  | { kind: "emoji"; char: string }
{
  const raw = task.icon;
  if (raw) {
    if (raw.startsWith("lc:")) {
      const I = LUCIDE_MAP[raw.slice(3)];
      if (I) return { kind: "lucide", Icon: I };
    } else if (raw.trim()) {
      return { kind: "emoji", char: raw };
    }
  }
  return { kind: "lucide", Icon: inferTaskIcon(task.title, task.notes) };
}