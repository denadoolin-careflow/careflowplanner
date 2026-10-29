import { useState } from "react";
import { Download, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinClub } from "@/lib/corner";
import { cn } from "@/lib/utils";

/** "Join the CareFlow Club" form. Saves the member and reveals the active freebie. */
export function ClubSignup({ source, cta = "Join the CareFlow Club", thanks = "Welcome to the CareFlow Club!", className }: {
  source: string; cta?: string; thanks?: string; className?: string;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ title: string | null; url: string | null } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError("Please enter a valid email."); return; }
    setBusy(true);
    try {
      const r = await joinClub(email, name, source);
      setDone({ title: r.freebieTitle, url: r.freebieUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className={cn("rounded-2xl border border-border bg-card p-5 text-center", className)} role="status">
        <Heart className="mx-auto h-6 w-6 text-primary" aria-hidden />
        <p className="mt-2 font-display text-xl text-foreground">{thanks}</p>
        {done.url && (
          <Button asChild className="mt-4 min-h-11">
            <a href={done.url} target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" /> Download {done.title ?? "your freebie"}</a>
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={cn("flex flex-col gap-2 sm:flex-row", className)}>
      <Input aria-label="First name" placeholder="First name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="min-h-11 bg-card sm:max-w-[180px]" />
      <Input aria-label="Email" type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} className="min-h-11 bg-card" />
      <Button type="submit" disabled={busy} className="min-h-11 shrink-0">{busy ? "Joining…" : cta}</Button>
      {error && <p className="text-sm text-destructive sm:basis-full">{error}</p>}
    </form>
  );
}
