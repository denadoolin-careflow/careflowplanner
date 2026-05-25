import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Leaf, Sparkles, Heart, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { ARCHETYPES, loadQuizResult, getArchetype } from "@/lib/archetype-quiz";

const schema = z.object({
  name: z.string().trim().min(1, "Please share your name").max(120),
  email: z.string().trim().email("Please enter a valid email").max(255),
  archetype: z.string().trim().max(64).optional().or(z.literal("")),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export function WaitlistForm({ source = "waitlist" }: { source?: string }) {
  const prior = useMemo(() => loadQuizResult(), []);
  const defaultArchetype = prior?.archetype ?? "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [archetype, setArchetype] = useState<string>(defaultArchetype);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!archetype && defaultArchetype) setArchetype(defaultArchetype);
  }, [defaultArchetype, archetype]);

  const submit = async () => {
    const parsed = schema.safeParse({ name, email, archetype, reason });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: parsed.data.name,
        email: parsed.data.email,
        archetype: parsed.data.archetype || null,
        reason: parsed.data.reason || null,
        source,
        quiz_score: prior ? (prior as unknown as Record<string, unknown>) : null,
      };

      const { data: inserted, error } = await supabase
        .from("waitlist_signups")
        .insert(payload)
        .select("id")
        .maybeSingle();

      if (error) {
        if (/duplicate|unique/i.test(error.message)) {
          toast.success("You're already on the list — see you soon 🌿");
          setDone(true);
          return;
        }
        throw error;
      }

      // Fire-and-forget transactional emails. If email infra isn't ready yet
      // the signup still succeeds.
      const archetypeTitle = parsed.data.archetype
        ? getArchetype(parsed.data.archetype).title
        : null;

      const signupId = inserted?.id ?? crypto.randomUUID();

      void supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "waitlist-welcome",
          recipientEmail: parsed.data.email,
          idempotencyKey: `waitlist-welcome-${signupId}`,
          templateData: {
            name: parsed.data.name,
            archetypeTitle,
          },
        },
      });

      void supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "waitlist-admin-notification",
          idempotencyKey: `waitlist-admin-${signupId}`,
          templateData: {
            name: parsed.data.name,
            email: parsed.data.email,
            archetype: archetypeTitle ?? "—",
            reason: parsed.data.reason || "—",
            source,
          },
        },
      });

      setDone(true);
      toast.success("You're on the list 🌿");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went sideways";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[hsl(145_35%_88%)] text-[hsl(145_30%_24%)]">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div>
          <h3 className="font-display text-2xl text-foreground">You're on the list 🌿</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Check your inbox for a soft hello — we'll let you know the moment CareFlow opens.
          </p>
        </div>
        {!prior && (
          <Link
            to="/quiz"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-5 py-2.5 text-sm font-medium text-foreground/90 hover:bg-card"
          >
            <Sparkles className="h-4 w-4" /> Take the caregiver quiz while you wait
          </Link>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void submit(); }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wl-name">Name</Label>
          <Input
            id="wl-name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What should we call you?"
            maxLength={120}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wl-email">Email</Label>
          <Input
            id="wl-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            maxLength={255}
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>
          Caregiver archetype <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Select value={archetype || "__none"} onValueChange={(v) => setArchetype(v === "__none" ? "" : v)}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Pick the one that fits — or take the quiz" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">I'm not sure yet</SelectItem>
            {ARCHETYPES.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!prior && (
          <p className="text-xs text-muted-foreground">
            Want help picking?{" "}
            <Link to="/quiz" className="underline underline-offset-2 hover:text-foreground">
              Take the 2-minute quiz
            </Link>.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wl-reason">
          Why you're interested <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="wl-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What are you hoping CareFlow helps with?"
          maxLength={500}
          rows={4}
        />
        <div className="text-right text-[11px] text-muted-foreground">{reason.length}/500</div>
      </div>

      <Button
        type="submit"
        disabled={busy}
        className="h-12 w-full rounded-full bg-[hsl(145_30%_28%)] text-[hsl(36_50%_96%)] hover:bg-[hsl(145_32%_24%)]"
      >
        {busy ? (
          <span className="inline-flex items-center gap-2"><Leaf className="h-4 w-4" /> Adding you…</span>
        ) : (
          <span className="inline-flex items-center gap-2"><Heart className="h-4 w-4" /> Join the CareFlow waitlist</span>
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        No spam. Just gentle updates and your founding-member invite.
      </p>
    </form>
  );
}