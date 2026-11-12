"use client";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { ErrorNotice, Field, businessToday, useMutation } from "@/features/operations/ui";
import { cycleView } from "./contracts";
import { CycleProductField } from "./cycle-product-field";
import { writeCycle } from "./repository";
export function CycleEditor({ raftId, raftCode, record, canCancel, onClose, onSaved }: { raftId: string; raftCode: string; record?: z.infer<typeof cycleView>; canCancel: boolean; onClose(): void; onSaved(): void }) {
  const initial = { startDate: record?.startDate ?? businessToday(), productId: record?.product?.id ?? "", expectedSeedQuantity: record?.expectedSeedQuantity == null ? "" : String(record.expectedSeedQuantity), expectedHarvestDate: record?.expectedHarvestDate ?? "", targetYieldKg: record?.targetYieldKg == null ? "" : String(record.targetYieldKg) };
  const [values, setValues] = useState(initial), [missing, setMissing] = useState(false), mutation = useMutation(), confirmation = useActionDialog();
  const dirty = JSON.stringify(initial) !== JSON.stringify(values);
  const close = async () => { if (!mutation.busy() && (!dirty || await confirmation.confirm("Bỏ các thay đổi chưa lưu?"))) onClose(); };
  const field = (key: keyof typeof values, value: string) => { setValues(current => ({ ...current, [key]: value })); if (key === "productId") setMissing(false); };
  // A cycle started before products were recorded may stay without one; every new cycle needs it.
  const productRequired = !record || !!record.product;
  return <Dialog open title={`${record ? "Sửa" : "Mở"} chu kỳ nuôi · ${raftCode}`} dismissible={!mutation.pending} onOpenChange={open => { if (!open) void close(); }}>{confirmation.dialog}<ErrorNotice error={mutation.error} />
    {mutation.blocked && <p role="alert" className="mb-4 text-sm">Hãy tải lại lịch sử và đối chiếu kết quả trước khi lập lượt lưu mới. Bản nháp hiện tại vẫn được giữ.</p>}
    <form onSubmit={async event => { event.preventDefault(); if (productRequired && !values.productId) { setMissing(true); return; } const result = await mutation.run(() => writeCycle(record ? "edit" : "start", record?.id ?? raftId, { startDate: values.startDate || null, productId: values.productId || null, expectedSeedQuantity: values.expectedSeedQuantity === "" ? null : Number(values.expectedSeedQuantity), expectedHarvestDate: values.expectedHarvestDate || null, targetYieldKg: values.targetYieldKg === "" ? null : Number(values.targetYieldKg), ...(record ? { rowVersion: record.rowVersion } : {}) })); if (result) onSaved(); }}>
      <fieldset disabled={mutation.pending || mutation.blocked} className="grid gap-4 sm:grid-cols-2">
        <Field label="Ngày bắt đầu" type="date" required max={businessToday()} value={values.startDate} onChange={e => field("startDate", e.target.value)} />
        <CycleProductField value={values.productId} current={record?.product} label={productRequired ? "Sản phẩm nuôi *" : "Sản phẩm nuôi"} error={missing ? "Chọn sản phẩm nuôi." : undefined} onChange={id => field("productId", id)} />
        <Field label="Lượng giống dự kiến" type="number" min="0.001" step="0.001" value={values.expectedSeedQuantity} onChange={e => field("expectedSeedQuantity", e.target.value)} />
        <Field label="Ngày thu hoạch dự kiến" type="date" value={values.expectedHarvestDate} onChange={e => field("expectedHarvestDate", e.target.value)} />
        <Field label="Sản lượng mục tiêu (kg)" type="number" min="0.01" step="0.01" value={values.targetYieldKg} onChange={e => field("targetYieldKg", e.target.value)} />
      </fieldset><div className="mt-6 flex flex-wrap gap-3"><Button className="w-auto" type="submit" disabled={mutation.blocked} isPending={mutation.pending}>Lưu chu kỳ</Button>
        {record && canCancel && <Button className="w-auto" type="button" variant="secondary" disabled={mutation.pending || mutation.blocked || dirty} onClick={async () => { if (await confirmation.confirm("Hủy chu kỳ được mở nhầm? Chỉ hủy được khi chu kỳ chưa có bản ghi nghiệp vụ.")) { const result = await mutation.run(() => writeCycle("cancel", record.id, { rowVersion: record.rowVersion })); if (result) onSaved(); } }}>Hủy chu kỳ</Button>}
        <Button className="w-auto" type="button" variant="secondary" disabled={mutation.pending} onClick={() => void close()}>Đóng</Button></div>
    </form></Dialog>;
}
