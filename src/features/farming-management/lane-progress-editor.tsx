"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { ErrorNotice, Field, Note, useMutation } from "@/features/operations/ui";
import { laneProgressValues, type LaneProgressMetadata } from "./lane-progress-contracts";
import { laneProgressDisplay } from "./lane-progress-display";
import { laneProgressRepository, type LaneProgressTarget } from "./lane-progress-repository";
import type { LaneOverviewItem } from "./lane-overview";

export function LaneProgressEditor({ lane, target, rowVersion, canEdit, onChanged, onStateChange, onUnsupported }: {
  lane: LaneOverviewItem; target: LaneProgressTarget; rowVersion?: string; canEdit: boolean; onChanged(saved?: LaneProgressMetadata): void;
  onStateChange?(state: { dirty: boolean; pending: boolean }): void;
  onUnsupported?(): void;
}) {
  const display = laneProgressDisplay(lane), mutation = useMutation(), { notify } = useToast();
  const [seeded, setSeeded] = useState(String(display.seededPercent)), [harvested, setHarvested] = useState(display.harvestedPercent === null ? "" : String(display.harvestedPercent));
  const [reason, setReason] = useState(""), [error, setError] = useState<string>(), [unavailable, setUnavailable] = useState(false);
  const dirty = canEdit && !unavailable && (seeded !== String(display.seededPercent) || harvested !== (display.harvestedPercent === null ? "" : String(display.harvestedPercent)) || !!reason);
  useEffect(() => { onStateChange?.({ dirty, pending: mutation.pending }); return () => onStateChange?.({ dirty: false, pending: false }); }, [dirty, mutation.pending, onStateChange]);
  async function save() {
    if (mutation.busy() || mutation.blocked || !rowVersion || !canEdit) return;
    const values = laneProgressValues.safeParse({ ...(seeded.trim() ? { seededPercent: Number(seeded) } : {}),
      ...(harvested.trim() ? { harvestedPercent: Number(harvested) } : {}), reason, rowVersion });
    if (!values.success) { setError("Nhập % từ 0 đến 100 và lý do điều chỉnh (tối đa 500 ký tự)."); return; }
    setError(undefined);
    const saved = await mutation.run(async () => {
      const result = await laneProgressRepository.save(target, values.data);
      if (result.status === "error" && [404, 405].includes(result.httpStatus)) { setUnavailable(true); onUnsupported?.(); }
      return result;
    });
    if (!saved) return;
    notify({ tone: "success", title: `Đã lưu tiến độ làn ${lane.laneNumber}.` }); onChanged(saved);
  }
  return <section aria-label={`Tiến độ làn ${lane.laneNumber}`} className="space-y-2 text-xs">
    {canEdit && rowVersion && !unavailable && <>
      <fieldset className="grid grid-cols-2 gap-x-2 gap-y-2" disabled={mutation.pending || mutation.blocked}>
        <Field label="% đã thả" type="number" inputMode="decimal" min={0} max={100} step="any" value={seeded} onChange={event => setSeeded(event.target.value)} />
        <Field label="% đã thu" type="number" inputMode="decimal" min={0} max={100} step="any" placeholder="Chưa ghi %" value={harvested} onChange={event => setHarvested(event.target.value)} />
        <div className="col-span-2"><Note label="Lý do điều chỉnh *" required maxLength={500} rows={2} value={reason} onChange={event => setReason(event.target.value)} disabled={mutation.pending || mutation.blocked} /></div>
      </fieldset>
      <ErrorNotice error={error || mutation.error} />
      {mutation.blocked && <p role="alert">Tải lại làn để đối chiếu kết quả trước khi lưu tiếp.</p>}
      <div className="flex flex-wrap justify-end gap-2">
        {!mutation.blocked && <Button key="discard-progress" type="button" variant="secondary" className="w-auto" disabled={mutation.pending || !dirty} onClick={() => { setSeeded(String(display.seededPercent)); setHarvested(display.harvestedPercent === null ? "" : String(display.harvestedPercent)); setReason(""); setError(undefined); }}>Bỏ thay đổi %</Button>}
        <Button key="reload-progress" type="button" variant="secondary" className="w-auto" disabled={mutation.pending} onClick={() => onChanged()}>Tải lại làn</Button><Button key="save-progress" type="button" className="w-auto" isPending={mutation.pending} disabled={mutation.blocked || !dirty} onClick={() => void save()}>Lưu %</Button>
      </div>
    </>}
    <p className="text-text-muted">Người sửa gần nhất: {lane.lastModifiedByName ?? "Chưa ghi nhận"}{lane.lastModifiedAt && ` · ${new Date(lane.lastModifiedAt).toLocaleString("vi-VN")}`}</p>
  </section>;
}
