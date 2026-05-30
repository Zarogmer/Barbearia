/**
 * Ilustrações inline pros empty states (PBI-27).
 * Estilo low-poly geométrico monocromático — herda currentColor do
 * container pai (text-brand no EmptyState).
 */

type SvgProps = { className?: string };

const COMMON_PROPS = {
  viewBox: "0 0 48 48",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  width: 40,
  height: 40,
} as const;

export function ScissorsIllustration({ className }: SvgProps) {
  return (
    <svg {...COMMON_PROPS} className={className} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="14" cy="14" r="5" />
      <circle cx="14" cy="34" r="5" />
      <path d="m18 17 18 18" />
      <path d="m18 31 18-18" />
      <path d="M30 24 44 16" opacity={0.4} />
    </svg>
  );
}

export function ProfessionalIllustration({ className }: SvgProps) {
  return (
    <svg {...COMMON_PROPS} className={className} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="18" r="7" />
      <path d="M10 40c2-7 8-11 14-11s12 4 14 11" />
      <path d="M19 18l5-4 5 4" opacity={0.5} />
    </svg>
  );
}

export function CustomersIllustration({ className }: SvgProps) {
  return (
    <svg {...COMMON_PROPS} className={className} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="6" />
      <circle cx="34" cy="20" r="4" opacity={0.6} />
      <path d="M6 40c2-7 7-10 12-10s10 3 12 10" />
      <path d="M30 40c1-5 4-7 8-7s6 2 7 6" opacity={0.5} />
    </svg>
  );
}

export function ComandaIllustration({ className }: SvgProps) {
  return (
    <svg {...COMMON_PROPS} className={className} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6h24v36l-6-4-6 4-6-4-6 4z" />
      <path d="M18 16h12" />
      <path d="M18 22h12" opacity={0.6} />
      <path d="M18 28h8" opacity={0.4} />
    </svg>
  );
}

export function FeedIllustration({ className }: SvgProps) {
  return (
    <svg {...COMMON_PROPS} className={className} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="8" width="32" height="32" rx="4" />
      <circle cx="17" cy="17" r="3" />
      <path d="m8 32 8-8 8 8 6-6 10 10" opacity={0.7} />
    </svg>
  );
}

export function CommissionIllustration({ className }: SvgProps) {
  return (
    <svg {...COMMON_PROPS} className={className} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="24" r="14" />
      <path d="M18 30l12-12" />
      <circle cx="18.5" cy="19.5" r="2.5" />
      <circle cx="29.5" cy="28.5" r="2.5" />
    </svg>
  );
}

export function CalendarIllustration({ className }: SvgProps) {
  return (
    <svg {...COMMON_PROPS} className={className} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="10" width="32" height="30" rx="3" />
      <path d="M8 18h32" />
      <path d="M16 6v8M32 6v8" />
      <circle cx="24" cy="28" r="3" opacity={0.6} />
    </svg>
  );
}
