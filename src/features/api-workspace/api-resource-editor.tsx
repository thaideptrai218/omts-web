"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { validVietnamesePhone, vietnamesePhoneMessage } from "@/components/form/phone-input-rules";
import { Dialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { ResourceExtras } from "@/features/farming-api/resource-extras";
import { ResourceEditorFields } from "./api-resource-editor-fields";
import { ResourceEditorIdentity } from "./api-resource-editor-identity";
import { ResourceEditorRecordSummary } from "./api-resource-editor-record-summary";
import { DuplicateRecordReview, LatestRecordReview } from "./api-resource-editor-review";
import catalogStyles from "./catalog.module.css";
import { resources, type ResourceKey } from "./resources";
import { workspaceError } from "./workspace-error";
import { createWorkspaceRepository, type ApiRecord } from "./workspace-repository";
import { RaftResourceEditor } from "./raft-resource-editor";

type MutationAction = "create" | "update" | "discontinue" | "reactivate" | "lock" | "unlock";

const emptyBank = { bankName: "", accountNumber: "", accountHolderName: "" };
const workingZoneIdsOf = (record: ApiRecord | null) =>
  Array.isArray(record?.workingZones) ? record.workingZones.map((zone) => zone.id) : [];
const fieldValueOf = (record: ApiRecord | null, key: string) => (record?.[key] == null ? "" : String(record[key]));

/** Create/edit dialog for a generic workspace resource, including status changes and conflict review. */
type ResourceEditorProps = {
  resource: ResourceKey; record: ApiRecord | null; canEdit: boolean; zones: ApiRecord[]; zoneId: string;
  onClose(): void; onSaved(record: ApiRecord): void;
};

export function ResourceEditor(props: ResourceEditorProps) {
  return props.resource === "rafts" ? <RaftResourceEditor {...props} /> : <GenericResourceEditor {...props} />;
}

function GenericResourceEditor({
  resource,
  record,
  canEdit,
  zones,
  zoneId,
  onClose,
  onSaved,
}: {
  resource: ResourceKey;
  record: ApiRecord | null;
  canEdit: boolean;
  zones: ApiRecord[];
  zoneId: string;
  onClose(): void;
  onSaved(record: ApiRecord): void;
}) {
  const confirmation = useActionDialog();
  const definition = resources[resource];
  const repository = useMemo(() => createWorkspaceRepository(resource), [resource]);
  // Row version used for updates and status changes.
  const original = useRef(record);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(definition.fields.map((field) => [field.key, fieldValueOf(record, field.key)])),
  );
  // Seed unit returned with the code proposal; when set, it fixes the unit of seed items.
  const [seedUnit, setSeedUnit] = useState<string | null>();
  const [proposalError, setProposalError] = useState<string>();
  const [proposalRefresh, setProposalRefresh] = useState(0);

  // New input items get a proposed code (and seed unit) from the backend.
  useEffect(() => {
    if (resource !== "input-items" || record || !canEdit) return;
    const controller = new AbortController();
    void repository.proposal(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.status === "success") {
        setSeedUnit(result.data.seedUnit);
        setProposalError(undefined);
        setValues((current) => ({
          ...current,
          code: current.code || result.data.code,
          unit: current.group === "Seed" && result.data.seedUnit ? result.data.seedUnit : current.unit,
        }));
      } else if (result.httpStatus === 404) {
        // Older backend contracts have no code proposal; the editable code and unit fields remain available.
        setProposalError(undefined);
      } else setProposalError(workspaceError(result));
    });
    return () => controller.abort();
  }, [resource, record, canEdit, repository, proposalRefresh]);

  const discontinued = record?.statusId === 102 && ["suppliers", "input-items"].includes(resource);
  // Synced trader phone numbers, used items' group/unit and the seed unit cannot be edited.
  const lockedField = (key: string) =>
    (resource === "customers" && key === "phoneNumber" && record?.phoneLocked === true) ||
    (resource === "input-items" &&
      ((record?.isUsed === true && ["group", "unit"].includes(key)) ||
        (key === "unit" && values.group === "Seed" && !!seedUnit)));
  const [workingZoneIds, setWorkingZoneIds] = useState<string[]>(() => workingZoneIdsOf(record));
  const [bank, setBank] = useState<Record<string, string>>(() =>
    record?.bankAccount && typeof record.bankAccount === "object"
      ? (record.bankAccount as Record<string, string>)
      : { ...emptyBank },
  );
  const [laneCount, setLaneCount] = useState(String(record?.laneCount ?? 1));
  const [pending, setPending] = useState(false);
  // Synchronous guard against double submits before `pending` re-renders.
  const pendingRef = useRef(false);
  const [error, setError] = useState<string>();
  // Set after an uncertain result or error MSG06; further writes stay disabled while the user reviews.
  const [blocked, setBlocked] = useState(false);
  const [problemField, setProblemField] = useState<string>();
  const [duplicateId, setDuplicateId] = useState<string>();
  const [duplicate, setDuplicate] = useState<ApiRecord>();
  const [latest, setLatest] = useState<ApiRecord>();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const dirty =
    definition.fields.some((field) => values[field.key] !== fieldValueOf(record, field.key)) ||
    (resource === "employees" &&
      (JSON.stringify(workingZoneIds) !== JSON.stringify(workingZoneIdsOf(record)) ||
        JSON.stringify(bank) !== JSON.stringify(record?.bankAccount ?? emptyBank))) ||
    (resource === "rafts" && laneCount !== String(record?.laneCount ?? 1));
  const statusEditable = definition.editable && (record ? canEdit : true);
  // Discontinued catalogue entries and merged customers are read-only.
  const editable = statusEditable && !discontinued && !(resource === "customers" && record?.mergedIntoCustomerId);

  function buildBody(action: MutationAction, reason?: string) {
    const body: Record<string, unknown> =
      action === "lock" || action === "unlock"
        ? { reason }
        : action === "discontinue" || action === "reactivate"
          ? { rowVersion: original.current?.rowVersion }
          : Object.fromEntries(
              definition.fields.map((field) => [
                field.key,
                field.type === "number"
                  ? values[field.key] === ""
                    ? null
                    : Number(values[field.key])
                  : values[field.key] || null,
              ]),
            );
    if (action === "update") body.rowVersion = original.current?.rowVersion;
    if (resource === "employees" && (action === "create" || action === "update")) {
      body.workingZoneIds = workingZoneIds;
      body.bankAccount = Object.values(bank).some(Boolean) ? bank : null;
      body.accountId =
        record?.account && typeof record.account === "object" && "id" in record.account ? record.account.id : null;
    }
    if (resource === "rafts" && (action === "create" || action === "update")) {
      body.laneCount = Number(laneCount);
    }
    return body;
  }

  async function mutate(action: MutationAction, reason?: string) {
    if (pendingRef.current || blocked || ((action === "create" || action === "update") && !editable)) return;
    if (resource === "accounts" && (action === "create" || action === "update") && !validVietnamesePhone(values.phoneNumber ?? "")) {
      setError(vietnamesePhoneMessage);
      return;
    }
    pendingRef.current = true;
    setPending(true);
    setError(undefined);
    setProblemField(undefined);
    setDuplicateId(undefined);
    setDuplicate(undefined);
    const body = buildBody(action, reason);
    const result = await repository.mutate(action, body, record?.id, zoneId || undefined);
    pendingRef.current = false;
    if (!mounted.current) return;
    setPending(false);
    if (result.status === "success") onSaved(result.data);
    else {
      setError(workspaceError(result));
      setBlocked(result.uncertain || result.code === "MSG06");
      setProblemField(result.catalogueProblem?.field);
      setDuplicateId(result.catalogueProblem?.existingId);
    }
  }

  /** Loads a record for review while holding the pending guard. */
  async function readDetail(id: string, onLoaded: (record: ApiRecord) => void) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    const result = await repository.detail(id);
    pendingRef.current = false;
    if (!mounted.current) return;
    setPending(false);
    if (result.status === "success") onLoaded(result.data);
    else setError(workspaceError(result));
  }

  const confirmClose = async () => {
    if (!dirty || (await confirmation.confirm("Bỏ các thay đổi chưa lưu?"))) onClose();
  };

  return (
    <Dialog
      open
      title={`${record ? "Hồ sơ" : "Thêm mới"} · ${definition.title}`}
      size="lg"
      dismissible={!pending}
      onOpenChange={async (open) => {
        if (!open && !pendingRef.current && (!dirty || (await confirmation.confirm("Bỏ các thay đổi chưa lưu?"))))
          onClose();
      }}
    >
      {confirmation.dialog}
      <form
        className={
          ["suppliers", "input-items", "customers", "accounts", "roles"].includes(resource)
            ? catalogStyles.editor
            : undefined
        }
        onSubmit={(event) => {
          event.preventDefault();
          void mutate(record ? "update" : "create");
        }}
      >
        <ResourceEditorIdentity resource={resource} record={record} />
        {discontinued && <p className="mb-4">Khôi phục sử dụng trước khi chỉnh sửa hồ sơ.</p>}
        {resource === "customers" && record?.phoneLocked === true && (
          <p className="mb-4 text-sm text-text-muted">
            Số điện thoại được đồng bộ từ tài khoản thương lái và không chỉnh sửa tại hồ sơ khách hàng.
          </p>
        )}
        {resource === "customers" && !!record?.mergedIntoCustomerId && (
          <p className="mb-4">Hồ sơ đã được gộp vào khách hàng khác, chỉ được xem.</p>
        )}
        {proposalError && (
          <div role="alert">
            <p>{proposalError}</p>
            <Button variant="secondary" onClick={() => setProposalRefresh((value) => value + 1)}>
              Tải lại mã gợi ý và đơn vị giống
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="mb-4 rounded-control border border-danger p-4">
            {error}
          </p>
        )}
        {problemField && (
          <p role="alert">
            Kiểm tra trường:{" "}
            {definition.fields.find((field) => field.key === problemField)?.label ?? "Thông tin danh mục"}.
          </p>
        )}
        {duplicateId && (
          <DuplicateRecordReview
            resource={resource}
            pending={pending}
            duplicate={duplicate}
            onLoad={() => void readDetail(duplicateId, setDuplicate)}
          />
        )}
        <fieldset disabled={pending || !editable} className="grid gap-4 sm:grid-cols-2">
          <ResourceEditorFields
            resource={resource}
            record={record}
            values={values}
            setValues={setValues}
            lockedField={lockedField}
            seedUnit={seedUnit}
            zones={zones}
            workingZoneIds={workingZoneIds}
            setWorkingZoneIds={setWorkingZoneIds}
            bank={bank}
            setBank={setBank}
            laneCount={laneCount}
            setLaneCount={setLaneCount}
          />
        </fieldset>
        {record && !["suppliers", "input-items", "customers", "accounts", "roles"].includes(resource) && (
          <ResourceEditorRecordSummary resource={resource} record={record} />
        )}
        {blocked && record && (
          <LatestRecordReview
            resource={resource}
            pending={pending}
            latest={latest}
            confirmation={confirmation}
            onLoad={() => void readDetail(record.id, setLatest)}
            onUseLatest={onSaved}
          />
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button className="w-auto" variant="secondary" disabled={pending} onClick={confirmClose}>
            Đóng
          </Button>
          {editable && (
            <Button
              className="w-auto"
              type="submit"
              isPending={pending}
              disabled={blocked || (record !== null && !dirty)}
            >
              Lưu
            </Button>
          )}
          {statusEditable && record && ["zones", "suppliers", "input-items", "rafts"].includes(resource) && (
            <Button
              className="w-auto"
              variant="secondary"
              disabled={pending || dirty || blocked}
              onClick={async () => {
                const action = record.statusId === 102 ? "reactivate" : "discontinue";
                if (
                  await confirmation.confirm(
                    action === "reactivate" ? "Khôi phục sử dụng bản ghi này?" : "Ngừng sử dụng bản ghi này?",
                  )
                )
                  void mutate(action);
              }}
            >
              {record.statusId === 102 ? "Khôi phục" : "Ngừng dùng"}
            </Button>
          )}
          {editable && record && resource === "accounts" && (
            <Button
              className="w-auto"
              variant="secondary"
              disabled={pending || dirty || blocked}
              onClick={async () => {
                const action = record.status === "Locked" ? "unlock" : "lock";
                const reason = await confirmation.prompt(
                  action === "lock" ? "Lý do khóa tài khoản" : "Lý do mở khóa tài khoản",
                );
                if (reason?.trim()) void mutate(action, reason.trim());
              }}
            >
              {record.status === "Locked" ? "Mở khóa" : "Khóa tài khoản"}
            </Button>
          )}
        </div>
      </form>
      {record && (
        <>
          <ResourceExtras
            resource={resource}
            record={record}
            busy={pending}
            dirty={dirty}
            blocked={blocked}
            onSaved={onSaved}
          />
        </>
      )}
    </Dialog>
  );
}
