/** The commercial size of a product: the AVERAGE shell length at maturity in cm, a reference for the buyer, never a guarantee. One value is "~5 cm", a range "8–12 cm". */
export type SizeCm = { sizeMinCm?: number | null; sizeMaxCm?: number | null };

const cm = (value: number) => String(Number(value.toFixed(1))).replace(".", ",");

/** The bare figure: "~5 cm" or "8–12 cm"; null when the product has no size. */
export function sizeFigure(min: number | null | undefined, max: number | null | undefined): string | null {
  if (min == null) return null;
  return max != null && max !== min ? `${cm(min)}–${cm(max)} cm` : `~${cm(min)} cm`;
}

/** The long wording for the detail and the form: "Cỡ trung bình khoảng 8–12 cm" / "Cỡ trung bình khoảng 5 cm". */
export function sizeText(min: number | null | undefined, max: number | null | undefined): string | null {
  const figure = sizeFigure(min, max);
  return figure ? `Cỡ trung bình khoảng ${figure.replace("~", "")}` : null;
}

export const SIZE_TITLE = "Cỡ thương phẩm trung bình khi thu hoạch (khác cỡ giống lúc nhập), chỉ mang tính tham khảo";

/** The short chip next to a product name ("Cỡ TB ~8–12 cm"); renders nothing for a product without a size. */
export function ProductSizeChip({ size, className }: { size: SizeCm; className?: string }) {
  const figure = sizeFigure(size.sizeMinCm, size.sizeMaxCm);
  if (!figure) return null;
  const short = figure.startsWith("~") ? figure : `~${figure}`;
  return <span className={className} title={SIZE_TITLE} style={{ display: "inline-block", fontSize: "0.75rem", lineHeight: 1.4, padding: "0 0.4rem", borderRadius: 999, background: "var(--color-surface-muted, #eef2f1)", color: "inherit", whiteSpace: "nowrap" }}>Cỡ bán TB {short}</span>;
}
