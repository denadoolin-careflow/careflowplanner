import { useState } from "react";
import { DIFFERENCE, FEATURES, FEATURES_SUB, FEATURES_TITLE, FINAL, HERO, PHASES, PHASE_GRADIENT, PHILOSOPHY, PROBLEM, WAY, WHO, ph } from "./copy";
import { Brand, Footer, GhostButton, PhoneMock, WaitlistButton } from "./shared";

/** A — Calm Lifestyle: spacious, editorial, phase ribbon. */
export default function MockupA() {
  const [active, setActive] = useState(0);
  const p = PHASES[active];
  return (
    <div className="bg-background font-sans text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Brand />
        <WaitlistButton className="hidden sm:inline-flex">Join the Waitlist</WaitlistButton>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-2 md:py-24">
        <div>
          <h1 className="font-display text-5xl leading-tight md:text-6xl">{HERO.title}</h1>
          <p className="mt-5 text-xl font-semibold">{HERO.sub}</p>
          <p className="mt-4 text-muted-foreground">{HERO.body}</p>
          <p className="mt-3 text-muted-foreground">{HERO.body2}</p>
          <div className="mt-8 flex flex-wrap gap-3"><WaitlistButton>{HERO.primary}</WaitlistButton><GhostButton>{HERO.secondary}</GhostButton></div>
          <p className="mt-6 font-display italic text-muted-foreground">{HERO.note}</p>
        </div>
        <div className="flex justify-center"><PhoneMock title="Today" className="w-[260px] rotate-2" /></div>
      </section>

      <div className="h-3 w-full" style={{ background: PHASE_GRADIENT }} />

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="font-display text-4xl">{PROBLEM.title}</h2>
        {PROBLEM.body.map((b) => <p key={b} className="mt-4 text-lg text-muted-foreground">{b}</p>)}
        <p className="mt-6 text-lg font-bold">{PROBLEM.turn}</p>
        <p className="mt-3 font-display text-2xl italic">{PROBLEM.question}</p>
      </section>

      <section id="phases" className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center font-display text-4xl">{WAY.title}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">{WAY.body}</p>
        <div className="mt-10 grid grid-cols-4 overflow-hidden rounded-full" style={{ background: PHASE_GRADIENT }}>
          {PHASES.map((x, i) => (
            <button key={x.key} onClick={() => setActive(i)} className={`min-h-12 px-2 text-sm font-bold text-foreground transition ${i === active ? "bg-card/70" : ""}`}>
              {x.emoji} <span className="hidden sm:inline">{x.name}</span>
            </button>
          ))}
        </div>
        <div className="mt-6 rounded-3xl p-8 transition-colors" style={{ background: ph(p.key, "-tint") }}>
          <div className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: ph(p.key, "-deep") }}>{p.emoji} {p.name}</div>
          <h3 className="mt-2 font-display text-3xl">{p.lead}</h3>
          <p className="mt-3 text-lg">{p.body}</p>
          <p className="mt-4 font-display italic" style={{ color: ph(p.key, "-deep") }}>{p.note}</p>
        </div>
        <p className="mt-8 text-center font-display text-xl">{WAY.close}</p>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="font-display text-4xl">{FEATURES_TITLE}</h2>
          <p className="mt-3 text-muted-foreground">{FEATURES_SUB}</p>
        </div>
        <div className="mt-10 flex gap-6 overflow-x-auto px-6 pb-6 md:justify-center">
          <PhoneMock title="Today" /><PhoneMock title="Projects" variant="projects" /><PhoneMock title="Care" variant="care" /><PhoneMock title="Reflection" variant="reflect" />
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-x-10 gap-y-8 px-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.name} className="border-t-2 pt-4" style={{ borderColor: ph(f.phase) }}>
              <h3 className="font-display text-xl">{f.emoji} {f.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="font-display text-4xl">{DIFFERENCE.title}</h2>
        {DIFFERENCE.body.map((b) => <p key={b} className="mt-4 text-lg text-muted-foreground">{b}</p>)}
        <p className="mt-6 font-display text-2xl italic">{DIFFERENCE.close}</p>
      </section>

      <section className="bg-card px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-display text-4xl">{WHO.title}</h2>
          <ul className="mt-8 space-y-4">
            {WHO.items.map((w, i) => (
              <li key={w} className="flex gap-3 text-lg"><span className="mt-2 h-3 w-3 shrink-0 rounded-full" style={{ background: ph(PHASES[i % 4].key) }} />{w}</li>
            ))}
          </ul>
          <p className="mt-8 text-center text-lg font-bold">{WHO.close}</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        {PHILOSOPHY.lines.map((l, i) => <h2 key={l} className="font-display text-4xl" style={{ color: ph(PHASES[i].key, "-deep") }}>{l}</h2>)}
        <div className="mt-8 space-y-2 text-lg text-muted-foreground">{PHILOSOPHY.body.map((b) => <p key={b}>{b}</p>)}</div>
        <p className="mt-6 text-lg font-bold">{PHILOSOPHY.close}</p>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-4xl rounded-[2.5rem] p-10 text-center md:p-16" style={{ background: `linear-gradient(135deg, ${ph("plan", "-tint")}, ${ph("grow", "-tint")}, ${ph("care", "-tint")}, ${ph("letgo", "-tint")})` }}>
          <h2 className="font-display text-4xl">{FINAL.title}</h2>
          <p className="mt-4 text-lg font-semibold">{FINAL.sub}</p>
          <p className="mt-2 text-muted-foreground">{FINAL.body}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3"><WaitlistButton>{FINAL.primary}</WaitlistButton><GhostButton>{FINAL.secondary}</GhostButton></div>
          <p className="mt-6 font-display italic">{FINAL.note}</p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
