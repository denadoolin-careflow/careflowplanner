import { useEffect, useMemo, useState } from "react";
import { startOfWeek, addDays, format, parseISO } from "date-fns";
import { useStore } from "@/lib/store";
import { useHousehold } from "@/lib/household";
import { useMealsLibrary, type LibraryMeal } from "@/lib/meals-library";
import {
  getPollForWeek, createPoll, listCandidates, listResponses,
  addCandidate, removeCandidate, castVote, clearVote, submitRequest, removeResponse, updatePoll,
  type DinnerPoll, type DinnerPollCandidate, type DinnerPollResponse,
} from "@/lib/dinner-polls";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Trash2, Users, Vote, MessageSquare, X, Sparkles, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

function isoDay(d: Date) { return d.toISOString().slice(0, 10); }

export default function FamilyRequests() {
  const { user } = useStore();
  const { current: household, members } = useHousehold(user?.id);
  const { items: library } = useMealsLibrary();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [poll, setPoll] = useState<DinnerPoll | null>(null);
  const [candidates, setCandidates] = useState<DinnerPollCandidate[]>([]);
  const [responses, setResponses] = useState<DinnerPollResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekIso = isoDay(weekStart);

  const reload = async (p: DinnerPoll | null) => {
    if (!p) { setCandidates([]); setResponses([]); return; }
    const [c, r] = await Promise.all([listCandidates(p.id), listResponses(p.id)]);
    setCandidates(c); setResponses(r);
  };

  useEffect(() => {
    if (!household) return;
    setLoading(true);
    getPollForWeek(household.id, weekIso).then(async p => {
      setPoll(p);
      await reload(p);
      setLoading(false);
    });
  }, [household?.id, weekIso]);

  if (!user) return null;
  if (!household) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <SectionCard title="Family meal requests" accent="warm">
          <p className="text-sm text-muted-foreground">
            Create or join a household to build a shared dinner poll for your family.
          </p>
          <Button asChild className="mt-3"><Link to="/family">Open Family settings</Link></Button>
        </SectionCard>
      </div>
    );
  }

  const ensurePoll = async (): Promise<DinnerPoll | null> => {
    if (poll) return poll;
    const p = await createPoll(household.id, weekIso, user.id, `Dinner this week — ${format(weekStart, "MMM d")}`);
    setPoll(p);
    if (p) await reload(p);
    return p;
  };

  const me = members.find(m => m.user_id === user.id);
  const isOwner = me?.role === "owner";
  const canEdit = me?.role === "owner" || me?.role === "editor";

  const addCandidateFor = async (day: string, meal: LibraryMeal | null, custom?: string) => {
    const p = await ensurePoll(); if (!p) return;
    const same = candidates.filter(c => c.day_date === day);
    await addCandidate(p.id, day, {
      mealId: meal?.id ?? null,
      customTitle: custom ?? (meal ? null : "Untitled"),
      position: same.length,
    });
    await reload(p);
  };

  const removeCand = async (id: string) => { await removeCandidate(id); if (poll) await reload(poll); };

  const vote = async (day: string, candidateId: string) => {
    const p = await ensurePoll(); if (!p) return;
    await castVote(p.id, user.id, day, candidateId);
    await reload(p);
  };

  const unvote = async (day: string) => { if (!poll) return; await clearVote(poll.id, user.id, day); await reload(poll); };

  const addRequest = async (day: string, opts: { meal?: LibraryMeal; custom?: string; note?: string }) => {
    const p = await ensurePoll(); if (!p) return;
    await submitRequest(p.id, user.id, day, {
      mealId: opts.meal?.id ?? null,
      customTitle: opts.custom ?? null,
      note: opts.note ?? null,
    });
    await reload(p);
    toast.success("Request sent");
  };

  const mealById = (id: string | null) => library.find(l => l.id === id);
  const memberName = (uid: string) => members.find(m => m.user_id === uid)?.display_name ?? "Member";
  const memberColor = (uid: string) => members.find(m => m.user_id === uid)?.color ?? "hsl(var(--muted))";

  const closeOrReopen = async () => {
    if (!poll) return;
    await updatePoll(poll.id, { status: poll.status === "open" ? "closed" : "open" });
    const p = await getPollForWeek(household.id, weekIso);
    setPoll(p);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="cozy-card gradient-warm flex flex-col gap-3 p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
            <Users className="h-6 w-6" /> Family dinner requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build candidates from your library — let {household.name} vote or send their own requests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" className="h-9 w-9 rounded-full" onClick={() => setWeekStart(d => addDays(d, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="rounded-full bg-muted/40 px-3 py-1 text-xs font-medium">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}
          </span>
          <Button size="icon" variant="outline" className="h-9 w-9 rounded-full" onClick={() => setWeekStart(d => addDays(d, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {poll && isOwner && (
            <Button variant="outline" className="rounded-full" onClick={closeOrReopen}>
              {poll.status === "open" ? "Close poll" : "Reopen"}
            </Button>
          )}
        </div>
      </div>

      {!poll && !loading && canEdit && (
        <SectionCard title="Start this week's poll" accent="sage">
          <p className="text-sm text-muted-foreground mb-3">
            Pick candidate meals from your library for each night, or skip and let family request anything.
          </p>
          <Button onClick={ensurePoll}><Sparkles className="mr-2 h-4 w-4" />Create poll</Button>
        </SectionCard>
      )}

      {poll && (
        <SectionCard title="Nights this week" subtitle={poll.status === "closed" ? "Closed" : "Open for votes & requests"} accent="warm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {days.map(d => {
              const day = isoDay(d);
              const dayCands = candidates.filter(c => c.day_date === day);
              const dayVotes = responses.filter(r => r.day_date === day && r.kind === "vote");
              const dayRequests = responses.filter(r => r.day_date === day && r.kind === "request");
              const myVote = dayVotes.find(v => v.user_id === user.id);
              return (
                <div key={day} className="rounded-2xl border border-border/60 bg-card/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">{format(d, "EEEE")}</div>
                      <div className="font-display text-lg">{format(d, "MMM d")}</div>
                    </div>
                    {canEdit && poll.status === "open" && (
                      <AddCandidateMenu library={library} onAdd={(meal, custom) => addCandidateFor(day, meal, custom)} />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {dayCands.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No candidates yet — add some or wait for requests.</p>
                    )}
                    {dayCands.map(c => {
                      const m = c.meal_id ? mealById(c.meal_id) : null;
                      const votes = dayVotes.filter(v => v.candidate_id === c.id);
                      const mine = myVote?.candidate_id === c.id;
                      return (
                        <div key={c.id} className={`group flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-sm transition ${mine ? "border-primary bg-primary/10" : "border-border/60 bg-background/40"}`}>
                          <button
                            type="button"
                            onClick={() => poll.status === "open" && (mine ? unvote(day) : vote(day, c.id))}
                            className="flex-1 text-left truncate flex items-center gap-2"
                            disabled={poll.status !== "open"}
                          >
                            <Vote className={`h-3.5 w-3.5 ${mine ? "text-primary" : "text-muted-foreground"}`} />
                            <span className="truncate">{m?.title ?? c.custom_title ?? "Untitled"}</span>
                          </button>
                          <div className="flex items-center gap-1">
                            {votes.map(v => (
                              <span key={v.id} title={memberName(v.user_id)} className="h-4 w-4 rounded-full" style={{ background: memberColor(v.user_id) }} />
                            ))}
                            <span className="text-xs text-muted-foreground tabular-nums">{votes.length}</span>
                            {canEdit && (
                              <button onClick={() => removeCand(c.id)} className="opacity-0 group-hover:opacity-100 text-destructive">
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {dayRequests.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Requests
                      </div>
                      {dayRequests.map(r => {
                        const m = r.meal_id ? mealById(r.meal_id) : null;
                        const title = m?.title ?? r.custom_title ?? "Request";
                        return (
                          <div key={r.id} className="flex items-start justify-between gap-2 rounded-lg bg-muted/30 px-2 py-1 text-xs">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: memberColor(r.user_id) }} />
                                <span className="font-medium truncate">{title}</span>
                              </div>
                              {r.note && <div className="text-muted-foreground truncate">{r.note}</div>}
                              <div className="text-[10px] text-muted-foreground">— {memberName(r.user_id)}</div>
                            </div>
                            {(r.user_id === user.id || isOwner) && (
                              <button onClick={async () => { await removeResponse(r.id); if (poll) await reload(poll); }} className="text-destructive opacity-60 hover:opacity-100">
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {poll.status === "open" && (
                    <div className="mt-2">
                      <RequestComposer library={library} onSubmit={(opts) => addRequest(day, opts)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      <SectionCard title={`Household (${members.length})`} accent="sage">
        <div className="flex flex-wrap gap-2">
          {members.map(m => (
            <Badge key={m.id} variant="outline" className="rounded-full">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: m.color ?? "hsl(var(--muted))" }} />
              {m.display_name ?? "Member"} · {m.role}
            </Badge>
          ))}
          <Button asChild size="sm" variant="ghost"><Link to="/family">Manage</Link></Button>
        </div>
      </SectionCard>
    </div>
  );
}

function AddCandidateMenu({ library, onAdd }: { library: LibraryMeal[]; onAdd: (meal: LibraryMeal | null, custom?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [custom, setCustom] = useState("");
  const filtered = library.filter(l => !l.is_archived && (!filter || l.title.toLowerCase().includes(filter.toLowerCase()))).slice(0, 30);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 rounded-full text-xs"><Plus className="mr-1 h-3 w-3" />Candidate</Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        <div className="space-y-2">
          <Input placeholder="Search library" value={filter} onChange={e => setFilter(e.target.value)} className="h-8" />
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filtered.length === 0 && <p className="text-xs text-muted-foreground p-2">No meals — add some to your <Link to="/meals/library" className="underline">library</Link>.</p>}
            {filtered.map(m => (
              <button key={m.id} onClick={() => { onAdd(m); setOpen(false); }} className="w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-muted">
                <BookOpen className="mr-1.5 inline h-3 w-3 text-muted-foreground" />{m.title}
              </button>
            ))}
          </div>
          <div className="border-t border-border/60 pt-2 space-y-1">
            <Input placeholder="Or type a custom meal" value={custom} onChange={e => setCustom(e.target.value)} className="h-8" />
            <Button size="sm" className="w-full" disabled={!custom.trim()} onClick={() => { onAdd(null, custom.trim()); setCustom(""); setOpen(false); }}>
              Add custom
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RequestComposer({ library, onSubmit }: { library: LibraryMeal[]; onSubmit: (opts: { meal?: LibraryMeal; custom?: string; note?: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [mealId, setMealId] = useState<string>("");
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");
  const submit = () => {
    const meal = library.find(l => l.id === mealId);
    if (!meal && !custom.trim()) return;
    onSubmit({ meal, custom: custom.trim() || undefined, note: note.trim() || undefined });
    setMealId(""); setCustom(""); setNote(""); setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 w-full rounded-full text-xs">
          <MessageSquare className="mr-1 h-3 w-3" />Request something
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="space-y-2">
          <Select value={mealId} onValueChange={setMealId}>
            <SelectTrigger className="h-8"><SelectValue placeholder="From library…" /></SelectTrigger>
            <SelectContent>
              {library.filter(l => !l.is_archived).slice(0, 50).map(l => (
                <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="…or a custom dish" value={custom} onChange={e => setCustom(e.target.value)} className="h-8" />
          <Textarea placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} className="min-h-[60px] text-sm" />
          <Button size="sm" className="w-full" onClick={submit} disabled={!mealId && !custom.trim()}>Send request</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}