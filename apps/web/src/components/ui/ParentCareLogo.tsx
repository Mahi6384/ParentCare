/*
  ParentCareLogo — the product's primary brand mark.

  The idea:
  "An AI watching over the people who raised you."
  The mark is a single bold arc cradling a solid dot. It reads
  three ways on purpose:
    1. an embrace / shelter — someone watching over
    2. a rising saffron sun  — warmth, a new day
    3. a soft eyelid          — watchfulness
  The dot underneath is the parent being cared for.

  Why a standalone component (not an inline <svg>):
  The logo shows up in the nav bar, auth pages, marketing hero,
  favicons and the PWA splash. Centralising it means one edit
  ripples everywhere — same reasoning as <SaathiMark />.

  Color strategy:
  Fills reference the --pc-* CSS variables, so the mark recolours
  itself for light/dark/theme changes with zero JS — identical
  approach to SaathiMark.

  Props:
  - size : pixel width + height (default 32)
  - tile : draw a rounded parchment background tile behind the
           mark (default false). Turn this ON for app-icon /
           favicon use; leave OFF when placing on a coloured nav.
*/

interface ParentCareLogoProps {
  size?: number
  tile?: boolean
}

export default function ParentCareLogo({ size = 32, tile = false }: ParentCareLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      style={{ display: 'block', flexShrink: 0 }}
      role="img"
      aria-label="ParentCare"
    >
      {/* Optional app-icon tile — warm parchment, rounded like iOS/Android icons */}
      {tile && (
        <rect x="0" y="0" width="40" height="40" rx="9" fill="var(--pc-bg)" />
      )}

      {/*
        The shelter / sun arc.
        It's a stroked path, not a filled shape, so the line weight
        stays even at every size. Endpoints sit low-left (12,28) and
        low-right (28,28); the arc (large-arc-flag=1) sweeps the long
        way up and over the top — forming the dome.
        strokeLinecap="round" softens the two ends into the "arms".
      */}
      <path
        d="M 12 28 A 12 12 0 1 1 28 28"
        fill="none"
        stroke="var(--pc-brand)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />

      {/*
        The parent — a solid dot cradled beneath the arc.
        Deep saffron so it sits a shade darker than the dome and
        reads as the protected centre of the composition.
      */}
      <circle cx="20" cy="24.5" r="3.4" fill="var(--pc-brand-deep)" />
    </svg>
  )
}
