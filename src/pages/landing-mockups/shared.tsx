import { Link } from "react-router-dom";
import { CareFlowLogo } from "@/components/widgets/CareFlowLogo";
import { cn } from "@/lib/utils";
import { FOOTER, PHASES, PHASE_GRADIENT, TAGLINE, ph } from "./copy";

export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <CareFlowLogo size={36} />
      <div className="leading-tight">
        <div className="font-display text-xl text-foreground">careflow</div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{TAGLINE}</div>
      </div>
    </div>
  );
}

export function WaitlistButton({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Link to="/waitlist" className={cn("inline-flex min-h-11 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-foreground shadow-md transition hover:opacity-90", className)} style={{ background: PHASE_GRADIENT }}>
      {children}
    </Link>
  );
}

export function GhostButton({ children, href = "#phases" }: { children: React.ReactNode; href?: string }) {
  return (
    <a href={href} className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-card/70 px-6 py-3 text-sm font-semibold text-foreground hover:bg-card">
      {children}
    </a>
  );
}

/** Small faux phone showing a CareFlow screen. */
export function PhoneMock({ title, variant = "today", className }: { title: string; variant?: "today" | "projects" | "care" | "reflect"; className?: string }) {
  return (
    <div className={cn("w-[220px] shrink-0 rounded-[2rem] border-[6px] border-foreground/80 bg-background p-3 shadow-xl", className)}>
      <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-foreground/20" />
      <div className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">{title}</div>
      {variant === "today" && (
        <>
          <div className="mb-3 rounded-2xl p-3 text-center" style={{ background: ph("grow", "-tint") }}>
            <div className="text-3xl">🌔</div>
            <div className="font-display text-2xl text-foreground">9:41</div>
            <div className="text-[10px]" style={{ color: ph("grow", "-deep") }}>Grow · Moon in Taurus</div>
          </div>
          {["Morning reset", "Call the pharmacy", "Walk with Mom"].map((t, i) => (
            <div key={t} className="mb-1.5 flex items-center gap-2 rounded-xl bg-card px-2 py-2 text-[11px] text-foreground">
              <span className="h-3.5 w-3.5 rounded-full border-2" style={{ borderColor: ph(PHASES[i].key) }} /> {t}
            </div>
          ))}
        </>
      )}
      {variant === "projects" && (
        <div className="grid grid-cols-2 gap-1.5">
          {PHASES.map((p) => (
            <div key={p.key} className="rounded-xl p-2" style={{ background: ph(p.key, "-tint") }}>
              <div className="text-[10px] font-bold" style={{ color: ph(p.key, "-deep") }}>{p.emoji} {p.name}</div>
              <div className="mt-1 h-2 rounded bg-card" /><div className="mt-1 h-2 w-2/3 rounded bg-card" />
            </div>
          ))}
        </div>
      )}
      {variant === "care" && (
        <>
          {["💊 Evening meds · 8:00", "🍲 Soup night", "🧺 Laundry in dryer", "👵 Visit Grandma"].map((t) => (
            <div key={t} className="mb-1.5 rounded-xl px-2 py-2 text-[11px] text-foreground" style={{ background: ph("care", "-tint") }}>{t}</div>
          ))}
        </>
      )}
      {variant === "reflect" && (
        <div className="rounded-2xl p-3" style={{ background: ph("letgo", "-tint") }}>
          <div className="font-display text-sm text-foreground">Evening reflection</div>
          <div className="mt-2 text-[11px] italic text-muted-foreground">What can I set down tonight?</div>
          <div className="mt-2 h-2 rounded bg-card" /><div className="mt-1 h-2 w-4/5 rounded bg-card" /><div className="mt-1 h-2 w-3/5 rounded bg-card" />
        </div>
      )}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10 text-center">
      <Brand className="justify-center" />
      <p className="mt-3 text-sm text-muted-foreground">{FOOTER.line}</p>
      <nav className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-foreground">
        {FOOTER.links.map((l) => <a key={l} href="#" className="hover:underline">{l}</a>)}
      </nav>
      <p className="mt-4 text-xs text-muted-foreground">{FOOTER.copy}</p>
    </footer>
  );
}
