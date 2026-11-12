"use client";

import { useMemo, useState } from "react";
import type { z } from "zod";
import { UnitField } from "@/components/form/number-fields";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { harvestClosePreview, harvestSettings, harvestSettingsValues } from "@/features/cultivation-api/records-contracts";
import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";

const repository = createOperationsRepository("harvest");

/** Cooperative parameters stay in settings; the harvest form only reads their current values. */
export function HarvestSettingsPanel() {
  const owner = useApiWorkspace().identity.subjectType === "CooperativeOwner";
  return owner ? <OwnerHarvestSettings /> : <p role="status">Chỉ Chủ hợp tác xã được quản lý thiết lập thu hoạch.</p>;
}

function OwnerHarvestSettings() {
  const remote = useRemote(useMemo(() => (signal: AbortSignal) => repository.read("settings", {}, harvestSettings, signal), []));
  return <section id="harvest-settings" aria-label="Thiết lập thu hoạch" className="py-4">
    <ErrorNotice error={remote.error} />
    {remote.loading ? <Skeleton /> : remote.data
      ? <HarvestSettingsForm key={remote.data.rowVersion} record={remote.data} onReload={remote.reload} />
      : <Button type="button" variant="secondary" className="w-auto" onClick={remote.reload}>Tải lại thiết lập</Button>}
  </section>;
}

function HarvestSettingsForm({ record, onReload }: { record: z.infer<typeof harvestSettings>; onReload(): void }) {
  const { notify } = useToast();
  const [average, setAverage] = useState(String(record.averageKgPerCage));
  const [days, setDays] = useState(String(record.daysBeforeAutoClose));
  const [error, setError] = useState<string>();
  const dirty = average !== String(record.averageKgPerCage) || days !== String(record.daysBeforeAutoClose);
  const editor = useOperationEditor(onReload, dirty), preview = useMutation();

  async function save() {
    if (editor.disabled || preview.busy()) return;
    const parsed = harvestSettingsValues.safeParse({ averageKgPerCage: Number(average), daysBeforeAutoClose: Number(days), rowVersion: record.rowVersion });
    if (!parsed.success) {
      setError("Khối lượng mỗi lồng phải lớn hơn 0, tối đa 9.999.999,99 kg; thời hạn từ 1 đến 365 ngày.");
      return;
    }
    setError(undefined);
    const checked = await preview.run(() => repository.read("settings-preview", { days: String(parsed.data.daysBeforeAutoClose) }, harvestClosePreview), true);
    if (!checked) return;
    const message = checked.lowered
      ? `Giảm thời hạn còn ${checked.days} ngày. Có ${checked.lotCount} lô có thể bị đóng tại lần kiểm tra tự động tiếp theo. Lưu thiết lập?`
      : "Lưu thiết lập thu hoạch?";
    if (await editor.submit(message, () => repository.write("settings", parsed.data, harvestSettings))) {
      notify({ tone: "success", title: "Đã lưu thiết lập thu hoạch." });
      onReload();
    }
  }

  return <>{editor.dialog}
    <ErrorNotice error={error || preview.error || editor.mutation.error} />
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={editor.disabled || preview.pending} className="grid gap-4 sm:grid-cols-2">
        <UnitField label="Khối lượng trung bình mỗi lồng" unit="kg/lồng" decimals={2} required min={0.01} max={9999999.99} value={average} onChange={setAverage} />
        <UnitField label="Tự động đóng lô sau" unit="ngày" allowFraction={false} required min={1} max={365} value={days} onChange={setDays} />
      </fieldset>
      <p className="mt-3 text-xs text-text-muted">Khối lượng dùng để tính kg ước tính cho lượt thu mới. Giảm số ngày tự động đóng lô sẽ được xem trước và xác nhận khi lưu.</p>
      {editor.mutation.blocked && <p role="alert" className="mt-3 text-sm">Hãy tải lại thiết lập để đối chiếu kết quả trước khi lưu tiếp.</p>}
      <footer className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button type="button" className="w-auto" variant="secondary" disabled={editor.pending || preview.pending} onClick={() => void editor.close()}>Bỏ qua</Button>
        <Button type="submit" className="w-auto" disabled={!dirty || editor.disabled || preview.pending} isPending={editor.pending || preview.pending}>Lưu</Button>
      </footer>
    </form>
  </>;
}
