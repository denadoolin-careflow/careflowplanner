import { useNavigate } from "react-router-dom";
import { Inbox, Anchor, Waves, Wind } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "capture" | "anchor" | "rhythm" | "exhale";

const TONE: Record<Tone, { ring: string; bg: string; fg: string }> = {
  capture: { ring: "hover:border-care-capture/50", bg: "bg-care-capture-soft", fg: "text-care-capture" },
  anchor:  { ring: "hover:border-care-anchor/50",  bg: "bg-care-anchor-soft",  fg: "text-care-anchor" },
  rhythm:  { ring: "hover:border-care-rhythm/50",  bg: "bg-care-rhythm-soft",  fg: "text-care-rhythm" },
  exhale:  { ring: "hover:border-care-exhale/50",  bg: "bg-care-exhale-soft",  fg: "text-care-exhale" },
};

function LoopCard({
  tone, icon: Icon, title, hint, meta, onClick,
}: {
  tone: Tone;
  icon: typeof Inbox;
  title: string;
  hint: string;
  meta?: string;
  onClick: () => void;
}) {
  const t = TONE[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex h-full flex-col items-start rounded-3xl border border-border/40 bg-card/60 p-4 text-left shadow-soft backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5",
        t.ring,
      )}
    >
      <span className={cn("grid h-9 w-9 place-items-center rounded-2xl", t.bg)}>
        <Icon className={cn("h-4 w-4", t.fg)} aria-hidden />
      </span>
      <span className="mt-3 font-display text-sm font-semibold">{title}</span>
      <span className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{hint}</span>
      {meta && <span className={cn("mt-2 text-[11px] font-medium", t.fg)}>{meta}</span>}
    </button>
  );
}

export function CareLoopRow({
  inboxCount, anchorLabel, scheduledCount, onExhale,
}: {
  inboxCount: number;
  anchorLabel: string;
  scheduledCount: number;
  onExhale: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <LoopCard
        tone="capture" icon={Inbox} title="Capture"
        hint="Empty your head into the inbox."
        meta={inboxCount > 0 ? `${inboxCount} waiting` : "All clear"}
        onClick={() => navigate("/inbox")}
      />
      <LoopCard
        tone="anchor" icon={Anchor} title="Anchor"
        hint="The one thing that holds today."
        meta={anchorLabel}
        onClick={() => navigate("/today#anchor")}
      />
      <LoopCard
        tone="rhythm" icon={Waves} title="Rhythm"
        hint="Shape the day around your energy."
        meta={scheduledCount > 0 ? `${scheduledCount} scheduled` : "Open day"}
        onClick={() => navigate("/planner")}
      />
      <LoopCard
        tone="exhale" icon={Wind} title="Exhale"
        hint="Close the loop with a soft landing."
        meta="Begin exhale"
        onClick={onExhale}
      />
    </div>
  );
}