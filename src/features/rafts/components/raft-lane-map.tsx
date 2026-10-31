"use client";

import { useState } from "react";
import type {
  LaneCondition,
  LanePortion,
  LaneState,
  RaftEvent,
} from "../domain/raft";
import { RaftSourceDialog } from "./raft-source-dialog";

const states: Record<LaneState, { label: string; color: string }> = {
  unseeded: { label: "Chưa gieo", color: "bg-border" },
  growing: { label: "Đang nuôi", color: "bg-primary" },
  harvested: { label: "Đã thu hoạch", color: "bg-success" },
  "written-off": { label: "Hao hụt", color: "bg-danger" },
};
type Selection = {
  laneNumber: number;
  from: number;
  to: number;
  sources: readonly RaftEvent[];
};
function metres(value: number) {
  return value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}
function portionLabel(portion: LanePortion) {
  return `${metres(portion.from)}–${metres(portion.to)} m: ${states[portion.state].label}`;
}

export function RaftLaneMap({ lanes }: { lanes: readonly LaneCondition[] }) {
  const [selected, setSelected] = useState<Selection>();
  return (
    <section aria-label="Sơ đồ làn nuôi" className="mt-5">
      <ul
        className="mb-5 flex flex-wrap gap-x-5 gap-y-3 text-sm"
        aria-label="Chú giải sơ đồ"
      >
        {Object.entries(states).map(([key, state]) => (
          <li key={key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`size-3 rounded-sm ${state.color}`}
            />
            {state.label}
          </li>
        ))}
      </ul>
      <div className="space-y-6">
        {lanes.map((lane) => (
          <section
            key={lane.number}
            aria-label={`Làn ${lane.number}`}
            className="min-w-0 border-t border-border pt-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold">Làn {lane.number}</h4>
              <span className="text-sm tabular-nums text-text-muted">
                {metres(lane.length)} m
              </span>
            </div>
            <div className="mt-2 flex justify-between gap-4 text-xs text-text-muted">
              <span className="max-w-[45%] break-words">A: {lane.markerA}</span>
              <span className="max-w-[45%] break-words text-right">
                B: {lane.markerB}
              </span>
            </div>
            <div
              className="mt-2 flex min-h-12 w-full min-w-0 overflow-hidden rounded-lg border border-border"
              aria-label={`Các đoạn làn ${lane.number}`}
            >
              {lane.portions.map((portion) => (
                <button
                  key={`${portion.from}-${portion.to}`}
                  type="button"
                  style={{ flexGrow: portion.to - portion.from, flexBasis: 0 }}
                  className={`relative min-h-12 min-w-0 border-r border-surface/60 last:border-r-0 hover:brightness-110 ${states[portion.state].color}`}
                  title={portionLabel(portion)}
                  aria-label={`Làn ${lane.number}, ${portionLabel(portion)}`}
                  onClick={() =>
                    setSelected({ laneNumber: lane.number, ...portion })
                  }
                >
                  <span className="sr-only">{portionLabel(portion)}</span>
                </button>
              ))}
            </div>
            <div
              className="mt-2 flex flex-wrap gap-2"
              aria-label={`Chi tiết các đoạn làn ${lane.number}`}
            >
              {lane.portions.map((portion) => (
                <button
                  type="button"
                  key={portion.from}
                  onClick={() =>
                    setSelected({ laneNumber: lane.number, ...portion })
                  }
                  className="min-h-11 max-w-full rounded-control px-2 text-left text-xs tabular-nums text-text-muted hover:bg-primary-soft hover:text-primary"
                >
                  {portionLabel(portion)}
                </button>
              ))}
            </div>
            {lane.planned.length > 0 && (
              <div className="mt-3 border-l-2 border-dashed border-info pl-3">
                <p className="text-xs font-semibold text-info">
                  Dự kiến thu hoạch
                </p>
                {lane.planned.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className="min-h-11 text-left text-sm text-info hover:underline"
                    onClick={() => setSelected({ ...event, sources: [event] })}
                  >
                    {metres(event.from)}–{metres(event.to)} m — Xem kế hoạch
                  </button>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
      {selected && (
        <RaftSourceDialog
          {...selected}
          onClose={() => setSelected(undefined)}
        />
      )}
    </section>
  );
}
