// Hand-drawn line icons for the About page's Mission and Vision cards. Drawn
// on a 64px grid with one stroke weight so the two read as a matched pair.

interface IconProps {
  className?: string
}

/** A target with an arrow in the bullseye: a goal pursued with precision. */
export function MissionIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="28" cy="36" r="20" />
      <circle cx="28" cy="36" r="13" opacity={0.75} />
      <circle cx="28" cy="36" r="6" opacity={0.55} />
      <circle cx="28" cy="36" r="2" fill="currentColor" stroke="none" />
      <path d="M28 36 50 14" />
      <path d="M50 14V6M50 14h8" />
      <path d="M54 10V4M54 10h6" opacity={0.6} />
    </svg>
  )
}

/** An eye holding a sunrise over the land: seeing the future of a place. */
export function VisionIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 34c7-12 16.5-18 26-18s19 6 26 18c-7 12-16.5 18-26 18S13 46 6 34Z" />
      <circle cx="32" cy="34" r="11" />
      <path d="M26 33.5a6 6 0 0 1 12 0" />
      <path d="M22.5 39c3-2.6 6-3.2 9.5-1.6s6.6 1.2 9.5-1" />
      <path d="M32 4v6M18.5 8.5l3 5M45.5 8.5l-3 5" opacity={0.7} />
    </svg>
  )
}
