import { OysterMark } from "./oyster-mark";

type BrandMarkProps = {
  autoReveal?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
  tone?: "default" | "inverse";
};

const toneStyles = {
  default: {
    icon: "bg-[#10243a] text-[#a7e0dc] shadow-[0_5px_14px_rgb(16_36_58_/_0.18)]",
    name: "text-text",
    tagline: "text-text-muted",
  },
  inverse: {
    icon: "border border-white/20 bg-white/10 text-[#a7e0dc]",
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
        className={`grid ${compact ? "size-8 rounded-lg" : "size-11 rounded-[.7rem]"} shrink-0 place-items-center ${styles.icon}`}
      >
        <OysterMark className={compact ? "size-6" : "size-8"} />
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
