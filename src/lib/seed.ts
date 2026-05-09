import type { AppState } from "./types";

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const id = () => Math.random().toString(36).slice(2, 10);

const T = iso(today);

export const seedState = (): AppState => ({
  settings: { name: "Friend", lowEnergyMode: false, theme: "system" },
  energyDate: T,
  energyToday: "medium",
  tasks: [
    { id: id(), title: "Pack school bag for tomorrow", done: false, priority: "high", area: "Kids", isTopThree: true, dueDate: T, dayPart: "Evening", energy: "low", createdAt: T },
    { id: id(), title: "Call pediatrician for follow-up", done: false, priority: "high", area: "Caregiving", isTopThree: true, dueDate: T, dayPart: "Morning", energy: "medium", createdAt: T },
    { id: id(), title: "Plan this week's meals", done: false, priority: "medium", area: "Meals", isTopThree: true, dueDate: T, dayPart: "Afternoon", energy: "medium", createdAt: T },
    { id: id(), title: "Sort the laundry basket", done: false, priority: "low", area: "Home", dueDate: T, dayPart: "Morning", energy: "low", createdAt: T },
    { id: id(), title: "Refill Nana's medication", done: false, priority: "high", area: "Caregiving", dueDate: iso(addDays(today,1)), energy: "medium", createdAt: T },
    { id: id(), title: "Wrap birthday gift for Mia", done: false, priority: "medium", area: "Holidays & Birthdays", dueDate: iso(addDays(today,2)), createdAt: T },
    { id: id(), title: "Schedule dentist for the kids", done: false, priority: "medium", area: "Appointments", createdAt: T },
    { id: id(), title: "Write three pages — novel draft", done: false, priority: "low", area: "Creative Projects", energy: "high", createdAt: T },
    { id: id(), title: "Move the laundry to dryer", done: true, priority: "low", area: "Home", dueDate: T, createdAt: T },
  ],
  goals: [
    { id: id(), title: "Calmer mornings", description: "A gentler start: lay out clothes, prep bags, no phone first 30 min.", category: "Family", timeline: "Q1", progress: 35, status: "active" },
    { id: id(), title: "Consistent meal planning", description: "Plan Sunday, shop Monday, no decision fatigue at 5pm.", category: "Home", timeline: "Q1", progress: 50, status: "active" },
    { id: id(), title: "Finish creative project", description: "Ship the small thing I keep almost-finishing.", category: "Creative", timeline: "Q2", progress: 20, status: "active" },
    { id: id(), title: "Reduce clutter in the living room", category: "Home", timeline: "Q1", progress: 60, status: "active" },
    { id: id(), title: "Protect rest", description: "Lights out by 10:30. Phone off the nightstand.", category: "Health", timeline: "Year", progress: 25, status: "active" },
    { id: id(), title: "Caregiver support group, monthly", category: "Caregiving", timeline: "Year", progress: 10, status: "active" },
  ],
  habits: [
    { id: id(), title: "Drink water with breakfast", cadence: "daily", category: "self-care", streak: 4, log: { [T]: false, [iso(addDays(today,-1))]: true, [iso(addDays(today,-2))]: true } },
    { id: id(), title: "10 minutes outside", cadence: "daily", category: "health", streak: 2, log: { [iso(addDays(today,-1))]: true } },
    { id: id(), title: "One tidy-up sweep before bed", cadence: "daily", category: "home", streak: 6, log: { [T]: true, [iso(addDays(today,-1))]: true } },
    { id: id(), title: "Read with the kids", cadence: "daily", category: "family", streak: 3, log: {} },
    { id: id(), title: "Sunday weekly reset", cadence: "weekly", category: "home", streak: 2, log: {} },
    { id: id(), title: "Journal one line", cadence: "daily", category: "spiritual", streak: 9, log: { [T]: true } },
  ],
  journal: [
    { id: id(), date: T, type: "daily", title: "A small soft start", body: "Coffee in the quiet kitchen. The dishwasher is running. I'm okay.", mood: "medium" },
    { id: id(), date: iso(addDays(today,-2)), type: "gratitude", body: "1) Slept until 6:30  2) Nana laughed at the bird outside  3) The kids ate dinner without a fight" },
    { id: id(), date: iso(addDays(today,-7)), type: "weekly", title: "What worked", body: "Meal-prepping Sunday saved me on Wednesday. Need to keep doing it." },
  ],
  meals: [
    { id: id(), date: T, slot: "Breakfast", name: "Yogurt + berries + toast", kidSafe: true },
    { id: id(), date: T, slot: "Lunch", name: "Turkey wraps + apple slices", kidSafe: true },
    { id: id(), date: T, slot: "Dinner", name: "Tacos (mild for kids)", kidSafe: true, notes: "Use leftover chicken" },
    { id: id(), date: T, slot: "Snack", name: "Snack plate: cheese, crackers, grapes", kidSafe: true },
    { id: id(), date: iso(addDays(today,1)), slot: "Dinner", name: "Breakfast for dinner — pancakes + eggs", kidSafe: true },
    { id: id(), date: iso(addDays(today,2)), slot: "Dinner", name: "Pasta + green beans", kidSafe: true },
    { id: id(), date: iso(addDays(today,3)), slot: "Dinner", name: "Grilled cheese + tomato soup", kidSafe: true },
  ],
  grocery: [
    { id: id(), name: "Tortillas", bought: false, category: "Pantry" },
    { id: id(), name: "Shredded cheese", bought: false, category: "Dairy" },
    { id: id(), name: "Apples", bought: true, category: "Produce" },
    { id: id(), name: "Pasta", bought: false, category: "Pantry" },
    { id: id(), name: "Eggs", bought: false, category: "Dairy" },
    { id: id(), name: "Bread", bought: false, category: "Bakery" },
    { id: id(), name: "Bananas", bought: false, category: "Produce" },
  ],
  appointments: [
    { id: id(), date: T, time: "10:30", title: "OT for Sam", type: "therapy", with: "Ms. Riley", location: "Sunrise Therapy" },
    { id: id(), date: iso(addDays(today,1)), time: "14:00", title: "Pediatrician — well visit", type: "doctor" },
    { id: id(), date: iso(addDays(today,3)), time: "09:00", title: "Parent-teacher conference", type: "school" },
    { id: id(), date: iso(addDays(today,8)), time: "11:00", title: "Nana cardiologist", type: "doctor", with: "Dr. Patel" },
  ],
  birthdays: [
    { id: id(), name: "Mia", date: iso(addDays(today,2)), relation: "Niece" },
    { id: id(), name: "Mom", date: iso(addDays(today,18)), relation: "Mom" },
    { id: id(), name: "Sam", date: iso(addDays(today,42)), relation: "Son" },
  ],
  holidays: [
    { id: id(), name: "Mother's Day", date: iso(addDays(today,12)) },
    { id: id(), name: "Memorial Day", date: iso(addDays(today,26)) },
  ],
  recipients: [
    { id: "r1", name: "Sam (7)", kind: "child", sensory: "Soft tags only. Loud noises overwhelm. Loves weighted blanket.", notes: "Picky eater — beige foods OK.", contacts: [{ name: "Dr. Lee", role: "Pediatrician", phone: "555-0111" }, { name: "Ms. Riley", role: "OT", phone: "555-0144" }], meds: [{ name: "Vitamin D", dose: "400 IU", schedule: "morning" }] },
    { id: "r2", name: "Nana", kind: "elder", notes: "Lives with us Tue-Thu. Soft foods after dental work.", contacts: [{ name: "Dr. Patel", role: "Cardiologist", phone: "555-0177" }], meds: [{ name: "Lisinopril", dose: "10mg", schedule: "morning" }, { name: "Calcium", schedule: "evening" }] },
    { id: "r3", name: "Self", kind: "self", notes: "I count too." },
  ],
  careNotes: [
    { id: id(), recipientId: "r1", date: T, body: "Big day at school — extra quiet evening helps.", tag: "sensory" },
    { id: id(), recipientId: "r2", date: iso(addDays(today,-1)), body: "Took meds at 8am. Slept well.", tag: "meds" },
  ],
  cleaning: [
    { id: id(), title: "Wipe kitchen counters", zone: "Kitchen", cadence: "daily", done: true },
    { id: id(), title: "Run dishwasher", zone: "Kitchen", cadence: "daily", done: false },
    { id: id(), title: "Take out trash", zone: "Kitchen", cadence: "weekly", done: false },
    { id: id(), title: "Clean the toilet", zone: "Bathroom", cadence: "weekly", done: false },
    { id: id(), title: "Wash sheets", zone: "Bedrooms", cadence: "weekly", done: false },
    { id: id(), title: "Vacuum living room", zone: "Living", cadence: "weekly", done: false },
    { id: id(), title: "Wash kids' laundry", zone: "Laundry", cadence: "weekly", done: false },
    { id: id(), title: "Sweep entryway", zone: "Entryway", cadence: "weekly", done: false },
    { id: id(), title: "Deep clean fridge", zone: "Kitchen", cadence: "monthly", done: false },
    { id: id(), title: "Swap closet seasonally", zone: "Bedrooms", cadence: "seasonal", done: false },
  ],
  resetTemplates: [
    { id: "rt1", name: "Sunday Reset", items: ["Plan the week's meals","Make grocery list","Wash & fold laundry","Review appointments","Pack school bags","Wipe kitchen","Take out trash","Check meds & supplies"] },
    { id: "rt2", name: "Reset After a Hard Day", items: ["Drink a full glass of water","Clear one surface","Write one note","Choose tomorrow's top task","Lights out by 10:30"] },
    { id: "rt3", name: "Minimum Viable Day", items: ["Everyone fed","Meds taken","One load of laundry","One kind word to myself"] },
  ],
  ideas: [
    { id: id(), title: "Family cookbook with kids' favorites", category: "creative ideas", createdAt: T },
    { id: id(), title: "Birthday box — wrap, cards, ribbon in one bin", category: "home ideas", createdAt: T },
    { id: id(), title: "Saturday morning walk together", category: "family ideas", createdAt: T },
    { id: id(), title: "Use envelopes for variable budget", category: "money ideas", createdAt: T },
    { id: id(), title: "Sheet-pan everything Tuesdays", category: "meal ideas", createdAt: T },
  ],
});
