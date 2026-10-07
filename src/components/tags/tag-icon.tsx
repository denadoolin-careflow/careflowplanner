import {
  Tag as TagIcon, Sparkle, Heart, Star, Flag, Bookmark,
  Leaf, Sun, Moon, Compass, Flame, Cloud,
  Feather, Lightbulb, Rocket, Gem,
  Home, Briefcase, Baby, GraduationCap, ShoppingBag, Plane,
  Coffee, Music, BookOpen, Brush, Camera, MapPin, Smile,
  Pill, Stethoscope, Dumbbell, CalendarDays, Clock,
  Flower2, TreePine, Mountain, Waves, Snowflake, Rainbow,
  Apple, Carrot, UtensilsCrossed, CakeSlice, Wine, Soup,
  Dog, Cat, Bird, Fish, Bug, Rabbit,
  Car, Bike, Bus, Train, Ship, Tent,
  Wallet, PiggyBank, Receipt, Gift, HandHeart, Users,
  Phone, Mail, MessageCircle, Bell, AlarmClock, Timer,
  Hammer, Wrench, Paintbrush, Scissors, Ruler, Key,
  Laptop, Monitor, Printer, Wifi, BatteryCharging, Plug,
  Activity, Brain, Eye, Ear, Hand, Footprints,
  BedDouble, Bath, Shirt, WashingMachine, Trash2, Package,
  NotebookPen, PenLine, FileText, Folder, Archive, Paperclip,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  tag: TagIcon, sparkle: Sparkle, heart: Heart, star: Star, flag: Flag, bookmark: Bookmark,
  leaf: Leaf, sun: Sun, moon: Moon, compass: Compass, flame: Flame, cloud: Cloud,
  feather: Feather, lightbulb: Lightbulb, rocket: Rocket, gem: Gem,
  home: Home, briefcase: Briefcase, baby: Baby, graduation: GraduationCap, shopping: ShoppingBag, plane: Plane,
  coffee: Coffee, music: Music, book: BookOpen, brush: Brush, camera: Camera, "map-pin": MapPin, smile: Smile,
  pill: Pill, stethoscope: Stethoscope, dumbbell: Dumbbell, calendar: CalendarDays, clock: Clock,
  flower: Flower2, tree: TreePine, mountain: Mountain, waves: Waves, snowflake: Snowflake, rainbow: Rainbow,
  apple: Apple, carrot: Carrot, utensils: UtensilsCrossed, cake: CakeSlice, wine: Wine, soup: Soup,
  dog: Dog, cat: Cat, bird: Bird, fish: Fish, bug: Bug, rabbit: Rabbit,
  car: Car, bike: Bike, bus: Bus, train: Train, ship: Ship, tent: Tent,
  wallet: Wallet, "piggy-bank": PiggyBank, receipt: Receipt, gift: Gift, "hand-heart": HandHeart, users: Users,
  phone: Phone, mail: Mail, message: MessageCircle, bell: Bell, alarm: AlarmClock, timer: Timer,
  hammer: Hammer, wrench: Wrench, paintbrush: Paintbrush, scissors: Scissors, ruler: Ruler, key: Key,
  laptop: Laptop, monitor: Monitor, printer: Printer, wifi: Wifi, battery: BatteryCharging, plug: Plug,
  activity: Activity, brain: Brain, eye: Eye, ear: Ear, hand: Hand, footprints: Footprints,
  bed: BedDouble, bath: Bath, shirt: Shirt, laundry: WashingMachine, trash: Trash2, package: Package,
  notebook: NotebookPen, pen: PenLine, document: FileText, folder: Folder, archive: Archive, paperclip: Paperclip,
};

export function tagIconFor(name?: string): LucideIcon {
  if (!name) return TagIcon;
  return MAP[name.toLowerCase()] ?? TagIcon;
}

export const TAG_ICON_OPTIONS = Object.keys(MAP);

/** Themed groups for the picker UI. Order is render order. */
export const TAG_ICON_GROUPS: Array<{ label: string; icons: string[] }> = [
  { label: "Essentials",    icons: ["tag", "star", "heart", "flag", "bookmark", "sparkle", "lightbulb", "gem"] },
  { label: "Home & Family", icons: ["home", "baby", "users", "hand-heart", "gift", "bed", "bath", "laundry", "shirt", "package", "key", "trash"] },
  { label: "Kitchen & Food",icons: ["coffee", "utensils", "soup", "apple", "carrot", "cake", "wine", "shopping"] },
  { label: "Health & Body", icons: ["pill", "stethoscope", "dumbbell", "activity", "brain", "eye", "ear", "hand", "footprints", "smile", "feather", "leaf"] },
  { label: "Nature",        icons: ["flower", "tree", "mountain", "waves", "snowflake", "rainbow", "sun", "moon", "cloud", "flame"] },
  { label: "Pets & Animals",icons: ["dog", "cat", "bird", "fish", "rabbit", "bug"] },
  { label: "Work & Study",  icons: ["briefcase", "graduation", "book", "notebook", "pen", "document", "folder", "archive", "paperclip", "calendar", "clock", "rocket"] },
  { label: "Money & Admin", icons: ["wallet", "piggy-bank", "receipt", "mail", "phone", "message", "bell", "alarm", "timer"] },
  { label: "Tech & Tools",  icons: ["laptop", "monitor", "printer", "wifi", "battery", "plug", "hammer", "wrench", "paintbrush", "scissors", "ruler", "brush"] },
  { label: "Play & Travel", icons: ["plane", "map-pin", "camera", "compass", "tent", "car", "bike", "bus", "train", "ship", "music"] },
];
