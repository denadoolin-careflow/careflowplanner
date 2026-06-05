import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Loader2, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import type { Chapter } from "@/lib/cosmic/v2-hooks";

export function ChapterCard({ chapter, loading, onRefresh, compact }: { chapter: Chapter | null; loading: boolean; onRefresh: () => void; compact?: boolean }) {
  return (
    <section className="cozy-card relative overflow-hidden p-5"
      style={{
        background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--primary)/0.06) 100%)",
        borderLeft: "4px solid hsl(var(--primary))",
      }}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Your Current Chapter</p>
          <h2 className="font-display text-xl flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {chapter?.chapter_theme ?? (loading ? "Synthesizing your season…" : "No chapter yet")}
          </h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading} aria-label="Regenerate chapter">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </header>

      {chapter ? (
        <>
          <p className={`mt-3 text-[14px] leading-relaxed text-foreground/90 ${compact ? "line-clamp-4" : ""}`}>{chapter.summary}</p>

          {!compact && chapter.characters?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground">Major Characters</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {chapter.characters.map(c => <Badge key={c} variant="secondary" className="font-normal">{c}</Badge>)}
              </div>
            </div>
          )}

          {!compact && chapter.lessons?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground">Lessons</p>
              <ul className="mt-1 ml-4 list-disc text-[13px] text-foreground/90">
                {chapter.lessons.map(l => <li key={l}>{l}</li>)}
              </ul>
            </div>
          )}

          {!compact && chapter.practices?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground">Helpful Practices</p>
              <ul className="mt-1 ml-4 list-disc text-[13px] text-foreground/90">
                {chapter.practices.map(p => <li key={p}>{p}</li>)}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="default">
              <Link to="/cosmic-flow/chapter"><BookOpen className="mr-1.5 h-3.5 w-3.5" />Read full chapter</Link>
            </Button>
            {chapter.reflection_prompt && (
              <Button asChild size="sm" variant="outline">
                <Link to={`/journal?prompt=${encodeURIComponent(chapter.reflection_prompt)}`}>Reflect</Link>
              </Button>
            )}
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground italic">
          {loading ? "Reading the sky and your last few weeks…" : "Tap the refresh icon to generate your first chapter."}
        </p>
      )}
    </section>
  );
}