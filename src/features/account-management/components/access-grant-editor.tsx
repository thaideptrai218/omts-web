"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  AccessGrant,
  AssignableRole,
  FarmingZoneOption,
  GrantDraft,
} from "@/features/account-management/domain/account-management";

type AccessGrantEditorProps = Readonly<{
  currentGrants: readonly AccessGrant[];
  disabled?: boolean;
  drafts: readonly GrantDraft[];
  error?: string;
  onChange(drafts: readonly GrantDraft[]): void;
  onRevoke(grant: AccessGrant): void;
  roles: readonly AssignableRole[];
  zones: readonly FarmingZoneOption[];
}>;

const inputStyles =
  "min-h-12 min-w-0 w-full rounded-control border border-border-strong bg-surface px-3 text-text disabled:bg-surface-subtle disabled:text-text-muted";

function formatDate(value: string | null) {
  if (!value) return "Không giới hạn";
  return new Intl.DateTimeFormat("vi-VN").format(new Date(`${value}T00:00:00`));
}

export function AccessGrantEditor({
  currentGrants,
  disabled = false,
  drafts,
  error,
  onChange,
  onRevoke,
  roles,
  zones,
}: AccessGrantEditorProps) {
  const [zoneId, setZoneId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [effectiveTo, setEffectiveTo] = useState("");
  const [draftError, setDraftError] = useState("");
  const effectiveRoles = roles.filter((role) => role.status === "in-use");
  const effectiveZones = zones.filter((zone) => zone.status === "in-use");
  const roleMap = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles]);
  const zoneMap = useMemo(() => new Map(zones.map((zone) => [zone.id, zone])), [zones]);

  function addDraft() {
    if (!zoneId || !roleId || !effectiveFrom) {
      setDraftError("Chọn vùng, vai trò và ngày bắt đầu.");
      return;
    }
    if (effectiveTo && effectiveTo < effectiveFrom) {
      setDraftError("Ngày kết thúc không được trước ngày bắt đầu.");
      return;
    }
    const key = `${zoneId}:${roleId}`;
    const isDuplicate =
      drafts.some((draft) => `${draft.zoneId}:${draft.roleId}` === key) ||
      currentGrants.some(
        (grant) =>
          grant.status === "effective" &&
          `${grant.zoneId ?? "all-zones"}:${grant.roleId}` === key,
      );
    if (isDuplicate) {
      setDraftError("Cặp vùng và vai trò này đang có hiệu lực.");
      return;
    }

    onChange([
      ...drafts,
      {
        effectiveFrom,
        effectiveTo,
        key: `${key}:${crypto.randomUUID()}`,
        roleId,
        zoneId,
      },
    ]);
    setRoleId("");
    setDraftError("");
  }

  return (
    <fieldset className="min-w-0 space-y-4" disabled={disabled}>
      <legend className="text-lg font-semibold text-text">Phân quyền theo vùng</legend>
      <p className="text-sm leading-6 text-text-muted">
        Mỗi dòng là một cặp vùng–vai trò. Có thể thêm nhiều dòng cho cùng tài khoản;
        thu hồi sẽ giữ lại lịch sử thay vì xóa.
      </p>

      {currentGrants.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text">Quyền đã lưu</h3>
          <ul className="mt-2 space-y-2">
            {currentGrants.map((grant) => {
              const role = roleMap.get(grant.roleId);
              const zoneLabel = grant.zoneId
                ? zoneMap.get(grant.zoneId)?.label ?? "Vùng không còn trong danh mục"
                : "Tất cả vùng";
              return (
                <li
                  className={`rounded-control border p-3 ${
                    grant.status === "effective"
                      ? "border-border bg-surface"
                      : "border-border bg-surface-subtle text-text-muted"
                  }`}
                  key={grant.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-text">
                        {zoneLabel} <span className="text-text-muted">·</span> {role?.name ?? "Vai trò không còn trong danh mục"}
                      </p>
                      <p className="mt-1 text-sm">
                        {formatDate(grant.effectiveFrom)} → {formatDate(grant.effectiveTo)}
                      </p>
                      {grant.status === "revoked" && (
                        <p className="mt-2 text-sm leading-6">
                          Đã thu hồi{grant.revocationReason ? `: ${grant.revocationReason}` : ""}
                        </p>
                      )}
                    </div>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        grant.status === "effective"
                          ? "bg-emerald-100 text-success"
                          : "bg-slate-200 text-text-muted"
                      }`}>
                        {grant.status === "effective" ? "Hiệu lực" : "Đã thu hồi"}
                      </span>
                      {grant.status === "effective" && !disabled && (
                        <button
                          className="min-h-11 rounded-control px-3 text-sm font-semibold text-danger hover:bg-rose-50"
                          onClick={() => onRevoke(grant)}
                          type="button"
                        >
                          Thu hồi
                        </button>
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!disabled && (
        <div className="rounded-card border border-border bg-surface-subtle p-4">
          <h3 className="font-semibold text-text">Thêm quyền truy cập</h3>
          <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2">
            <label className="min-w-0 text-sm font-semibold text-text">
              Vùng <span className="text-danger">*</span>
              <select className={`mt-2 ${inputStyles}`} onChange={(event) => setZoneId(event.target.value)} value={zoneId}>
                <option value="">Chọn vùng</option>
                <option value="all-zones">Tất cả vùng</option>
                {effectiveZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.label}</option>)}
              </select>
            </label>
            <label className="min-w-0 text-sm font-semibold text-text">
              Vai trò <span className="text-danger">*</span>
              <select className={`mt-2 ${inputStyles}`} onChange={(event) => setRoleId(event.target.value)} value={roleId}>
                <option value="">Chọn vai trò</option>
                {effectiveRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
            </label>
            <label className="min-w-0 text-sm font-semibold text-text">
              Hiệu lực từ <span className="text-danger">*</span>
              <input className={`mt-2 ${inputStyles}`} onChange={(event) => setEffectiveFrom(event.target.value)} type="date" value={effectiveFrom} />
            </label>
            <label className="min-w-0 text-sm font-semibold text-text">
              Hiệu lực đến <span className="font-normal text-text-muted">(không bắt buộc)</span>
              <input className={`mt-2 ${inputStyles}`} min={effectiveFrom} onChange={(event) => setEffectiveTo(event.target.value)} type="date" value={effectiveTo} />
            </label>
          </div>
          {draftError && <p className="mt-3 text-sm font-medium text-danger">{draftError}</p>}
          <Button className="mt-4 sm:w-auto" onClick={addDraft} variant="secondary">Thêm dòng quyền</Button>
        </div>
      )}

      {drafts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text">Sẽ thêm khi lưu</h3>
          <ul className="mt-2 space-y-2">
            {drafts.map((draft) => (
              <li className="flex flex-col gap-3 rounded-control border border-primary/30 bg-primary-soft p-3 sm:flex-row sm:items-center sm:justify-between" key={draft.key}>
                <div className="min-w-0">
                  <p className="font-semibold text-text">
                    {draft.zoneId === "all-zones" ? "Tất cả vùng" : zoneMap.get(draft.zoneId)?.label} · {roleMap.get(draft.roleId)?.name}
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    {formatDate(draft.effectiveFrom)} → {formatDate(draft.effectiveTo || null)}
                  </p>
                </div>
                {!disabled && (
                  <button className="min-h-11 shrink-0 rounded-control px-3 text-sm font-semibold text-danger hover:bg-white/60" onClick={() => onChange(drafts.filter((item) => item.key !== draft.key))} type="button">
                    Bỏ dòng
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
    </fieldset>
  );
}
