"use client";
import { UnitField } from "@/components/form/number-fields";
import { laneRemainingMessage } from "./seeding-lane-remaining-percent";

/**
 * Enter this record's increment next to the W1 lane selection, never overwrite cumulative progress.
 * `remaining` (seeding only, new records): what is left per lane; a lane that already has part seeded shows it and refuses more.
 */
export function RecordLanePercentFields({ lanes, values, onChange, kind, defaultValue, remaining, error }: {
  lanes: number[]; values: Record<string, string>; onChange(values: Record<string, string>): void;
  kind: "seeding" | "harvest"; defaultValue?: number; remaining?: Readonly<Record<string, number>>; error?: string;
}) {
  if (!lanes.length) return null;
  return <fieldset className="min-w-0 space-y-2">
    <legend className="text-sm font-medium">{kind === "seeding" ? "% làn đạt (ước lượng)" : "Phần trăm thu thêm trong lần này"}</legend>
    {kind === "seeding" && <p className="text-xs text-text-muted">Ước lượng phần làn thả thêm trong lần này bằng mắt, độc lập với số mảnh. {remaining ? "Mặc định là phần còn lại của làn (100% trừ phần đã thả); có thể giảm nhưng không vượt phần còn lại." : "Mặc định 100%."}</p>}
    {kind === "harvest" && <p className="text-xs text-text-muted">Để trống nếu chưa ghi %. Làn xác nhận thu xong sẽ đạt 100%. Phần trăm độc lập với số lồng.</p>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{lanes.map(lane => {
      const left = remaining?.[String(lane)], typed = Number((values[lane] ?? "").replace(",", "."));
      return <UnitField key={`${kind}-percent-${lane}`} label={`Làn ${lane}`} unit="%" decimals={2} min={0.01} max={left !== undefined && left > 0 ? left : 100}
        required={kind === "seeding" && defaultValue !== undefined} value={values[lane] ?? (defaultValue === undefined ? "" : String(defaultValue))} onChange={value => onChange({ ...values, [lane]: value })}
        hint={left !== undefined && left < 100 ? `Còn ${left.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}% có thể thả` : undefined}
        error={left !== undefined && Number.isFinite(typed) && typed > left ? laneRemainingMessage(lane, left) : undefined} />;
    })}</div>
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
  </fieldset>;
}
