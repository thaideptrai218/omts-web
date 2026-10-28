"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import type {
  FarmingZone,
  ZoneMutationResult,
  ZoneWorkspace,
} from "../domain/farming-zone";
import type { FarmingZoneService } from "../services/farming-zone-service";
import { ZoneEditor } from "./zone-editor";
import { ZoneDocuments } from "./zone-documents";
import { useZoneMutation } from "./use-zone-mutation";

type Saved = Extract<ZoneMutationResult, { status: "saved" }>;
export function ZoneDialog({
  zone,
  workspace,
  service,
  onSaved,
  onClose,
  canViewRafts = false,
}: {
  zone?: FarmingZone;
  workspace: ZoneWorkspace;
  service: FarmingZoneService;
  onSaved(result: Saved): void;
  onClose(): void;
  canViewRafts?: boolean;
}) {
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const editorLocked = useRef(false);
  const changeEditorState = useCallback(
    (nextDirty: boolean, nextPending: boolean) => {
      setDirty(nextDirty);
      setPending(nextPending);
      editorLocked.current = nextPending;
    },
    [],
  );
  const mutation = useZoneMutation((result) => {
    setConfirmStatus(false);
    onSaved(result);
  });
  function close() {
    if (editorLocked.current || mutation.isLocked()) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  return (
    <Dialog
      open
      size="xl"
      title={zone?.name ?? "Thêm vùng nuôi"}
      description={
        zone
          ? `Mã vùng ${zone.code}`
          : "Khai báo vị trí và điểm đo nước của vùng nuôi."
      }
      dismissible={!pending && !mutation.pending}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      {zone && canViewRafts && (
        <Link
          href={`/farming/rafts?zoneId=${encodeURIComponent(zone.id)}`}
          aria-disabled={dirty || pending || mutation.pending}
          title={dirty ? "Lưu hoặc hủy thay đổi trước khi xem bè." : undefined}
          onClick={(event) => {
            if (dirty || editorLocked.current || mutation.isLocked())
              event.preventDefault();
          }}
          className="mb-5 inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-primary hover:bg-primary-soft aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        >
          Xem bè trong vùng
        </Link>
      )}
      {zone && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <StatusPill tone={zone.status === "in-use" ? "success" : "neutral"}>
            {zone.status === "in-use" ? "Đang sử dụng" : "Đã ngừng sử dụng"}
          </StatusPill>
          {workspace.canWrite && (
            <Button
              className="sm:w-auto"
              variant="secondary"
              disabled={dirty || pending || mutation.pending}
              onClick={() => {
                mutation.clearError();
                setConfirmStatus(true);
              }}
            >
              {zone.status === "in-use"
                ? "Ngừng sử dụng vùng"
                : "Sử dụng lại vùng"}
            </Button>
          )}
        </div>
      )}
      {dirty && (
        <p className="mb-4 text-sm text-text-muted">
          Bạn có thay đổi chưa lưu. Hãy lưu hoặc hủy thay đổi trước khi đổi
          trạng thái vùng.
        </p>
      )}
      {workspace.canWrite ? (
        <ZoneEditor
          zone={zone}
          service={service}
          onSaved={onSaved}
          onStateChange={changeEditorState}
        />
      ) : (
        zone && (
          <dl className="grid gap-4 rounded-card bg-surface-subtle p-4 sm:grid-cols-2">
            {[
              ["Mã vùng", zone.code],
              ["Tên vùng", zone.name],
              ["Vị trí", zone.location],
              ["Diện tích", `${zone.area.toLocaleString("vi-VN")} ha`],
              ["Tọa độ", `${zone.latitude}, ${zone.longitude}`],
              ["Điểm đo nước", zone.waterMeasurementPoint],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-sm text-text-muted">{label}</dt>
                <dd className="mt-1 break-words font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        )
      )}
      {zone && (
        <fieldset disabled={pending || mutation.pending} className="min-w-0">
          <legend className="sr-only">Hồ sơ pháp lý vùng</legend>
          <ZoneDocuments
            zoneId={zone.id}
            workspace={workspace}
            service={service}
            onSaved={onSaved}
          />
        </fieldset>
      )}
      {mutation.error && !confirmStatus && (
        <p
          role="alert"
          className="mt-4 rounded-control bg-danger/10 p-3 text-sm text-danger"
        >
          {mutation.error}
        </p>
      )}
      <ConfirmDialog
        open={confirmStatus}
        error={mutation.error || undefined}
        isPending={mutation.pending}
        title={
          zone?.status === "in-use"
            ? "Ngừng sử dụng vùng?"
            : "Sử dụng lại vùng?"
        }
        description={
          zone?.status === "in-use"
            ? "Hồ sơ và lịch sử vẫn được giữ. Vùng chỉ ngừng được khi không còn bè đang sử dụng."
            : "Vùng sẽ xuất hiện trở lại trong các danh mục đang sử dụng. Hồ sơ giấy phép vẫn được kiểm tra riêng."
        }
        confirmLabel={
          zone?.status === "in-use" ? "Ngừng sử dụng" : "Sử dụng lại"
        }
        onOpenChange={(open) => {
          if (!mutation.isLocked()) setConfirmStatus(open);
        }}
        onConfirm={() => {
          if (!zone || editorLocked.current || dirty) return;
          void mutation.run(() =>
            service.changeStatus({
              id: zone.id,
              recordVersion: zone.recordVersion,
              status: zone.status === "in-use" ? "discontinued" : "in-use",
            }),
          );
        }}
      />
      <ConfirmDialog
        open={discard}
        title="Bỏ thay đổi thông tin vùng?"
        description="Các thông tin chưa lưu sẽ bị bỏ. Hồ sơ vùng và giấy tờ đã lưu vẫn được giữ lại."
        confirmLabel="Bỏ thay đổi"
        onConfirm={onClose}
        onOpenChange={setDiscard}
      />
    </Dialog>
  );
}
