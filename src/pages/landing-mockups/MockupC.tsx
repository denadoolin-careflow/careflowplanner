import { DIFFERENCE, FEATURES, FEATURES_SUB, FEATURES_TITLE, FINAL, HERO, PHASES, PHASE_GRADIENT, PHILOSOPHY, PROBLEM, WAY, WHO, ph } from "./copy";
import { Brand, Footer, GhostButton, PhoneMock, WaitlistButton } from "./shared";

const Tile = ({ className = "", style, children }: { className?: string; style?: React.CSSProperties; children: React.ReactNode }) => (
  <div className={`rounded-3xl border border-border bg-card p-6 ${className}`} style={style}>{children}</div>
);

/** C — Bento Dashboard: modern product grid. */
export default function MockupC() {
  return (
    <div className="bg-background font-sans text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Brand />
        <WaitlistButton className="hidden sm:inline-flex">Join the Waitlist</WaitlistButton>
      </header>

      <div className="mx-auto grid max-w-6xl gap-4 px-4 md:grid-cols-6">
        <Tile className="md:col-span-4 md:row-span-2">
          <span className="inline-block rounded-full px-3 py-1 text-xs font-bold text-foreground" style={{ background: PHASE_GRADIENT }}>Plan ✦ Grow ✦ Care ✦ Let Go</span>
          <h1 className="mt-5 font-display text-5xl leading-tight md:text-6xl">{HERO.title}</h1>
          <p className="mt-4 text-xl font-semibold">{HERO.sub}</p>
          <p className="mt-3 text-muted-foreground">{HERO.body} {HERO.body2}</p>
          <div className="mt-6 flex flex-wrap gap-3"><WaitlistButton>{HERO.primary}</WaitlistButton><GhostButton>{HERO.secondary}</GhostButton></div>
        </Tile>
        <Tile className="flex items-center justify-center md:col-span-2 md:row-span-2" style={{ background: ph("grow", "-tint") }}>
          <PhoneMock title="Today" />
        </Tile>
        <Tile className="md:col-span-6" style={{ background: ph("plan", "-tint") }}>
          <p className="text-center font-display text-xl italic">{HERO.note}</p>
        </Tile>

        <Tile className="md:col-span-3">
          <h2 className="font-display text-3xl">{PROBLEM.title}</h2>
          {PROBLEM.body.map((b) => <p key={b} className="mt-3 text-muted-foreground">{b}</p>)}
        </Tile>
        <Tile className="flex flex-col justify-center md:col-span-3" style={{ background: ph("care", "-tint") }}>
          <p className="text-lg font-bold">{PROBLEM.turn}</p>
          <p className="mt-3 font-display text-2xl italic">{PROBLEM.question}</p>
        </Tile>

        <Tile id="phases" className="md:col-span-6">
          <h2 className="font-display text-3xl">{WAY.title}</h2>
          <p className="mt-2 text-muted-foreground">{WAY.body}</p>
        </Tile>
        {PHASES.map((p) => (
          <Tile key={p.key} className="md:col-span-3 lg:col-span-3" style={{ background: ph(p.key, "-tint") }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: ph(p.key, "-deep") }}>{p.name}</span>
              <span className="text-3xl">{p.emoji}</span>
            </div>
            <h3 className="mt-3 font-display text-2xl">{p.lead}</h3>
            <p className="mt-2 text-sm">{p.body}</p>
            <p className="mt-3 text-sm italic" style={{ color: ph(p.key, "-deep") }}>{p.note}</p>
          </Tile>
        ))}
        <Tile className="md:col-span-6" style={{ background: PHASE_GRADIENT }}>
          <p className="text-center font-display text-2xl">{WAY.close}</p>
        </Tile>

        <Tile className="md:col-span-6 border-0 bg-transparent px-0 text-center">
          <h2 className="font-display text-4xl">{FEATURES_TITLE}</h2>
          <p className="mt-2 text-muted-foreground">{FEATURES_SUB}</p>
        </Tile>
        {FEATURES.map((f, i) => (
          <Tile key={f.name} className={i === 0 || i === 3 ? "md:col-span-4" : "md:col-span-2"}>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl text-xl" style={{ background: ph(f.phase, "-tint") }}>{f.emoji}</div>
            <h3 className="font-display text-xl">{f.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            {i === 0 && <div className="mt-4 flex gap-2">{PHASES.map((p) => <div key={p.key} className="h-2 flex-1 rounded-full" style={{ background: ph(p.key) }} />)}</div>}
          </Tile>
        ))}

        <Tile className="md:col-span-4">
          <h2 className="font-display text-3xl">{DIFFERENCE.title}</h2>
          {DIFFERENCE.body.map((b) => <p key={b} className="mt-3 text-muted-foreground">{b}</p>)}
        </Tile>
        <Tile className="flex items-center md:col-span-2" style={{ background: ph("letgo", "-tint") }}>
          <p className="font-display text-2xl italic">{DIFFERENCE.close}</p>
        </Tile>
      </div>

      <section className="mx-auto max-w-6xl py-12">
        <h2 className="px-4 font-display text-3xl">{WHO.title}</h2>
        <div className="mt-6 flex snap-x gap-4 overflow-x-auto px-4 pb-4">
          {WHO.items.map((w, i) => (
            <div key={w} className="w-64 shrink-0 snap-start rounded-3xl p-6" style={{ background: ph(PHASES[i % 4].key, "-tint") }}>
              <div className="text-3xl">{PHASES[i % 4].emoji}</div>
              <p className="mt-4 text-lg">{w}</p>
            </div>
          ))}
        </div>
        <p className="px-4 font-bold">{WHO.close}</p>
      </section>

      <div className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 md:grid-cols-4">
        {PHILOSOPHY.lines.map((l, i) => (
          <Tile key={l} style={{ background: ph(PHASES[i].key, "-tint") }}><h3 className="font-display text-2xl" style={{ color: ph(PHASES[i].key, "-deep") }}>{l}</h3></Tile>
        ))}
        <Tile className="md:col-span-4 text-center">
          <p className="text-muted-foreground">{PHILOSOPHY.body.join(" ")}</p>
          <p className="mt-3 font-bold">{PHILOSOPHY.close}</p>
        </Tile>
        <Tile className="md:col-span-4 text-center" style={{ background: `linear-gradient(135deg, ${ph("plan", "-tint")}, ${ph("letgo", "-tint")})` }}>
          <h2 className="font-display text-4xl">{FINAL.title}</h2>
          <p className="mt-3 font-semibold">{FINAL.sub}</p>
          <p className="mt-2 text-muted-foreground">{FINAL.body}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3"><WaitlistButton>{FINAL.primary}</WaitlistButton><GhostButton>{FINAL.secondary}</GhostButton></div>
          <p className="mt-5 font-display italic">{FINAL.note}</p>
        </Tile>
      </div>
      <Footer />
    </div>
  );
}
