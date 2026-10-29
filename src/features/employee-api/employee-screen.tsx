"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { VietnameseDateInput } from "@/components/form/vietnamese-date-input";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { createOperationsRepository } from "@/features/operations/repository";
import { loadOptions } from "@/features/operations/lookups";
import { businessToday, control, DataTable, ErrorNotice, Field, Note, Paging, Select, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import { employeeEditorSchema } from "@/features/employee-management/schemas/employee-editor-schema";
import { employeeBankFields, toEmployeeBankAccount } from "@/features/employee-management/schemas/employee-bank-schema";
import { normalizeEmployeePhone } from "@/features/employee-management/schemas/employee-phone";
import { employeePageSchema, employeeViewSchema, employmentChangedSchema, linkableEmployeeAccountsSchema, type Employee, type EmploymentChange } from "./contracts";
import type { EmployeeListItemDto, LinkableEmployeeAccountDto } from "@/features/employee-management/api/employee-contract.schemas";
import { createEmployeeEndDateSchema } from "@/features/employee-management/schemas/employee-employment-schema";

const employmentLabel = (value: string) => value === "Employed" ? "Đang làm việc" : "Đã nghỉ việc";
const accountLabel = (value: string) => value === "Active" ? "Hoạt động" : "Đã khóa";
const dateLabel = (value: string | null) => value ? value.split("-").reverse().join("/") : "—";
const fieldLabels = { "Full name": ["fullName", "Họ và tên"], "Phone number": ["phone", "Số điện thoại"], Birthday: ["birthday", "Ngày sinh"], Address: ["address", "Địa chỉ"], Area: ["area", "Khu vực"], Ward: ["wardCommune", "Phường/Xã"], "Other information": ["otherInformation", "Thông tin khác"], Notes: ["notes", "Ghi chú"], "Working zones": ["workingZoneIds", "Vùng làm việc"], "Bank account": ["bankAccount", "Thông tin ngân hàng"], Account: ["accountId", "Tài khoản đăng nhập"], RowVersion: ["rowVersion", "Phiên bản hồ sơ"] } as const;
export function EmployeeApiScreen() {
  const context = useApiWorkspace();
  return context.identity.subjectType === "CooperativeOwner" ? <EmployeeDirectory /> : <p role="alert">Bạn không có quyền quản lý nhân viên.</p>;
}
function EmployeeDirectory() {
  const repository = useMemo(() => createOperationsRepository("employees"), []);
  const [search, setSearch] = useState(""), [term, setTerm] = useState(""), [statusId, setStatusId] = useState("401"), [zoneId, setZoneId] = useState(""), [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Employee | null>(), [serial, setSerial] = useState(0), [followUp, setFollowUp] = useState<EmploymentChange>(), [notice, setNotice] = useState<string>();
  const opening = useMutation();
  useEffect(() => { const timer = setTimeout(() => { setTerm(search.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  const list = useRemote(useCallback((signal: AbortSignal) => repository.read("list", { search: term, statusId, zoneId, page: String(page), pageSize: "20" }, employeePageSchema, signal), [repository, term, statusId, zoneId, page]));
  const zones = useRemote(useCallback((signal: AbortSignal) => loadOptions("zones", signal), []));
  const accounts = useRemote(useCallback((signal: AbortSignal) => repository.read("linkable-accounts", {}, linkableEmployeeAccountsSchema, signal), [repository]));
  async function open(id: string) { const result = await opening.run(() => repository.read("detail", { id }, employeeViewSchema), true); if (result) { setSelected(result); setSerial((value) => value + 1); } }
  function refresh() { list.reload(); accounts.reload(); }
  return <section><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-semibold">Nhân viên</h1><Button className="sm:w-auto" disabled={opening.pending || zones.loading || accounts.loading || !zones.data || !accounts.data} onClick={() => { setSelected(null); setSerial((value) => value + 1); }}>Thêm nhân viên</Button></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-3"><Field label="Tìm theo tên hoặc số điện thoại" value={search} maxLength={200} onChange={(event) => setSearch(event.target.value)} />
      <Select label="Tình trạng làm việc" value={statusId} onChange={(event) => { setStatusId(event.target.value); setPage(1); }}><option value="401">Đang làm việc</option><option value="402">Đã nghỉ việc</option><option value="">Tất cả</option></Select>
      <Select label="Vùng làm việc" value={zoneId} onChange={(event) => { setZoneId(event.target.value); setPage(1); }}><option value="">Tất cả vùng</option>{zones.data?.map((zone) => <option key={zone.id} value={zone.id}>{String(zone.code)} · {String(zone.name)}</option>)}</Select></div>
    {notice && <p role="status" className="mt-4 text-primary">{notice}</p>}<ErrorNotice error={list.error || zones.error || accounts.error || opening.error} />
    {(list.error || zones.error || accounts.error) && <Button className="w-auto" variant="secondary" onClick={() => { refresh(); zones.reload(); }}>Tải lại danh mục</Button>}
    {list.loading ? <Skeleton /> : list.data && <><DataTable headings={["Họ và tên", "Số điện thoại", "Vùng làm việc", "Tài khoản", "Tình trạng", "Hồ sơ"]} empty={!list.data.items.length}>{list.data.items.map((row) => <tr key={row.id}><td>{row.fullName}</td><td>{row.phoneNumber ?? "—"}</td><td>{row.workingZones.map((zone) => zone.code).join(", ") || "—"}</td><td>{row.account ? `@${row.account.username} · ${accountLabel(row.account.status)}` : "Chưa liên kết"}</td><td>{employmentLabel(row.status)}</td><td><button className="text-primary underline" disabled={opening.pending} onClick={() => void open(row.id)}>Mở {row.fullName}</button></td></tr>)}</DataTable>
      <Paging page={page} total={list.data.total} disabled={list.loading} onChange={setPage} /></>}
    {selected !== undefined && <EmployeeApiEditor key={serial} record={selected} zones={zones.data ?? []} accounts={accounts.data ?? []} lookupsReady={!!zones.data && !!accounts.data && !accounts.loading}
      onClose={() => setSelected(undefined)} onReloadAccounts={accounts.reload} onAdopt={(employee) => { setSelected(employee); setSerial((value) => value + 1); refresh(); setNotice(undefined); }} onSaved={(employee, follow) => { setSelected(employee); setSerial((value) => value + 1); refresh(); setNotice("Đã lưu hồ sơ nhân viên."); if (follow?.followUp) setFollowUp(follow); }}
      onUnlinked={() => { refresh(); setNotice("Đã bỏ liên kết tài khoản."); }} />}
    {followUp?.followUp && <Dialog open title={followUp.followUp.action === "review-lock" ? "Nhắc xử lý tài khoản" : "Nhắc kiểm tra quyền truy cập"} onOpenChange={(open) => { if (!open) setFollowUp(undefined); }}>
      <p>{followUp.employee.fullName} · @{followUp.employee.account?.username}</p><p className="my-4">{followUp.followUp.action === "review-lock" ? "Nhân viên đã nghỉ việc. Hãy kiểm tra tài khoản và khóa nếu cần." : "Nhân viên đã đi làm lại. Hãy kiểm tra trạng thái tài khoản và quyền truy cập."}</p>
      <div className="flex flex-wrap gap-3"><Button className="w-auto" variant="secondary" onClick={() => setFollowUp(undefined)}>Để sau</Button><Link className="inline-flex min-h-12 items-center rounded-control bg-primary px-4 text-white" href={`/workspace/accounts?accountId=${followUp.followUp.accountId}`}>Mở tài khoản nội bộ</Link></div>
    </Dialog>}
  </section>;
}
function valuesOf(record: Employee | null) { return { fullName: record?.fullName ?? "", phone: record?.phoneNumber ?? "", birthday: record?.birthday ?? "", address: record?.address ?? "", area: record?.area ?? "", wardCommune: record?.ward ?? "", otherInformation: record?.otherInformation ?? "", notes: record?.notes ?? "",
  accountId: record?.account?.id ?? "", workingZoneIds: record?.workingZones.map((zone) => zone.id) ?? [], bankAccount: employeeBankFields(record?.bankAccount ?? null) }; }
type EmployeeEditorProps = { record: Employee | null; zones: ApiRecord[]; accounts: LinkableEmployeeAccountDto[]; lookupsReady: boolean; onClose(): void; onReloadAccounts(): void; onAdopt(employee: Employee): void; onSaved(employee: Employee, followUp?: EmploymentChange): void; onUnlinked(employee: Employee): void };
export function EmployeeApiEditor({ record, zones, accounts, lookupsReady, onClose, onReloadAccounts, onAdopt, onSaved, onUnlinked }: EmployeeEditorProps) {
  const repository = useMemo(() => createOperationsRepository("employees"), []), mutation = useMutation();
  const [baseline, setBaseline] = useState(record), [values, setValues] = useState(() => valuesOf(record)), [issues, setIssues] = useState<{ path: string; message: string }[]>([]), [latest, setLatest] = useState<Employee>(), [compared, setCompared] = useState<Employee>();
  const [action, setAction] = useState<"unlink" | "end-employment" | "reinstate">(), [endDate, setEndDate] = useState(businessToday), [actionError, setActionError] = useState<string>(), [discard, setDiscard] = useState(false), [reconciledRows, setReconciledRows] = useState<EmployeeListItemDto[]>();
  const formRef = useRef<HTMLFormElement>(null), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const dirty = JSON.stringify(values) !== JSON.stringify(valuesOf(baseline));
  const zoneOptions: ApiRecord[] = [...zones, ...(baseline?.workingZones ?? []).filter((zone) => !zones.some((entry) => entry.id === zone.id))];
  const inactiveZones = values.workingZoneIds.filter((id) => zones.find((zone) => zone.id === id)?.statusId !== 101);
  const availableZones = zoneOptions.filter((zone) => zone.statusId === 101 || values.workingZoneIds.includes(zone.id));
  const accountOptions = [...(baseline?.account ? [baseline.account] : []), ...accounts].filter((entry, i, all) => all.findIndex((option) => option.id === entry.id) === i);
  function close() { if (mutation.busy()) return; if (dirty) setDiscard(true); else onClose(); }
  const problem = mutation.failure?.employeeProblem;
  const invalidServerFields = problem?.kind === "invalid-fields" ? problem.fields.map((field) => fieldLabels[field][0]) : [];
  function errorProps(name: string) { return { name, "aria-invalid": issues.some((issue) => issue.path === name) || invalidServerFields.some((field) => field === name || name.startsWith(field + ".")), "aria-describedby": issues.length ? "employee-api-errors" : invalidServerFields.length ? "employee-api-server-errors" : undefined }; }
  function showIssues(next: { path: string; message: string }[]) { setIssues(next); requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[name="${next[0]?.path}"]`)?.focus()); }
  async function save() {
    if (mutation.busy() || mutation.blocked || !lookupsReady) return;
    const checked = employeeEditorSchema.safeParse({ ...values, status: baseline?.status === "Left" ? "left" : "employed" });
    if (!checked.success) { showIssues(checked.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))); return; }
    if (inactiveZones.length) { showIssues([{ path: "workingZoneIds", message: "Bỏ chọn vùng đã ngừng hoặc chưa có trong danh mục trước khi lưu." }]); return; }
    setIssues([]);
    const body = { fullName: checked.data.fullName, phoneNumber: normalizeEmployeePhone(checked.data.phone)!, birthday: checked.data.birthday || null,
      address: checked.data.address || null, area: checked.data.area || null, ward: checked.data.wardCommune || null, otherInformation: checked.data.otherInformation || null, notes: checked.data.notes || null,
      workingZoneIds: checked.data.workingZoneIds, bankAccount: toEmployeeBankAccount(checked.data.bankAccount), accountId: checked.data.accountId || null, ...(baseline ? { rowVersion: baseline.rowVersion } : {}) };
    const result = await mutation.run(() => repository.write(baseline ? "update" : "create", body, employeeViewSchema, baseline?.id));
    if (result) onSaved(result);
  }
  async function confirmAction() {
    if (!baseline || !action || mutation.busy() || mutation.blocked || action !== "unlink" && dirty) return;
    if (action === "end-employment" && !createEmployeeEndDateSchema().safeParse({ endDate }).success) { setActionError("Ngày nghỉ việc phải hợp lệ và không sau hôm nay."); return; }
    setIssues([]);
    if (action === "unlink") {
      const next = await mutation.run(() => repository.write("unlink", { rowVersion: baseline.rowVersion }, employeeViewSchema, baseline.id));
      if (!alive.current) return; setAction(undefined);
      if (next) { const selected = values.accountId; setBaseline(next); setValues((current) => ({ ...current, accountId: selected && selected !== baseline.account?.id ? selected : "" })); onUnlinked(next); }
    } else {
      const next = await mutation.run(() => repository.write(action, { rowVersion: baseline.rowVersion, ...(action === "end-employment" ? { endDate } : {}) }, employmentChangedSchema, baseline.id));
      if (!alive.current) return; setAction(undefined);
      if (next) onSaved(next.employee, next);
    }
  }
  return <Dialog open title={baseline ? `Hồ sơ · ${baseline.fullName}` : "Thêm nhân viên"} size="lg" dismissible={!mutation.pending && !action} onOpenChange={(open) => { if (!open) close(); }}>
    <ErrorNotice error={mutation.error} />
    {problem?.kind === "invalid-fields" && <p id="employee-api-server-errors" role="alert" className="my-3">Các mục cần kiểm tra: {problem.fields.map((field) => fieldLabels[field][1]).join(", ")}.</p>}
    {issues.length > 0 && <ul id="employee-api-errors" role="alert" className="my-4 space-y-2 text-danger">{issues.map((issue, index) => <li key={`${issue.path}-${index}`}>{issue.message}</li>)}</ul>}
    {problem && problem.kind !== "invalid-fields" && <div className="my-4"><Button className="w-auto" variant="secondary" isPending={mutation.pending} onClick={async () => { const next = await mutation.run(() => repository.read("detail", { id: problem.existingEmployeeId }, employeeViewSchema), true); if (next) setCompared(next); }}>Đối chiếu hồ sơ hiện có</Button></div>}
    {compared && <div className="my-4 rounded-control border border-border p-4"><ProfileComparison employee={compared} /><Button className="mt-3 w-auto" variant="secondary" onClick={() => onAdopt(compared)}>Mở hồ sơ này và bỏ nháp hiện tại</Button></div>}
    {baseline && <div className="mb-5 rounded-control border border-border p-4"><p className="font-semibold">{employmentLabel(baseline.status)}{baseline.employmentEndDate ? ` · Ngày nghỉ: ${dateLabel(baseline.employmentEndDate)}` : ""}</p>
      <Button className="mt-3 sm:w-auto" variant="secondary" disabled={dirty || mutation.pending || mutation.blocked} onClick={() => { if (!dirty && !mutation.busy()) { setEndDate(businessToday()); setAction(baseline.status === "Employed" ? "end-employment" : "reinstate"); } }}>{baseline.status === "Employed" ? "Nghỉ việc" : "Đi làm lại"}</Button>
      {dirty && <p className="mt-3 text-sm text-text-muted">Lưu hoặc hủy bản nháp trước khi đổi tình trạng làm việc.</p>}</div>}
    <form ref={formRef} onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <fieldset disabled={mutation.pending || mutation.blocked || !!action} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Họ và tên *" required maxLength={100} {...errorProps("fullName")} value={values.fullName} onChange={(event) => setValues({ ...values, fullName: event.target.value })} />
        <Field label="Số điện thoại *" type="tel" required {...errorProps("phone")} value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} /></div>
        <label className="block text-sm font-semibold">Ngày sinh<VietnameseDateInput className={control} {...errorProps("birthday")} value={values.birthday} max={businessToday()} onValueChange={(birthday) => setValues({ ...values, birthday })} calendarLabel="Chọn ngày sinh" /></label>
        <fieldset className="rounded-control border border-border p-3" tabIndex={-1} {...errorProps("workingZoneIds")}><legend className="font-semibold">Vùng làm việc</legend>{availableZones.map((zone) => <label key={zone.id} className="flex min-h-12 items-center gap-3"><input type="checkbox" checked={values.workingZoneIds.includes(zone.id)} onChange={(event) => setValues({ ...values, workingZoneIds: event.target.checked ? [...values.workingZoneIds, zone.id] : values.workingZoneIds.filter((id) => id !== zone.id) })} />{String(zone.code)} · {String(zone.name)}{zone.statusId !== 101 ? " (đã ngừng — cần bỏ chọn)" : ""}</label>)}
          {values.workingZoneIds.filter((id) => !zoneOptions.some((zone) => zone.id === id)).map((id) => <label key={id} className="flex min-h-12 items-center gap-3"><input type="checkbox" checked onChange={() => setValues({ ...values, workingZoneIds: values.workingZoneIds.filter((zoneId) => zoneId !== id) })} />Vùng chưa có trong danh mục</label>)}</fieldset>
        <fieldset className="space-y-4 rounded-control border border-border p-3"><legend className="font-semibold">Thông tin ngân hàng</legend>{[["bankName", "Ngân hàng"], ["accountNumber", "Số tài khoản"], ["accountHolderName", "Chủ tài khoản"]].map(([key, label]) => <Field key={key} label={label} {...errorProps(`bankAccount.${key}`)} value={values.bankAccount[key as keyof typeof values.bankAccount]} onChange={(event) => setValues({ ...values, bankAccount: { ...values.bankAccount, [key]: key === "accountHolderName" ? event.target.value.toUpperCase() : event.target.value } })} />)}</fieldset>
        <Select label="Tài khoản đăng nhập" {...errorProps("accountId")} value={values.accountId} disabled={!lookupsReady || mutation.pending || mutation.blocked || !!action} onChange={(event) => setValues({ ...values, accountId: event.target.value })}><option value="">{baseline?.account ? "Giữ tài khoản đang liên kết" : "Chưa liên kết tài khoản"}</option>{accountOptions.map((account) => <option key={account.id} value={account.id}>@{account.username} · {account.displayName} · {accountLabel(account.status)}</option>)}{values.accountId && !accountOptions.some((option) => option.id === values.accountId) && <option value={values.accountId}>Tài khoản đã chọn không còn trong danh sách hiện tại</option>}</Select>
        <Button className="w-auto" variant="secondary" onClick={onReloadAccounts}>Tải lại tài khoản có thể liên kết</Button>
        {!lookupsReady && <p className="text-sm text-text-muted">Cần tải đủ danh mục vùng và tài khoản trước khi lưu.</p>}
        {baseline?.account && <div className="rounded-control border border-border p-3"><p>Đang liên kết: @{baseline.account.username} · {accountLabel(baseline.account.status)}</p><Button className="mt-3 w-auto" variant="secondary" onClick={() => setAction("unlink")}>Bỏ liên kết tài khoản</Button></div>}
        <div className="grid gap-4 sm:grid-cols-2">{[["address", "Địa chỉ", 500], ["area", "Khu vực", 100], ["wardCommune", "Phường/Xã", 100]].map(([key, label, max]) => <Field key={key} label={String(label)} maxLength={Number(max)} {...errorProps(String(key))} value={values[key as "address" | "area" | "wardCommune"]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} />)}</div>
        <Note label="Thông tin khác" maxLength={1000} {...errorProps("otherInformation")} value={values.otherInformation} onChange={(event) => setValues({ ...values, otherInformation: event.target.value })} />
        <Note label="Ghi chú" maxLength={1000} {...errorProps("notes")} value={values.notes} onChange={(event) => setValues({ ...values, notes: event.target.value })} />
      </fieldset>
      {mutation.blocked && <div className="my-4 rounded-control border border-border p-4"><p>Bản nháp vẫn được giữ; chưa gửi lại thao tác.</p><Button className="mt-3 w-auto" variant="secondary" isPending={mutation.pending} onClick={async () => {
        if (baseline) { const next = await mutation.run(() => repository.read("detail", { id: baseline.id }, employeeViewSchema), true); if (next) setLatest(next); }
        else { const next = await mutation.run(() => repository.read("list", { search: values.fullName, page: "1", pageSize: "100" }, employeePageSchema), true); if (next) setReconciledRows(next.items); }
      }}>Tải hồ sơ mới để đối chiếu</Button>
        {latest && <div className="mt-3"><ProfileComparison employee={latest} /><div className="mt-3 flex flex-wrap gap-3">{!mutation.uncertain && <Button className="w-auto" variant="secondary" onClick={() => { setBaseline(latest); setLatest(undefined); mutation.reviewed(); }}>Đã đối chiếu, giữ bản nháp để sửa tiếp</Button>}<Button className="w-auto" variant="secondary" onClick={() => onAdopt(latest)}>Dùng dữ liệu đã lưu</Button></div></div>}
        {reconciledRows && <ul className="mt-3 space-y-3">{reconciledRows.map((row) => <li key={row.id}>{row.fullName} · {row.phoneNumber} <button type="button" className="text-primary underline" disabled={mutation.pending} onClick={async () => { const next = await mutation.run(() => repository.read("detail", { id: row.id }, employeeViewSchema), true); if (next) setCompared(next); }}>Đối chiếu {row.fullName}</button></li>)}</ul>}
      </div>}
      {discard && <div className="my-4 rounded-control border border-border p-4"><p>Bỏ các thay đổi chưa lưu?</p><div className="mt-3 flex flex-wrap gap-3"><Button className="w-auto" variant="secondary" onClick={() => setDiscard(false)}>Tiếp tục sửa</Button><Button className="w-auto" onClick={onClose}>Bỏ bản nháp</Button></div></div>}
      <div className="mt-6 flex flex-wrap justify-end gap-3"><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={close}>Đóng hồ sơ</Button>{dirty && <Button className="w-auto" variant="secondary" disabled={mutation.pending || mutation.blocked} onClick={() => { setValues(valuesOf(baseline)); setIssues([]); }}>Hủy thay đổi</Button>}<Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked || !lookupsReady || !!baseline && !dirty}>Lưu hồ sơ</Button></div>
    </form>
    {action && baseline && <Dialog open title={action === "unlink" ? "Bỏ liên kết tài khoản?" : action === "end-employment" ? "Nghỉ việc?" : "Đi làm lại?"} dismissible={!mutation.pending} onOpenChange={(open) => { if (!open && !mutation.busy()) setAction(undefined); }}>
      <p>{action === "unlink" ? `Bỏ liên kết @${baseline.account?.username} khỏi ${baseline.fullName}? Các thay đổi khác đang nhập vẫn được giữ.` : `${baseline.fullName} sẽ chuyển sang ${action === "end-employment" ? "Đã nghỉ việc" : "Đang làm việc"}. Tài khoản và quyền truy cập được kiểm tra riêng.`}</p>
      <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); void confirmAction(); }}>{action === "end-employment" && <label className="block text-sm font-semibold">Ngày nghỉ việc *<VietnameseDateInput className={control} required max={businessToday()} value={endDate} disabled={mutation.pending} onValueChange={(value) => { setEndDate(value); setActionError(undefined); }} calendarLabel="Chọn ngày nghỉ việc" /></label>}
        <ErrorNotice error={actionError} />
        <div className="flex flex-wrap gap-3"><Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => setAction(undefined)}>Hủy</Button><Button className="w-auto" type="submit" isPending={mutation.pending}>Xác nhận {action === "unlink" ? "bỏ liên kết" : action === "end-employment" ? "nghỉ việc" : "đi làm lại"}</Button></div></form>
    </Dialog>}
  </Dialog>;
}
function ProfileComparison({ employee }: { employee: Employee }) {
  return <div className="space-y-2"><h3 className="font-semibold">Hồ sơ hiện tại trên hệ thống</h3><p>{employee.fullName} · {employee.phoneNumber || "—"} · {employmentLabel(employee.status)} · {dateLabel(employee.employmentEndDate)}</p><p>Ngày sinh: {dateLabel(employee.birthday)} · {employee.address || "—"} · {employee.area || "—"} · {employee.ward || "—"}</p><p>{employee.otherInformation || "—"} · {employee.notes || "—"}</p><p>Vùng: {employee.workingZones.map((zone) => zone.code).join(", ") || "—"}</p><p>Ngân hàng: {employee.bankAccount ? `${employee.bankAccount.bankName} · ${employee.bankAccount.accountNumber} · ${employee.bankAccount.accountHolderName}` : "—"}</p><p>Tài khoản: {employee.account ? `@${employee.account.username} · ${accountLabel(employee.account.status)}` : "Chưa liên kết"}</p></div>;
}
