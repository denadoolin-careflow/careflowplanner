export type Area =
  | "Family" | "Kids" | "Caregiving" | "Home" | "Meals"
  | "Appointments" | "Holidays & Birthdays" | "Personal"
  | "Creative Projects" | "Money";

export type Energy = "low" | "medium" | "high";
export type Priority = "low" | "medium" | "high";
export type DayPart = "Morning" | "Afternoon" | "Evening" | "Late Night";
export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "custom";
export type TaskStatus = "active" | "someday" | "this_week" | "waiting" | "done";

export interface Task {
  id: string;
  title: string;
  notes?: string;
  icon?: string;
  done: boolean;
  dueDate?: string; // ISO date
  priority: Priority;
  area: Area;
  tags?: string[];
  energy?: Energy;
  estMinutes?: number;
  goalId?: string;
  recipientId?: string;
  dayPart?: DayPart;
  isTopThree?: boolean;
  createdAt: string;
  status?: TaskStatus;
  sortOrder?: number;
  recurrenceType?: RecurrenceType;
  recurrenceInterval?: number;
  recurrenceDays?: number[];
  nextDueDate?: string;
  lastCompletedAt?: string;
  autoReset?: boolean;
  projectId?: string;
  parentTaskId?: string;
  inbox?: boolean;
  resetItemId?: string;
  sectionId?: string;
}

export interface AreaRecord {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  isArchived?: boolean;
}

export type ProjectStatus = "active" | "paused" | "done" | "someday";

export interface Project {
  id: string;
  areaId?: string;
  areaName?: string;
  parentProjectId?: string;
  name: string;
  notes?: string;
  icon?: string;
  color?: string;
  status: ProjectStatus;
  deadline?: string;
  sortOrder: number;
  archivedAt?: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: "Family" | "Home" | "Health" | "Creative" | "Financial" | "Relationship" | "Personal" | "Caregiving";
  timeline: "Q1" | "Q2" | "Q3" | "Q4" | "Year";
  progress: number; // 0-100
  status: "active" | "paused" | "done";
}

export interface Habit {
  id: string;
  title: string;
  cadence: "daily" | "weekly" | "monthly";
  category: "self-care" | "home" | "family" | "caregiving" | "health" | "creative" | "spiritual";
  streak: number;
  log: Record<string, boolean>; // date -> done
}

export interface JournalEntry {
  id: string;
  date: string;
  type: "daily" | "weekly" | "monthly" | "yearly" | "gratitude" | "brain-dump" | "burnout";
  title?: string;
  body: string;
  mood?: Energy;
  template?: string;
  energy?: string;
  prompts?: string[];
  gratitudeItems?: string[];
  tags?: string[];
  pinned?: boolean;
  linkedIds?: { type: string; id: string; label?: string }[];
}

export interface Meal {
  id: string;
  date: string;
  slot: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  name: string;
  notes?: string;
  kidSafe?: boolean;
  prepMinutes?: number;
  ingredients?: string[];
  steps?: string[];
  tags?: string[];
}

export interface GroceryItem {
  id: string; name: string; qty?: string; bought: boolean; category?: string; stockStatus: "in" | "low" | "out";
  sourceMealId?: string | null;
  sourceMealName?: string | null;
  sourceSlot?: string | null;
  sourceDate?: string | null;
}

export interface Appointment {
  id: string;
  date: string; // ISO date
  time?: string;
  title: string;
  icon?: string;
  with?: string;
  location?: string;
  recipientId?: string;
  type?: "doctor" | "therapy" | "school" | "family" | "personal" | "other";
}

export interface Birthday { id: string; name: string; date: string; relation?: string; notes?: string; }
export interface Holiday { id: string; name: string; date: string; notes?: string; }

export interface CareRecipient {
  id: string;
  name: string;
  kind: "child" | "elder" | "pet" | "partner" | "self";
  notes?: string;
  sensory?: string;
  contacts?: { name: string; phone?: string; role?: string }[];
  meds?: { name: string; dose?: string; schedule?: string }[];
  birthDate?: string;
  location?: string;
  zodiac?: string;
  loveLanguages?: string[];
  foodPreferences?: {
    breakfast?: { likes?: string[]; dislikes?: string[]; mealIds?: string[]; notes?: string };
    lunch?: { likes?: string[]; dislikes?: string[]; mealIds?: string[]; notes?: string };
    dinner?: { likes?: string[]; dislikes?: string[]; mealIds?: string[]; notes?: string };
    snacks?: { likes?: string[]; dislikes?: string[]; mealIds?: string[]; notes?: string };
    allergies?: string[];
  };
  school?: string;
  educationLevel?: string;
  schedule?: Record<string, string>; // weekday name -> description
  ssnLast4?: string;
  ssnFull?: string;
}

export interface CareNote { id: string; recipientId: string; date: string; body: string; tag?: string; }

export interface CleaningTask {
  id: string;
  title: string;
  zone: "Kitchen" | "Bathroom" | "Bedrooms" | "Living" | "Laundry" | "Entryway" | "Outdoor" | "Whole home";
  cadence: "daily" | "weekly" | "monthly" | "seasonal";
  done: boolean;
  lastDone?: string;
  weekday?: number;
  recurrenceType?: RecurrenceType;
  recurrenceDays?: number[];
  nextDueDate?: string;
  autoReset?: boolean;
  sortOrder?: number;
}

export interface ResetTemplate { id: string; name: string; items: string[]; }
export interface Idea { id: string; title: string; notes?: string; category: string; createdAt: string; }

export interface Settings {
  name: string;
  lowEnergyMode: boolean;
  theme?: "light" | "dark" | "system";
  email?: string;
  planningStyle?: string;
  timeZone?: string;
}

export interface AppState {
  tasks: Task[];
  goals: Goal[];
  habits: Habit[];
  journal: JournalEntry[];
  meals: Meal[];
  grocery: GroceryItem[];
  appointments: Appointment[];
  birthdays: Birthday[];
  holidays: Holiday[];
  recipients: CareRecipient[];
  careNotes: CareNote[];
  cleaning: CleaningTask[];
  resetTemplates: ResetTemplate[];
  ideas: Idea[];
  settings: Settings;
  energyToday?: Energy;
  energyDate?: string;
  areas?: AreaRecord[];
  projects?: Project[];
}

export const AREAS: Area[] = ["Family","Kids","Caregiving","Home","Meals","Appointments","Holidays & Birthdays","Personal","Creative Projects","Money"];
