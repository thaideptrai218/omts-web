"use client";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller } from "@/components/ui/management-screen/management-table";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { ScreenGuide } from "@/components/ui/screen-guide";
import { emptyUserFilters, filterUserAccounts, hasUserFilters, sortUserAccounts, type AccountSort, type UserFilters } from "@/features/account-access/user-account-list-model";
import { UserCreateDialog } from "@/features/account-access/user-create-dialog";
import { useUserAccounts } from "@/features/account-access/use-user-accounts";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { PermissionDeniedNotice } from "@/features/employee-api/permission-denied-notice";
import { accountColumns, defaultAccountColumns } from "./user-accounts-columns";
import { UserAccountsFilters } from "./user-accounts-filters";
import { UserAccountsTable } from "./user-accounts-table";
import { UserDetailDialog } from "./user-detail-dialog";
import { useLinkedEmployees } from "./use-linked-employees";
import styles from "./user-accounts.module.css";

export const ACCOUNT_COLUMNS_STORAGE = "omts-columns-user-accounts-v1";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pinned = ["name", "state"], pickable = accountColumns.filter((column) => !pinned.includes(column.key));

/**
 * "Tài khoản người dùng" (Cài đặt > Người dùng): every login of the cooperative, apart from the employee records of the Nhân viên screen.
 * Owner only, like the backend. A single valid `?accountId=` opens that account. Filtering, sorting and paging happen here over the
 * full list (a cooperative has a handful of accounts), so a role or zone filter never misses a row on another page.
 */
export function UserAccountsScreen() {
  const context = useApiWorkspace();
  if (context.identity.subjectType !== "CooperativeOwner") return <PermissionDeniedNotice />;
  return <UserAccountsContent selfId={context.identity.accountId} />;
}

function UserAccountsContent({ selfId }: { selfId: string }) {
  const ids = useSearchParams()?.getAll("accountId") ?? [];
  const [openId, setOpenId] = useState<string | undefined>(ids.length === 1 && UUID_PATTERN.test(ids[0]) ? ids[0] : undefined);
  const [filters, setFilters] = useState<UserFilters>(emptyUserFilters);
  const [sort, setSort] = useState<AccountSort>({ key: "", direction: "asc" });
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10), [creating, setCreating] = useState(false), [notice, setNotice] = useState<string>();
  const [stored, store] = useStoredValue(ACCOUNT_COLUMNS_STORAGE, defaultAccountColumns.join(","));
  const data = useUserAccounts(true), employees = useLinkedEmployees(true);
  const visible = accountColumns.filter((column) => pinned.includes(column.key) || stored.split(",").includes(column.key)).map((column) => column.key);
  const names = useMemo(() => new Map([...employees.byId].map(([id, employee]) => [id, employee.name])), [employees.byId]);
  const rows = useMemo(() => sortUserAccounts(filterUserAccounts(data.accounts ?? [], filters, names), sort), [data.accounts, filters, names, sort]);
  const last = Math.max(1, Math.ceil(rows.length / pageSize)), current = Math.min(page, last);
  const pageRows = rows.slice((current - 1) * pageSize, current * pageSize);
  const filtering = hasUserFilters(filters);
  const change = (apply: () => void) => { apply(); setPage(1); };
  const reset = () => change(() => { setFilters(emptyUserFilters); });
  const refreshAll = () => { data.refresh(); employees.refresh(); };
  return <>
    <ScreenGuide id="user-accounts-screen-v1" steps={[
      { title: "Tìm tài khoản", text: "Gõ tên đăng nhập, tên, số điện thoại hoặc email.", target: 'input[aria-label="Tìm tài khoản"]' },
      { title: "Tạo tài khoản", text: "Bấm Tạo tài khoản, nhập thông tin và chọn vai trò theo vùng. Mật khẩu tạm hiện một lần sau khi lưu.", target: "text:Tạo tài khoản" },
      { title: "Lọc danh sách", text: "Bấm Lọc để lọc theo vai trò, vùng, trạng thái hoặc có gắn nhân viên.", target: 'button[data-filter-toggle], aside[aria-label="Bộ lọc tài khoản"]' },
      { title: "Mở một tài khoản", text: "Bấm vào tên để sửa thông tin, đổi vai trò và vùng, đặt lại mật khẩu, khóa hoặc xóa.", target: 'button[aria-label^="Mở tài khoản"]' },
      { title: "Chọn cột hiển thị", text: "Thêm hoặc bớt cột như Email, Ghi chú.", target: 'button[aria-label="Chọn trường hiển thị"]' },
    ]} />
    <ManagementLayout storageKey="user-accounts" icon="id-card" title="Tài khoản người dùng" filterLabel="Bộ lọc tài khoản"
      filters={<UserAccountsFilters filters={filters} setFilters={(next) => change(() => setFilters(next))} zones={data.zones} onReset={reset} />}
      filtersActive={hasUserFilters({ ...filters, search: "" })}
      search={<input type="search" aria-label="Tìm tài khoản" placeholder="Theo tên đăng nhập, tên, điện thoại hoặc email" maxLength={200} value={filters.search} onChange={(event) => { const search = event.target.value; change(() => setFilters((now) => ({ ...now, search }))); }} />}
      actions={<>
        <Button className="w-auto" onClick={() => setCreating(true)}><InterfaceIcon name="add" className="mr-1 size-4" />Tạo tài khoản</Button>
        <ColumnPicker columns={pickable} visible={visible} onChange={(keys) => store(keys.join(","))} /><HelpLink />
      </>}
      footer={<ManagementPagination page={current} pageSize={pageSize} total={rows.length} unit="tài khoản" disabled={data.loading} onPage={setPage} onPageSize={(size) => change(() => setPageSize(size))} />}>
      {notice && <p role="status" className="flex-none border-b border-border px-3 py-2 text-sm">{notice}</p>}
      <ManagementScroller busy={data.loading}>
        {data.error ? <ListStateMessage error={data.error} onRetry={data.reload} retryLabel="Tải lại" />
          : !data.accounts ? <div role="status" aria-label="Đang tải danh sách" className={styles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
          : !rows.length ? <ListStateMessage>{filtering ? "Không có tài khoản phù hợp bộ lọc." : "Chưa có tài khoản nào."}
            {filtering ? <button type="button" className="ml-2 font-semibold underline" onClick={reset}>Xóa bộ lọc</button> : <button type="button" className="ml-2 font-semibold underline" onClick={() => setCreating(true)}>Tạo tài khoản</button>}</ListStateMessage>
          : <UserAccountsTable items={pageRows} visible={visible} openId={openId} employees={employees.byId} sort={sort} onSort={(next) => change(() => setSort(next))} onOpen={setOpenId} />}
      </ManagementScroller>
      {creating && <UserCreateDialog onClose={() => setCreating(false)} onCreated={(account) => { setNotice(`Đã tạo tài khoản ${account.username}.`); refreshAll(); }} />}
      {openId && <UserDetailDialog key={openId} accountId={openId} selfId={selfId} employee={employeeOf(data.byId.get(openId)?.employeeId, employees.byId)} onChanged={refreshAll} onClose={() => setOpenId(undefined)} />}
    </ManagementLayout>
  </>;
}

const employeeOf = (id: string | null | undefined, byId: ReturnType<typeof useLinkedEmployees>["byId"]) => id ? byId.get(id) : undefined;
