import { useEffect, useState } from "react";
import { DIFFERENCE, FEATURES, FEATURES_SUB, FEATURES_TITLE, FINAL, HERO, PHASES, PHILOSOPHY, PROBLEM, WAY, WHO, ph, type PhaseKey } from "./copy";
import { Brand, Footer, GhostButton, WaitlistButton } from "./shared";

const MOONS = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];

function Season({ phase, children, id }: { phase: PhaseKey; children: React.ReactNode; id?: string }) {
  return <section id={id} className="px-6 py-20 transition-colors" style={{ background: ph(phase, "-tint") }}>{children}</section>;
}

/** B — Seasonal Journey: background moves through the phases as you scroll. */
export default function MockupB() {
  const [moon, setMoon] = useState(0);
  useEffect(() => {
    const on = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight || 1;
      setMoon(Math.min(7, Math.floor((window.scrollY / max) * 8)));
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <div className="bg-background font-sans text-foreground">
      <div className="pointer-events-none fixed right-4 top-20 z-30 text-4xl drop-shadow" aria-hidden>{MOONS[moon]}</div>
      <Season phase="plan">
        <div className="mx-auto max-w-3xl text-center">
          <Brand className="justify-center" />
          <div className="mt-12 text-7xl" aria-hidden>{MOONS[moon]}</div>
          <h1 className="mt-6 font-display text-5xl leading-tight md:text-7xl">{HERO.title}</h1>
          <p className="mt-5 text-xl font-semibold">{HERO.sub}</p>
          <p className="mx-auto mt-4 max-w-xl">{HERO.body}</p>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{HERO.body2}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3"><WaitlistButton>{HERO.primary}</WaitlistButton><GhostButton>{HERO.secondary}</GhostButton></div>
          <p className="mt-6 font-display italic">{HERO.note}</p>
        </div>
      </Season>

      <Season phase="plan">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-4xl" style={{ color: ph("plan", "-deep") }}>{PROBLEM.title}</h2>
          {PROBLEM.body.map((b) => <p key={b} className="mt-4 text-lg">{b}</p>)}
          <p className="mt-6 text-lg font-bold">{PROBLEM.turn}</p>
          <p className="mt-3 font-display text-2xl italic">{PROBLEM.question}</p>
        </div>
      </Season>

      <div id="phases">
        <div className="bg-background px-6 py-16 text-center">
          <h2 className="mx-auto max-w-3xl font-display text-4xl">{WAY.title}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{WAY.body}</p>
        </div>
        {PHASES.map((p) => (
          <Season key={p.key} phase={p.key}>
            <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 md:flex-row">
              <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-full text-6xl shadow-inner" style={{ background: ph(p.key) }}>{p.moon}</div>
              <div>
                <div className="text-sm font-bold uppercase tracking-[0.3em]" style={{ color: ph(p.key, "-deep") }}>{p.emoji} {p.name}</div>
                <h3 className="mt-2 font-display text-4xl">{p.lead}</h3>
                <p className="mt-3 text-lg">{p.body}</p>
                <p className="mt-3 font-display italic" style={{ color: ph(p.key, "-deep") }}>{p.note}</p>
              </div>
            </div>
          </Season>
        ))}
        <p className="bg-background py-10 text-center font-display text-2xl">{WAY.close}</p>
      </div>

      <section className="bg-background px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-display text-4xl">{FEATURES_TITLE}</h2>
          <p className="mt-3 text-center text-muted-foreground">{FEATURES_SUB}</p>
          <ol className="relative mt-12 space-y-10 border-l-2 border-dashed border-border pl-8">
            {FEATURES.map((f) => (
              <li key={f.name} className="relative">
                <span className="absolute -left-[3.05rem] flex h-10 w-10 items-center justify-center rounded-full text-lg shadow" style={{ background: ph(f.phase) }}>{f.emoji}</span>
                <h3 className="font-display text-2xl">{f.name}</h3>
                <p className="mt-1 text-muted-foreground">{f.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Season phase="grow">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-4xl" style={{ color: ph("grow", "-deep") }}>{DIFFERENCE.title}</h2>
          {DIFFERENCE.body.map((b) => <p key={b} className="mt-4 text-lg">{b}</p>)}
          <p className="mt-6 font-display text-2xl italic">{DIFFERENCE.close}</p>
        </div>
      </Season>

      <Season phase="care">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-4xl" style={{ color: ph("care", "-deep") }}>{WHO.title}</h2>
          {WHO.items.map((w) => <p key={w} className="mt-4 border-l-4 pl-4 text-lg" style={{ borderColor: ph("care") }}>{w}</p>)}
          <p className="mt-8 text-lg font-bold">{WHO.close}</p>
        </div>
      </Season>

      {PHILOSOPHY.lines.map((l, i) => (
        <div key={l} className="px-6 py-14 text-center" style={{ background: `radial-gradient(ellipse at center, ${ph(PHASES[i].key)} 0%, ${ph(PHASES[i].key, "-tint")} 70%)` }}>
          <h2 className="font-display text-5xl md:text-6xl">{l}</h2>
        </div>
      ))}
      <Season phase="letgo">
        <div className="mx-auto max-w-2xl space-y-2 text-center text-lg">
          {PHILOSOPHY.body.map((b) => <p key={b}>{b}</p>)}
          <p className="pt-4 font-bold">{PHILOSOPHY.close}</p>
        </div>
      </Season>

      <Season phase="letgo">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-6xl" aria-hidden>🌘</div>
          <h2 className="mt-4 font-display text-4xl">{FINAL.title}</h2>
          <p className="mt-4 text-lg font-semibold">{FINAL.sub}</p>
          <p className="mt-2">{FINAL.body}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3"><WaitlistButton>{FINAL.primary}</WaitlistButton><GhostButton>{FINAL.secondary}</GhostButton></div>
          <p className="mt-6 font-display italic">{FINAL.note}</p>
        </div>
      </Season>
      <Footer />
    </div>
  );
}
