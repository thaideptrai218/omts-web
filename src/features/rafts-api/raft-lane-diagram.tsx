"use client";
type Lane = { laneNumber: number; lineLengthM?: number | null; statusId?: number; isDamaged?: boolean; isOutOfService?: boolean };
/** Two ropes bound the boat passage; lane numbers always come from the stored layout. */
export function RaftLaneDiagram({ lanes, length }: { lanes: readonly Lane[]; length?: number }) {
  if (!lanes.length) return null;
  return <div role="group" aria-label="Sơ đồ làn" className="my-3 max-h-64 space-y-2 overflow-y-auto rounded border border-border p-3">
    {lanes.map(lane => {
      const stopped = lane.statusId === 2002 || lane.isOutOfService === true, value = lane.lineLengthM ?? length;
      return <div key={lane.laneNumber} className="flex items-center gap-3 text-xs">
        <span className="w-12 shrink-0">Làn {lane.laneNumber}</span>
        {(stopped || lane.isDamaged) && <span className="shrink-0">{stopped ? "Ngừng hoạt động" : "Hỏng"}</span>}
        <div className="min-w-0 flex-1"><div style={{ width: value && length ? `${Math.min(100, value / length * 100)}%` : "100%" }}
          className={`flex h-6 items-center justify-center border-y-2 ${stopped ? "border-dashed border-gray-400 bg-gray-100" : lane.isDamaged ? "border-red-600 bg-red-50" : "border-current text-primary"}`}>
          <span className="truncate">Lối thuyền</span>
        </div></div><span className="shrink-0">{value == null ? "—" : `${value.toLocaleString("vi-VN")} m`}</span>
      </div>;
    })}
  </div>;
}
