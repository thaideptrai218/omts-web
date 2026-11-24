"use client";
import { useId } from "react";
import { estimatedLoss, nurseryDraftNumber } from "./nursery-inventory";
import { quantityText } from "./contracts";

/** Survival percent of the pieces put into the nursery, as a horizontal slider tied to the pieces field. */
export function percentToPieces(percent: number, quantityIn: number, floor: number): number {
  const pieces = percent >= 100 ? quantityIn : Math.round(quantityIn * percent / 100);
  return Math.min(quantityIn, Math.max(floor, pieces));
}

export function NurserySurvivalSlider({ quantityIn, survivors, floor = 0, onSurvivorsChange }: { quantityIn: number; survivors: string; floor?: number; onSurvivorsChange(value: string): void }) {
  const id = useId(), count = nurseryDraftNumber(survivors), valid = quantityIn > 0 && Number.isFinite(count) && count >= 0 && count <= quantityIn;
  const percent = valid ? Math.min(100, Math.round(count / quantityIn * 1000) / 10) : 0;
  const minPercent = quantityIn > 0 ? Math.min(100, Math.ceil(floor / quantityIn * 100)) : 0;
  const loss = valid ? estimatedLoss(quantityIn, count) : undefined;
  if (quantityIn <= 0) return null;
  return <div className="space-y-1">
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <label htmlFor={id} className="font-medium">Tỷ lệ sống sót (ước tính)</label>
      <span role="status" className="tabular-nums"><strong>{valid ? `${percent.toLocaleString("vi-VN")}%` : "—"}</strong>
        <span className="text-text-muted">{valid ? ` · ${quantityText(count)} mảnh` : ""}</span></span>
    </div>
    <input id={id} type="range" min={minPercent} max={100} step={1} value={valid ? Math.max(minPercent, Math.round(percent)) : 0}
      aria-label="Tỷ lệ sống sót (ước tính)" aria-valuetext={valid ? `${percent}% (${quantityText(count)} mảnh)` : "chưa nhập"}
      className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
      style={{ background: `linear-gradient(to right, var(--omts-brand, var(--omts-color-primary)) ${valid ? percent : 0}%, var(--omts-color-surface-subtle, #e5eaf1) ${valid ? percent : 0}%)`, accentColor: "var(--omts-brand, var(--omts-color-primary))" }}
      onChange={event => onSurvivorsChange(String(percentToPieces(Number(event.target.value), quantityIn, floor)))} />
    <div className="flex justify-between text-xs text-text-muted"><span>{minPercent > 0 ? `${minPercent}% (đã thả)` : "0%"}</span>
      <span>{loss ? `Hao hụt ước tính ${loss.lossPercent.toLocaleString("vi-VN")}%` : ""}</span><span>100%</span></div>
  </div>;
}
