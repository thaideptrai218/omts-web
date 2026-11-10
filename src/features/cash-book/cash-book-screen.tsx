"use client";
import { SelectBox } from "@/components/ui/select-box";
import { useToast } from "@/components/ui/toast-provider";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { FilterGroup, FilterPills, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ColumnPicker, ListStateMessage, ManagementPagination, ManagementScroller, SortableHeader, Subtabs, managementStyles, type SortState } from "@/components/ui/management-screen/management-table";
import layoutStyles from "@/components/ui/management-screen/management-screen.module.css";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { presetValue, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { PersonPicker } from "@/components/ui/management-screen/person-picker";
import { ErrorNotice, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import type { PaymentView } from "@/features/purchase-documents/contracts";
import { errorText, fmt, nowLocal, viDateTime, vnLocal } from "@/features/purchase-documents/document-parts";
import { cancelPayment, editPayment, getPayment } from "@/features/purchase-documents/repository";
import { PaymentVoucherDialog } from "@/features/purchase-documents/payment-dialogs";
import { CustomerPaymentView } from "@/features/customers/customer-payment-dialogs";
import { customerHref } from "@/features/customers/customer-links";
import listStyles from "@/features/suppliers-api/suppliers.module.css";
import type { BookPage, BookRow, CashDirection, CashFund, PartyKind } from "./contracts";
import { Field } from "./cash-pickers";
import { exportBook, fundLabel, listAccounts, listBook, listCollectors, listTypes, partyKindLabel, type BookQuery } from "./repository";
import { VoucherDialog, VoucherInline, useCashAccess } from "./voucher-dialog";
import styles from "./cash-book.module.css";

type Column = { key: string; label: string; sort?: string; numeric?: boolean; hidden?: boolean; render(row: BookRow): ReactNode };
/** Supplier and customer rows link to their own list searched by the party's code. */
const partyHref = (row: BookRow) => row.party?.code ? row.party.kind === "Supplier" ? `/workspace/suppliers?code=${encodeURIComponent(row.party.code)}` : row.party.kind === "Customer" ? customerHref(row.party.code) : undefined : undefined;
const isCustomerPayment = (row: BookRow) => row.source === "CustomerPayment" || row.source === "CustomerPaidBack";
const columns: readonly Column[] = [
  { key: "code", label: "Mã phiếu", sort: "code", render: (row) => <span className="font-mono tabular-nums">{row.code}</span> },
  { key: "time", label: "Thời gian", sort: "time", render: (row) => viDateTime(row.occurredAt) },
  { key: "createdAt", label: "Thời gian tạo", hidden: true, render: (row) => viDateTime(row.createdAt) },
  { key: "type", label: "Loại thu chi", render: (row) => row.type.name },
  { key: "partyCode", label: "Mã người nộp/nhận", hidden: true, render: (row) => row.party?.code ?? "—" },
  { key: "party", label: "Người nộp/nhận", render: (row) => row.party ? (partyHref(row) ? <Link className={managementStyles.linkButton} href={partyHref(row)!} onClick={(event) => event.stopPropagation()}>{row.party.name}</Link> : row.party.name) : "—" },
  { key: "phone", label: "Số điện thoại", hidden: true, render: (row) => row.party?.phoneNumber ?? "—" },
  { key: "createdBy", label: "Người tạo", hidden: true, render: (row) => row.createdBy?.name ?? "—" },
  { key: "collector", label: "Nhân viên thu/chi", hidden: true, render: (row) => row.collector?.name ?? "—" },
  { key: "account", label: "Tài khoản", hidden: true, render: (row) => row.cashAccount ? `${row.cashAccount.accountNumber} - ${row.cashAccount.providerName}` : row.fund === "Cash" ? "—" : "Chưa rõ tài khoản" },
  { key: "fund", label: "Loại sổ quỹ", hidden: true, render: (row) => fundLabel[row.fund] },
  { key: "amount", label: "Giá trị", sort: "amount", numeric: true, render: (row) => <span className={row.signedAmount < 0 ? styles.out : undefined}>{fmt(row.signedAmount)}</span> },
  { key: "note", label: "Ghi chú", hidden: true, render: (row) => row.note || "—" },
  { key: "counts", label: "Hạch toán KQKD", hidden: true, render: (row) => row.countsInResult ? "Có" : "Không" },
  { key: "status", label: "Trạng thái", render: (row) => <StatusPill tone={row.status === "Cancelled" ? "danger" : "success"}>{row.status === "Cancelled" ? "Đã hủy" : "Đã thanh toán"}</StatusPill> },
];
const defaults = columns.filter((column) => !column.hidden).map((column) => column.key).join(",");
const emptyFilters = { cashAccountId: "", direction: "" as "" | CashDirection, typeId: "", status: "Recorded" as "" | "Recorded" | "Cancelled", createdById: "", partyKind: "" as "" | PartyKind, party: "", countsInResult: "" as "" | "true" | "false" };
type Opened = { kind: "create"; direction: CashDirection; fund: CashFund } | { kind: "voucher"; id: string } | { kind: "payment"; id: string } | { kind: "customerPayment"; id: string };

/**
 * "+ Phiếu thu" / "+ Phiếu chi". With one fund filtered the button opens that fund's voucher directly; only "Tổng quỹ"
 * (`fund` undefined) shows the menu of funds on hover or click.
 */
function NewVoucherMenu({ direction, fund: fixed, onPick }: { direction: CashDirection; fund?: CashFund; onPick(fund: CashFund): void }) {
  const [open, setOpen] = useState(false), root = useRef<HTMLDivElement>(null), timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = () => { if (fixed) return; clearTimeout(timer.current); setOpen(true); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 200); };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const label = direction === "Receipt" ? "Phiếu thu" : "Phiếu chi";
  return <div ref={root} className={styles.menuWrap} onMouseEnter={show} onMouseLeave={hide}>
    <Button className="w-auto" variant="secondary" aria-haspopup={fixed ? undefined : "menu"} aria-expanded={fixed ? undefined : open} onClick={() => fixed ? onPick(fixed) : setOpen((current) => !current)}><InterfaceIcon name="add" className="mr-1 size-4" />{label}</Button>
    {open && <div role="menu" className={styles.menu}>{(["Cash", "Bank", "EWallet"] as const).map((fund) =>
      <button key={fund} type="button" role="menuitem" onClick={() => { setOpen(false); onPick(fund); }}><InterfaceIcon name={fund === "Cash" ? "payment" : fund === "Bank" ? "cooperative" : "id-card"} />{fundLabel[fund]}</button>)}</div>}
  </div>;
}

export function CashBookScreen({ helpHref }: { helpHref?: string }) {
  const access = useCashAccess(), exportFile = useMutation();
  const [fund, setFund] = useState<CashFund | "All">("Cash"), [time, setTime] = useState<TimeRangeValue>(() => presetValue("thisMonth")), [filters, setFilters] = useState(emptyFilters), [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "code", direction: "desc" }), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<BookPage>(), [loading, setLoading] = useState(true), [error, setError] = useState<string>(), [expanded, setExpanded] = useState<string>(), { notify } = useToast(), [opened, setOpened] = useState<Opened>();
  const [stored, store] = useStoredValue("omts-columns-cash-book", defaults);
  const visible = useMemo(() => { const keys = stored.split(","), shown = columns.filter((column) => keys.includes(column.key)); return shown.length ? shown : columns; }, [stored]);
  const accounts = useRemote(useCallback((signal: AbortSignal) => fund === "Bank" || fund === "EWallet" ? listAccounts(fund, true, signal) : Promise.resolve({ status: "success" as const, data: [] }), [fund]));
  const types = useRemote(useCallback((signal: AbortSignal) => listTypes(undefined, signal), []));
  const people = useRemote(useCallback((signal: AbortSignal) => listCollectors(signal), []));
  const query = useMemo<BookQuery>(() => ({ fund, ...filters, from: time.from, to: time.to, search, sort: sort.key, desc: sort.direction === "desc", page, pageSize }), [fund, filters, time, search, sort, page, pageSize]);
  useEffect(() => {
    if (!access.view) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(undefined);
      void listBook(query, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (result.status === "success") setData(result.data); else { setData(undefined); setError(errorText(result)); }
      });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, refresh, access.view]);
  function changed<T>(apply: (value: T) => void) { return (value: T) => { apply(value); setPage(1); setExpanded(undefined); }; }
  const setFilter = <K extends keyof typeof emptyFilters>(key: K) => changed<(typeof emptyFilters)[K]>((value) => setFilters((current) => ({ ...current, [key]: value })));
  const reload = () => setRefresh((value) => value + 1);
  const closeOpened = (message?: string) => { setOpened(undefined); if (message) { notify({ tone: "success", title: message }); setExpanded(undefined); reload(); } };
  if (!access.view) return <p role="alert" className="rounded-card border border-border bg-surface p-6">Bạn không có quyền xem chức năng này.</p>;

  const rail = <>
    <div className={listStyles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} onClick={() => changed<void>(() => { setFilters(emptyFilters); setTime(presetValue("thisMonth")); setFund("Cash"); })()}>Đặt lại</button></div>
    <FilterGroup legend="Quỹ tiền"><div className={layoutStyles.pills}>{(["Cash", "Bank", "EWallet", "All"] as const).map((key) =>
      <label key={key} className={layoutStyles.pill}><input type="radio" className="sr-only" name="cash-fund" checked={fund === key} onChange={() => changed<void>(() => { setFund(key); setFilters((current) => ({ ...current, cashAccountId: "" })); })()} />{fundLabel[key]}</label>)}</div>
      {(fund === "Bank" || fund === "EWallet") && <SelectBox aria-label="Tài khoản" className={styles.railInput} value={filters.cashAccountId} onChange={(event) => setFilter("cashAccountId")(event.target.value)}>
        <option value="">Tất cả tài khoản</option>{(accounts.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.accountNumber} - {row.providerName}</option>)}</SelectBox>}
    </FilterGroup>
    <TimeRangeFilter legend="Thời gian" value={time} onChange={changed<TimeRangeValue>(setTime)} />
    <FilterPills legend="Loại chứng từ" name="cash-direction" value={filters.direction} options={[["Receipt", "Phiếu thu"], ["Payment", "Phiếu chi"]]} onChange={(value) => setFilter("direction")(value as "" | CashDirection)} />
    <FilterGroup legend="Loại thu chi"><SelectBox aria-label="Loại thu chi" className={styles.railSelect} value={filters.typeId} onChange={(event) => setFilter("typeId")(event.target.value)}>
      <option value="">Tất cả loại thu chi</option>
      {(["Receipt", "Payment"] as const).map((key) => <optgroup key={key} label={key === "Receipt" ? "Loại thu" : "Loại chi"}>{(types.data ?? []).filter((type) => type.direction === key).map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</optgroup>)}
    </SelectBox></FilterGroup>
    <FilterPills legend="Trạng thái" name="cash-status" value={filters.status} options={[["Recorded", "Đã thanh toán"], ["Cancelled", "Đã hủy"]]} onChange={(value) => setFilter("status")(value as "" | "Recorded" | "Cancelled")} />
    <FilterPills legend="Hạch toán kết quả kinh doanh" name="cash-counts" value={filters.countsInResult} options={[["true", "Có"], ["false", "Không"]]} onChange={(value) => setFilter("countsInResult")(value as "" | "true" | "false")} />
    <FilterGroup legend="Người tạo"><SelectBox aria-label="Người tạo" className={styles.railSelect} value={filters.createdById} onChange={(event) => setFilter("createdById")(event.target.value)}>
      <option value="">Tất cả</option>{(people.data ?? []).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</SelectBox></FilterGroup>
    <FilterGroup legend="Người nộp/nhận"><SelectBox aria-label="Loại người nộp/nhận" className={styles.railSelect} value={filters.partyKind} onChange={(event) => setFilter("partyKind")(event.target.value as "" | PartyKind)}>
      <option value="">Tất cả</option>{(["Customer", "Supplier", "Employee", "Other"] as const).map((key) => <option key={key} value={key}>{partyKindLabel[key]}</option>)}</SelectBox>
      <input type="search" aria-label="Tên, mã người nộp/nhận" className={styles.railInput} placeholder="Tên, mã, số điện thoại" maxLength={200} value={filters.party} onChange={(event) => setFilter("party")(event.target.value)} /></FilterGroup>
  </>;
  const summary = data?.summary;
  return <ManagementLayout storageKey="cash-book" icon="payment" title={`Sổ quỹ ${fund === "All" ? "" : fundLabel[fund].toLowerCase()}`.trim()} filters={rail} filterLabel="Bộ lọc sổ quỹ"
    footer={<ManagementPagination page={data?.page ?? page} pageSize={pageSize} total={data?.total ?? 0} unit="phiếu thu chi" disabled={loading} onPage={(next) => { setPage(next); setExpanded(undefined); }} onPageSize={changed<number>(setPageSize)} />}
    search={<input type="search" aria-label="Tìm theo mã phiếu" placeholder="Theo mã phiếu" maxLength={100} value={search} onChange={(event) => changed<string>(setSearch)(event.target.value)} />}
    actions={<>
      {access.create && <><NewVoucherMenu direction="Receipt" fund={fund === "All" ? undefined : fund} onPick={(value) => setOpened({ kind: "create", direction: "Receipt", fund: value })} /><NewVoucherMenu direction="Payment" fund={fund === "All" ? undefined : fund} onPick={(value) => setOpened({ kind: "create", direction: "Payment", fund: value })} /></>}
      {access.exportFile && <Button className="w-auto" variant="secondary" isPending={exportFile.pending} onClick={() => void exportFile.run(() => exportBook(query), true)}><InterfaceIcon name="download" className="mr-1 size-4" />Xuất file</Button>}
      <ColumnPicker columns={columns} visible={visible.map((column) => column.key)} onChange={(keys) => store(keys.join(","))} />
      <HelpLink helpHref={helpHref} />
    </>}>
    {exportFile.error && <div className={listStyles.feedback}><ErrorNotice error={exportFile.error} /></div>}
    <div className={styles.summary} aria-label="Tổng hợp quỹ">
      <div><span>Quỹ đầu kỳ</span><strong>{summary ? fmt(summary.opening) : "—"}</strong></div>
      <div><span>Tổng thu</span><strong className={styles.in}>{summary ? fmt(summary.totalIn) : "—"}</strong></div>
      <div><span>Tổng chi</span><strong className={styles.out}>{summary ? fmt(-summary.totalOut) : "—"}</strong></div>
      <div><span>Tồn quỹ</span><strong className={styles.closing}>{summary ? fmt(summary.closing) : "—"}</strong></div>
    </div>
    <ManagementScroller busy={loading}>
      {error ? <ListStateMessage error={error} onRetry={reload} retryLabel="Tải lại" />
        : !data ? <div role="status" aria-label="Đang tải danh sách" className={listStyles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>
        : !data.items.length ? <ListStateMessage>Không có phiếu thu chi phù hợp bộ lọc.</ListStateMessage>
        : <table className={listStyles.table}><thead><tr><th scope="col" className={listStyles.expandCell}><span className="sr-only">Mở dòng</span></th>
          {visible.map((column) => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={changed<SortState>(setSort)} className={column.numeric ? styles.num : undefined} />)}</tr></thead>
          <tbody>{data.items.map((row) => <Fragment key={`${row.source}:${row.id}`}>
            <OpenableTableRow data-selected={expanded === row.id || undefined} onOpen={() => setExpanded((value) => value === row.id ? undefined : row.id)}>
              <td className={listStyles.expandCell}><button type="button" aria-expanded={expanded === row.id} aria-label={`${expanded === row.id ? "Thu gọn" : "Mở"} ${row.code}`} onClick={() => setExpanded((value) => value === row.id ? undefined : row.id)}><InterfaceIcon name={expanded === row.id ? "chevron-down" : "chevron-right"} /></button></td>
              {visible.map((column) => <td key={column.key} className={column.numeric ? styles.num : undefined}>{column.render(row)}</td>)}
            </OpenableTableRow>
            {expanded === row.id && <tr><td colSpan={visible.length + 1} className={listStyles.detailCell}><div className={managementStyles.viewWidth}>
              <RowDetail row={row} canEdit={access.edit} canCancel={access.cancel} onOpen={() => setOpened(row.source === "CashVoucher" ? { kind: "voucher", id: row.id } : isCustomerPayment(row) ? { kind: "customerPayment", id: row.id } : { kind: "payment", id: row.id })} onChanged={(message) => { notify({ tone: "success", title: message }); setExpanded(undefined); reload(); }} />
            </div></td></tr>}
          </Fragment>)}</tbody></table>}
    </ManagementScroller>
    {opened?.kind === "create" && <VoucherDialog target={{ mode: "create", direction: opened.direction, fund: opened.fund }} onClose={closeOpened} />}
    {opened?.kind === "voucher" && <VoucherDialog target={{ mode: "edit", id: opened.id }} onClose={closeOpened} />}
    {opened?.kind === "customerPayment" && <CustomerPaymentView id={opened.id} canConfirm={access.customerPaymentsEdit} canCancel={access.customerPaymentsEdit} onClose={(changedPayment) => { setOpened(undefined); if (changedPayment) { setExpanded(undefined); reload(); } }} />}
    {opened?.kind === "payment" && <PaymentVoucherDialog id={opened.id} onClose={(changedPayment) => closeOpened(changedPayment ? "Đã cập nhật phiếu." : undefined)} />}
  </ManagementLayout>;
}

function RowDetail({ row, canEdit, canCancel, onOpen, onChanged }: { row: BookRow; canEdit: boolean; canCancel: boolean; onOpen(): void; onChanged(message: string): void }) {
  return <section className={listStyles.detail} aria-label={`Chi tiết ${row.code}`}>
    <Subtabs<"info"> label="Nội dung phiếu" tabs={[{ key: "info", label: "Thông tin" }]} value="info" onChange={() => undefined} />
    <div className={listStyles.tabBody}>
      {row.source === "CashVoucher"
        ? <VoucherInline id={row.id} onOpen={onOpen} onChanged={onChanged} />
        : isCustomerPayment(row) ? <CustomerPaymentFacts row={row} onOpen={onOpen} />
        : <PaymentInline row={row} canEdit={canEdit} canCancel={canCancel} onOpen={onOpen} onChanged={onChanged} />}
    </div>
  </section>;
}

/** A customer payment or money paid back to a customer: it is the customer's document, so the book only shows it and opens it ("Mở phiếu"). */
function CustomerPaymentFacts({ row, onOpen }: { row: BookRow; onOpen(): void }) {
  return <>
    <dl className={styles.facts}>
      <div><dt>Mã phiếu</dt><dd>{row.code}</dd></div>
      <div><dt>Loại thu chi</dt><dd>{row.type.name}</dd></div>
      <div><dt>Giá trị</dt><dd className={row.signedAmount < 0 ? styles.out : styles.in}>{fmt(row.signedAmount)}</dd></div>
      <div><dt>Khách hàng</dt><dd>{row.party ? partyHref(row) ? <Link className={managementStyles.linkButton} href={partyHref(row)!}>{row.party.name}</Link> : row.party.name : "—"}</dd></div>
      <div><dt>Quỹ</dt><dd>{fundLabel[row.fund]}{row.fund !== "Cash" && ` · ${row.cashAccount ? `${row.cashAccount.accountNumber} - ${row.cashAccount.providerName}` : "Chưa rõ tài khoản"}`}</dd></div>
      <div><dt>Thời gian</dt><dd>{viDateTime(row.occurredAt)}</dd></div>
    </dl>
    <p className={styles.muted}>Phiếu này thuộc công nợ khách hàng nên chỉ xem ở đây; số tiền và phân bổ vào hóa đơn xem trong phiếu gốc, bấm “Mở phiếu”.</p>
    <footer className={styles.foot}><div /><div><Button className="w-auto" variant="secondary" onClick={onOpen}><InterfaceIcon name="document" className="size-4" />Mở phiếu</Button></div></footer>
  </>;
}

/**
 * A supplier payment or money paid back, opened in the cash book: its time, who paid and the note can be corrected here; the
 * money, supplier and receipts belong to the purchasing documents and are changed there. Cancelling recomputes the supplier debt.
 */
function PaymentInline({ row, canEdit, canCancel, onOpen, onChanged }: { row: BookRow; canEdit: boolean; canCancel: boolean; onOpen(): void; onChanged(message: string): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => getPayment(row.id, signal), [row.id]));
  if (remote.loading) return <Skeleton />;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được phiếu."} onRetry={remote.reload} />;
  return <PaymentFields key={remote.data.rowVersion} row={row} payment={remote.data} canEdit={canEdit} canCancel={canCancel} onOpen={onOpen} onChanged={onChanged} />;
}
function PaymentFields({ row, payment, canEdit, canCancel, onOpen, onChanged }: { row: BookRow; payment: PaymentView; canEdit: boolean; canCancel: boolean; onOpen(): void; onChanged(message: string): void }) {
  const confirmation = useActionDialog(), people = useRemote(useCallback((signal: AbortSignal) => listCollectors(signal), []));
  const cancelled = payment.statusId === 1802, readOnly = cancelled || !canEdit, word = row.direction === "Receipt" ? "thu" : "chi";
  const initial = { paidAt: vnLocal(payment.paidAt ?? `${payment.paymentDate}T00:00:00+07:00`), paidById: payment.paidBy?.id ?? "", note: payment.note ?? "" };
  const [values, setValues] = useState(initial), [error, setError] = useState<string>(), [pending, setPending] = useState(false);
  const dirty = values.paidAt !== initial.paidAt || values.paidById !== initial.paidById || values.note !== initial.note;
  const payers = payment.paidBy && !(people.data ?? []).some((person) => person.id === payment.paidBy!.id) ? [payment.paidBy, ...(people.data ?? [])] : people.data ?? [];
  async function save() {
    setPending(true); setError(undefined);
    const method = payment.method === "Other" ? "Cash" : payment.method;
    const result = await editPayment(payment.id, { rowVersion: payment.rowVersion, ...values, method, cashAccountId: payment.cashAccount?.id ?? "", bankReference: payment.bankReference ?? "", confirmDuplicateBankReference: true });
    setPending(false);
    if (result.status === "success") onChanged(`Đã lưu phiếu ${word} ${payment.code}.`); else setError(errorText(result));
  }
  async function cancel() {
    const reason = await confirmation.prompt(`Hủy phiếu ${word} ${payment.code}? Công nợ nhà cung cấp sẽ được tính lại.`);
    if (!reason) return;
    setPending(true);
    const result = await cancelPayment(payment.id, reason, payment.rowVersion);
    setPending(false);
    if (result.status === "success") onChanged(`Đã hủy phiếu ${word} ${payment.code}.`); else setError(errorText(result));
  }
  const source = row.sourceDocument;
  return <>{confirmation.dialog}
    <dl className={styles.facts}>
      <div><dt>Mã phiếu</dt><dd>{payment.code}</dd></div>
      <div><dt>Loại thu chi</dt><dd>{row.type.name}</dd></div>
      <div><dt>Giá trị</dt><dd className={row.signedAmount < 0 ? styles.out : styles.in}>{fmt(row.signedAmount)}</dd></div>
      <div><dt>Nhà cung cấp</dt><dd>{partyHref(row) ? <Link className={managementStyles.linkButton} href={partyHref(row)!}>{payment.supplier.name}</Link> : payment.supplier.name}</dd></div>
      <div><dt>Quỹ</dt><dd>{fundLabel[row.fund]}{row.fund !== "Cash" && ` · ${row.cashAccount ? `${row.cashAccount.accountNumber} - ${row.cashAccount.providerName}` : "Chưa rõ tài khoản"}`}</dd></div>
      {source?.kind === "PurchaseReturn" && <div><dt>Phiếu trả hàng</dt><dd><Link className={managementStyles.linkButton} href={`/operations/purchase-returns?code=${source.code}`}>{source.code}</Link></dd></div>}
    </dl>
    {!readOnly && <p className={styles.editLabel}>Có thể sửa</p>}
    <div className={`${styles.formGrid} ${styles.inlineGrid}`}>
      <Field label="Thời gian"><DatePickerField label="Thời gian" withTime disabled={readOnly} value={values.paidAt} max={nowLocal()} onChange={(value) => setValues((current) => ({ ...current, paidAt: value }))} /></Field>
      <Field label={row.direction === "Receipt" ? "Người thu" : "Người chi"}><PersonPicker label={row.direction === "Receipt" ? "Người thu" : "Người chi"} people={payers} value={values.paidById} disabled={readOnly} onChange={(value) => setValues((current) => ({ ...current, paidById: value }))} /></Field>
      <div />
      <Field label="Ghi chú" wide><textarea className={styles.textarea} readOnly={readOnly} maxLength={2000} placeholder="Nhập ghi chú" value={values.note} onChange={(event) => setValues((current) => ({ ...current, note: event.target.value }))} /></Field>
    </div>
    {cancelled && payment.cancelReason && <p className={styles.danger}>Lý do hủy: {payment.cancelReason}</p>}
    <p className={styles.muted}>Số tiền, nhà cung cấp và phân bổ vào phiếu nhập thuộc phiếu gốc ở Mua hàng, bấm “Mở phiếu” để xem.</p>
    <ErrorNotice error={error} />
    <footer className={styles.foot}>
      <div>{!cancelled && canCancel && <Button className="w-auto" variant="ghost" disabled={pending} onClick={() => void cancel()}><InterfaceIcon name="trash" className="size-4" />Hủy phiếu</Button>}</div>
      <div>{dirty && <Button className="w-auto" variant="ghost" disabled={pending} onClick={() => { setValues(initial); setError(undefined); }}>Hoàn tác</Button>}
        <Button className="w-auto" variant="secondary" disabled={pending} onClick={onOpen}><InterfaceIcon name="document" className="size-4" />Mở phiếu</Button>
        {!readOnly && <Button className="w-auto" isPending={pending} disabled={!dirty} onClick={() => void save()}><InterfaceIcon name="check" className="size-4" />Lưu</Button>}</div>
    </footer>
  </>;
}
