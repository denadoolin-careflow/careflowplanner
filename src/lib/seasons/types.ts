export type CelebrationKind =
  | "birthday" | "anniversary" | "graduation"
  | "family_milestone" | "care_milestone" | "therapy_win"
  | "adoption" | "special_event" | "custom";

export type CelebrationStatus = "planning" | "in_progress" | "done";
export type CelebrationTaskCategory = "decor" | "cake" | "gifts" | "food" | "invitations" | "other";
export type HolidayPlanCategory = "federal" | "religious" | "family" | "seasonal" | "custom";
export type TraditionAnchor = "christmas_eve" | "thanksgiving" | "first_snow" | "birthday" | "custom_date" | "season";
export type BucketSeason = "spring" | "summer" | "autumn" | "winter" | "all";
export type RemembranceKind = "person" | "pet" | "date";
export type MemoryGroupType = "season" | "holiday" | "birthday" | "celebration" | "year";

export interface Celebration {
  id: string;
  kind: CelebrationKind;
  title: string;
  date: string;          // YYYY-MM-DD
  endDate?: string | null;
  recipientId?: string | null;
  theme?: string | null;
  color?: string | null;
  icon?: string | null;
  coverUrl?: string | null;
  budgetCents?: number | null;
  spentCents?: number | null;
  status: CelebrationStatus;
  notes?: string | null;
  recursYearly: boolean;
  parentCelebrationId?: string | null;
  personAgeAnchor?: number | null;
  updatedAt?: string;
}

export interface CelebrationTask {
  id: string;
  celebrationId: string;
  title: string;
  category: CelebrationTaskCategory;
  done: boolean;
  dueOffsetDays?: number | null;
  linkedTaskId?: string | null;
  sortOrder: number;
  updatedAt?: string;
}

export interface WishlistItem {
  id: string;
  celebrationId?: string | null;
  recipientId?: string | null;
  title: string;
  url?: string | null;
  priceCents?: number | null;
  claimedBy?: string | null;
  done: boolean;
  notes?: string | null;
}

export interface HolidayPlan {
  id: string;
  holidayId?: string | null;
  customName?: string | null;
  customDate?: string | null;
  category: HolidayPlanCategory;
  budgetCents?: number | null;
  spentCents?: number | null;
  color?: string | null;
  icon?: string | null;
  notes?: string | null;
  status: CelebrationStatus;
  updatedAt?: string;
}

export interface HolidayStep {
  id: string;
  holidayPlanId: string;
  daysBefore: number;
  title: string;
  notes?: string | null;
  done: boolean;
  sortOrder: number;
}

export interface Tradition {
  id: string;
  title: string;
  description?: string | null;
  anchor: TraditionAnchor;
  anchorDate?: string | null;
  category?: string | null;
  icon?: string | null;
  color?: string | null;
  recursYearly: boolean;
  active: boolean;
  updatedAt?: string;
}

export interface TraditionItem {
  id: string;
  traditionId: string;
  title: string;
  sortOrder: number;
}

export interface TraditionInstance {
  id: string;
  traditionId: string;
  year: number;
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  itemState: Record<string, boolean>;
}

export interface BucketList {
  id: string;
  season: BucketSeason;
  year?: number | null;
  title: string;
  color?: string | null;
  icon?: string | null;
  isShared: boolean;
  sortOrder: number;
}

export interface BucketItem {
  id: string;
  listId: string;
  title: string;
  done: boolean;
  doneAt?: string | null;
  dueDate?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  sortOrder: number;
}

export interface SeasonalGoal {
  id: string;
  season: BucketSeason;
  year: number;
  title: string;
  done: boolean;
  notes?: string | null;
  sortOrder: number;
}

export interface Remembrance {
  id: string;
  name: string;
  kind: RemembranceKind;
  birthDate?: string | null;
  remembranceDate?: string | null;
  photoUrl?: string | null;
  story?: string | null;
  showPrompts: boolean;
}

export interface MemoryBookEntry {
  id: string;
  title: string;
  body?: string | null;
  date: string;
  groupType: MemoryGroupType;
  groupKey: string;
  media: Array<{ kind: "photo" | "video" | "voice" | "journal"; url: string; caption?: string }>;
  coverUrl?: string | null;
  mood?: string | null;
  linkedCelebrationId?: string | null;
  linkedHolidayId?: string | null;
  linkedMemoryId?: string | null;
  updatedAt?: string;
}