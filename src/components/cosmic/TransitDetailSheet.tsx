import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sparkles, ArrowRight, FileText, BookOpen, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import type { CosmicEvent } from "@/lib/cosmic/events";
import { copyForEvent, houseOverlayLine } from "@/lib/cosmic/transit-copy";
import { elementFor, fourFoldFor, themesFor, intensityFor } from "@/lib/cosmic/event-meta";
import { ELEMENT_VAR } from "@/lib/cosmic/glyphs";
import { TransitJournalInline } from "./TransitJournalInline";
import { natalHouseForEvent } from "@/hooks/useTransitsRange";
import { useBirthChart } from "@/lib/cosmic/hooks";
import { cn } from "@/lib/utils";

interface Props {
  event: CosmicEvent | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function TransitDetailSheet({ event, open, onOpenChange }: Props) {
  const { row } = useBirthChart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stubbing, setStubbing] = useState<null | "note" | "journal">(null);
  const date = event ? parseISO(event.date) : null;
  const el = event && date ? elementFor(event, date) : null;
  const copy = useMemo(() => event ? copyForEvent(event) : null, [event]);
  const ff = event ? fourFoldFor(event) : null;
  const themes = event ? themesFor(event) : null;
  const intensity = event ? intensityFor(event) : 0;
  const natalHouse = event && date ? natalHouseForEvent(event, date, row ?? null) : undefined;

  const createStub = async (kind: "note" | "journal") => {
    if (!event || !copy) return;
    setStubbing(kind);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        toast({ title: "Sign in to save", description: "Stubs save to your account." });
        return;
      }
      const houseLine = natalHouse ? `\n\n_${houseOverlayLine(natalHouse)}_` : "";
      const body = [
        `**${event.title}**${event.date ? ` · ${event.date}` : ""}`,
        copy.insight,
        `> ${copy.journalPrompt}`,
        houseLine,
        "",
      ].filter(Boolean).join("\n\n");

      if (kind === "note") {
        const { data, error } = await (supabase as any).from("notes").insert({
          user_id: u.user.id,
          title: `Transit · ${event.title}`,
          body,
          kind: "note",
          tags: ["cosmic", "transit"],
          icon: "Sparkles",
        }).select("id").maybeSingle();
        if (error) throw error;
        toast({
          title: "Note created",
          description: "Linked to this transit.",
          action: data?.id ? (
            <Button size="sm" variant="outline" onClick={() => navigate(`/notes/${data.id}`)}>
              Open
            </Button>
          ) : undefined,
        });
      } else {
        const { data, error } = await (supabase as any).from("journal_entries").insert({
          user_id: u.user.id,
          date: event.date ?? new Date().toISOString().slice(0, 10),
          type: "cosmic",
          title: event.title,
          body,
          tags: ["cosmic", "transit"],
        }).select("id").maybeSingle();
        if (error) throw error;
        if (data?.id) {
          await (supabase as any).from("cosmic_journal_entries").insert({
            user_id: u.user.id,
            journal_entry_id: data.id,
            event_id: event.id,
            event_date: event.date ?? null,
          });
        }
        toast({ title: "Journal stub created", description: "Saved to Cosmic Journal." });
      }
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setStubbing(null);
    }
  };

  const accent: React.CSSProperties = el
    ? { background: `linear-gradient(180deg, hsl(var(${ELEMENT_VAR[el]}) / 0.16), hsl(var(--card)))` }
    : {};
  const accentBorder: React.CSSProperties = el
    ? { borderTopColor: `hsl(var(${ELEMENT_VAR[el]}))`, borderTopWidth: 3 }
    : {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg" style={accent}>
        {event && date && copy && (
          <div className="flex h-full flex-col" style={accentBorder}>
            <SheetHeader className="px-5 pb-3 pt-5 text-left">
              <div className="flex items-start gap-3">
                <span aria-hidden className="text-2xl leading-none">{event.glyph}</span>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="font-display text-lg leading-tight">{event.title}</SheetTitle>
                  <SheetDescription className="text-xs">
                    {format(date, "EEEE, MMM d, yyyy")}
                  </SheetDescription>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {el && (
                      <Badge
                        variant="outline"
                        className="px-1.5 py-0 text-[10px]"
                        style={{
                          background: `hsl(var(${ELEMENT_VAR[el]}) / 0.16)`,
                          color: `hsl(var(${ELEMENT_VAR[el]}))`,
                          borderColor: `hsl(var(${ELEMENT_VAR[el]}) / 0.3)`,
                        }}
                      >
                        {el}
                      </Badge>
                    )}
                    {event.sign && <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">{event.sign}</Badge>}
                    <span className="font-mono text-[11px] text-primary/70">{"★".repeat(intensity)}{"☆".repeat(5 - intensity)}</span>
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-4 px-5 py-4">
              {natalHouse && (
                <p className="rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-[12.5px] leading-snug">
                  <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
                  {houseOverlayLine(natalHouse)}
                </p>
              )}

              <section>
                <h4 className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Deeper meaning</h4>
                <p className="text-[13.5px] leading-relaxed">{copy.insight}</p>
              </section>

              {event.subtitle && (
                <p className="text-[12.5px] italic text-muted-foreground">{event.subtitle}</p>
              )}

              {ff && (
                <section>
                  <h4 className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">How to work with it</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Mini label="Plan" body={ff.plan} />
                    <Mini label="Care" body={ff.care} />
                    <Mini label="Grow" body={ff.grow} />
                    <Mini label="Release" body={ff.release} />
                  </div>
                </section>
              )}

              {themes && (
                <section className="grid grid-cols-2 gap-2">
                  <Mini label="Emotional" body={themes.emotional} />
                  <Mini label="Relationships" body={themes.relationships} />
                  <Mini label="Career" body={themes.career} />
                  <Mini label="Family" body={themes.family} />
                </section>
              )}

              <section className="rounded-md border border-border/60 bg-card/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Affirmation</p>
                <p className="mt-1 text-[13.5px] italic">{copy.affirmation}</p>
              </section>

              <Separator />

              <section>
                <h4 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Journal this transit
                </h4>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 gap-1.5"
                    disabled={stubbing !== null}
                    onClick={() => createStub("note")}
                  >
                    {stubbing === "note" ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                    Save to Notes
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 gap-1.5"
                    disabled={stubbing !== null}
                    onClick={() => createStub("journal")}
                  >
                    {stubbing === "journal" ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookOpen className="h-3 w-3" />}
                    Save to Journal
                  </Button>
                </div>
                <TransitJournalInline
                  eventId={event.id}
                  eventLabel={event.title}
                  eventDate={event.date}
                  prompt={copy.journalPrompt}
                />
              </section>

              <Button asChild variant="outline" size="sm" className="w-full gap-1.5">
                <Link to={`/cosmic-flow/event/${encodeURIComponent(event.id)}`}>
                  Full event reading <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Mini({ label, body }: { label: string; body: string }) {
  return (
    <div className={cn("rounded-md border border-border/40 bg-background/40 p-2")}>
      <p className="text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[12.5px] leading-snug">{body}</p>
    </div>
  );
}