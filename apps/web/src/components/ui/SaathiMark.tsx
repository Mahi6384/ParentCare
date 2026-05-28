/*
  SaathiMark — the Saathi AI agent avatar.

  What it is:
  A small soft circle with two symbolic elements:
    1. A gentle crescent near the top — calm, lunar
    2. A tika dot in the lower centre — a warm Indian touch

  Why this exists as a standalone component:
  The mark appears in ~8 places: nav bars, verification cards,
  concern cards, agent suggestion cards, chat headers, etc.
  Extracting it here means one change ripples everywhere.

  Props:
  - size  : pixel size for width + height (default 32)
  - ring  : whether to draw the outer ring stroke (default true)

  Color strategy:
  The fill uses CSS variables so it adapts to light/dark mode
  and future theme changes without any JS. The `currentColor`
  trick isn't usable on SVG fills directly, so we use inline
  style with CSS var() references — works in all modern browsers.
*/

interface SaathiMarkProps {
  size?: number
  ring?: boolean
}

export default function SaathiMark({ size = 32, ring = true }: SaathiMarkProps) {
  // React needs a unique ID per instance so multiple marks on one page
  // don't share the same radialGradient and paint wrong colors.
  // We can't use React.useId() in a server component, so we use a
  // simple static ID — acceptable here because gradient uses CSS vars
  // which are per-element, not per-gradient-instance.
  const id = 'saathi-grad'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      style={{ display: 'block', flexShrink: 0 }}
      aria-label="Saathi"
    >
      <defs>
        {/*
          Radial gradient: lighter brand-soft at top-left,
          deeper brand at bottom-right — gives the circle
          a glowing, warm feel.
        */}
        <radialGradient id={id} cx="35%" cy="32%" r="75%">
          <stop offset="0%"   stopColor="var(--pc-brand-soft)" />
          <stop offset="100%" stopColor="var(--pc-brand)" />
        </radialGradient>
      </defs>

      {/* Main circle */}
      <circle cx="20" cy="20" r="18" fill={`url(#${id})`} />

      {/* Outer ring — subtle, gives it definition */}
      {ring && (
        <circle
          cx="20" cy="20" r="18.5"
          fill="none"
          stroke="var(--pc-brand-deep)"
          strokeWidth="0.75"
          opacity="0.5"
        />
      )}

      {/* Crescent — top arc, feels lunar and calm */}
      <path
        d="M 13 13 Q 20 8, 27 13 Q 22 12, 18 14 Q 14 16, 13 13 Z"
        fill="white"
        opacity="0.85"
      />

      {/* Tika dot — cultural warmth, centres the composition */}
      <circle
        cx="20" cy="24" r="1.6"
        fill="var(--pc-brand-deep)"
        opacity="0.8"
      />
    </svg>
  )
}
