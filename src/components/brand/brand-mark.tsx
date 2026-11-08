import Image from "next/image";

type BrandMarkProps = {
  autoReveal?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
  tone?: "default" | "inverse";
};

const toneStyles = {
  default: {
    icon: "border border-border bg-white",
    name: "text-text",
    tagline: "text-text-muted",
  },
  inverse: {
    icon: "border border-white/20 bg-white",
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
        <Image src="/brand/trung-nam-oyster.webp" alt="" width={450} height={450} sizes={compact ? "32px" : "44px"} className="size-full rounded-[inherit] object-contain p-0.5" />
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
          HTX Trung Nam
        </span>
        {!compact && (
          <span className={`block text-sm leading-5 ${styles.tagline}`}>
            Quản lý nuôi hàu · Truy xuất nguồn gốc
          </span>
        )}
      </span>
    </div>
  );
}
