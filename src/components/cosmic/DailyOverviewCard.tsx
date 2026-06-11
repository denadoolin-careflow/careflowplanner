import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { getMoonPhase, MOON_INFO, getIllumination } from "@/lib/moon";
import { getMoonSign, ELEMENT_EMOJI } from "@/lib/zodiac";
import { SIGN_GLYPH } from "@/lib/cosmic/glyphs";
import { Sparkles, Target, Ban, Leaf } from "lucide-react";

const SIGN_THEME: Record<string, { theme: string; focus: string; avoid: string; support: string; reminder: string }> = {
  Aries:       { theme: "Initiate gently.",   focus: "Pick one bold yes — leave the rest for later.",         avoid: "Saying yes to too many fresh starts at once.", support: "Movement, fast notes, decisive small wins.",   reminder: "One brave step is enough. The fire stays lit." },
  Taurus:      { theme: "Tend and steady.",   focus: "Slow rituals; protect comfort and the body.",            avoid: "Over-buying or stuffing rest with stuff.",       support: "Cooking, gardening, soft money decisions.",     reminder: "Slowness is doing. Pleasure is allowed." },
  Gemini:      { theme: "Curious and light.", focus: "Short conversations and quick errands.",                 avoid: "Overcommitting to long deep work.",              support: "Messaging friends, reading, errands.",           reminder: "You don't need a final answer to keep moving." },
  Cancer:      { theme: "Soft homecoming.",   focus: "Family rituals and small comforts.",                     avoid: "Carrying everyone's feelings as your own.",      support: "Cooking, calling family, tidying the nest.",     reminder: "You're allowed to receive care too." },
  Leo:         { theme: "Warm and visible.",  focus: "Share something you made; let yourself be seen.",        avoid: "Performing instead of feeling.",                 support: "Creative play, time with kids, generosity.",     reminder: "Your warmth is enough — it doesn't have to dazzle." },
  Virgo:       { theme: "Tidy and tend.",     focus: "Sort one drawer, one list, one routine.",                avoid: "Critiquing the small to avoid the big.",         support: "Lists, decluttering, gentle health habits.",     reminder: "Done is kinder than perfect." },
  Libra:       { theme: "Balance and ask.",   focus: "Have the conversation; ask for help.",                   avoid: "Saying yes to keep the peace.",                  support: "Pairing up, beauty, soft mediation.",            reminder: "Fair doesn't mean equal — choose your needs too." },
  Scorpio:     { theme: "Honest depth.",      focus: "Tell one truth — to yourself first.",                    avoid: "Doom-scrolling other people's feelings.",        support: "Therapy, journaling, deep one-on-ones.",         reminder: "Feeling deeply is not the same as being stuck." },
  Sagittarius: { theme: "One hopeful step.",  focus: "Plan one thing that gives you horizon.",                 avoid: "Overpromising on the long road.",                support: "Walks, books, planning a future trip.",          reminder: "Hope counts as progress." },
  Capricorn:   { theme: "Steady ordinary work.", focus: "Pick the one task that actually moves the rock.",     avoid: "Stacking pressure on top of pressure.",          support: "Time-blocking, finance check-ins, structure.",   reminder: "Pace over pressure. The mountain is made of days." },
  Aquarius:    { theme: "Reflect and refine.", focus: "Review recent decisions before moving forward.",        avoid: "Overcommitting to new ideas.",                   support: "Journaling, organizing, editing.",               reminder: "Take a breath. Clarity comes when you give yourself space to listen." },
  Pisces:      { theme: "Soften and dream.",   focus: "Let the to-do list be shorter today.",                  avoid: "Saving everyone before yourself.",               support: "Bath, music, rest, gentle creative play.",       reminder: "Rest is research. Daydreams count." },
};

export function DailyOverviewCard({ date = new Date() }: { date?: Date }) {
  const phase = getMoonPhase(date);
  const sign = getMoonSign(date);
  const info = MOON_INFO[phase];
  const illum = getIllumination(date);
  const theme = SIGN_THEME[sign.name];

  return (
    <section className="cozy-card p-4 sm:p-5" aria-label="Daily cosmic overview">
      <header className="mb-4 flex items-center gap-2">
        <h2 className="font-display text-base">Daily Cosmic Overview</h2>
        <Sparkles className="h-3.5 w-3.5 text-primary" />
      </header>

      <div className="grid gap-4 sm:gap-5 md:grid-cols-[150px_minmax(0,1fr)] items-start">
        <div className="flex flex-row items-center gap-3 md:flex-col md:items-start">
          <MoonGlyph date={date} size={84} />
          <div className="md:hidden">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Theme</p>
            <p className="text-[13px] font-medium leading-snug">{theme.theme}</p>
          </div>
          <div className="hidden md:block"><MoonGlyph date={date} size={120} /></div>
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="uppercase tracking-[0.18em]">Theme</span>
          </div>
          <p className="hidden md:block text-[13px] font-medium">{theme.theme}</p>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span aria-hidden className="font-mono text-2xl text-primary">{SIGN_GLYPH[sign.name]}</span>
              <h3 className="font-display text-xl">Moon in {sign.name}</h3>
            </div>
            <p className="text-[12.5px] text-muted-foreground">
              {info.label} · {illum}% illuminated
            </p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground inline-flex items-center gap-1">
              <span aria-hidden>{ELEMENT_EMOJI[sign.element]}</span> {sign.element} Element
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <OverviewTile icon={<Target className="h-3.5 w-3.5 text-primary" />} label="Focus" body={theme.focus} />
            <OverviewTile icon={<Ban className="h-3.5 w-3.5 text-destructive" />} label="Avoid" body={theme.avoid} />
            <OverviewTile icon={<Leaf className="h-3.5 w-3.5 text-secondary-foreground" />} label="Support" body={theme.support} />
          </div>

          <p className="rounded-lg bg-muted/40 px-3 py-2 text-[12.5px] italic text-muted-foreground">
            <Sparkles aria-hidden className="mr-1 inline h-3 w-3 text-primary" />
            {theme.reminder}
          </p>
        </div>
      </div>
    </section>
  );
}

function OverviewTile({ icon, label, body }: { icon: React.ReactNode; label: string; body: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/60 p-2.5">
      <p className="mb-1 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {icon}{label}
      </p>
      <p className="text-[12px] leading-snug">{body}</p>
    </div>
  );
}