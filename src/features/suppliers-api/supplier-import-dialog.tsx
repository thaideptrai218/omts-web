"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { workspaceError } from "@/features/api-workspace/workspace-error";
import { DataTable, ErrorNotice, useMutation } from "@/features/operations/ui";
import type { ImportResult } from "./contracts";
import { supplierRepository } from "./repository";

const reasons: Record<string, string> = { "Missing or invalid.": "Thiếu hoặc không hợp lệ.", "Repeated in this file.": "Trùng số điện thoại trong file.", "Already belongs to a supplier.": "Số điện thoại đã có nhà cung cấp.", "Formulas are not accepted.": "Không nhận ô chứa công thức." };
const fields: Record<string, string> = { Name: "Tên", "Supplier type": "Nhóm", "Phone number": "Điện thoại", Email: "Email", Address: "Địa chỉ", Province: "Tỉnh/thành", Ward: "Phường/xã", Note: "Ghi chú", "Company name": "Tên công ty", "Tax code": "Mã số thuế" };

export function SupplierImportDialog({ onClose, onImported }: { onClose(): void; onImported(count: number): void }) {
  const [file, setFile] = useState<File>(), [result, setResult] = useState<ImportResult>(), [error, setError] = useState<string>();
  const template = useMutation(), upload = useMutation();
  async function submit() {
    if (!file || upload.busy()) return;
    setError(undefined); setResult(undefined);
    const outcome = await supplierRepository.import(file);
    if (outcome.status !== "success") { setError(outcome.httpStatus === 400 ? "File chưa đúng mẫu: cần file .xlsx tối đa 2 MB, 1000 dòng, có các cột Name, Group, Phone và ít nhất một dòng." : workspaceError(outcome)); return; }
    if (outcome.data.imported > 0) onImported(outcome.data.imported); else setResult(outcome.data);
  }
  return <Dialog open size="lg" title="Nhập nhà cung cấp từ file" dismissible={!upload.pending} onOpenChange={(open) => { if (!open) onClose(); }}>
    <div className="space-y-4">
      <p className="text-sm">Dùng đúng mẫu. Có một dòng lỗi thì không dòng nào được nhập.</p>
      <Button className="w-auto" variant="secondary" disabled={template.pending} onClick={() => void template.run(() => supplierRepository.download("template", {}, "mau-nha-cung-cap.xlsx"), true)}>Tải file mẫu</Button>
      <label className="block text-sm font-medium">Chọn file<input className="mt-2 block w-full text-sm" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { setFile(event.target.files?.[0]); setResult(undefined); setError(undefined); }} /></label>
      <ErrorNotice error={error || template.error} />
      {result && <><p role="alert" className="text-sm font-semibold text-danger">Chưa nhập dòng nào. Sửa {result.errors.length} dòng lỗi rồi tải lại file.</p>
        <DataTable headings={["Dòng", "Trường", "Lý do"]} empty={false}>{result.errors.map((row) => <tr key={`${row.row}:${row.message}`}><td>{row.row}</td><td>{row.fields.map((field) => fields[field] ?? field).join(", ") || "—"}</td><td>{reasons[row.message] ?? row.message}</td></tr>)}</DataTable></>}
      <div className="flex justify-end gap-3"><Button className="w-auto" variant="secondary" disabled={upload.pending} onClick={onClose}>Bỏ qua</Button><Button className="w-auto" disabled={!file} isPending={upload.pending} onClick={() => void upload.run(async () => { await submit(); return { status: "success", data: true } as const; })}>Nhập file</Button></div>
    </div>
  </Dialog>;
}
