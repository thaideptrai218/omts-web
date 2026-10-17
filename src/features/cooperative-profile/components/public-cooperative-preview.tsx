import type { PublicCooperativeProjection } from "@/features/cooperative-profile/domain/cooperative-profile";

export function PublicCooperativePreview({
  projection,
}: Readonly<{ projection: PublicCooperativeProjection }>) {
  return (
    <section
      aria-labelledby="public-preview-title"
      className="overflow-hidden rounded-card border border-primary/20 bg-surface shadow-card"
    >
      <div className="bg-gradient-to-br from-primary to-primary-hover px-5 py-6 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">
          Thông tin truy xuất
        </p>
        <h2 className="mt-3 text-xl font-semibold leading-snug" id="public-preview-title">
          {projection.cooperativeName}
        </h2>
      </div>
      <div className="p-5">
        <div className="flex gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-hover"
          >
            ⌖
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Địa chỉ</p>
            <p className="mt-1 break-words leading-6 text-text">
              {projection.officeAddress}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
