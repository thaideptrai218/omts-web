"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { vietnameseBusinessDate } from "@/shared/format/date-only";
import type {
  ZoneDocument,
  ZoneMutationResult,
  FarmingZone,
} from "../domain/farming-zone";
import {
  zoneDocumentSchema,
  type ZoneDocumentFormValues,
} from "../schemas/farming-zone-schema";
import type { FarmingZoneService } from "../services/farming-zone-service";
import { useZoneMutation } from "./use-zone-mutation";
import { ZoneDocumentFields } from "./zone-document-fields";

export function ZoneDocumentEditor({
  document,
  mode,
  zoneId,
  zones,
  service,
  onSaved,
  onClose,
}: {
  document?: ZoneDocument;
  mode: "add" | "edit" | "renew";
  zoneId: string;
  zones: readonly FarmingZone[];
  service: FarmingZoneService;
  onSaved(result: Extract<ZoneMutationResult, { status: "saved" }>): void;
  onClose(): void;
}) {
  const form = useForm<ZoneDocumentFormValues>({
    resolver: zodResolver(zoneDocumentSchema),
    defaultValues: {
      type: document?.type ?? "SEA_AREA_ALLOCATION",
      number: mode === "edit" ? (document?.number ?? "") : "",
      effectiveDate:
        mode === "edit" ? document?.effectiveDate : vietnameseBusinessDate(),
      expiryDate: mode === "edit" ? (document?.expiryDate ?? "") : "",
      issuingAuthority: document?.issuingAuthority ?? "",
      holder: document?.holder ?? "",
      legalScope: document?.legalScope ?? "",
      zoneIds: document ? [...document.zoneIds] : [zoneId],
    },
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [discard, setDiscard] = useState(false);
  const revision = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const mutation = useZoneMutation(onSaved, undefined, (result) => {
    if (result.status === "invalid" && result.fields.includes("file"))
      setFileError(
        "Tệp phải là PDF, JPG hoặc PNG hợp lệ, có nội dung và không quá 10 MB.",
      );
  });
  function close() {
    if (mutation.isLocked()) return;
    revision.current += 1;
    if (form.formState.isDirty || file) setDiscard(true);
    else onClose();
  }
  return (
    <Dialog
      open
      title={
        mode === "renew"
          ? "Gia hạn / thay thế giấy tờ"
          : mode === "edit"
            ? "Chỉnh sửa giấy tờ"
            : "Thêm giấy tờ"
      }
      size="lg"
      dismissible={!mutation.pending}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      {mode === "renew" && (
        <p className="mb-4 rounded-control bg-primary-soft p-3 text-sm leading-6">
          Bản mới sẽ thay thế giấy tờ số <strong>{document?.number}</strong> kể
          từ ngày hiệu lực. Bản cũ và tệp gốc vẫn được lưu trong lịch sử.
        </p>
      )}
      <form
        noValidate
        onSubmit={(event) => {
          const submittedRevision = revision.current;
          void form.handleSubmit((values) => {
            if (submittedRevision !== revision.current) return;
            if (mutation.isLocked()) return;
            if (mode !== "edit" && !file) {
              setFileError("Chọn tệp đính kèm cho giấy tờ mới.");
              fileRef.current?.focus();
              return;
            }
            setFileError("");
            void mutation.run(() =>
              service.saveDocument({
                ...values,
                file,
                id: mode === "edit" ? document!.id : null,
                recordVersion: mode === "edit" ? document!.recordVersion : null,
                replacesId: mode === "renew" ? document!.id : null,
                replacesVersion:
                  mode === "renew" ? document!.recordVersion : null,
              }),
            );
          })(event);
        }}
      >
        <fieldset disabled={mutation.pending} className="min-w-0">
          <legend className="sr-only">Thông tin giấy tờ</legend>
          <ZoneDocumentFields
            form={form}
            zones={zones}
            fileRef={fileRef}
            fileError={fileError}
            existingFile={mode === "edit" ? document?.fileName : undefined}
            onFileChange={(next) => {
              setFile(next);
              setFileError("");
            }}
          />
        </fieldset>
        {mutation.error && (
          <p
            role="alert"
            className="mt-3 rounded-control bg-danger/10 p-3 text-sm text-danger"
          >
            {mutation.error}
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            disabled={mutation.pending}
            variant="secondary"
            onClick={close}
            className="sm:w-auto"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            isPending={mutation.pending}
            className="sm:w-auto"
          >
            {mode === "renew" ? "Lưu bản thay thế" : "Lưu giấy tờ"}
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={discard}
        title="Bỏ thay đổi giấy tờ?"
        description="Các thông tin chưa lưu sẽ bị bỏ. Hồ sơ đã lưu vẫn được giữ lại."
        confirmLabel="Bỏ thay đổi"
        onConfirm={onClose}
        onOpenChange={setDiscard}
      />
    </Dialog>
  );
}
