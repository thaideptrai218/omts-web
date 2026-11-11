"use client";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { Facts, TabFooter } from "@/features/farming-management/detail-parts";
import styles from "@/features/farming-management/farming-management.module.css";
import * as c from "./contracts";
import { loadOptions } from "./lookups";
import { ErrorNotice, displayTime, statusLabel, useMutation, useRemote } from "./ui";
import { CORRECTION_INVALID, correctionBody, draftOf, type WaterDraft } from "./water-correction-model";
import { againstThreshold } from "./water-history-model";
import { WaterEditFields } from "./water-measurement-edit-fields";
import { formatMeasuredValue, waterRepository } from "./water-measurement-shared";
import { WaterReviewNotice } from "./water-review-notice";
import local from "./water-screen.module.css";

const IN_USE_RAFT = "101";
const range = (min: number | null, max: number | null) => min === null && max === null ? "Chưa đặt" : `${min ?? "—"} – ${max ?? "—"}`;
const VERDICT = { none: "Chưa đặt ngưỡng", ok: "Trong ngưỡng", low: "Thấp hơn ngưỡng", high: "Cao hơn ngưỡng" } as const;

/** Values of the record against the thresholds it was judged with (the thresholds in force when it was recorded). */
function ThresholdsUsed({ record }: { record: c.WaterMeasurement }) {
  const { thresholdsUsed: t } = record;
  const rows = [["pH", record.ph, t.phMin, t.phMax], ["Độ mặn (‰)", record.salinity, t.salinityMin, t.salinityMax], ["Nhiệt độ (°C)", record.temperature, t.temperatureMin, t.temperatureMax]] as const;
  return <table className={`${styles.subTable} ${local.thresholdTable}`}>
    <caption className="sr-only">Giá trị và ngưỡng đã dùng khi ghi phép đo</caption>
    <thead><tr><th scope="col">Chỉ số</th><th scope="col" className={styles.number}>Đã ghi</th><th scope="col">Ngưỡng đã dùng</th><th scope="col">Đánh giá</th></tr></thead>
    <tbody>{rows.map(([label, value, min, max]) => {
      const verdict = againstThreshold(value, min, max);
      return <tr key={label}><th scope="row">{label}</th><td className={styles.number}>{formatMeasuredValue(value)}</td><td>{range(min, max)}</td>
        <td className={verdict === "low" || verdict === "high" ? local.outside : undefined}>{VERDICT[verdict]}</td></tr>;
    })}</tbody>
  </table>;
}

/** "Thông tin": the measurement and its thresholds; `Hiệu chỉnh` turns the facts into inputs with `Bỏ qua` / `Lưu` in the footer. */
export function WaterMeasurementInfoTab({ record, zoneName, canChange, busy, dirtyRef, onSaved, onReload, onVoid }: {
  record: c.WaterMeasurement; zoneName: string; canChange: boolean; busy: boolean; dirtyRef: RefObject<boolean>;
  onSaved(record: c.WaterMeasurement): void; onReload(): void; onVoid(): void;
}) {
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState<WaterDraft>(() => draftOf(record));
  const [problem, setProblem] = useState<string>(), [reloaded, setReloaded] = useState(false);
  const mutation = useMutation();
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(draftOf(record));
  useEffect(() => { dirtyRef.current = dirty; return () => { dirtyRef.current = false; }; }, [dirty, dirtyRef]);
  const rafts = useRemote(useCallback((signal: AbortSignal) => editing
    ? loadOptions("rafts", signal, { zoneId: record.zoneId, statusId: IN_USE_RAFT })
    : Promise.resolve({ status: "success" as const, data: [] }), [editing, record.zoneId]));
  const raftOptions = (rafts.data ?? []).map(raft => ({ id: raft.id, code: String(raft.code) }));
  if (!raftOptions.some(raft => raft.id === record.raftId)) raftOptions.unshift({ id: record.raftId, code: record.raftCode });
  const locked = busy || mutation.pending;

  function begin() { setDraft(draftOf(record)); setProblem(undefined); setReloaded(false); mutation.reviewed(); setEditing(true); }
  function cancel() { if (mutation.busy()) return; setEditing(false); setProblem(undefined); mutation.reviewed(); }
  async function save() {
    if (!editing || mutation.busy() || mutation.blocked || busy) return;
    const body = correctionBody(draft);
    setProblem(body ? undefined : CORRECTION_INVALID);
    if (!body) return;
    const result = await mutation.run(() => waterRepository.write("correct", body, c.waterSchema, record.id));
    if (!result) return;
    setEditing(false);
    onSaved(result);
  }

  return <form noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
    {record.violatedValues && !editing && <p role="alert" className={local.alertLine}>Vượt ngưỡng: {record.violatedValues}</p>}
    <fieldset disabled={locked || mutation.blocked} className="min-w-0 border-0 p-0">
      {editing ? <WaterEditFields draft={draft} setDraft={setDraft} rafts={raftOptions} /> : <>
        <Facts items={[["Thời điểm đo", displayTime(record.measuredAt)], ["Vùng nuôi", zoneName || record.zoneName], ["Bè đo", record.raftCode], ["Người ghi", record.measuredBy?.name],
          ["Trạng thái", statusLabel(record.statusCode)], ["Cảnh báo", statusLabel(record.alertState)], ["Lý do hủy", record.voidReason]]} />
        <ThresholdsUsed record={record} />
      </>}
    </fieldset>
    <ErrorNotice error={problem ?? rafts.error ?? mutation.error} />
    {mutation.blocked && <WaterReviewNotice reloadLabel="Tải phép đo mới để đối chiếu" text="Chưa xác nhận được kết quả lưu. Hãy tải phép đo mới để đối chiếu; nội dung đang nhập vẫn được giữ." reloaded={reloaded} busy={busy} canContinue={!mutation.uncertain}
      onReload={() => { onReload(); setReloaded(true); }} onReviewed={() => { mutation.reviewed(); setReloaded(false); }} reviewedLabel="Đã đối chiếu, tiếp tục sửa" />}
    {canChange && <TabFooter
      left={!editing && <Button key="void" type="button" className="w-auto" variant="ghost" disabled={locked} onClick={onVoid}><InterfaceIcon name="trash" className="size-4" />Hủy bỏ phép đo</Button>}
      right={editing
        ? <><Button key="cancel" type="button" className="w-auto" variant="secondary" disabled={mutation.pending} onClick={cancel}>Bỏ qua</Button>
          <Button key="save" type="submit" className="w-auto" disabled={busy || mutation.blocked} isPending={mutation.pending}>Lưu</Button></>
        : <Button key="edit" type="button" className="w-auto" disabled={locked} onClick={begin}><InterfaceIcon name="pencil" className="size-4" />Hiệu chỉnh</Button>} />}
  </form>;
}
