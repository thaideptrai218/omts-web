"use client";
import { useRef } from "react";
import type { useActionDialog } from "@/components/ui/use-action-dialog";
import { Button } from "@/components/ui/button";
import * as c from "./contracts";
import { receiptRepository } from "./receipt-shared";
import { Field, type useMutation } from "./ui";

/**
 * Invoice downloads plus, for draft receipts the user may edit, the picker/upload flow.
 * Selected files live in the editor so save/complete/cancel can block while uploads are pending.
 */
export function ReceiptInvoiceSection({
  record,
  canUpload,
  dirty,
  files,
  setFiles,
  mutation,
  confirmation,
  onSaved,
}: {
  record: c.Receipt;
  canUpload: boolean;
  dirty: boolean;
  files: File[];
  setFiles(files: File[]): void;
  mutation: ReturnType<typeof useMutation>;
  confirmation: ReturnType<typeof useActionDialog>;
  onSaved(record: c.Receipt): void;
}) {
  const invoicePicker = useRef<HTMLInputElement>(null);

  return (
    <>
      <h3 className="mt-6 font-semibold">Hóa đơn</h3>
      <ul className="my-3 space-y-2">
        {record.invoicePhotoUrls.map((url, index) => (
          <li key={index}>
            <a className="text-primary underline" href={url} download>
              Tải hóa đơn {index + 1}
            </a>
          </li>
        ))}
      </ul>
      {canUpload && (
        <div className="space-y-3">
          <Field
            ref={invoicePicker}
            label="Thêm hóa đơn (JPEG, PNG, PDF; tối đa 10 tệp, 10 MB/tệp)"
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            multiple
            disabled={mutation.pending || mutation.blocked || dirty}
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          {files.length > 0 && (
            <section
              aria-label="Hóa đơn chưa tải lên"
              className="min-w-0 space-y-2 rounded-control border border-border p-3"
            >
              <p>
                Đã chọn {files.length} tệp, chưa tải lên. Lưu nháp phiếu giữ các tệp trong trang này; tải lại trang sẽ
                mất lựa chọn.
              </p>
              <ul className="space-y-1">
                {files.map((file, index) => (
                  <li className="break-all text-sm" key={`${file.name}:${index}`}>
                    {file.name}
                  </li>
                ))}
              </ul>
              <Button
                className="w-auto"
                variant="secondary"
                disabled={mutation.pending || mutation.blocked}
                onClick={async () => {
                  if (await confirmation.confirm("Bỏ các tệp hóa đơn đã chọn nhưng chưa tải lên?")) {
                    setFiles([]);
                    if (invoicePicker.current) invoicePicker.current.value = "";
                  }
                }}
              >
                Bỏ chọn tệp
              </Button>
            </section>
          )}
          <Button
            className="w-auto"
            variant="secondary"
            disabled={!files.length || mutation.pending || mutation.blocked || dirty}
            onClick={async () => {
              const saved = await mutation.run(() =>
                receiptRepository.upload("invoice-photos", files, {}, c.receiptSchema, record.id),
              );
              if (saved) onSaved(saved);
            }}
          >
            Tải hóa đơn lên
          </Button>
        </div>
      )}
    </>
  );
}
