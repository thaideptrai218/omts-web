"use client";
import { UnitField } from "@/components/form/number-fields";

/** Enter this record's increment next to the W1 lane selection, never overwrite cumulative progress. */
export function RecordLanePercentFields({ lanes, values, onChange, kind, defaultValue, error }: {
  lanes: number[]; values: Record<string, string>; onChange(values: Record<string, string>): void;
  kind: "seeding" | "harvest"; defaultValue?: number; error?: string;
}) {
  if (!lanes.length) return null;
  return <fieldset className="min-w-0 space-y-2">
    <legend className="text-sm font-medium">{kind === "seeding" ? "% làn đạt (ước lượng)" : "Phần trăm thu thêm trong lần này"}</legend>
    {kind === "seeding" && <p className="text-xs text-text-muted">Ước lượng phần làn thả thêm trong lần này bằng mắt, độc lập với số mảnh. Mặc định 100%.</p>}
    {kind === "harvest" && <p className="text-xs text-text-muted">Để trống nếu chưa ghi %. Làn xác nhận thu xong sẽ đạt 100%. Phần trăm độc lập với số lồng.</p>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{lanes.map(lane => <UnitField key={`${kind}-percent-${lane}`} label={`Làn ${lane}`} unit="%" decimals={2} min={0.01} max={100}
      required={kind === "seeding" && defaultValue !== undefined} value={values[lane] ?? (defaultValue === undefined ? "" : String(defaultValue))} onChange={value => onChange({ ...values, [lane]: value })} />)}</div>
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
  </fieldset>;
}
