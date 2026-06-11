import { Link } from "react-router-dom";
import { BookOpen, NotebookPen, Heart, Smile, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMoonSign } from "@/lib/zodiac";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";

function reflectionPrompt(sign: string) {
  const map: Record<string, string> = {
    Aquarius: "What insight is trying to emerge?",
    Pisces: "What feeling is asking to be honored today?",
    Aries: "Where do I want to begin again?",
    Cancer: "What does my softer self need right now?",
    Leo: "What part of me wants to be seen?",
    Virgo: "Which one thing is mine to tend today?",
    Libra: "What conversation am I avoiding?",
    Scorpio: "What truth wants to be told?",
    Sagittarius: "What gives me horizon?",
    Capricorn: "What's worth my next focused hour?",
    Taurus: "What would feel like enough today?",
    Gemini: "What am I curious about right now?",
  };
  return map[sign] ?? "What is one thing my body wants to tell me?";
}

export function JournalWithTheSkyCard({ date = new Date() }: { date?: Date }) {
  const sign = getMoonSign(date).name;
  const phase = MOON_INFO[getMoonPhase(date)].label;

  return (
    <section className="cozy-card p-4 sm:p-5" aria-label="Journal with the sky">
      <header className="mb-2 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <h3 className="font-display text-base">Journal With The Sky</h3>
      </header>
      <p className="mb-3 text-[11.5px] text-muted-foreground">Connect, reflect, and align.</p>

      <ul className="space-y-2 text-[12.5px]">
        <PromptRow icon={<NotebookPen className="h-3.5 w-3.5 text-primary" />} title="Reflection Prompt" body={reflectionPrompt(sign)} />
        <PromptRow icon={<Heart className="h-3.5 w-3.5 text-accent-foreground" />} title="Emotional Check-In" body="How are you feeling today?" />
        <PromptRow icon={<Smile className="h-3.5 w-3.5 text-secondary-foreground" />} title="Gratitude Prompt" body="What is something you appreciate right now?" />
        <PromptRow icon={<Sun className="h-3.5 w-3.5 text-primary" />} title="Intention Prompt" body={`This ${phase}, what energy do you want to invite in?`} />
      </ul>

      <Button asChild size="sm" className="mt-4 w-full bg-gradient-to-r from-primary to-moon text-primary-foreground hover:opacity-95">
        <Link to="/journal">Open Journal</Link>
      </Button>
    </section>
  );
}

function PromptRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="flex items-start gap-2 rounded-lg border border-border/50 bg-card/60 p-2">
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[12px] font-medium">{title}</p>
        <p className="text-[11.5px] text-muted-foreground leading-snug">{body}</p>
      </div>
    </li>
  );
}