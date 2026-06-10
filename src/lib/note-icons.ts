import { icons as LucideIcons, StickyNote, type LucideIcon } from "lucide-react";
import * as Astro from "@/components/icons/AstrologyIcons";
import type { Note } from "@/lib/notes";

export type IconCategory =
  | "Writing"
  | "Life"
  | "Work"
  | "Care"
  | "Health"
  | "Home"
  | "Travel"
  | "Money"
  | "Ideas"
  | "Nature"
  | "Symbols"
  | "Astrology";

export interface IconEntry {
  name: string;          // Lucide PascalCase name
  label: string;         // human-readable
  category: IconCategory;
  tags: string[];        // search keywords
}

/** Curated set of ~90 icons — fast to search, broad coverage. */
export const NOTE_ICONS: IconEntry[] = [
  // Writing
  { name: "StickyNote",    label: "Note",      category: "Writing", tags: ["note","memo","jot"] },
  { name: "NotebookPen",   label: "Notebook",  category: "Writing", tags: ["notebook","writing","draft"] },
  { name: "BookOpen",      label: "Book",      category: "Writing", tags: ["book","read","story"] },
  { name: "BookHeart",     label: "Journal",   category: "Writing", tags: ["journal","diary","heart"] },
  { name: "FileText",      label: "Document",  category: "Writing", tags: ["doc","document","file","paper"] },
  { name: "Pencil",        label: "Draft",     category: "Writing", tags: ["draft","edit","pencil"] },
  { name: "Quote",         label: "Quote",     category: "Writing", tags: ["quote","saying","words"] },
  { name: "ScrollText",    label: "Scroll",    category: "Writing", tags: ["scroll","letter"] },
  { name: "Feather",       label: "Poetry",    category: "Writing", tags: ["poem","poetry","feather"] },

  // Life
  { name: "Sun",           label: "Daily",     category: "Life", tags: ["daily","day","morning","sun"] },
  { name: "Moon",          label: "Night",     category: "Life", tags: ["night","moon","evening","sleep"] },
  { name: "Sparkles",      label: "Magic",     category: "Life", tags: ["magic","sparkle","wish"] },
  { name: "Heart",         label: "Love",      category: "Life", tags: ["love","heart","romance"] },
  { name: "Smile",         label: "Mood",      category: "Life", tags: ["mood","happy","smile"] },
  { name: "Coffee",        label: "Coffee",    category: "Life", tags: ["coffee","cafe","morning"] },
  { name: "Cake",          label: "Birthday",  category: "Life", tags: ["birthday","cake","party"] },
  { name: "PartyPopper",   label: "Celebrate", category: "Life", tags: ["party","celebrate","fun"] },
  { name: "Gift",          label: "Gift",      category: "Life", tags: ["gift","present"] },
  { name: "Music",         label: "Music",     category: "Life", tags: ["music","song","playlist"] },
  { name: "Camera",        label: "Photo",     category: "Life", tags: ["photo","camera","picture"] },
  { name: "Film",          label: "Movie",     category: "Life", tags: ["movie","film","cinema"] },

  // Work
  { name: "Briefcase",     label: "Work",      category: "Work", tags: ["work","job","career"] },
  { name: "Target",        label: "Goal",      category: "Work", tags: ["goal","target","aim"] },
  { name: "ListChecks",    label: "Checklist", category: "Work", tags: ["checklist","todo","list"] },
  { name: "ListTodo",      label: "Todo",      category: "Work", tags: ["todo","tasks"] },
  { name: "KanbanSquare",  label: "Kanban",    category: "Work", tags: ["kanban","board"] },
  { name: "ClipboardList", label: "Clipboard", category: "Work", tags: ["clipboard","plan"] },
  { name: "Calendar",      label: "Calendar",  category: "Work", tags: ["calendar","date","schedule"] },
  { name: "Clock",         label: "Time",      category: "Work", tags: ["time","clock","hour"] },
  { name: "Timer",         label: "Focus",     category: "Work", tags: ["focus","pomodoro","timer"] },
  { name: "Presentation",  label: "Meeting",   category: "Work", tags: ["meeting","present","talk"] },
  { name: "Users",         label: "Team",      category: "Work", tags: ["team","people","group"] },
  { name: "MessageSquare", label: "Message",   category: "Work", tags: ["message","chat","convo"] },
  { name: "Mail",          label: "Email",     category: "Work", tags: ["mail","email","letter"] },
  { name: "Phone",         label: "Call",      category: "Work", tags: ["call","phone"] },

  // Care
  { name: "HeartHandshake", label: "Care",     category: "Care", tags: ["care","support","help"] },
  { name: "Baby",          label: "Baby",      category: "Care", tags: ["baby","child","infant"] },
  { name: "Dog",           label: "Pet",       category: "Care", tags: ["pet","dog","animal"] },
  { name: "Cat",           label: "Cat",       category: "Care", tags: ["cat","kitten","pet"] },

  // Health
  { name: "Stethoscope",   label: "Doctor",    category: "Health", tags: ["doctor","medical","appt","appointment"] },
  { name: "Pill",          label: "Medicine",  category: "Health", tags: ["medicine","pill","rx","prescription"] },
  { name: "Activity",      label: "Vitals",    category: "Health", tags: ["vitals","heart","activity"] },
  { name: "Brain",         label: "Mind",      category: "Health", tags: ["mind","mental","brain","therapy"] },
  { name: "Dumbbell",      label: "Workout",   category: "Health", tags: ["workout","gym","exercise"] },
  { name: "Bike",          label: "Cycling",   category: "Health", tags: ["bike","cycle","ride"] },
  { name: "PersonStanding", label: "Stretch",  category: "Health", tags: ["yoga","stretch","mindful"] },

  // Home
  { name: "Home",          label: "Home",      category: "Home", tags: ["home","house"] },
  { name: "Bed",           label: "Bedroom",   category: "Home", tags: ["bed","sleep","bedroom"] },
  { name: "Sofa",          label: "Living",    category: "Home", tags: ["living","couch","sofa"] },
  { name: "ChefHat",       label: "Recipe",    category: "Home", tags: ["recipe","cook","chef","kitchen","meal"] },
  { name: "UtensilsCrossed", label: "Meals",   category: "Home", tags: ["meals","food","dinner","lunch"] },
  { name: "ShoppingCart",  label: "Groceries", category: "Home", tags: ["groceries","shopping","cart","store"] },
  { name: "Sprout",        label: "Garden",    category: "Home", tags: ["garden","plant","sprout"] },
  { name: "Wrench",        label: "Repair",    category: "Home", tags: ["repair","fix","maintenance","tool"] },

  // Travel
  { name: "Plane",         label: "Flight",    category: "Travel", tags: ["plane","flight","trip","travel"] },
  { name: "Car",           label: "Drive",     category: "Travel", tags: ["car","drive"] },
  { name: "MapPin",        label: "Place",     category: "Travel", tags: ["place","location","pin","map"] },
  { name: "Map",           label: "Map",       category: "Travel", tags: ["map","route","trip"] },
  { name: "Compass",       label: "Explore",   category: "Travel", tags: ["compass","explore","direction"] },
  { name: "Tent",          label: "Camping",   category: "Travel", tags: ["camp","tent","outdoor"] },
  { name: "Mountain",      label: "Mountain",  category: "Travel", tags: ["mountain","hike","peak"] },
  { name: "Palmtree",      label: "Vacation",  category: "Travel", tags: ["vacation","beach","palm"] },

  // Money
  { name: "Wallet",        label: "Wallet",    category: "Money", tags: ["wallet","cash","money"] },
  { name: "DollarSign",    label: "Money",     category: "Money", tags: ["money","dollar","cash"] },
  { name: "Receipt",       label: "Receipt",   category: "Money", tags: ["receipt","bill","expense"] },
  { name: "PiggyBank",     label: "Savings",   category: "Money", tags: ["save","savings","piggy"] },
  { name: "TrendingUp",    label: "Growth",    category: "Money", tags: ["growth","trend","up"] },
  { name: "CreditCard",    label: "Card",      category: "Money", tags: ["card","credit","payment"] },

  // Ideas
  { name: "Lightbulb",     label: "Idea",      category: "Ideas", tags: ["idea","light","insight","brainstorm"] },
  { name: "Telescope",     label: "Vision",    category: "Ideas", tags: ["vision","telescope","future"] },
  { name: "Puzzle",        label: "Puzzle",    category: "Ideas", tags: ["puzzle","solve","piece"] },
  { name: "Wand2",         label: "Spell",     category: "Ideas", tags: ["wand","magic","spell"] },
  { name: "Star",          label: "Favorite",  category: "Ideas", tags: ["star","favorite","top"] },
  { name: "Flame",         label: "Streak",    category: "Ideas", tags: ["flame","streak","fire","hot"] },
  { name: "Zap",           label: "Energy",    category: "Ideas", tags: ["zap","energy","fast"] },

  // Nature
  { name: "Cloud",         label: "Cloud",     category: "Nature", tags: ["cloud","sky"] },
  { name: "CloudRain",     label: "Rain",      category: "Nature", tags: ["rain","weather"] },
  { name: "Snowflake",     label: "Winter",    category: "Nature", tags: ["snow","winter","cold"] },
  { name: "Leaf",          label: "Leaf",      category: "Nature", tags: ["leaf","plant","nature"] },
  { name: "Trees",         label: "Forest",    category: "Nature", tags: ["tree","forest","wood"] },
  { name: "Flower2",       label: "Flower",    category: "Nature", tags: ["flower","bloom"] },
  { name: "Waves",         label: "Water",     category: "Nature", tags: ["wave","water","ocean","sea"] },

  // Symbols
  { name: "Bookmark",      label: "Bookmark",  category: "Symbols", tags: ["bookmark","save"] },
  { name: "Tag",           label: "Tag",       category: "Symbols", tags: ["tag","label"] },
  { name: "Hash",          label: "Hash",      category: "Symbols", tags: ["hash","tag"] },
  { name: "Pin",           label: "Pin",       category: "Symbols", tags: ["pin"] },
  { name: "Folder",        label: "Folder",    category: "Symbols", tags: ["folder","group"] },
  { name: "Archive",       label: "Archive",   category: "Symbols", tags: ["archive","box"] },
  { name: "Link",          label: "Link",      category: "Symbols", tags: ["link","url"] },
  { name: "Search",        label: "Search",    category: "Symbols", tags: ["search","find"] },
  { name: "Globe",         label: "Web",       category: "Symbols", tags: ["globe","web","world"] },

  // Astrology — planets
  { name: "Mercury",       label: "Mercury",   category: "Astrology", tags: ["mercury","planet","astrology"] },
  { name: "Venus",         label: "Venus",     category: "Astrology", tags: ["venus","planet","astrology"] },
  { name: "Mars",          label: "Mars",      category: "Astrology", tags: ["mars","planet","astrology"] },
  { name: "Jupiter",       label: "Jupiter",   category: "Astrology", tags: ["jupiter","planet","astrology"] },
  { name: "Saturn",        label: "Saturn",    category: "Astrology", tags: ["saturn","planet","astrology"] },
  { name: "Uranus",        label: "Uranus",    category: "Astrology", tags: ["uranus","planet","astrology"] },
  { name: "Neptune",       label: "Neptune",   category: "Astrology", tags: ["neptune","planet","astrology"] },
  { name: "Pluto",         label: "Pluto",     category: "Astrology", tags: ["pluto","planet","astrology"] },

  // Astrology — zodiac
  { name: "Aries",         label: "Aries",     category: "Astrology", tags: ["aries","zodiac","astrology","fire"] },
  { name: "Taurus",        label: "Taurus",    category: "Astrology", tags: ["taurus","zodiac","astrology","earth"] },
  { name: "Gemini",        label: "Gemini",    category: "Astrology", tags: ["gemini","zodiac","astrology","air"] },
  { name: "Cancer",        label: "Cancer",    category: "Astrology", tags: ["cancer","zodiac","astrology","water"] },
  { name: "Leo",           label: "Leo",       category: "Astrology", tags: ["leo","zodiac","astrology","fire"] },
  { name: "Virgo",         label: "Virgo",     category: "Astrology", tags: ["virgo","zodiac","astrology","earth"] },
  { name: "Libra",         label: "Libra",     category: "Astrology", tags: ["libra","zodiac","astrology","air"] },
  { name: "Scorpio",       label: "Scorpio",   category: "Astrology", tags: ["scorpio","zodiac","astrology","water"] },
  { name: "Sagittarius",   label: "Sagittarius", category: "Astrology", tags: ["sagittarius","zodiac","astrology","fire"] },
  { name: "Capricorn",     label: "Capricorn", category: "Astrology", tags: ["capricorn","zodiac","astrology","earth"] },
  { name: "Aquarius",      label: "Aquarius",  category: "Astrology", tags: ["aquarius","zodiac","astrology","air"] },
  { name: "Pisces",        label: "Pisces",    category: "Astrology", tags: ["pisces","zodiac","astrology","water"] },
];

export const NOTE_ICON_CATEGORIES: IconCategory[] = [
  "Writing","Life","Work","Care","Health","Home","Travel","Money","Ideas","Nature","Symbols","Astrology",
];

/** Keyword → icon. First match wins. */
const RULES: { test: RegExp; icon: string }[] = [
  { test: /\b(recipe|cook|kitchen|dinner|lunch|breakfast|meal|food)\b/i, icon: "ChefHat" },
  { test: /\b(grocer|shopping|store|cart)\b/i, icon: "ShoppingCart" },
  { test: /\b(doctor|appointment|appt|medical|clinic|dentist)\b/i, icon: "Stethoscope" },
  { test: /\b(med|medicine|pill|prescription|rx)\b/i, icon: "Pill" },
  { test: /\b(therapy|mental|mind|brain|anxious|anxiety)\b/i, icon: "Brain" },
  { test: /\b(workout|gym|exercise|lift)\b/i, icon: "Dumbbell" },
  { test: /\b(yoga|stretch|mindful)\b/i, icon: "PersonStanding" },
  { test: /\b(trip|travel|vacation|flight|airport)\b/i, icon: "Plane" },
  { test: /\b(camp|outdoor|tent)\b/i, icon: "Tent" },
  { test: /\b(hike|mountain|peak)\b/i, icon: "Mountain" },
  { test: /\b(map|route|address|place)\b/i, icon: "MapPin" },
  { test: /\b(garden|plant|sprout|seed)\b/i, icon: "Sprout" },
  { test: /\b(repair|fix|maintenance|broken)\b/i, icon: "Wrench" },
  { test: /\b(home|house)\b/i, icon: "Home" },
  { test: /\b(sleep|bed|dream)\b/i, icon: "Bed" },
  { test: /\b(moon|lunar|cycle)\b/i, icon: "Moon" },
  { test: /\b(journal|diary|reflect|gratitude)\b/i, icon: "BookHeart" },
  { test: /\b(poem|poetry|verse)\b/i, icon: "Feather" },
  { test: /\b(quote|quotation)\b/i, icon: "Quote" },
  { test: /\b(letter|scroll)\b/i, icon: "ScrollText" },
  { test: /\b(book|read|chapter|novel)\b/i, icon: "BookOpen" },
  { test: /\b(movie|film|cinema|watch)\b/i, icon: "Film" },
  { test: /\b(music|song|playlist|album)\b/i, icon: "Music" },
  { test: /\b(photo|picture|camera|album)\b/i, icon: "Camera" },
  { test: /\b(birthday|cake)\b/i, icon: "Cake" },
  { test: /\b(party|celebrate|celebration)\b/i, icon: "PartyPopper" },
  { test: /\b(gift|present)\b/i, icon: "Gift" },
  { test: /\b(love|heart|romance|partner)\b/i, icon: "Heart" },
  { test: /\b(baby|infant|newborn|toddler)\b/i, icon: "Baby" },
  { test: /\b(dog|puppy)\b/i, icon: "Dog" },
  { test: /\b(cat|kitten)\b/i, icon: "Cat" },
  { test: /\b(care|caregiv|support)\b/i, icon: "HeartHandshake" },
  { test: /\b(idea|brainstorm|insight)\b/i, icon: "Lightbulb" },
  { test: /\b(vision|future|dream)\b/i, icon: "Telescope" },
  { test: /\b(spell|magic|wish)\b/i, icon: "Wand2" },
  { test: /\b(goal|target|aim)\b/i, icon: "Target" },
  { test: /\b(meeting|call|standup|sync)\b/i, icon: "Presentation" },
  { test: /\b(team|people|crew)\b/i, icon: "Users" },
  { test: /\b(email|mail|inbox)\b/i, icon: "Mail" },
  { test: /\b(focus|pomodoro|deep work)\b/i, icon: "Timer" },
  { test: /\b(todo|task|checklist)\b/i, icon: "ListChecks" },
  { test: /\b(kanban|board)\b/i, icon: "KanbanSquare" },
  { test: /\b(work|job|career|project)\b/i, icon: "Briefcase" },
  { test: /\b(money|cash|wallet|spend|expense|bill|invoice)\b/i, icon: "Wallet" },
  { test: /\b(saving|piggy|invest)\b/i, icon: "PiggyBank" },
  { test: /\b(receipt|bill)\b/i, icon: "Receipt" },
  { test: /\b(coffee|cafe|latte|espresso)\b/i, icon: "Coffee" },
  { test: /\b(rain|storm)\b/i, icon: "CloudRain" },
  { test: /\b(snow|winter|cold)\b/i, icon: "Snowflake" },
  { test: /\b(ocean|beach|sea|wave|water)\b/i, icon: "Waves" },
  { test: /\b(forest|tree|wood)\b/i, icon: "Trees" },
  { test: /\b(flower|bloom|rose|tulip)\b/i, icon: "Flower2" },
  { test: /\b(star|favorite)\b/i, icon: "Star" },
  { test: /\b(streak|fire|flame|hot)\b/i, icon: "Flame" },
];

export function suggestIconForNote(note: Pick<Note, "title" | "body" | "kind">): string {
  if (note.kind === "daily") return "Sun";
  const haystack = `${note.title ?? ""}\n${(note.body ?? "").slice(0, 240)}`;
  for (const r of RULES) if (r.test.test(haystack)) return r.icon;
  return "StickyNote";
}

export function resolveNoteIcon(note: Pick<Note, "title" | "body" | "kind" | "icon">): string {
  if (note.icon && note.icon.length > 0) return note.icon;
  return suggestIconForNote(note);
}

/** Look up a Lucide component by PascalCase name (safe fallback to StickyNote). */
export function getLucideIcon(name: string | null | undefined): LucideIcon {
  if (!name) return StickyNote;
  const map = LucideIcons as unknown as Record<string, LucideIcon>;
  return map[name] ?? StickyNote;
}

/* ---------- recent icons ---------- */

const RECENT_KEY = "careflow:note-icons:recent";
const RECENT_MAX = 12;

export function getRecentNoteIcons(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch { return []; }
}

export function pushRecentNoteIcon(name: string) {
  if (typeof window === "undefined") return;
  try {
    const cur = getRecentNoteIcons().filter((s) => s !== name);
    cur.unshift(name);
    localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, RECENT_MAX)));
  } catch {}
}

export function searchNoteIcons(query: string): IconEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return NOTE_ICONS;
  return NOTE_ICONS.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.label.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q)),
  );
}