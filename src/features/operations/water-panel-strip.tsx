"use client";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import local from "./water-screen.module.css";

/** Toggles above the measurement list: the trend chart and the zone's alert thresholds open as sections over the table. */
export function WaterPanelStrip({ chartOpen, thresholdsOpen, note, onChart, onThresholds }: { chartOpen: boolean; thresholdsOpen: boolean; note?: string; onChart(): void; onThresholds(): void }) {
  return <div className={local.strip}>
    <button type="button" className={local.stripButton} aria-expanded={chartOpen} onClick={onChart}><InterfaceIcon name={chartOpen ? "chevron-down" : "chevron-right"} />Biểu đồ xu hướng</button>
    <button type="button" className={local.stripButton} aria-expanded={thresholdsOpen} onClick={onThresholds}><InterfaceIcon name={thresholdsOpen ? "chevron-down" : "chevron-right"} />Ngưỡng cảnh báo</button>
    {note && <span role="status">{note}</span>}
  </div>;
}
