"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusPill } from "@/components/ui/management-page";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type {
  RaftProfile,
  RaftMutationResult,
  RaftWorkspace,
} from "../domain/raft";
import type { RaftService } from "../services/raft-service";
import { RaftConditionPanel } from "./raft-condition-panel";
import { RaftEditorDialog } from "./raft-editor-dialog";
import { RaftPhoto } from "./raft-photo";
import { useRaftMutation } from "./use-raft-mutation";

export function RaftDialog({
  raft,
  zoneName,
  service,
  onClose,
  workspace,
  onSaved,
}: {
  raft: RaftProfile;
  zoneName: string;
  service: RaftService;
  onClose(): void;
  workspace: RaftWorkspace;
  onSaved(result: Extract<RaftMutationResult, { status: "saved" }>): void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const mutation = useRaftMutation((result) => {
    setConfirmStatus(false);
    onSaved(result);
  });
  const hasOpenCycle = raft.cycles.some((cycle) => !cycle.closedAt);
  const canReactivate = workspace.zones.some(
    (zone) => zone.id === raft.zoneId && zone.status === "in-use",
  );
  return (
    <Dialog
      open
      size="xl"
      title={`Bè ${raft.code}`}
      description={zoneName}
      onOpenChange={(open) => {
        if (!open && !mutation.isLocked() && !editing) onClose();
      }}
      dismissible={!mutation.pending}
    >
      <StatusPill tone={raft.status === "in-use" ? "success" : "neutral"}>
        {raft.status === "in-use" ? "Đang sử dụng" : "Đã ngừng sử dụng"}
      </StatusPill>
      {workspace.canWrite && (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            className="sm:w-auto"
            disabled={mutation.pending}
            onClick={() => {
              mutation.clearError();
              setEditing(true);
            }}
          >
            Chỉnh sửa
          </Button>
          <Button
            variant="secondary"
            className="sm:w-auto"
            disabled={
              mutation.pending ||
              (raft.status === "in-use" ? hasOpenCycle : !canReactivate)
            }
            onClick={() => {
              mutation.clearError();
              setConfirmStatus(true);
            }}
          >
            {raft.status === "in-use" ? "Ngừng sử dụng" : "Khôi phục sử dụng"}
          </Button>
        </div>
      )}
      {workspace.canWrite && hasOpenCycle && (
        <p className="mt-3 text-sm leading-6 text-text-muted">
          Bè còn chu kỳ nuôi đang mở. Chưa thể ngừng sử dụng hoặc đổi sơ đồ làn.
        </p>
      )}
      {workspace.canWrite &&
        raft.status === "discontinued" &&
        !canReactivate && (
          <p className="mt-3 text-sm text-text-muted">
            Vùng nuôi đã ngừng sử dụng. Cần khôi phục vùng trước khi khôi phục
            bè.
          </p>
        )}
      {mutation.error && !confirmStatus && (
        <p
          role="alert"
          className="mt-3 rounded-control bg-danger/10 p-3 text-sm text-danger"
        >
          {mutation.error}
        </p>
      )}
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Kích thước", raft.size],
          ["Tọa độ", `${raft.latitude}, ${raft.longitude}`],
          ["Vị trí", raft.location || "Chưa có mô tả vị trí"],
          ["Tình trạng vật lý", raft.conditionNotes || "Chưa có ghi chú"],
          [
            "Chi phí vật tư",
            raft.materialCostVnd === null
              ? "Chưa có số liệu chi phí"
              : `${raft.materialCostVnd.toLocaleString("vi-VN")} đồng`,
          ],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-text-muted">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words font-medium">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <RaftConditionPanel
        key={`condition-${raft.recordVersion}`}
        raft={raft}
        service={service}
      />
      <RaftPhoto
        key={`photo-${raft.recordVersion}`}
        raft={raft}
        service={service}
        canWrite={!!workspace.canWrite}
        pending={mutation.pending}
        run={mutation.run}
      />
      <details className="mt-6 border-t border-border pt-4">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">
          Lịch sử phiên bản sơ đồ ({raft.layouts.length})
        </summary>
        <ol className="mt-3 space-y-3">
          {[...raft.layouts]
            .sort((a, b) => b.version - a.version)
            .map((layout) => (
              <li
                key={layout.version}
                className="flex flex-wrap justify-between gap-2 border-b border-border pb-3 text-sm"
              >
                <span>
                  Phiên bản {layout.version} — {layout.lanes.length} làn
                </span>
                <span className="text-text-muted">
                  {formatVietnameseDate(layout.validFrom)}
                  {layout.validTo
                    ? ` đến ${formatVietnameseDate(layout.validTo)}`
                    : " đến hiện tại"}
                </span>
              </li>
            ))}
        </ol>
      </details>
      {editing && (
        <RaftEditorDialog
          raft={raft}
          zones={workspace.zones}
          service={service}
          onClose={() => setEditing(false)}
          onSaved={(result) => {
            setEditing(false);
            onSaved(result);
          }}
        />
      )}
      <ConfirmDialog
        open={confirmStatus}
        title={
          raft.status === "in-use"
            ? `Ngừng sử dụng bè ${raft.code}?`
            : `Khôi phục bè ${raft.code}?`
        }
        description={
          raft.status === "in-use"
            ? "Bè chuyển sang ngừng sử dụng. Hồ sơ và lịch sử nuôi vẫn được giữ lại."
            : "Bè sẽ được đưa trở lại danh sách đang sử dụng của vùng."
        }
        confirmLabel={
          raft.status === "in-use" ? "Ngừng sử dụng" : "Khôi phục sử dụng"
        }
        tone={raft.status === "in-use" ? "danger" : "primary"}
        isPending={mutation.pending}
        error={mutation.error}
        onOpenChange={(open) => {
          if (!mutation.isLocked()) setConfirmStatus(open);
        }}
        onConfirm={() => {
          void mutation.run(() =>
            service.changeStatus({
              id: raft.id,
              recordVersion: raft.recordVersion,
              status: raft.status === "in-use" ? "discontinued" : "in-use",
            }),
          );
        }}
      />
    </Dialog>
  );
}
