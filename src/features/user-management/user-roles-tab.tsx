"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { loadOptions } from "@/features/operations/lookups";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { RolePermissionReadView } from "@/features/personal-api/role-read-view";
import { ACCOUNTANT_ROLE, ZONE_MANAGER_ROLE, countRoleHolders, roleLabel, type UserAccount } from "./user-account-model";

const roleCards = [
  { code: ZONE_MANAGER_ROLE, summary: "Vận hành hằng ngày trong các vùng được cấp: phân công, chấm công, ươm, thả, thu hoạch, xem báo cáo vùng. Một người có thể phụ trách nhiều vùng nếu Chủ hợp tác xã cấp." },
  { code: ACCOUNTANT_ROLE, summary: "Tiền, chứng từ, công nợ và báo cáo trên toàn hợp tác xã. Thông thường chỉ có một Kế toán; luôn làm việc ở tất cả vùng." },
] as const;

/** Who holds the role right now, in the Owner's words ("Lan, Hải và 2 người khác"); empty when nobody does. */
function holderNames(accounts: readonly UserAccount[], code: string): string {
  const names = accounts.filter((account) => account.pairs.some((pair) => pair.role === code)).map((account) => account.displayName);
  if (!names.length) return "Chưa có ai giữ vai trò này.";
  return names.length > 3 ? `${names.slice(0, 3).join(", ")} và ${names.length - 3} người khác` : names.join(", ");
}

/**
 * Tab "Vai trò": the two fixed roles (they cannot be created, edited or deleted) with how many accounts hold each,
 * and the read-only permission matrix of the selected role. Holder counts come from the loaded accounts' Effective pairs.
 */
export function UserRolesTab({ accounts }: { accounts: readonly UserAccount[] | undefined }) {
  const roles = useRemote(useCallback((signal: AbortSignal) => loadOptions("roles", signal), []));
  const [selected, setSelected] = useState<string>(ZONE_MANAGER_ROLE), matrix = useRef<HTMLDivElement>(null);
  const show = (code: string) => {
    setSelected(code);
    // jsdom has no scrollIntoView; real browsers scroll to the matrix and keep keyboard focus there.
    matrix.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    matrix.current?.focus({ preventScroll: true });
  };
  const counts = useMemo(() => countRoleHolders(accounts ?? []), [accounts]);
  const roleId = roles.data?.find((role) => role.code === selected)?.id;
  const detail = useRemote(useCallback((signal: AbortSignal) => roleId ? createWorkspaceRepository("roles").detail(roleId, signal) : Promise.resolve({ status: "error" as const, httpStatus: 0, uncertain: false }), [roleId]));
  return <section aria-label="Vai trò" className="space-y-4">
    <p className="text-sm text-text-muted">Hợp tác xã dùng hai vai trò cố định. Vai trò không thể tạo mới, sửa hay xóa; Chủ hợp tác xã chỉ gán vai trò cho người dùng theo vùng.</p>
    <div className="grid gap-3 md:grid-cols-2">{roleCards.map((card) => <article key={card.code} className="rounded-card border border-border bg-surface p-4" data-selected={selected === card.code || undefined}>
      <h2 className="text-lg font-semibold">{roleLabel(card.code)}</h2>
      <p className="mt-1 text-sm">{card.summary}</p>
      <p className="mt-2 text-sm font-medium">{accounts ? `${counts[card.code] ?? 0} người đang dùng` : "Đang đếm người dùng…"}</p>
      {accounts && <p className="text-xs text-text-muted">{holderNames(accounts, card.code)}</p>}
      <Button className="mt-3 w-auto" variant={selected === card.code ? "primary" : "secondary"} aria-pressed={selected === card.code} onClick={() => show(card.code)}>Xem quyền của vai trò</Button>
    </article>)}</div>
    {/* The matrix region always exists: the button scrolls here and moves focus, so the click visibly does something. */}
    <div ref={matrix} tabIndex={-1} aria-live="polite" className="scroll-mt-4 space-y-4 outline-none">
      <h2 className="text-lg font-semibold">Quyền của vai trò {roleLabel(selected)}</h2>
      {roles.loading && <Skeleton />}
      <ErrorNotice error={roles.error} />{roles.error && <Button className="w-auto" variant="secondary" onClick={roles.reload}>Tải lại vai trò</Button>}
      {roles.data && !roleId && <ErrorNotice error="Chưa tìm thấy vai trò này trong danh mục của hệ thống." />}
      {roleId && detail.loading && <Skeleton />}
      {roleId && <ErrorNotice error={detail.error} />}
      {detail.data && <RolePermissionReadView record={detail.data} />}
    </div>
  </section>;
}
