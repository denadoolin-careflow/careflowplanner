import { STUDIO } from "./studio-tokens";

// Soft mood-scene gradient cover, derived from a seed string so each project
// gets a consistent but distinct hue without an uploaded image.
const MOODS: Array<[string, string, string]> = [
  [STUDIO.sage,      STUDIO.cream,      STUDIO.sageDeep],
  [STUDIO.blush,     STUDIO.cream,      STUDIO.blushDeep],
  [STUDIO.goldSoft,  STUDIO.cream,      STUDIO.gold],
  [STUDIO.plumSoft,  STUDIO.cream,      STUDIO.plum],
  ["215 50% 92%",    STUDIO.cream,      "215 40% 60%"],
  ["280 35% 92%",    STUDIO.cream,      "280 30% 55%"],
];

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export function ProjectCoverArt({ seed, coverUrl, className }: { seed: string; coverUrl?: string; className?: string }) {
  if (coverUrl) {
    return (
      <div
        className={className}
        style={{ backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
    );
  }
  const [a, b, c] = MOODS[hash(seed) % MOODS.length];
  return (
    <div
      className={className}
      style={{
        background: `linear-gradient(135deg, hsl(${a}) 0%, hsl(${b}) 60%, hsl(${a}) 100%)`,
      }}
    >
      <svg viewBox="0 0 200 120" className="h-full w-full opacity-70" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id={`g-${hash(seed)}`} cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor={`hsl(${c} / 0.35)`} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width="200" height="120" fill={`url(#g-${hash(seed)})`} />
        <g fill={`hsl(${c} / 0.45)`} transform="translate(140 70)">
          <path d="M0 0 C 10 -20 30 -25 45 -15 C 35 -5 20 5 0 0 Z" />
          <path d="M-5 8 C 5 -10 25 -18 42 -8 C 30 4 10 14 -5 8 Z" opacity="0.6" />
        </g>
        <circle cx="40" cy="35" r="14" fill={`hsl(${c} / 0.25)`} />
      </svg>
    </div>
  );
}