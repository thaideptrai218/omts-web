import { approxKgText } from "@/shared/format/approx-kg";

/** The approximate kg of a cage count ("≈ 450 kg") in muted text; renders nothing when the kg per cage is unknown. */
export function ApproxKg({ cages, kgPerCage, className }: { cages: number | null | undefined; kgPerCage: number | null | undefined; className?: string }) {
  const text = approxKgText(cages, kgPerCage);
  return text ? <span className={className} style={{ color: "var(--omts-color-text-muted)", fontSize: 12, whiteSpace: "nowrap" }}>{text}</span> : null;
}
