"use client";
import { SelectBox } from "@/components/ui/select-box";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Skeleton, displayTime, useRemote } from "@/features/operations/ui";
import { roleDisplayName } from "./role-display-name";
import { readAccountGrants } from "./account-grants-repository";
const stateLabels = { Effective: "Hiệu lực", Expired: "Hết hạn", NotYetEffective: "Chưa đến hạn", Revoked: "Đã thu hồi" };
const date = (value: string) => value.split("-").reverse().join("/");

/** Read-only audit trail of every grant (also expired and revoked ones). Changing grants happens in the editor above it, never here. */
function GrantHistoryRows({ accountId }: { accountId: string }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => readAccountGrants(accountId, signal), [accountId]));
  const [filter, setFilter] = useState("");
  const rows = remote.data?.filter((row) => !filter || row.state === filter);
  return <div className="space-y-3">
    {remote.loading && <Skeleton />}<ErrorNotice error={remote.error} />
    {!remote.loading && <Button className="w-auto" variant="secondary" onClick={remote.reload}>Tải lại phân quyền</Button>}
    {remote.data && <><label className="block text-sm font-semibold">Tình trạng phân quyền<SelectBox className="mt-2 min-h-12 w-full rounded-control border border-border bg-surface px-3" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">Tất cả</option>{Object.entries(stateLabels).map(([state, label]) => <option key={state} value={state}>{label}</option>)}</SelectBox></label>
      {!rows?.length && <p>Không có cặp vùng – vai trò phù hợp.</p>}
      <ul className="space-y-3">{rows?.map((row) => <li key={row.id} className="space-y-1 rounded-control border border-border p-3 break-words"><p className="font-semibold">{roleDisplayName(row.role, row.roleName)} · {stateLabels[row.state]}</p><p>{row.allZones ? "Tất cả vùng" : row.zoneName || "Vùng chưa có tên trong danh mục"}</p><p className="text-sm">{row.grantedAt ? `Cấp lúc ${displayTime(row.grantedAt)}${row.grantedByName ? ` · ${row.grantedByName}` : ""}` : `Từ ${date(row.effectiveFrom!)} · Đến ${row.effectiveTo ? date(row.effectiveTo) : "Không giới hạn"}`}</p>
        {row.revokedAt && <p className="text-sm">Thu hồi: {displayTime(row.revokedAt)}{row.revokedByName ? ` · ${row.revokedByName}` : ""}</p>}{row.revokeReason && <p className="text-sm">Lý do: {row.revokeReason}</p>}
      </li>)}</ul>
    </>}
  </div>;
}

/** Collapsed "Lịch sử phân quyền". It reads only when opened; `refreshKey` changes after an edit so the list is read again. */
export function AccountGrantHistory({ accountId, refreshKey = 0 }: { accountId: string; refreshKey?: number }) {
  const [open, setOpen] = useState(false);
  return <details className="rounded-card border border-border p-3" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer font-semibold">Lịch sử phân quyền</summary>
    {open && <div className="mt-3"><GrantHistoryRows key={refreshKey} accountId={accountId} /></div>}
  </details>;
}
