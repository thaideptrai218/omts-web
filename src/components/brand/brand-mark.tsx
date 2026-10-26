type BrandMarkProps = {
  autoReveal?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
  tone?: "default" | "inverse";
};

const toneStyles = {
  default: {
    icon: "bg-primary text-white shadow-sm",
    name: "text-text",
    tagline: "text-text-muted",
  },
  inverse: {
    icon: "bg-white text-primary",
    name: "text-white",
    tagline: "text-sky-50",
  },
} as const;

export function BrandMark({
  autoReveal = false,
  compact = false,
  iconOnly = false,
  tone = "default",
}: BrandMarkProps) {
  const styles = toneStyles[tone];

  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={`grid size-11 shrink-0 place-items-center rounded-xl ${styles.icon}`}
      >
        <svg
          className="size-7"
          fill="none"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 18.5c3.5-3 7-3 10.5 0s7 3 11 0"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
          <path
            d="M7 23.5c3-2.25 6-2.25 9 0s6 2.25 9 0"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
          <path
            d="M11 14c0-3.2 2.2-6 5-6s5 2.8 5 6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
        </svg>
      </span>

      <span
        className={
          iconOnly
            ? "sr-only"
            : autoReveal
              ? "whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100 motion-reduce:transition-none"
              : "whitespace-nowrap"
        }
      >
        <span className={`block text-lg font-bold tracking-tight ${styles.name}`}>
          OMTS
        </span>
        {!compact && (
          <span className={`block text-sm leading-5 ${styles.tagline}`}>
            Quản lý và truy xuất nuôi hàu
          </span>
        )}
      </span>
    </div>
  );
}
