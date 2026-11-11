"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DataTable, ErrorNotice, operationError } from "@/features/operations/ui";
import { employeeImportMaxBytes, type EmployeeImportResult } from "./employee-file-contract";
import { employeeFileRepository } from "./employee-file-repository";
import { importErrorReason, importFieldLabel, importFileRefusal } from "./employee-import-labels";
import { useEmployeeFileAction } from "./use-employee-file-action";

/** Client-side precheck: the BFF and the backend check again; this only saves a round trip. */
export function checkImportFile(file: File): string | undefined {
  if (!/\.xlsx$/i.test(file.name)) return "Chỉ nhận file Excel .xlsx.";
  if (file.size > employeeImportMaxBytes) return "File lớn hơn 2 MB. Hãy chia nhỏ file rồi nhập lần lượt.";
  if (file.size === 0) return "File trống.";
}

/** "Import file" pop-up: template, one .xlsx, then the outcome. Rows with errors are skipped, the other rows are imported. */
export function EmployeeImportDialog({ onClose, onImported }: { onClose(): void; onImported(count: number): void }) {
  const [file, setFile] = useState<File>(), [result, setResult] = useState<EmployeeImportResult>(), [error, setError] = useState<string>();
  const [blocked, setBlocked] = useState(false), [pending, setPending] = useState(false), [inputKey, setInputKey] = useState(0);
  const template = useEmployeeFileAction(() => employeeFileRepository.template());

  async function submit() {
    if (!file || pending || blocked) return;
    setPending(true); setError(undefined);
    const outcome = await employeeFileRepository.importFile(file);
    setPending(false);
    if (outcome.status === "success") {
      setResult(outcome.data);
      if (outcome.data.imported > 0) onImported(outcome.data.imported);
      return;
    }
    if (outcome.uncertain) { setBlocked(true); setError("Chưa xác định được kết quả nhập file. Hãy đóng hộp thoại và tải lại danh sách để đối chiếu trước khi nhập lại."); return; }
    setError(outcome.httpStatus === 400 ? importFileRefusal : operationError(outcome));
  }
  function again() { setResult(undefined); setFile(undefined); setError(undefined); setInputKey(key => key + 1); }

  return <Dialog open size="lg" title="Nhập nhân viên từ file" dismissible={!pending} onOpenChange={open => { if (!open) onClose(); }}>
    <div className="space-y-4">
      {!result ? <>
        <p className="text-sm">Dùng đúng file mẫu (.xlsx, tối đa 2 MB, 1000 dòng). Dòng nào lỗi sẽ được bỏ qua và báo lại, các dòng đúng vẫn được nhập.</p>
        <Button className="w-auto" variant="secondary" isPending={template.pending} onClick={() => void template.run()}>Tải file mẫu</Button>
        <label className="block text-sm font-medium">Chọn file
          <input key={inputKey} className="mt-2 block w-full text-sm" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={pending || blocked}
            onChange={event => { const picked = event.target.files?.[0], problem = picked && checkImportFile(picked); setFile(problem ? undefined : picked); setError(problem || undefined); if (problem) setInputKey(key => key + 1); }} />
        </label>
        <ErrorNotice error={error || template.error} />
      </> : <>
        <p role="status" className="text-sm font-semibold">Đã nhập {result.imported} nhân viên.{result.errors.length > 0 && ` Bỏ qua ${result.errors.length} dòng lỗi.`}</p>
        {result.errors.length > 0 && <><p className="text-sm">Sửa các dòng sau trong file rồi nhập lại phần còn thiếu.</p>
          <DataTable headings={["Dòng", "Trường", "Thông báo"]} empty={false}>{result.errors.map((row, index) => <tr key={`${row.row}:${index}`}>
            <td>{row.row}</td><td>{row.fields.map(importFieldLabel).join(", ") || "—"}</td><td>{importErrorReason(row)}</td></tr>)}</DataTable></>}
      </>}
      {/* Distinct keys: the footer changes role between steps, and a reused <button> must never turn into another action. */}
      <div className="flex justify-end gap-3">
        {result ? <>
          {result.errors.length > 0 && <Button key="again" type="button" className="w-auto" variant="secondary" onClick={again}>Chọn file khác</Button>}
          <Button key="close" type="button" className="w-auto" onClick={onClose}>Đóng</Button>
        </> : <>
          <Button key="cancel" type="button" className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>Bỏ qua</Button>
          <Button key="import" type="button" className="w-auto" disabled={!file || blocked} isPending={pending} onClick={() => void submit()}>Nhập file</Button>
        </>}
      </div>
    </div>
  </Dialog>;
}
