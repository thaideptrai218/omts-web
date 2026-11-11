"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { fieldNames } from "@/features/input-items/contracts";
import { DataTable, ErrorNotice, useMutation } from "@/features/operations/ui";
import type { ImportResult } from "./contracts";
import { errorText, productRepository } from "./repository";

const columnNames: Record<string, string> = { ...fieldNames, Code: "Mã sản phẩm", Name: "Tên sản phẩm", Group: "Nhóm sản phẩm", "Unit price": "Giá bán" };

/**
 * Nhập sản phẩm từ file. A file with a refused row saves nothing and lists the rows; `onImported` is told how many products were created
 * (the list reloads and a toast says so) and the dialog closes, unless a rare failure after the check left some rows listed.
 */
export function ProductImportDialog({ onClose, onImported }: { onClose(): void; onImported(count: number): void }) {
  const [file, setFile] = useState<File>(), [result, setResult] = useState<ImportResult>(), [error, setError] = useState<string>();
  const template = useMutation(), upload = useMutation();
  async function submit() {
    if (!file) return;
    setError(undefined); setResult(undefined);
    const outcome = await productRepository.import(file);
    if (outcome.status !== "success") { setError(outcome.httpStatus === 400 ? "File chưa đúng mẫu: cần file .xlsx tối đa 2 MB, 1000 dòng, có các cột của file mẫu và ít nhất một dòng." : errorText(outcome)); return; }
    if (outcome.data.imported > 0) onImported(outcome.data.imported);
    if (outcome.data.errors.length) setResult(outcome.data); else if (outcome.data.imported > 0) onClose();
  }
  return <Dialog open size="lg" title="Nhập sản phẩm từ file" dismissible={!upload.pending} onOpenChange={(open) => { if (!open) onClose(); }}>
    <div className="space-y-4">
      <p className="text-sm">Dùng đúng mẫu. Cần có tên và giá bán theo kg. Có một dòng lỗi thì không dòng nào được nhập.</p>
      <Button className="w-auto" variant="secondary" disabled={template.pending} onClick={() => void template.run(() => productRepository.template(), true)}>Tải file mẫu</Button>
      <label className="block text-sm font-medium">Chọn file<input className="mt-2 block w-full text-sm" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { setFile(event.target.files?.[0]); setResult(undefined); setError(undefined); }} /></label>
      <ErrorNotice error={error || template.error} />
      {result && <>
        <p role="alert" className="text-sm font-semibold text-danger">{result.imported > 0 ? `Đã nhập ${result.imported} dòng. ` : "Chưa nhập dòng nào. "}Sửa {result.errors.length} dòng lỗi rồi tải lại file.</p>
        <DataTable headings={["Dòng", "Cột", "Lý do"]} empty={false}>{result.errors.map((row) => <tr key={`${row.row}:${row.message}:${row.fields.join()}`}><td>{row.row}</td><td>{row.fields.map((field) => columnNames[field] ?? field).join(", ") || "—"}</td><td>{row.message}</td></tr>)}</DataTable>
      </>}
      <div className="flex justify-end gap-3"><Button className="w-auto" variant="secondary" disabled={upload.pending} onClick={onClose}>Bỏ qua</Button><Button className="w-auto" disabled={!file} isPending={upload.pending} onClick={() => void upload.run(async () => { await submit(); return { status: "success", data: true } as const; })}>Nhập file</Button></div>
    </div>
  </Dialog>;
}
