"use client";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import { Dialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { UnitField } from "@/components/form/number-fields";
import { ErrorNotice, Field, businessToday, useMutation } from "@/features/operations/ui";
import { cycleView } from "./contracts";
import { writeCycle } from "./repository";
/** `seedUnit` is the catalogue unit of the seed when known (e.g. "mảnh"); the plan is the cycle's own estimate, never billed. */
export function CycleEditor({ raftId, raftCode, record, canCancel, seedUnit, onClose, onSaved }: { raftId: string; raftCode: string; record?: z.infer<typeof cycleView>; canCancel: boolean; seedUnit?: string; onClose(): void; onSaved(): void }) {
  const initial = { startDate: record?.startDate ?? businessToday(), expectedSeedQuantity: record?.expectedSeedQuantity == null ? "" : String(record.expectedSeedQuantity), expectedHarvestDate: record?.expectedHarvestDate ?? "", targetYieldKg: record?.targetYieldKg == null ? "" : String(record.targetYieldKg) };
  const [values, setValues] = useState(initial), mutation = useMutation(), confirmation = useActionDialog();
  const dirty = JSON.stringify(initial) !== JSON.stringify(values);
  const close = async () => { if (!mutation.busy() && (!dirty || await confirmation.confirm("Bỏ các thay đổi chưa lưu?"))) onClose(); };
  const field = (key: keyof typeof values, value: string) => setValues(current => ({ ...current, [key]: value }));
  return <Dialog open title={`${record ? "Sửa" : "Mở"} chu kỳ nuôi · ${raftCode}`} dismissible={!mutation.pending} onOpenChange={open => { if (!open) void close(); }}>{confirmation.dialog}<ErrorNotice error={mutation.error} />
    {mutation.blocked && <p role="alert" className="mb-4 text-sm">Hãy tải lại lịch sử và đối chiếu kết quả trước khi lập lượt lưu mới. Bản nháp hiện tại vẫn được giữ.</p>}
    <form onSubmit={async event => { event.preventDefault(); const result = await mutation.run(() => writeCycle(record ? "edit" : "start", record?.id ?? raftId, { startDate: values.startDate || null, expectedSeedQuantity: values.expectedSeedQuantity === "" ? null : Number(values.expectedSeedQuantity), expectedHarvestDate: values.expectedHarvestDate || null, targetYieldKg: values.targetYieldKg === "" ? null : Number(values.targetYieldKg), ...(record ? { rowVersion: record.rowVersion } : {}) })); if (result) onSaved(); }}>
      <fieldset disabled={mutation.pending || mutation.blocked} className="space-y-3">
        <CollapsibleSection title="Thời gian" description="Ngày bắt đầu và ngày thu hoạch dự kiến." columns={2}>
        <Field label="Ngày bắt đầu" type="date" required max={businessToday()} value={values.startDate} onChange={e => field("startDate", e.target.value)} />
        <Field label="Ngày thu hoạch dự kiến" type="date" value={values.expectedHarvestDate} onChange={e => field("expectedHarvestDate", e.target.value)} />
        </CollapsibleSection>
        <CollapsibleSection title="Kế hoạch" description="Lượng giống và sản lượng mục tiêu của chu kỳ." columns={2}>
        <UnitField key="plan-seed" label="Lượng giống dự kiến" unit={seedUnit ?? "giống"} decimals={3} min={0.001} value={values.expectedSeedQuantity} onChange={value => field("expectedSeedQuantity", value)} />
        <UnitField key="plan-target-kg" label="Sản lượng mục tiêu (ước tính)" unit="kg" decimals={2} min={0.01} value={values.targetYieldKg} onChange={value => field("targetYieldKg", value)} />
        </CollapsibleSection>
      </fieldset><div className="mt-6 flex flex-wrap justify-end gap-3">
        {record && canCancel && <Button className="w-auto" type="button" variant="secondary" disabled={mutation.pending || mutation.blocked || dirty} onClick={async () => { if (await confirmation.confirm("Hủy chu kỳ được mở nhầm? Chỉ hủy được khi chu kỳ chưa có bản ghi nghiệp vụ.")) { const result = await mutation.run(() => writeCycle("cancel", record.id, { rowVersion: record.rowVersion })); if (result) onSaved(); } }}>Hủy chu kỳ</Button>}
        <Button key="discard-cycle" className="w-auto" type="button" variant="secondary" disabled={mutation.pending} onClick={() => void close()}>Bỏ qua</Button><Button key="save-cycle" className="w-auto" type="submit" disabled={mutation.blocked} isPending={mutation.pending}>Lưu</Button></div>
    </form></Dialog>;
}
