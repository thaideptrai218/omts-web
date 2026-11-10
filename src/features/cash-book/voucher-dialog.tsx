"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { ListStateMessage, managementStyles } from "@/components/ui/management-screen/management-table";
import { PersonPicker } from "@/components/ui/management-screen/person-picker";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { MoneyInput, errorText, nowLocal, viDateTime, vnLocal } from "@/features/purchase-documents/document-parts";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import type { CashDirection, CashFund, PartyKind, VoucherView } from "./contracts";
import { AccountPicker, Field, PartyDialog, PartyPicker, TypePicker } from "./cash-pickers";
import { cancelVoucher, fundLabel, getVoucher, listAccounts, listCollectors, listTypes, partyKindLabel, saveVoucher, type VoucherInput } from "./repository";
import styles from "./cash-book.module.css";

export function useCashAccess() {
  const { identity, permissions } = useApiWorkspace();
  const owner = identity.subjectType === "CooperativeOwner";
  const can = (fn: string, action: string) => owner || permissions.functionPermissions.some((p) => p.functionCode === fn && p.action === action);
  return { owner, view: can("CASH_BOOK", "View"), create: can("CASH_BOOK", "Create"), edit: can("CASH_BOOK", "Edit"), cancel: can("CASH_BOOK", "Delete"), exportFile: can("CASH_BOOK", "Export"),
    settings: can("CASH_BOOK_SETTINGS", "View"), manageSettings: can("CASH_BOOK_SETTINGS", "Edit") };
}

const fundTitle: Record<CashFund, string> = { Cash: "tiền mặt", Bank: "ngân hàng", EWallet: "ví điện tử" };
const kinds: readonly PartyKind[] = ["Customer", "Supplier", "Employee", "Other"];
type Target = { mode: "create"; direction: CashDirection; fund: CashFund } | { mode: "edit"; id: string };

/** Opens the form for a new self-made voucher, or loads one to edit. */
export function VoucherDialog({ target, onClose }: { target: Target; onClose(message?: string): void }) {
  if (target.mode === "create") return <VoucherForm direction={target.direction} fund={target.fund} onClose={onClose} />;
  return <LoadedVoucher id={target.id} onClose={onClose} />;
}
function LoadedVoucher({ id, onClose }: { id: string; onClose(message?: string): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => getVoucher(id, signal), [id]));
  if (remote.loading || remote.error || !remote.data) return <Dialog open size="lg" title="Phiếu thu chi" onOpenChange={(open) => { if (!open) onClose(); }}>
    {remote.loading ? <Skeleton /> : <ListStateMessage error={remote.error ?? "Không tải được phiếu."} onRetry={remote.reload} />}</Dialog>;
  return <VoucherForm key={remote.data.rowVersion} direction={remote.data.direction} fund={remote.data.fund} voucher={remote.data} onClose={onClose} />;
}

/** The voucher inside an expanded list row: the same fields, saved with "Lưu" without opening a dialog. */
export function VoucherInline({ id, onOpen, onChanged }: { id: string; onOpen(): void; onChanged(message: string): void }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => getVoucher(id, signal), [id]));
  if (remote.loading) return <Skeleton />;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được phiếu."} onRetry={remote.reload} />;
  return <VoucherForm key={remote.data.rowVersion} inline direction={remote.data.direction} fund={remote.data.fund} voucher={remote.data} onOpen={onOpen}
    onClose={(message) => { if (message) onChanged(message); }} />;
}

function VoucherForm({ direction, fund: initialFund, voucher, inline, onOpen, onClose }: { direction: CashDirection; fund: CashFund; voucher?: VoucherView; inline?: boolean; onOpen?(): void; onClose(message?: string): void }) {
  const access = useCashAccess(), confirmation = useActionDialog(), receipt = direction === "Receipt", word = receipt ? "thu" : "chi";
  const cancelled = voucher?.status === "Cancelled", readOnly = cancelled || (voucher ? !access.edit : !access.create);
  const [initial] = useState<VoucherInput>(() => ({
    code: voucher?.code ?? "", direction, fund: initialFund, cashAccountId: voucher?.cashAccount?.id ?? "", typeId: voucher?.type.id ?? "", occurredAt: voucher ? vnLocal(voucher.occurredAt) : nowLocal(),
    amount: voucher?.amount ?? 0, collectorId: voucher?.collector?.id ?? "", partyKind: voucher?.party?.kind ?? "Other", partyId: voucher?.party?.id ?? "", partyName: voucher?.party?.name ?? "", note: voucher?.note ?? "",
    countsInResult: voucher?.countsInResult ?? true,
  }));
  const [values, setValues] = useState(initial);
  const dirty = (Object.keys(initial) as (keyof VoucherInput)[]).some((key) => values[key] !== initial[key]);
  const set = <K extends keyof VoucherInput>(key: K, value: VoucherInput[K]) => setValues((current) => ({ ...current, [key]: value }));
  const types = useRemote(useCallback((signal: AbortSignal) => listTypes(direction, signal), [direction]));
  const accounts = useRemote(useCallback((signal: AbortSignal) => values.fund === "Cash" ? Promise.resolve({ status: "success" as const, data: [] }) : listAccounts(values.fund, false, signal), [values.fund]));
  const collectors = useRemote(useCallback((signal: AbortSignal) => listCollectors(signal), []));
  const [error, setError] = useState<string>(), [pending, setPending] = useState(false), [creatingParty, setCreatingParty] = useState(false);
  const typeList = voucher && !types.data?.some((type) => type.id === voucher.type.id) ? [...(types.data ?? []), { ...voucher.type, direction, description: null, countsInResult: voucher.countsInResult, isSystem: false, manual: true, rowVersion: "" }] : types.data ?? [];
  const people = collectors.data ?? [];
  const accountRows = voucher?.cashAccount && !accounts.data?.some((row) => row.id === voucher.cashAccount!.id)
    ? [...(accounts.data ?? []), { ...voucher.cashAccount, kind: values.fund === "EWallet" ? "EWallet" as const : "Bank" as const, holderName: "", isActive: false, isVietQr: false, rowVersion: "" }] : accounts.data ?? [];

  async function save() {
    if (!values.typeId) { setError(`Chọn loại ${word}.`); return; }
    if (values.fund !== "Cash" && !values.cashAccountId) { setError(`Chọn tài khoản ${receipt ? "nhận" : "chi"}.`); return; }
    if (values.amount <= 0) { setError("Nhập số tiền lớn hơn 0."); return; }
    setPending(true); setError(undefined);
    const result = await saveVoucher(values, voucher?.id, voucher?.rowVersion);
    setPending(false);
    if (result.status === "success") { onClose(`Đã lưu phiếu ${word} ${result.data.code}.`); return; }
    setError(result.code === "MSG-GEN-02" ? `Mã phiếu ${values.code.trim()} đã được dùng.` : errorText(result));
  }
  async function cancel() {
    if (!voucher) return;
    const reason = await confirmation.prompt(`Hủy phiếu ${word} ${voucher.code}`);
    if (!reason) return;
    setPending(true);
    const result = await cancelVoucher(voucher.id, reason, voucher.rowVersion);
    setPending(false);
    if (result.status === "success") onClose(`Đã hủy phiếu ${word} ${voucher.code}.`); else setError(errorText(result));
  }

  const title = voucher ? `Phiếu ${word} ${voucher.code}` : `Tạo phiếu ${word} ${fundTitle[values.fund]}`;
  const body = <>{confirmation.dialog}
    {cancelled && <p className={styles.danger}><StatusPill tone="danger">Đã hủy</StatusPill> {voucher?.cancelReason}</p>}
    <div className={inline ? `${styles.formGrid} ${styles.inlineGrid}` : styles.formGrid}>
      <Field label="Mã phiếu"><input className={styles.input} aria-label="Mã phiếu" readOnly={readOnly} maxLength={30} placeholder="Tự động" value={values.code} onChange={(event) => set("code", event.target.value.replace(/\s/g, ""))} /></Field>
      <Field label="Thời gian"><DatePickerField label="Thời gian" withTime disabled={readOnly} value={values.occurredAt} max={nowLocal()} onChange={(value) => set("occurredAt", value)} /></Field>
      <Field label={`Loại ${word}`}>{types.loading ? <Skeleton /> : <TypePicker direction={direction} types={typeList} value={values.typeId} canManage={access.manageSettings} disabled={readOnly}
        onChange={(type) => setValues((current) => ({ ...current, typeId: type.id, countsInResult: type.countsInResult }))} onTypesChanged={() => types.reload()} />}</Field>
      <Field label={receipt ? "Người thu" : "Người chi"}><PersonPicker label={receipt ? "Người thu" : "Người chi"} people={people} value={values.collectorId} placeholder="Người đang đăng nhập" disabled={readOnly} onChange={(value) => set("collectorId", value)} /></Field>
      <Field label={receipt ? "Đối tượng nộp" : "Đối tượng nhận"}><select className={styles.input} disabled={readOnly} value={values.partyKind} onChange={(event) => setValues((current) => ({ ...current, partyKind: event.target.value as PartyKind, partyId: "", partyName: "" }))}>
        {kinds.map((kind) => <option key={kind} value={kind}>{partyKindLabel[kind]}</option>)}</select></Field>
      <Field label={receipt ? "Tên người nộp" : "Tên người nhận"} action={values.partyKind === "Other" && access.create && !readOnly ? <button type="button" className={styles.labelLink} onClick={() => setCreatingParty(true)}>Tạo mới</button> : undefined}>
        <PartyPicker kind={values.partyKind || "Other"} label={receipt ? "Người nộp" : "Người nhận"} disabled={readOnly} value={values.partyId ? { id: values.partyId, name: values.partyName } : null}
          onChange={(party) => setValues((current) => ({ ...current, partyId: party?.id ?? "", partyName: party?.name ?? "" }))} /></Field>
      {voucher && <Field label="Quỹ"><select className={styles.input} disabled={readOnly} value={values.fund} onChange={(event) => setValues((current) => ({ ...current, fund: event.target.value as CashFund, cashAccountId: "" }))}>
        {(["Cash", "Bank", "EWallet"] as const).map((key) => <option key={key} value={key}>{fundLabel[key]}</option>)}</select></Field>}
      {values.fund !== "Cash" && <Field label={receipt ? "Tài khoản nhận" : "Tài khoản chi"}><AccountPicker label={receipt ? "Tài khoản nhận" : "Tài khoản chi"} accounts={accountRows} value={values.cashAccountId} disabled={readOnly} onChange={(value) => set("cashAccountId", value)} /></Field>}
      <Field label="Số tiền" wide><MoneyInput label="Số tiền" className={`${styles.input} ${styles.num}`} disabled={readOnly} value={values.amount} onChange={(value) => set("amount", value)} /></Field>
      <Field label="Ghi chú" wide><textarea className={styles.textarea} readOnly={readOnly} maxLength={2000} placeholder="Nhập ghi chú" value={values.note} onChange={(event) => set("note", event.target.value)} /></Field>
      <div className={styles.formWide}>
        <label className={styles.check}><input type="checkbox" disabled={readOnly} checked={values.countsInResult} onChange={(event) => set("countsInResult", event.target.checked)} />Hạch toán vào kết quả hoạt động kinh doanh</label>
        <p className={styles.hint}>Nếu hạch toán, khoản này sẽ được tính vào báo cáo kết quả kinh doanh.</p>
      </div>
      {voucher && <p className={`${styles.formWide} ${styles.muted}`}>Tạo lúc {viDateTime(voucher.createdAt)}{voucher.createdBy ? ` bởi ${voucher.createdBy.name}` : ""}{voucher.updatedAt ? ` · sửa lúc ${viDateTime(voucher.updatedAt)}` : ""}</p>}
    </div>
    <ErrorNotice error={error} />
    <footer className={styles.foot}>
      <div>{voucher && !cancelled && access.cancel && <Button className="w-auto" variant="ghost" disabled={pending} onClick={() => void cancel()}><InterfaceIcon name="trash" className="size-4" />Hủy phiếu</Button>}</div>
      {inline
        ? <div>{dirty && <Button className="w-auto" variant="ghost" disabled={pending} onClick={() => { setValues(initial); setError(undefined); }}>Hoàn tác</Button>}
          {onOpen && <Button className="w-auto" variant="secondary" disabled={pending} onClick={onOpen}><InterfaceIcon name="document" className="size-4" />Mở phiếu</Button>}
          {!readOnly && <Button className="w-auto" isPending={pending} disabled={!dirty} onClick={() => void save()}><InterfaceIcon name="check" className="size-4" />Lưu</Button>}</div>
        : <div><Button className="w-auto" variant="secondary" disabled={pending} onClick={() => onClose()}>Bỏ qua</Button>{!readOnly && <Button className="w-auto" isPending={pending} onClick={() => void save()}>Lưu</Button>}</div>}
    </footer>
    {creatingParty && <PartyDialog title={receipt ? "Tạo người nộp" : "Tạo người nhận"} onClose={(party) => { setCreatingParty(false); if (party) setValues((current) => ({ ...current, partyKind: "Other", partyId: party.id, partyName: party.name })); }} />}
  </>;
  if (inline) return <div className={managementStyles.theme}>{body}</div>;
  return <Dialog open size="lg" dismissible={!pending} title={title} onOpenChange={(open) => { if (!open) onClose(); }}><div className={managementStyles.theme}>{body}</div></Dialog>;
}
