"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { VietnameseDateInput } from "@/components/form/vietnamese-date-input";
import {
  formatVietnameseDate,
  isDateOnly,
  vietnameseBusinessDate,
} from "@/shared/format/date-only";
import {
  zoneDocumentTypes,
  type ZoneDocument,
  type ZoneMutationResult,
  type ZoneWorkspace,
} from "../domain/farming-zone";
import {
  documentStateLabels,
  missingZoneDocuments,
  zoneDocumentState,
} from "../domain/zone-document-state";
import type { FarmingZoneService } from "../services/farming-zone-service";
import { ZoneDocumentEditor } from "./zone-document-editor";
import { zoneInputStyles } from "./zone-field";

export function ZoneDocuments({
  zoneId,
  workspace,
  service,
  onSaved,
}: {
  zoneId: string;
  workspace: ZoneWorkspace;
  service: FarmingZoneService;
  onSaved(result: Extract<ZoneMutationResult, { status: "saved" }>): void;
}) {
  const [date, setDate] = useState(vietnameseBusinessDate());
  const dateId = useId();
  const [editing, setEditing] = useState<{
    mode: "add" | "edit" | "renew";
    document?: ZoneDocument;
  }>();
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState<string>();
  const active = useRef(true);
  const downloadLock = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const documents = workspace.documents.filter((item) =>
    item.zoneIds.includes(zoneId),
  );
  const dateValid = isDateOnly(date);
  const missing = dateValid
    ? missingZoneDocuments(zoneId, workspace.documents, date)
    : [];
  async function download(document: ZoneDocument) {
    if (downloadLock.current) return;
    downloadLock.current = true;
    setDownloading(document.id);
    setDownloadError("");
    try {
      const file = await service.readAttachment(document.id);
      if (!active.current) return;
      if (!file) {
        setDownloadError(
          "Không tải được tệp. Tệp có thể không còn trong phiên hiện tại hoặc bạn không còn quyền truy cập.",
        );
        return;
      }
      const url = URL.createObjectURL(file);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (active.current)
        setDownloadError("Chưa tải được tệp. Vui lòng thử lại.");
    } finally {
      downloadLock.current = false;
      if (active.current) setDownloading(undefined);
    }
  }
  return (
    <section
      className="mt-8 border-t border-border pt-6"
      aria-label="Giấy phép và hồ sơ pháp lý"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Giấy phép & hồ sơ pháp lý</h3>
          <p className="mt-1 text-sm text-text-muted">
            Tra cứu theo ngày; giấy tờ chỉ dùng trong nội bộ.
          </p>
        </div>
        {workspace.canWrite && (
          <Button
            variant="secondary"
            className="sm:w-auto"
            onClick={() => setEditing({ mode: "add" })}
          >
            <InterfaceIcon name="add" />
            Thêm giấy tờ
          </Button>
        )}
      </div>
      <div className="mt-4 max-w-xs">
        <label htmlFor={dateId} className="text-sm font-semibold">
          Xem hiệu lực tại ngày
        </label>
        <VietnameseDateInput
          id={dateId}
          value={date}
          onValueChange={setDate}
          className={zoneInputStyles}
          calendarLabel="Chọn ngày tra cứu hồ sơ"
          aria-invalid={!dateValid}
        />
      </div>
      {!dateValid ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          Nhập ngày tra cứu hợp lệ theo ngày/tháng/năm.
        </p>
      ) : (
        <p
          className={`mt-3 rounded-control p-3 text-sm leading-6 ${missing.length ? "bg-warning-soft" : "bg-success/10"}`}
        >
          {missing.length
            ? `Thiếu hồ sơ còn hiệu lực: ${missing.map((key) => zoneDocumentTypes[key as keyof typeof zoneDocumentTypes]).join("; ")}.`
            : "Đã đủ hai loại giấy tờ bắt buộc còn hiệu lực tại ngày đã chọn."}
        </p>
      )}
      {documents.length === 0 && (
        <p className="py-6 text-sm text-text-muted">
          Chưa có giấy tờ. Thông tin vùng đã được lưu; hồ sơ pháp lý cần được bổ
          sung.
        </p>
      )}
      <ul className="mt-4 space-y-3">
        {documents.map((item) => {
          const state = dateValid
            ? zoneDocumentState(item, workspace.documents, date)
            : undefined;
          const replaced = !!item.replacementEffectiveDate;
          return (
            <li key={item.id} className="rounded-card border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {zoneDocumentTypes[item.type]}
                  </p>
                  <h4 className="mt-1 break-words font-semibold">
                    {item.number}
                  </h4>
                </div>
                {state && (
                  <StatusPill
                    tone={
                      state === "valid"
                        ? "success"
                        : state === "expired"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {documentStateLabels[state]}
                  </StatusPill>
                )}
              </div>
              <p className="mt-2 text-sm text-text-muted">
                {formatVietnameseDate(item.effectiveDate)} →{" "}
                {item.expiryDate
                  ? formatVietnameseDate(item.expiryDate)
                  : "Không ghi ngày hết hạn"}
              </p>
              {(item.issuingAuthority || item.holder) && (
                <p className="mt-1 text-sm">
                  {[item.issuingAuthority, item.holder]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              {item.legalScope && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                  {item.legalScope}
                </p>
              )}
              <p className="mt-2 text-xs text-text-muted">
                Áp dụng:{" "}
                {item.zoneIds
                  .map(
                    (id) =>
                      workspace.zones.find((zone) => zone.id === id)?.name,
                  )
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <button
                type="button"
                disabled={!!downloading}
                className="mt-2 flex min-h-11 max-w-full items-center gap-2 break-all text-left text-sm font-semibold text-primary disabled:opacity-50"
                onClick={() => void download(item)}
              >
                <InterfaceIcon name="document" className="size-4 shrink-0" />
                {downloading === item.id ? "Đang tải tệp…" : item.fileName}
              </button>
              {workspace.canWrite && !replaced && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    className="sm:w-auto"
                    onClick={() => setEditing({ mode: "edit", document: item })}
                  >
                    Sửa giấy tờ
                  </Button>
                  <Button
                    variant="secondary"
                    className="sm:w-auto"
                    onClick={() =>
                      setEditing({ mode: "renew", document: item })
                    }
                  >
                    Gia hạn / thay thế
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {downloadError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {downloadError}
        </p>
      )}
      {editing && (
        <ZoneDocumentEditor
          {...editing}
          zoneId={zoneId}
          zones={workspace.zones}
          service={service}
          onClose={() => setEditing(undefined)}
          onSaved={(result) => {
            onSaved(result);
            setEditing(undefined);
          }}
        />
      )}
    </section>
  );
}
