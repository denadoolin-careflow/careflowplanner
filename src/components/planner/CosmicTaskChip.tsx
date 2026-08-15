import { format } from "date-fns";
import { decodeCosmicTag, cosmicStampSentence } from "@/lib/planner/cosmic-link";
import { encodeEventId } from "@/lib/cosmic/event-id";
import { MOON_IN_SIGN_GUIDE } from "@/lib/zodiac";
import { CosmicEventPopover } from "./CosmicEventPopover";
import { cn } from "@/lib/utils";

/**
 * Tiny glyph showing which moon phase / element a task was planned under.
 * Tapping it opens the shared cosmic quick-info popover.
 */
export function CosmicTaskChip({ tag, dateISO, className }: {
  tag?: string | null;
  dateISO?: string;
  className?: string;
}) {
  const stamp = decodeCosmicTag(tag);
  if (!stamp) return null;

  const guide = MOON_IN_SIGN_GUIDE[stamp.sign];
  const iso = dateISO ?? format(new Date(), "yyyy-MM-dd");

  return (
    <CosmicEventPopover
      event={{
        id: encodeEventId({ kind: "phase", date: iso, phase: stamp.phase, sign: stamp.sign }),
        glyph: stamp.glyph,
        title: stamp.label,
        when: cosmicStampSentence(stamp),
        detail: guide?.vibe ?? `${stamp.element} energy.`,
        landing: guide?.vibe,
        actions: guide?.actions,
        accent: stamp.color,
      }}
    >
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        aria-label={`${cosmicStampSentence(stamp)} — quick info`}
        title={cosmicStampSentence(stamp)}
        className={cn(
          "shrink-0 rounded-full px-1 text-[10px] leading-4 transition hover:brightness-110",
          className,
        )}
        style={{ background: `${stamp.color}22`, color: stamp.color }}
      >
        <span aria-hidden>{stamp.glyph}</span>
      </button>
    </CosmicEventPopover>
  );
}
