import type { AppState } from "./types";

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const T = iso(today);

/** Empty shape used during loading and as default. */
export const seedState = (): AppState => ({
  settings: { name: "", lowEnergyMode: false, theme: "system" },
  tasks: [], goals: [], habits: [], journal: [], meals: [], grocery: [],
  appointments: [], birthdays: [], holidays: [], recipients: [], careNotes: [],
  cleaning: [], ideas: [], projectSections: [],
  resetTemplates: [
    { id: "rt1", name: "Sunday Reset", items: ["Plan the week's meals","Make grocery list","Wash & fold laundry","Review appointments","Pack school bags","Wipe kitchen","Take out trash","Check meds & supplies"] },
    { id: "rt2", name: "Reset After a Hard Day", items: ["Drink a full glass of water","Clear one surface","Write one note","Choose tomorrow's top task","Lights out by 10:30"] },
    { id: "rt3", name: "Minimum Viable Day", items: ["Everyone fed","Meds taken","One load of laundry","One kind word to myself"] },
  ],
});

/** Per-table inserts for a brand-new user's first sign-in. */
export function newUserSeed(uid: string) {
  return {
    tasks: [
      { user_id: uid, title: "Pack school bag for tomorrow", priority: "high", area: "Kids", is_top_three: true, due_date: T, day_part: "Evening", energy: "low" },
      { user_id: uid, title: "Call pediatrician for follow-up", priority: "high", area: "Caregiving", is_top_three: true, due_date: T, day_part: "Morning", energy: "medium" },
      { user_id: uid, title: "Plan this week's meals", priority: "medium", area: "Meals", is_top_three: true, due_date: T, day_part: "Afternoon", energy: "medium" },
      { user_id: uid, title: "Sort the laundry basket", priority: "low", area: "Home", due_date: T, day_part: "Morning", energy: "low" },
      { user_id: uid, title: "Refill Nana's medication", priority: "high", area: "Caregiving", due_date: iso(addDays(today,1)), energy: "medium" },
      { user_id: uid, title: "Wrap birthday gift for Mia", priority: "medium", area: "Holidays & Birthdays", due_date: iso(addDays(today,2)) },
      { user_id: uid, title: "Schedule dentist for the kids", priority: "medium", area: "Appointments" },
      { user_id: uid, title: "Write three pages — novel draft", priority: "low", area: "Creative Projects", energy: "high" },
    ],
    goals: [
      { user_id: uid, title: "Calmer mornings", description: "A gentler start: lay out clothes, prep bags, no phone first 30 min.", category: "Family", timeline: "Q1", progress: 35 },
      { user_id: uid, title: "Consistent meal planning", description: "Plan Sunday, shop Monday, no decision fatigue at 5pm.", category: "Home", timeline: "Q1", progress: 50 },
      { user_id: uid, title: "Finish creative project", category: "Creative", timeline: "Q2", progress: 20 },
      { user_id: uid, title: "Protect rest", description: "Lights out by 10:30.", category: "Health", timeline: "Year", progress: 25 },
    ],
    habits: [
      { user_id: uid, title: "Drink water with breakfast", cadence: "daily", category: "self-care" },
      { user_id: uid, title: "10 minutes outside", cadence: "daily", category: "health" },
      { user_id: uid, title: "One tidy-up sweep before bed", cadence: "daily", category: "home" },
      { user_id: uid, title: "Read with the kids", cadence: "daily", category: "family" },
      { user_id: uid, title: "Journal one line", cadence: "daily", category: "spiritual" },
    ],
    meals: [
      { user_id: uid, date: T, slot: "Breakfast", name: "Yogurt + berries + toast", kid_safe: true },
      { user_id: uid, date: T, slot: "Lunch", name: "Turkey wraps + apple slices", kid_safe: true },
      { user_id: uid, date: T, slot: "Dinner", name: "Tacos (mild for kids)", kid_safe: true },
      { user_id: uid, date: iso(addDays(today,1)), slot: "Dinner", name: "Breakfast for dinner — pancakes + eggs", kid_safe: true },
      { user_id: uid, date: iso(addDays(today,2)), slot: "Dinner", name: "Pasta + green beans", kid_safe: true },
    ],
    grocery_items: [
      { user_id: uid, name: "Tortillas", category: "Pantry" },
      { user_id: uid, name: "Shredded cheese", category: "Dairy" },
      { user_id: uid, name: "Pasta", category: "Pantry" },
      { user_id: uid, name: "Eggs", category: "Dairy" },
    ],
    appointments: [
      { user_id: uid, date: T, time: "10:30", title: "OT for Sam", type: "therapy", with_name: "Ms. Riley", location: "Sunrise Therapy" },
      { user_id: uid, date: iso(addDays(today,1)), time: "14:00", title: "Pediatrician — well visit", type: "doctor" },
      { user_id: uid, date: iso(addDays(today,3)), time: "09:00", title: "Parent-teacher conference", type: "school" },
    ],
    birthdays: [
      { user_id: uid, name: "Mia", date: iso(addDays(today,2)), relation: "Niece" },
      { user_id: uid, name: "Mom", date: iso(addDays(today,18)), relation: "Mom" },
    ],
    holidays: [
      { user_id: uid, name: "Mother's Day", date: iso(addDays(today,12)) },
    ],
    ideas: [
      { user_id: uid, title: "Family cookbook with kids' favorites", category: "creative ideas" },
      { user_id: uid, title: "Birthday box — wrap, cards, ribbon in one bin", category: "home ideas" },
      { user_id: uid, title: "Sheet-pan everything Tuesdays", category: "meal ideas" },
    ],
    cleaning_tasks: [
      { user_id: uid, title: "Laundry reset", zone: "Laundry", cadence: "weekly", weekday: 1, recurrence_type: "weekly", auto_reset: true, sort_order: 1 },
      { user_id: uid, title: "Bathrooms", zone: "Bathroom", cadence: "weekly", weekday: 2, recurrence_type: "weekly", auto_reset: true, sort_order: 2 },
      { user_id: uid, title: "Kitchen deep clean", zone: "Kitchen", cadence: "weekly", weekday: 3, recurrence_type: "weekly", auto_reset: true, sort_order: 3 },
      { user_id: uid, title: "Floors", zone: "Whole home", cadence: "weekly", weekday: 4, recurrence_type: "weekly", auto_reset: true, sort_order: 4 },
      { user_id: uid, title: "Paperwork & appointments review", zone: "Whole home", cadence: "weekly", weekday: 5, recurrence_type: "weekly", auto_reset: true, sort_order: 5 },
      { user_id: uid, title: "Bedrooms", zone: "Bedrooms", cadence: "weekly", weekday: 6, recurrence_type: "weekly", auto_reset: true, sort_order: 6 },
      { user_id: uid, title: "Meal plan & grocery list", zone: "Kitchen", cadence: "weekly", weekday: 0, recurrence_type: "weekly", auto_reset: true, sort_order: 7 },
    ],
    journal_entries: [
      { user_id: uid, date: T, type: "daily", title: "A small soft start", body: "Coffee in the quiet kitchen. The dishwasher is running. I'm okay.", mood: "medium" },
    ],
    care_recipients: [
      { user_id: uid, name: "Sam (7)", kind: "child", notes: "Picky eater — beige foods OK.", sensory: "Soft tags only. Loud noises overwhelm. Loves weighted blanket." },
      { user_id: uid, name: "Nana", kind: "elder", notes: "Lives with us Tue-Thu. Soft foods after dental work." },
      { user_id: uid, name: "Self", kind: "self", notes: "I count too." },
    ],
  };
}