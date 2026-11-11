"use client";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import * as c from "./contracts";
import { ErrorNotice, Field, Skeleton, useMutation } from "./ui";
import { waterRepository as repository, type WaterZoneThresholds } from "./water-measurement-shared";
import { WaterReviewNotice } from "./water-review-notice";
import local from "./water-screen.module.css";

// Grouped by indicator (min then max), so one column of the grid is one indicator.
const FIELDS = [
  ["phMin", "pH tối thiểu", "14"], ["phMax", "pH tối đa", "14"],
  ["salinityMin", "Độ mặn tối thiểu (‰)", "100"], ["salinityMax", "Độ mặn tối đa (‰)", "100"],
  ["temperatureMin", "Nhiệt độ tối thiểu (°C)", "100"], ["temperatureMax", "Nhiệt độ tối đa (°C)", "100"],
] as const;
type Values = Record<(typeof FIELDS)[number][0], string>;
const toValues = (thresholds: WaterZoneThresholds["thresholds"]): Values => Object.fromEntries(FIELDS.map(([key]) => [key, thresholds[key] == null ? "" : String(thresholds[key])])) as Values;
const rangeText = (min: number | null, max: number | null) => min === null && max === null ? "chưa đặt" : `${min ?? "—"} – ${max ?? "—"}`;

/** "Ngưỡng cảnh báo" of the chosen zone, edited in place: the owner changes it with `Bỏ qua` / `Lưu`, everyone else reads it. */
export function WaterThresholdPanel({ zoneId, owner, dirtyRef, onSaved }: { zoneId: string; owner: boolean; dirtyRef: RefObject<boolean>; onSaved(notice: string): void }) {
  const remote = useStickyRemote(useCallback((signal: AbortSignal) => repository.read("thresholds", { zoneId }, c.zoneThresholdsSchema, signal), [zoneId]));
  const [revision, setRevision] = useState(0);
  if (!remote.data) return remote.error
    ? <ListStateMessage error={remote.error} onRetry={remote.reload} retryLabel="Tải lại ngưỡng" />
    : <Skeleton />;
  return <ThresholdForm key={revision} record={remote.data} owner={owner} dirtyRef={dirtyRef} reload={remote.reload}
    onSaved={(notice, next) => { if (next) remote.replace(next); else remote.reload(); setRevision(value => value + 1); onSaved(notice); }} />;
}

function ThresholdForm({ record, owner, dirtyRef, reload, onSaved }: {
  record: WaterZoneThresholds; owner: boolean; dirtyRef: RefObject<boolean>; reload(): void; onSaved(notice: string, next?: WaterZoneThresholds): void;
}) {
  const confirmation = useActionDialog(), mutation = useMutation();
  const [initial] = useState(() => toValues(record.thresholds)), [values, setValues] = useState(initial);
  const [allZones, setAllZones] = useState(false), [problem, setProblem] = useState<string>(), [latest, setLatest] = useState<WaterZoneThresholds[]>();
  const dirty = JSON.stringify(values) !== JSON.stringify(initial) || allZones;
  useEffect(() => { dirtyRef.current = dirty; return () => { dirtyRef.current = false; }; }, [dirty, dirtyRef]);

  async function save() {
    if (mutation.busy() || mutation.blocked) return;
    // An omitted pair is cleared by the backend, so all six keys are always sent (empty text becomes null).
    const body = Object.fromEntries(FIELDS.map(([key]) => [key, values[key] === "" ? null : Number(values[key])]));
    if (!c.setThresholdsSchema.safeParse(body).success) { setProblem("Mỗi chỉ số cần đủ hai ngưỡng hoặc để trống cả hai; tối thiểu phải nhỏ hơn tối đa."); return; }
    setProblem(undefined);
    if (allZones && !await confirmation.confirm("Áp dụng các ngưỡng này cho tất cả vùng đang dùng?")) return;
    const result = await mutation.run(() => repository.write<WaterZoneThresholds | WaterZoneThresholds[]>("set-thresholds", body, allZones ? z.array(c.zoneThresholdsSchema) : c.zoneThresholdsSchema, undefined, allZones ? undefined : record.zoneId));
    if (!result) return;
    const own = Array.isArray(result) ? result.find(row => row.zoneId === record.zoneId) : result;
    onSaved(allZones ? "Đã lưu ngưỡng cho tất cả vùng. Ngưỡng mới áp dụng cho các phép đo ghi sau đó." : "Đã lưu ngưỡng cảnh báo. Ngưỡng mới áp dụng cho các phép đo ghi sau đó.", own);
  }
  async function review() {
    const result = await mutation.run(async () => {
      if (allZones) return repository.read("thresholds", {}, z.array(c.zoneThresholdsSchema));
      const response = await repository.read("thresholds", { zoneId: record.zoneId }, c.zoneThresholdsSchema);
      return response.status === "success" ? { status: "success" as const, data: [response.data] } : response;
    }, true);
    if (result) setLatest(result);
  }

  return <form noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
    {confirmation.dialog}
    <p className={local.hint}>Ngưỡng của {record.zoneName}. Ngưỡng mới chỉ áp dụng cho phép đo ghi sau khi lưu; phép đo và cảnh báo cũ giữ ngưỡng đã dùng.{!owner && " Chỉ Chủ hợp tác xã được thay đổi ngưỡng."}</p>
    <fieldset disabled={!owner || mutation.pending || mutation.blocked} className="min-w-0 border-0 p-0">
      <div className={local.thresholdGrid}>
        {FIELDS.map(([key, label, max]) => <Field key={key} label={label} type="number" min="0" max={max} step="0.01" value={values[key]} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} />)}
      </div>
      {owner && <label className={local.check}><input type="checkbox" checked={allZones} onChange={event => setAllZones(event.target.checked)} />Áp dụng cho tất cả vùng đang sử dụng</label>}
    </fieldset>
    <ErrorNotice error={problem ?? mutation.error} />
    {mutation.blocked && <WaterReviewNotice text="Chưa xác nhận được kết quả lưu. Hãy tải ngưỡng hiện tại để đối chiếu; nội dung đang nhập vẫn được giữ." reloadLabel="Tải ngưỡng hiện tại để đối chiếu" reloaded={!!latest} busy={mutation.pending} canContinue={!mutation.uncertain}
      onReload={() => void review()} onReviewed={() => { mutation.reviewed(); setLatest(undefined); reload(); }} reviewedLabel="Đã đối chiếu, tiếp tục sửa" />}
    {latest && mutation.blocked && <ul className={local.hint}>{latest.map(row => <li key={row.zoneId}>{row.zoneName}: pH {rangeText(row.thresholds.phMin, row.thresholds.phMax)} · độ mặn {rangeText(row.thresholds.salinityMin, row.thresholds.salinityMax)} · nhiệt độ {rangeText(row.thresholds.temperatureMin, row.thresholds.temperatureMax)}</li>)}</ul>}
    {owner && <TabFooter right={<>
      <Button key="cancel" type="button" className="w-auto" variant="secondary" disabled={!dirty || mutation.pending} onClick={() => { setValues(initial); setAllZones(false); setProblem(undefined); }}>Bỏ qua</Button>
      <Button key="save" type="submit" className="w-auto" disabled={!dirty || mutation.blocked} isPending={mutation.pending}>Lưu</Button></>} />}
  </form>;
}
