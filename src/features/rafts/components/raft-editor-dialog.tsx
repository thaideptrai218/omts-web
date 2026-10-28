"use client";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type {
  RaftMutationResult,
  RaftProfile,
  RaftWorkspace,
} from "../domain/raft";
import { raftSchema } from "../schemas/raft-schema";
import type { RaftService } from "../services/raft-service";
import { RaftField, raftInputStyles } from "./raft-field";
import { RaftLaneEditor, type RaftFormValues } from "./raft-lane-editor";
import { useRaftMutation } from "./use-raft-mutation";

export function raftFormValues(raft?: RaftProfile): RaftFormValues {
  return {
    zoneId: raft?.zoneId ?? "",
    code: raft?.code ?? "",
    latitude: raft ? String(raft.latitude) : "",
    longitude: raft ? String(raft.longitude) : "",
    location: raft?.location ?? "",
    size: raft?.size ?? "",
    conditionNotes: raft?.conditionNotes ?? "",
    lanes: raft?.layouts.at(-1)?.lanes.map((lane) => ({ ...lane })) ?? [
      { number: 1, length: 0, markerA: "", markerB: "" },
    ],
  };
}
const fields = [
  { key: "code", label: "Mã bè", required: true },
  {
    key: "size",
    label: "Kích thước",
    required: true,
    placeholder: "Ví dụ: 24 × 12 m",
  },
  {
    key: "latitude",
    label: "Vĩ độ",
    required: true,
    placeholder: "Từ −90 đến 90",
  },
  {
    key: "longitude",
    label: "Kinh độ",
    required: true,
    placeholder: "Từ −180 đến 180",
  },
  { key: "location", label: "Mô tả vị trí" },
  { key: "conditionNotes", label: "Ghi chú tình trạng" },
] as const;

export function RaftEditorDialog({
  raft,
  zones,
  service,
  onSaved,
  onClose,
}: {
  raft?: RaftProfile;
  zones: RaftWorkspace["zones"];
  service: RaftService;
  onSaved(result: Extract<RaftMutationResult, { status: "saved" }>): void;
  onClose(): void;
}) {
  const form = useForm<RaftFormValues>({
    defaultValues: raftFormValues(raft),
    resolver: zodResolver(raftSchema),
  });
  const [discard, setDiscard] = useState(false);
  // Read during render to subscribe to RHF's lazy form-state proxy.
  const { isDirty } = form.formState;
  const revision = useRef(0);
  const mutation = useRaftMutation(onSaved, (failure) => {
    if (failure.status === "duplicate")
      form.setError(
        "code",
        { message: "Mã bè đã có trong vùng này. Hãy chọn mã khác." },
        { shouldFocus: true },
      );
  });
  function close() {
    if (mutation.isLocked()) return;
    revision.current += 1;
    if (isDirty) setDiscard(true);
    else onClose();
  }
  return (
    <Dialog
      open
      size="lg"
      title={raft ? `Chỉnh sửa bè ${raft.code}` : "Thêm bè nuôi"}
      description="Khai báo vị trí, kích thước và các làn A/B của bè."
      dismissible={!mutation.pending}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <form
        noValidate
        className="mt-5"
        onSubmit={(event) => {
          const submittedRevision = revision.current;
          void form.handleSubmit((values) => {
            if (revision.current !== submittedRevision) return;
            return mutation.run(() =>
              service.save({
                ...values,
                id: raft?.id ?? null,
                recordVersion: raft?.recordVersion ?? null,
              }),
            );
          })(event);
        }}
      >
        <fieldset disabled={mutation.pending} className="min-w-0">
          <legend className="sr-only">Thông tin bè nuôi</legend>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <RaftField
                label="Vùng nuôi"
                required
                error={form.formState.errors.zoneId?.message}
              >
                {(props) => (
                  <select
                    {...props}
                    className={raftInputStyles}
                    {...form.register("zoneId")}
                    disabled={!!raft}
                  >
                    <option value="">Chọn vùng nuôi</option>
                    {zones
                      .filter(
                        (zone) =>
                          zone.status === "in-use" || zone.id === raft?.zoneId,
                      )
                      .map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.label}
                          {zone.status === "discontinued" ? " — đã ngừng" : ""}
                        </option>
                      ))}
                  </select>
                )}
              </RaftField>
            </div>
            {fields.map((field) => (
              <RaftField
                key={field.key}
                label={field.label}
                required={"required" in field && field.required}
                error={form.formState.errors[field.key]?.message}
              >
                {(props) =>
                  field.key === "conditionNotes" ? (
                    <textarea
                      {...props}
                      className={raftInputStyles}
                      rows={2}
                      {...form.register(field.key)}
                    />
                  ) : (
                    <input
                      {...props}
                      className={raftInputStyles}
                      inputMode={
                        field.key === "latitude" || field.key === "longitude"
                          ? "decimal"
                          : undefined
                      }
                      placeholder={
                        "placeholder" in field ? field.placeholder : undefined
                      }
                      {...form.register(field.key)}
                    />
                  )
                }
              </RaftField>
            ))}
          </div>
          <RaftLaneEditor
            form={form}
            locked={!!raft?.cycles.some((cycle) => !cycle.closedAt)}
          />
        </fieldset>
        {mutation.error && (
          <p
            className="mt-4 rounded-control bg-danger/10 p-3 text-sm leading-6 text-danger"
            role="alert"
          >
            {mutation.error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            className="sm:w-auto"
            disabled={mutation.pending}
            onClick={close}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            className="sm:w-auto"
            isPending={mutation.pending}
            pendingLabel="Đang lưu bè..."
          >
            {raft ? "Lưu thay đổi" : "Tạo bè nuôi"}
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={discard}
        title="Bỏ thay đổi chưa lưu?"
        description="Thông tin đang nhập sẽ không được lưu vào hồ sơ bè."
        confirmLabel="Bỏ thay đổi"
        cancelLabel="Tiếp tục nhập"
        tone="danger"
        onOpenChange={setDiscard}
        onConfirm={() => {
          revision.current += 1;
          onClose();
        }}
      />
    </Dialog>
  );
}
