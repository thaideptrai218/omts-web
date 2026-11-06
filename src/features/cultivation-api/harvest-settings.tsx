"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice, Field, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import { harvestSettings, harvestSettingsValues, harvestClosePreview } from "./records-contracts";
import type { z } from "zod";
const repo = createOperationsRepository("harvest");
export function HarvestSettings({ onClose }: { onClose(): void }) {
  const remote = useRemote(useMemo(() => (signal: AbortSignal) => repo.read("settings", {}, harvestSettings, signal), []));
  return <Dialog open dismissible={false} title="Quy đổi lồng và tự đóng lô" onOpenChange={() => {}}><p className="mb-4 text-sm text-text-muted">Thông số dùng chung cho hợp tác xã. Sau khi lưu, chọn “Ghi nhận chuyến thu hoạch” để tạo lô; thiết lập này không tạo chuyến thu hoạch.</p><ErrorNotice error={remote.error} />{remote.loading ? <Skeleton /> : remote.data ? <SettingsForm key={remote.data.rowVersion} record={remote.data} onClose={onClose} /> : <><Button variant="secondary" onClick={remote.reload}>Tải lại thiết lập</Button><Button variant="secondary" onClick={onClose}>Đóng</Button></>}</Dialog>;
}
function SettingsForm({ record, onClose }: { record: z.infer<typeof harvestSettings>; onClose(): void }) {
  const [average, setAverage] = useState(String(record.averageKgPerCage)), [days, setDays] = useState(String(record.daysBeforeAutoClose)), [error, setError] = useState<string>(), [saved, setSaved] = useState(false);
  const editor = useOperationEditor(onClose, !saved && (average !== String(record.averageKgPerCage) || days !== String(record.daysBeforeAutoClose))), preview = useMutation();
  async function save() {
    const values = harvestSettingsValues.safeParse({ averageKgPerCage: Number(average), daysBeforeAutoClose: Number(days), rowVersion: record.rowVersion });
    if (!values.success) { setError("Khối lượng mỗi lồng phải lớn hơn 0, tối đa 9.999.999,99 kg; thời hạn từ 1 đến 365 ngày."); return; }
    setError(undefined);
    const checked = await preview.run(() => repo.read("settings-preview", { days: String(values.data.daysBeforeAutoClose) }, harvestClosePreview), true);
    if (!checked) return;
    const message = checked.lowered ? `Giảm thời hạn còn ${checked.days} ngày. Có ${checked.lotCount} lô có thể bị đóng tại lần kiểm tra tự động tiếp theo. Lưu thiết lập?` : "Lưu thiết lập thu hoạch?";
    if (await editor.submit(message, () => repo.write("settings", values.data, harvestSettings))) { setSaved(true); onClose(); }
  }
  return <>{editor.dialog}<ErrorNotice error={error || preview.error || editor.mutation.error} /><form onSubmit={e => { e.preventDefault(); void save(); }}><fieldset disabled={editor.disabled || preview.pending} className="space-y-4"><Field label="Khối lượng trung bình mỗi lồng (kg) *" required type="number" min="0.01" max="9999999.99" step="0.01" value={average} onChange={e => setAverage(e.target.value)} /><Field label="Số ngày trước khi tự đóng lô *" required type="number" min={1} max={365} step={1} value={days} onChange={e => setDays(e.target.value)} /><p className="text-sm text-text-muted">Khối lượng quy đổi mới áp dụng cho lô ghi nhận sau này. Thời hạn tự đóng áp dụng cho các lô còn bán từ lần kiểm tra tiếp theo.</p><Button type="submit">Lưu thiết lập</Button></fieldset></form>{editor.mutation.blocked && <p role="alert" className="my-3 text-sm">Hãy đóng và đọc lại thiết lập để đối chiếu kết quả trước khi lưu tiếp.</p>}<Button className="mt-4" variant="secondary" disabled={editor.pending || preview.pending} onClick={() => void editor.close()}>Đóng</Button></>;
}
