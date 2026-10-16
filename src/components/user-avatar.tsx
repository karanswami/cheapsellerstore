import { cn } from "@/lib/utils";

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PALETTES = [
  ["#7c5cff", "#c9bdff"],
  ["#ff6b4a", "#ffc7b8"],
  ["#14b8a6", "#b6efe8"],
  ["#f59e0b", "#fde4a6"],
  ["#ec4899", "#fbc4de"],
  ["#3b82f6", "#bcd5fd"],
  ["#22c55e", "#bdf0cd"],
  ["#8b5cf6", "#d9ccfb"],
];

/** Deterministic robot face generated from a seed (username/id) — no network. */
export function RobotAvatar({ seed, className }: { seed: string; className?: string }) {
  const h = hash(seed || "robot");
  const [bg, light] = PALETTES[h % PALETTES.length];
  const eyes = (h >> 3) % 4;
  const mouth = (h >> 5) % 4;
  const antenna = (h >> 7) % 3;
  const ears = (h >> 9) % 2 === 0;
  const ink = "#1b1b22";

  const eye = (cx: number) => {
    if (eyes === 0) return <circle key={cx} cx={cx} cy="46" r="6" fill={ink} />;
    if (eyes === 1) return <rect key={cx} x={cx - 6} y="40" width="12" height="12" rx="3" fill={ink} />;
    if (eyes === 2)
      return (
        <g key={cx}>
          <circle cx={cx} cy="46" r="7" fill="#fff" />
          <circle cx={cx + 1.5} cy="47" r="3.5" fill={ink} />
        </g>
      );
    return <path key={cx} d={`M${cx - 6} 49 q6 -10 12 0`} stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round" />;
  };

  return (
    <svg viewBox="0 0 100 100" className={cn("rounded-full", className)} role="img" aria-label="Robot avatar">
      <rect width="100" height="100" fill={light} />
      {antenna === 0 ? (
        <>
          <line x1="50" y1="22" x2="50" y2="10" stroke={bg} strokeWidth="4" />
          <circle cx="50" cy="9" r="5" fill={bg} />
        </>
      ) : antenna === 1 ? (
        <>
          <line x1="38" y1="22" x2="32" y2="10" stroke={bg} strokeWidth="4" />
          <line x1="62" y1="22" x2="68" y2="10" stroke={bg} strokeWidth="4" />
          <circle cx="32" cy="9" r="4" fill={bg} />
          <circle cx="68" cy="9" r="4" fill={bg} />
        </>
      ) : null}
      {ears ? (
        <>
          <rect x="14" y="40" width="8" height="20" rx="3" fill={bg} />
          <rect x="78" y="40" width="8" height="20" rx="3" fill={bg} />
        </>
      ) : null}
      <rect x="20" y="22" width="60" height="58" rx="16" fill={bg} />
      <rect x="27" y="32" width="46" height="30" rx="10" fill="#fff" opacity="0.92" />
      {eye(40)}
      {eye(60)}
      {mouth === 0 ? (
        <path d="M40 70 q10 8 20 0" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
      ) : mouth === 1 ? (
        <rect x="40" y="68" width="20" height="5" rx="2.5" fill="#fff" />
      ) : mouth === 2 ? (
        <g fill="#fff">
          <rect x="38" y="67" width="5" height="7" rx="1" />
          <rect x="45" y="67" width="5" height="7" rx="1" />
          <rect x="52" y="67" width="5" height="7" rx="1" />
          <rect x="59" y="67" width="3" height="7" rx="1" />
        </g>
      ) : (
        <circle cx="50" cy="70" r="4" fill="#fff" />
      )}
    </svg>
  );
}

/** Photo if set, otherwise a unique robot derived from `seed`. */
export function UserAvatar({
  src,
  seed,
  className,
}: {
  src?: string | null;
  seed: string;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn("rounded-full object-cover", className)} />;
  }
  return <RobotAvatar seed={seed} className={className} />;
}
