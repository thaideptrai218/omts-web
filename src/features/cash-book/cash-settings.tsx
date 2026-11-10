"use client";
import { SelectBox } from "@/components/ui/select-box";
import { useToast } from "@/components/ui/toast-provider";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage, managementStyles } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { errorText } from "@/features/purchase-documents/document-parts";
import type { CashAccount, CashDirection, VoucherType } from "./contracts";
import { Field, TypeDialog } from "./cash-pickers";
import { categoryLabel, listAccounts, listBanks, listTypes, removeAccount, saveAccount, type AccountInput } from "./repository";
import { useCashAccess } from "./voucher-dialog";
import styles from "./cash-book.module.css";

type Tab = "Bank" | "EWallet" | "types";

/** Thiết lập → Sổ quỹ: the bank accounts and e-wallets money moves through, and the receipt/payment types. */
export function CashBookSettings() {
  const access = useCashAccess(), [tab, setTab] = useState<Tab>("Bank");
  const accounts = useRemote(useCallback((signal: AbortSignal) => listAccounts(undefined, true, signal), []));
  if (!access.settings) return <p role="alert">Bạn không có quyền xem thiết lập sổ quỹ.</p>;
  const count = (kind: "Bank" | "EWallet") => accounts.data?.filter((row) => row.kind === kind).length ?? 0;
  return <div className={managementStyles.theme}>
    <div className={styles.tabs} role="tablist" aria-label="Thiết lập sổ quỹ">
      <button type="button" role="tab" aria-selected={tab === "Bank"} onClick={() => setTab("Bank")}>Tài khoản ngân hàng<em>{count("Bank")}</em></button>
      <button type="button" role="tab" aria-selected={tab === "EWallet"} onClick={() => setTab("EWallet")}>Ví điện tử<em>{count("EWallet")}</em></button>
      <button type="button" role="tab" aria-selected={tab === "types"} onClick={() => setTab("types")}>Loại thu chi</button>
    </div>
    {tab === "types" ? <TypesTab canManage={access.manageSettings} />
      : accounts.loading ? <Skeleton /> : accounts.error ? <ListStateMessage error={accounts.error} onRetry={accounts.reload} />
      : <AccountsTab kind={tab} rows={(accounts.data ?? []).filter((row) => row.kind === tab)} canManage={access.manageSettings} owner={access.owner} onChanged={accounts.reload} />}
  </div>;
}

function AccountsTab({ kind, rows, canManage, owner, onChanged }: { kind: "Bank" | "EWallet"; rows: CashAccount[]; canManage: boolean; owner: boolean; onChanged(): void }) {
  const [editing, setEditing] = useState<CashAccount | "new">(), [error, setError] = useState<string>(), confirmation = useActionDialog(), { notify } = useToast();
  const bank = kind === "Bank";
  async function remove(row: CashAccount) {
    if (!(await confirmation.confirm(`Xóa tài khoản ${row.accountNumber} - ${row.providerName}? Tài khoản đã có phiếu thu chi sẽ được chuyển sang ngừng dùng.`))) return;
    const result = await removeAccount(row.id);
    if (result.status === "success") { setError(undefined); notify({ tone: "success", title: `Đã xóa tài khoản ${row.accountNumber}.` }); onChanged(); } else setError(result.code === "MSG-CASH-01" ? "Tài khoản đang dùng để nhận VietQR, không thể xóa hoặc ngừng dùng." : errorText(result));
  }
  return <>{confirmation.dialog}
    {canManage && <div className={styles.toolbar}><Button className="w-auto" variant="secondary" onClick={() => setEditing("new")}><InterfaceIcon name="add" className="mr-1 size-4" />Thêm tài khoản</Button></div>}
    <ErrorNotice error={error} />
    <div className={styles.tableWrap}><table className={styles.table}>
      <thead><tr><th>Số tài khoản</th><th>{bank ? "Ngân hàng" : "Ví điện tử"}</th><th>Chủ tài khoản</th><th>Ghi chú</th><th>Trạng thái</th>{canManage && <th className={styles.actions}>Thao tác</th>}</tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id}>
        <td>{row.accountNumber}{row.isVietQr && <span className={styles.badge} title="Tài khoản nhận chuyển khoản và tạo mã VietQR khi bán hàng">VietQR</span>}</td>
        <td>{row.providerName}</td><td>{row.holderName}</td><td>{row.note || ""}</td>
        <td className={row.isActive ? undefined : styles.muted}>{row.isActive ? "Đang dùng" : "Ngừng dùng"}</td>
        {canManage && <td className={styles.actions}>
          <button type="button" className={styles.iconButton} aria-label={`Sửa ${row.accountNumber}`} title="Sửa" onClick={() => setEditing(row)}><InterfaceIcon name="pencil" /></button>
          {!row.isVietQr && <button type="button" className={styles.iconButton} aria-label={`Xóa ${row.accountNumber}`} title="Xóa" onClick={() => void remove(row)}><InterfaceIcon name="trash" /></button>}
        </td>}
      </tr>)}
        {!rows.length && <tr><td colSpan={6} className={styles.muted}>Chưa có {bank ? "tài khoản ngân hàng" : "ví điện tử"} nào.</td></tr>}</tbody>
    </table></div>
    {bank && owner && <p className={`${styles.muted} ${styles.after}`}>Tài khoản nhận VietQR khi bán hàng đổi tại <Link className={managementStyles.linkButton} href="/cooperative/receiving-bank-account">Ngân hàng nhận tiền</Link>; tài khoản đó tự có trong danh sách này.</p>}
    {editing && <AccountDialog kind={kind} account={editing === "new" ? undefined : editing} onClose={(changed) => { setEditing(undefined); if (changed) { notify({ tone: "success", title: "Đã lưu tài khoản." }); onChanged(); } }} />}
  </>;
}

function AccountDialog({ kind, account, onClose }: { kind: "Bank" | "EWallet"; account?: CashAccount; onClose(changed: boolean): void }) {
  const bank = kind === "Bank", banks = useRemote(useCallback((signal: AbortSignal) => bank ? listBanks(signal) : Promise.resolve({ status: "success" as const, data: [] }), [bank]));
  const [values, setValues] = useState<AccountInput>({ kind, bankBin: account?.bankBin ?? "", providerName: account?.providerName ?? "", accountNumber: account?.accountNumber ?? "", holderName: account?.holderName ?? "", note: account?.note ?? "", isActive: account?.isActive ?? true });
  const [pending, setPending] = useState(false), [error, setError] = useState<string>();
  const set = (key: keyof AccountInput) => (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: event.target.value }));
  async function save() {
    if (bank ? !values.bankBin : !values.providerName.trim()) { setError(bank ? "Chọn ngân hàng." : "Nhập tên ví điện tử."); return; }
    if (!values.accountNumber.trim() || !values.holderName.trim()) { setError("Nhập số tài khoản và chủ tài khoản."); return; }
    setPending(true); setError(undefined);
    const result = await saveAccount(values, account?.id, account?.rowVersion);
    setPending(false);
    if (result.status === "success") onClose(true);
    else setError(result.code === "MSG-GEN-02" ? "Tài khoản này đã có trong danh sách." : result.code === "MSG-CASH-01" ? "Tài khoản đang dùng để nhận VietQR, không thể ngừng dùng." : errorText(result));
  }
  return <Dialog open size="md" dismissible={!pending} title={`${account ? "Sửa" : "Thêm"} ${bank ? "tài khoản ngân hàng" : "ví điện tử"}`} onOpenChange={(open) => { if (!open) onClose(false); }}><div className={managementStyles.theme}>
    <div className={styles.formGrid}>
      {bank ? <Field label="Ngân hàng *" wide><SelectBox className={styles.input} disabled={banks.loading || account?.isVietQr} value={values.bankBin} onChange={set("bankBin")}><option value="">{banks.loading ? "Đang tải…" : "Chọn ngân hàng"}</option>{(banks.data ?? []).map((row) => <option key={row.bin} value={row.bin}>{row.shortName} - {row.name}</option>)}</SelectBox></Field>
        : <Field label="Ví điện tử *" wide><input className={styles.input} maxLength={100} placeholder="Ví dụ: MoMo, ZaloPay" value={values.providerName} onChange={set("providerName")} /></Field>}
      <Field label="Số tài khoản *"><input className={styles.input} maxLength={30} readOnly={account?.isVietQr} value={values.accountNumber} onChange={set("accountNumber")} /></Field>
      <Field label="Chủ tài khoản *"><input className={styles.input} maxLength={200} value={values.holderName} onChange={set("holderName")} /></Field>
      <Field label="Ghi chú" wide><input className={styles.input} maxLength={500} value={values.note} onChange={set("note")} /></Field>
      {account && !account.isVietQr && <label className={`${styles.check} ${styles.formWide}`}><input type="checkbox" checked={values.isActive} onChange={(event) => setValues((current) => ({ ...current, isActive: event.target.checked }))} />Đang dùng</label>}
    </div>
    <ErrorNotice error={error} />
    <footer className={styles.foot}><div /><div><Button className="w-auto" variant="secondary" disabled={pending} onClick={() => onClose(false)}>Bỏ qua</Button><Button className="w-auto" isPending={pending} onClick={() => void save()}>Lưu</Button></div></footer>
  </div></Dialog>;
}

function TypesTab({ canManage }: { canManage: boolean }) {
  const types = useRemote(useCallback((signal: AbortSignal) => listTypes(undefined, signal), []));
  const [editing, setEditing] = useState<{ direction: CashDirection; type?: VoucherType }>();
  if (types.loading) return <Skeleton />;
  if (types.error) return <ListStateMessage error={types.error} onRetry={types.reload} />;
  const section = (direction: CashDirection) => {
    const rows = (types.data ?? []).filter((type) => type.direction === direction), word = direction === "Receipt" ? "thu" : "chi";
    return <section key={direction} className={styles.typeSection}>
      <div className={`${styles.labelRow} ${styles.sectionHead}`}><strong>Loại {word}</strong>{canManage && <Button className="w-auto" variant="secondary" onClick={() => setEditing({ direction })}><InterfaceIcon name="add" className="mr-1 size-4" />Tạo loại {word}</Button>}</div>
      <table className={styles.table}><thead><tr><th>Tên loại {word}</th><th>Danh mục</th><th>Mô tả</th><th>Hạch toán KQKD</th>{canManage && <th className={styles.actions}>Thao tác</th>}</tr></thead>
        <tbody>{rows.map((type) => <tr key={type.id}>
          <td>{type.name}{type.isSystem && <span className={styles.badge}>Hệ thống</span>}</td><td>{categoryLabel[type.category]}</td><td>{type.description || ""}</td><td>{type.countsInResult ? "Có" : "Không"}</td>
          {canManage && <td className={styles.actions}>{!type.isSystem && <button type="button" className={styles.iconButton} aria-label={`Sửa ${type.name}`} title="Sửa" onClick={() => setEditing({ direction, type })}><InterfaceIcon name="pencil" /></button>}</td>}
        </tr>)}</tbody></table>
    </section>;
  };
  return <>{section("Receipt")}{section("Payment")}
    {editing && <TypeDialog direction={editing.direction} type={editing.type} onClose={(changed) => { setEditing(undefined); if (changed) types.reload(); }} />}</>;
}
