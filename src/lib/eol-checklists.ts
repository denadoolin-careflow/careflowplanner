/** Default end-of-life planning checklists. Seeded per person on first open. */
export type EolPhase = "before" | "first48" | "weeks" | "months";
export const EOL_PHASES: { id: EolPhase; label: string }[] = [
  { id: "before", label: "Before" },
  { id: "first48", label: "The first 24–48 hours" },
  { id: "weeks", label: "The first weeks" },
  { id: "months", label: "The first months" },
];
export const EOL_GROUPS = [
  { id: "legal", label: "Legal & paperwork" },
  { id: "funeral", label: "Funeral & memorial" },
  { id: "notify", label: "Notifications" },
  { id: "finance", label: "Banking & finances" },
  { id: "home", label: "Home & property" },
  { id: "health", label: "Health & hospice wrap-up" },
  { id: "digital", label: "Digital accounts" },
] as const;
export type EolGroup = (typeof EOL_GROUPS)[number]["id"];

export const EOL_DEFAULTS: { group: EolGroup; phase: EolPhase; title: string }[] = [
  { group: "legal", phase: "before", title: "Locate advance directive / living will" },
  { group: "legal", phase: "before", title: "Confirm POLST / DNR is signed and visible" },
  { group: "legal", phase: "before", title: "Confirm healthcare & financial power of attorney" },
  { group: "legal", phase: "before", title: "Locate the will or trust and executor contact" },
  { group: "legal", phase: "weeks", title: "Order certified death certificate copies (often 10+)" },
  { group: "legal", phase: "weeks", title: "Meet with executor or estate attorney" },
  { group: "funeral", phase: "before", title: "Learn their wishes (burial, cremation, service)" },
  { group: "funeral", phase: "before", title: "Choose a funeral home and note their number" },
  { group: "funeral", phase: "first48", title: "Call hospice to pronounce, then the funeral home" },
  { group: "funeral", phase: "first48", title: "Choose clothing, photos and items to keep" },
  { group: "funeral", phase: "weeks", title: "Write and share the obituary" },
  { group: "funeral", phase: "weeks", title: "Plan the service or gathering" },
  { group: "notify", phase: "before", title: "Make a list of people to call" },
  { group: "notify", phase: "first48", title: "Tell close family and friends" },
  { group: "notify", phase: "weeks", title: "Notify employer / pension" },
  { group: "notify", phase: "weeks", title: "Notify Social Security and Medicare" },
  { group: "notify", phase: "weeks", title: "Notify life and health insurers" },
  { group: "finance", phase: "before", title: "List bank accounts, cards and bills" },
  { group: "finance", phase: "weeks", title: "Notify banks and freeze or close cards" },
  { group: "finance", phase: "weeks", title: "File life insurance claims" },
  { group: "finance", phase: "months", title: "Ask about final tax returns" },
  { group: "home", phase: "first48", title: "Arrange care for pets" },
  { group: "home", phase: "weeks", title: "Secure the home and vehicles" },
  { group: "home", phase: "weeks", title: "Forward mail and review utilities" },
  { group: "home", phase: "months", title: "Decide on belongings at a gentle pace" },
  { group: "health", phase: "first48", title: "Safely dispose of leftover medicines" },
  { group: "health", phase: "weeks", title: "Schedule medical equipment pickup" },
  { group: "health", phase: "weeks", title: "Cancel upcoming appointments and refills" },
  { group: "digital", phase: "before", title: "Gather phone and key account passwords" },
  { group: "digital", phase: "months", title: "Memorialize or close social media accounts" },
  { group: "digital", phase: "months", title: "Cancel subscriptions" },
];

export function seedRows(recipientId: string | null) {
  return EOL_DEFAULTS.map((d, i) => ({ ...d, recipient_id: recipientId, sort: i, done: false }));
}

export function progress(items: { done: boolean }[]) {
  const done = items.filter((i) => i.done).length;
  return { done, total: items.length, pct: items.length ? Math.round((done / items.length) * 100) : 0 };
}

export const DOC_CATEGORIES = [
  { id: "eol", label: "End-of-life paperwork" },
  { id: "funeral", label: "Funeral arrangements" },
  { id: "death_cert", label: "Death certificates" },
  { id: "banking", label: "Banking" },
  { id: "home", label: "Home" },
  { id: "health", label: "Health" },
  { id: "insurance", label: "Insurance" },
  { id: "legal", label: "Legal" },
  { id: "other", label: "Other" },
];
