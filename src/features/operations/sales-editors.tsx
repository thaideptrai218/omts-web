"use client";
import { useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { createOperationsRepository } from "./repository";
import * as c from "./new-module-contracts";
import { ErrorNotice, Field, Note } from "./ui";
import { useOperationEditor } from "./use-operation-editor";

const products = createOperationsRepository("sales-products");
type Product = z.infer<typeof c.salesProductSchema>;

export function ProductEditor({ record, onClose, onSaved }: { record: Product | null; onClose(): void; onSaved(): void }) {
  const [initial] = useState(() => ({ code: record?.code ?? "", name: record?.name ?? "", description: record?.description ?? "", inUse: record?.inUse ?? true }));
  const [values, setValues] = useState(initial), [error, setError] = useState<string>(), [latest, setLatest] = useState<Product>();
  const baseline = useRef(record), editor = useOperationEditor(onClose, JSON.stringify(values) !== JSON.stringify(initial));
  async function save() {
    const payload = c.saveProductSchema.safeParse({ ...values, description: values.description || null, rowVersion: baseline.current?.rowVersion ?? null });
    if (!payload.success) { setError("Hãy kiểm tra mã, tên và mô tả sản phẩm."); return; }
    setError(undefined);
    const saved = await editor.submit(`Lưu sản phẩm ${values.name} với trạng thái ${values.inUse ? "đang dùng" : "ngừng dùng"}?`, () => products.write(record ? "update" : "create", payload.data, c.salesProductSchema, record?.id));
    if (saved) onSaved();
  }
  return <Dialog open title={record ? `Sản phẩm ${record.code}` : "Thêm sản phẩm bán"} dismissible={!editor.pending} onOpenChange={(open) => { if (!open) void editor.close(); }}>{editor.dialog}<ErrorNotice error={error || editor.mutation.error} />
    <form onSubmit={(e) => { e.preventDefault(); void save(); }}><fieldset disabled={editor.disabled} className="space-y-4"><Field label="Mã sản phẩm *" required maxLength={50} value={values.code} onChange={(e) => setValues({ ...values, code: e.target.value })} />
      <Field label="Tên sản phẩm *" required maxLength={200} value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} /><Note label="Mô tả" maxLength={2000} value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} />
      <label className="flex gap-3"><input type="checkbox" checked={values.inUse} onChange={(e) => setValues({ ...values, inUse: e.target.checked })} />Đang dùng</label><Button type="submit">Lưu sản phẩm</Button></fieldset></form>
    {editor.mutation.blocked && <p className="mt-3">Bản nháp đang được giữ. Hãy đối chiếu danh mục trước khi thực hiện tiếp.</p>}
    {record && editor.mutation.blocked && <Button className="mt-3" variant="secondary" disabled={editor.pending} onClick={async () => { const found = await editor.mutation.run(() => products.read("all", {}, z.array(c.salesProductSchema)), true); if (found) setLatest(found.find((r) => r.id === record.id)); }}>Tải sản phẩm mới để đối chiếu</Button>}
    {latest && <section className="mt-4 rounded-control border border-border p-4"><h3 className="font-semibold">Sản phẩm hiện tại</h3><p>{latest.code} · {latest.name} · {latest.inUse ? "Đang dùng" : "Ngừng dùng"}</p><p className="whitespace-pre-wrap">{latest.description}</p>{!editor.mutation.uncertain && <Button variant="secondary" onClick={() => { baseline.current = latest; editor.mutation.reviewed(); setLatest(undefined); }}>Đã đối chiếu, giữ nháp để sửa tiếp</Button>}</section>}
    <Button className="mt-4" variant="secondary" disabled={editor.pending} onClick={() => void editor.close()}>Đóng</Button>
  </Dialog>;
}
