"use client";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { loadOptions } from "@/features/operations/lookups";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { AccountGrantHistory } from "@/features/personal-api/account-grants";
import { readAccountGrants } from "@/features/personal-api/account-grants-repository";
import type { PlanResult } from "./user-grant-apply";
import { heldGrants } from "./user-grant-diff";
import { UserGrantEditorForm } from "./user-grant-editor-form";

const IN_USE = 101;

/** Per-item outcome after "Lưu thay đổi": what worked and what did not, each failure with its reason in plain Vietnamese. */
function PlanResults({ results }: { results: readonly PlanResult[] }) {
  const failed = results.some((result) => !result.ok);
  return <div role={failed ? "alert" : "status"} className={`space-y-1 rounded-control border p-3 text-sm ${failed ? "border-danger/30 bg-danger/5" : "border-border bg-surface-subtle"}`}>
    <ul className="space-y-1">{results.map((result, index) => <li key={index}>
      {result.ok ? `Đã ${result.item.kind === "add" ? "thêm" : "bỏ"}: ${result.item.label}.` : `Chưa ${result.item.kind === "add" ? "thêm" : "bỏ"} ${result.item.label}: ${result.message}`}
    </li>)}</ul>
    {results.some((result) => result.ok) && <p className="text-text-muted">Người dùng cần đăng nhập lại để thấy quyền và vùng mới.</p>}
    {failed && <p className="text-text-muted">Lựa chọn của bạn được giữ nguyên; sửa rồi bấm Lưu thay đổi để thử lại phần chưa xong.</p>}
  </div>;
}

/**
 * "Vai trò và vùng" of one account: the editor (current zones ticked, one save for the difference) and, collapsed below it,
 * the read-only history. Zones are read live so a zone created a minute ago is offered at once; only In Use zones can be granted.
 */
export function UserGrantEditor({ accountId, beforeGrant, onChanged }: { accountId: string; beforeGrant?(role: string): Promise<boolean>; onChanged?(): void }) {
  const grants = useRemote(useCallback((signal: AbortSignal) => readAccountGrants(accountId, signal), [accountId]));
  const zonesRemote = useRemote(useCallback((signal: AbortSignal) => loadOptions("zones", signal), []));
  const [version, setVersion] = useState(0), [results, setResults] = useState<PlanResult[]>();
  const zones = useMemo(() => (zonesRemote.data ?? []).filter((zone) => zone.statusId === IN_USE).map((zone) => ({ id: zone.id, name: String(zone.name ?? zone.code ?? "") })), [zonesRemote.data]);
  const held = useMemo(() => heldGrants(grants.data ?? []), [grants.data]);
  const fingerprint = held.map((grant) => grant.id).sort().join(",");
  const [pinned, setPinned] = useState<string>();
  function applied(done: PlanResult[]) {
    setResults(done);
    setPinned(done.every((result) => result.ok) ? undefined : fingerprint);
    if (done.some((result) => result.ok)) { grants.refresh(); onChanged?.(); setVersion((now) => now + 1); }
  }
  if (grants.loading || (zonesRemote.loading && !zonesRemote.data)) return <Skeleton />;
  if (grants.error || !grants.data) return <div className="space-y-2"><ErrorNotice error={grants.error ?? "Chưa đọc được phân quyền."} /><Button className="w-auto" variant="secondary" onClick={grants.reload}>Tải lại phân quyền</Button></div>;
  return <div className="space-y-4">
    <ErrorNotice error={zonesRemote.error} />
    {/* The editor restarts from the new grants whenever they change, except after a partial failure: then its key is pinned so the Owner's ticks survive. */}
    <UserGrantEditorForm key={pinned ?? fingerprint} accountId={accountId} held={held} zones={zones} beforeGrant={beforeGrant} onApplied={applied} />
    {results && <PlanResults results={results} />}
    <AccountGrantHistory accountId={accountId} refreshKey={version} />
  </div>;
}
