"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { createOperationsRepository } from "@/features/operations/repository";
import { UnitField } from "@/components/form/number-fields";
import { ErrorNotice, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { harvestSettings, harvestSettingsValues, harvestClosePreview } from "./records-contracts";
import type { z } from "zod";
const repo = createOperationsRepository("harvest");
export function HarvestSettings({ onClose }: { onClose(): void }) {
  const remote = useRemote(useMemo(() => (signal: AbortSignal) => repo.read("settings", {}, harvestSettings, signal), []));
  return <section aria-label="Quy đổi lồng và tự đóng lô"><h4 className="mb-3 font-semibold">Quy đổi lồng và tự đóng lô</h4><ErrorNotice error={remote.error} />{remote.loading ? <Skeleton /> : remote.data ? <SettingsForm key={remote.data.rowVersion} record={remote.data} onClose={onClose} /> : <><Button type="button" variant="secondary" onClick={remote.reload}>Tải lại thiết lập</Button><Button type="button" variant="secondary" onClick={onClose}>Đóng</Button></>}</section>;
}
function SettingsForm({ record, onClose }: { record: z.infer<typeof harvestSettings>; onClose(): void }) {
  const { notify } = useToast();
  const [average, setAverage] = useState(String(record.averageKgPerCage)), [days, setDays] = useState(String(record.daysBeforeAutoClose)), [error, setError] = useState<string>(), [saved, setSaved] = useState(false);
  const editor = useOperationEditor(onClose, !saved && (average !== String(record.averageKgPerCage) || days !== String(record.daysBeforeAutoClose))), preview = useMutation();
  async function save() {
    const values = harvestSettingsValues.safeParse({ averageKgPerCage: Number(average), daysBeforeAutoClose: Number(days), rowVersion: record.rowVersion });
    if (!values.success) { setError("Khối lượng mỗi lồng phải lớn hơn 0, tối đa 9.999.999,99 kg; thời hạn từ 1 đến 365 ngày."); return; }
    setError(undefined);
    const checked = await preview.run(() => repo.read("settings-preview", { days: String(values.data.daysBeforeAutoClose) }, harvestClosePreview), true);
    if (!checked) return;
    const message = checked.lowered ? `Giảm thời hạn còn ${checked.days} ngày. Có ${checked.lotCount} lô có thể bị đóng tại lần kiểm tra tự động tiếp theo. Lưu thiết lập?` : "Lưu thiết lập thu hoạch?";
    if (await editor.submit(message, () => repo.write("settings", values.data, harvestSettings))) { setSaved(true); notify({ tone: "success", title: "Đã lưu thiết lập thu hoạch." }); onClose(); }
  }
  return <>{editor.dialog}<ErrorNotice error={error || preview.error || editor.mutation.error} /><form onSubmit={e => { e.preventDefault(); void save(); }}><fieldset disabled={editor.disabled || preview.pending} className="space-y-4"><UnitField key="settings-kg-per-cage" label="Khối lượng trung bình mỗi lồng *" unit="kg/lồng" decimals={2} required min={0.01} max={9999999.99} value={average} onChange={setAverage} /><UnitField key="settings-auto-close-days" label="Số ngày trước khi tự đóng lô *" unit="ngày" allowFraction={false} required min={1} max={365} value={days} onChange={setDays} /><div className="flex justify-end gap-2"><Button key="discard-settings" type="button" variant="secondary" disabled={editor.pending || preview.pending} onClick={() => void editor.close()}>Bỏ qua</Button><Button key="save-settings" type="submit">Lưu</Button></div></fieldset></form>{editor.mutation.blocked && <p role="alert" className="my-3 text-sm">Hãy đóng và đọc lại thiết lập để đối chiếu kết quả trước khi lưu tiếp.</p>}</>;
}
