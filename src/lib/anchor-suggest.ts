import { DEFAULT_ANCHORS, type AnchorKey } from "@/lib/anchors";

/**
 * Lightweight keyword classifier — maps free-form task/note text to one of
 * the user's default anchors. Returns `undefined` when no signal is strong
 * enough. The Capture UI uses this for soft "Add anchor?" suggestions.
 */

const KEYWORDS: Record<AnchorKey, RegExp[]> = {
  home: [/\b(clean|laundry|dishes|tidy|vacuum|trash|garbage|repair|fix|kitchen|bathroom|bedroom|garage|yard|garden|plumb|paint|declutter|reset)\b/i],
  family: [/\b(mom|dad|mum|son|daughter|kid|kids|child|children|baby|partner|husband|wife|spouse|family|grandma|grandpa|brother|sister|nanny|school|pickup|drop ?off|playdate|bedtime|caregiv|appointment)\b/i],
  wellness: [/\b(walk|run|gym|workout|yoga|stretch|meditat|sleep|nap|water|hydrat|doctor|therap|medi(c|s)|vitamin|breath|wellness|self ?care|rest|heal|exercise)\b/i],
  finances: [/\b(bill|pay|payment|invoice|budget|bank|transfer|tax|taxes|refund|insurance|mortgage|rent|saving|spend|expense|finance|stripe|paypal|venmo|grocer|costco)\b/i],
  growth: [/\b(learn|read|book|study|course|class|practice|project|idea|write|draft|design|build|create|launch|ship|skill|research)\b/i],
  reflection: [/\b(journal|reflect|gratitude|pause|breathe|notice|feel|emotion|process|review|integrate|moon|ritual|intention|check ?in)\b/i],
};

export function suggestAnchorForText(text: string): AnchorKey | undefined {
  if (!text) return undefined;
  const t = text.toLowerCase();
  let best: { key: AnchorKey; score: number } | null = null;
  for (const anchor of DEFAULT_ANCHORS) {
    const patterns = KEYWORDS[anchor.key] ?? [];
    let score = 0;
    for (const re of patterns) if (re.test(t)) score++;
    if (score > 0 && (!best || score > best.score)) {
      best = { key: anchor.key, score };
    }
  }
  return best?.key;
}