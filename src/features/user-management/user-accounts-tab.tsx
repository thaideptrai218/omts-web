"use client";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { SelectBox } from "@/components/ui/select-box";
import { FilterGroup, FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, SortableHeader, managementStyles, type SortState } from "@/components/ui/management-screen/management-table";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { useToast } from "@/components/ui/toast-provider";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import { isPermissionDenied, PermissionDeniedNotice } from "@/features/employee-api/permission-denied-notice";
import type { AccountCredential } from "./account-credential-contract";
import { UserCreateForm, type UserCreateInitial } from "./user-create-form";
import { UserCredentialDialog } from "./user-credential-dialog";
import { UserDetailDialog } from "./user-detail-dialog";
import { accountStatusLabel, copyUserGrants, emptyUserFilters, filterUserAccounts, sortUserAccounts, type UserAccount, type UserFilters } from "./user-account-model";
import { UserGrantChips } from "./user-grant-chips";
import { emptyGrantSelection, grantsToSelection } from "./user-grant-selection";
import type { useUserAccounts } from "./use-user-accounts";

type Column = { key: string; label: string; sort?: string; render(account: UserAccount): ReactNode };
const roleOptions = [["ZONE_MANAGER", "Quản lý vùng"], ["ACCOUNTANT", "Kế toán"], ["NONE", "Chưa phân quyền"]] as const;
const statusOptions = [["Active", "Đang hoạt động"], ["Locked", "Đã khóa"]] as const;
const dash = (value: string | null | undefined) => value || "—";
const selectClass = "h-[30px] w-full rounded-md border border-border-strong bg-surface px-2 text-[13px]";

/** Tab "Tài khoản": the table of every staff account with role, zone and linked employee read from the list itself (no per-row requests). */
export function UserAccountsTab({ data, initialAccountId }: { data: ReturnType<typeof useUserAccounts>; initialAccountId?: string }) {
  const { accounts, employees, zones } = data, { notify } = useToast();
  const [filters, setFilters] = useState<UserFilters>(emptyUserFilters), [sort, setSort] = useState<SortState>({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15);
  const [openId, setOpenId] = useState(initialAccountId), [form, setForm] = useState<UserCreateInitial>(), [credential, setCredential] = useState<AccountCredential>();
  const employeeNames = useMemo(() => new Map([...employees.values()].map((employee) => [employee.id, `${employee.code} · ${employee.fullName}`])), [employees]);
  const zoneNames = useMemo(() => new Map(zones.map((zone) => [zone.id, zone.name])), [zones]);
  const columns = useMemo<readonly Column[]>(() => [
    { key: "name", label: "Tên người dùng", sort: "name", render: (a) => <strong className="font-semibold">{a.displayName}</strong> },
    // Status sits next to the name so it stays in view at 1280 px without scrolling sideways.
    { key: "status", label: "Trạng thái", sort: "status", render: (a) => <StatusPill tone={a.status === "Active" ? "success" : "danger"}>{accountStatusLabel(a.status)}</StatusPill> },
    { key: "username", label: "Tên đăng nhập", sort: "username", render: (a) => <span className="break-all">{a.username}</span> },
    { key: "phone", label: "Điện thoại", sort: "phone", render: (a) => dash(a.phoneNumber) },
    { key: "role", label: "Vai trò và vùng", sort: "role", render: (a) => <UserGrantChips pairs={a.pairs} /> },
    { key: "employee", label: "Nhân viên liên kết", sort: "employee", render: (a) => dash(a.employeeId ? employeeNames.get(a.employeeId) : null) },
  ], [employeeNames]);
  const [stored, store] = useStoredValue("omts-columns-accounts", columns.map((column) => column.key).join(","));
  const visible = useMemo(() => { const keys = stored.split(","), shown = columns.filter((column) => keys.includes(column.key)); return shown.length ? shown : columns; }, [stored, columns]);
  const rows = useMemo(() => sortUserAccounts(filterUserAccounts(accounts ?? [], filters, employeeNames), sort, employeeNames), [accounts, filters, sort, employeeNames]);
  const lastPage = Math.max(1, Math.ceil(rows.length / pageSize)), current = Math.min(page, lastPage);
  const pageRows = rows.slice((current - 1) * pageSize, current * pageSize);
  const hasFilter = Object.values(filters).some(Boolean);
  const filter = (key: keyof UserFilters) => (value: string) => { setFilters((now) => ({ ...now, [key]: value })); setPage(1); };
  const openCopy = (account: UserAccount) => { setOpenId(undefined); setForm({ title: "Sao chép người dùng", grants: grantsToSelection(copyUserGrants(account)), hint: `Quyền của ${account.displayName} được chép sang người dùng mới. Hãy nhập thông tin riêng của người dùng mới.` }); };
  const created = (issued: AccountCredential) => { setForm(undefined); setCredential(issued); data.refresh(); notify({ tone: "success", title: `Đã tạo người dùng ${issued.account.username}.` }); };

  const rail = <>
    <div className={listStyles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilter} onClick={() => { setFilters(emptyUserFilters); setPage(1); }}>Đặt lại</button></div>
    <FilterPills legend="Vai trò" name="user-role" value={filters.role} options={roleOptions} onChange={filter("role")} />
    <FilterGroup legend="Vùng"><SelectBox aria-label="Vùng" className={selectClass} value={filters.zoneId} onChange={(event) => filter("zoneId")(event.target.value)}>
      <option value="">Tất cả vùng</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</SelectBox></FilterGroup>
    <FilterPills legend="Trạng thái" name="user-status" value={filters.status} options={statusOptions} onChange={filter("status")} />
  </>;
  return <ManagementLayout storageKey="accounts" icon="users" title="Quản lý người dùng" filters={rail} filterLabel="Bộ lọc người dùng"
    footer={<ManagementPagination page={current} pageSize={pageSize} total={rows.length} unit="người dùng" disabled={data.loading} onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />}
    search={<input type="search" aria-label="Tìm người dùng" placeholder="Theo tên, tên đăng nhập, điện thoại" maxLength={200} value={filters.search} onChange={(event) => filter("search")(event.target.value)} />}
    actions={<>
      <Button className="w-auto" onClick={() => setForm({ title: "Tạo người dùng", grants: emptyGrantSelection })}><InterfaceIcon name="add" className="mr-1 size-4" />Tạo người dùng</Button>
      <ColumnPicker columns={columns} visible={visible.map((column) => column.key)} onChange={(keys) => store(keys.join(","))} />
      <HelpLink />
    </>}>
    <ManagementScroller busy={data.loading}>
      {isPermissionDenied(data.error) ? <PermissionDeniedNotice message={data.error} />
        : data.error ? <ListStateMessage error={data.error} onRetry={data.reload} retryLabel="Tải lại" />
        : !accounts ? <div role="status" aria-label="Đang tải danh sách" className={listStyles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !pageRows.length ? <ListStateMessage>{hasFilter ? "Không có người dùng phù hợp bộ lọc." : "Chưa có người dùng."}
          {hasFilter ? <button type="button" className="ml-2 font-semibold underline" onClick={() => { setFilters(emptyUserFilters); setPage(1); }}>Đặt lại bộ lọc</button>
            : <button type="button" className="ml-2 font-semibold underline" onClick={() => setForm({ title: "Tạo người dùng", grants: emptyGrantSelection })}>Tạo người dùng</button>}</ListStateMessage>
        : <table className={listStyles.table}><thead><tr>
          {visible.map((column) => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={(next) => { setSort(next); setPage(1); }} />)}
        </tr></thead><tbody>{pageRows.map((account) => <OpenableTableRow key={account.id} onOpen={() => setOpenId(account.id)}>
          {visible.map((column, index) => <td key={column.key}>{index === 0
            ? <button type="button" className={managementStyles.linkButton} aria-label={`Mở ${account.displayName}`} onClick={() => setOpenId(account.id)}>{column.render(account)}</button> : column.render(account)}</td>)}
        </OpenableTableRow>)}</tbody></table>}
    </ManagementScroller>
    {openId && accounts && <UserDetailDialog accountId={openId} accounts={accounts} employees={employees} zoneNames={zoneNames} onClose={() => setOpenId(undefined)} onChanged={data.refresh} onCopy={openCopy} />}
    {form && accounts && <UserCreateForm accounts={accounts} zones={zones} employees={employees} initial={form} onClose={() => setForm(undefined)} onCreated={created} />}
    {credential && <UserCredentialDialog title="Đã tạo người dùng" credential={credential} onClose={() => setCredential(undefined)} />}
  </ManagementLayout>;
}
