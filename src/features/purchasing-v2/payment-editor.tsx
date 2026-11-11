"use client";
import { formatVndWithSymbol } from "@/shared/format/vnd";
import { useMemo, useState } from "react";
import { MoneyField } from "@/components/form/number-fields";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { loadOptions } from "@/features/operations/lookups";
import { DataTable, ErrorNotice, Field, Money, Note, Select, businessToday, useRemote } from "@/features/operations/ui";
import { useOperationEditor } from "@/features/operations/use-operation-editor";
import * as c from "./contracts";
import { EditorClose } from "./editor-close-panel";
import { paymentsRepository as payments, type Payment, type SupplierPaymentDraft } from "./purchasing-shared";
import styles from "./purchasing.module.css";

type PaymentKind = "Payment" | "PaidBack";
type PaymentMethod = "Cash" | "BankTransfer";

const loadSuppliers = (signal: AbortSignal) => loadOptions("suppliers", signal);

/**
 * Records a supplier payment / pay-back (`record` null) or shows a saved one, which can only be cancelled.
 * The server may ask for explicit confirmation of an advance (MSG-PURCHASE-05) or a reused bank
 * reference (MSG-PURCHASE-06); those checkboxes reset whenever the related input changes.
 */
export function PaymentEditor({
  record,
  canWrite,
  onClose,
  onSaved,
  initialDraft,
}: {
  record: Payment | null;
  canWrite: boolean;
  onClose(): void;
  onSaved(): void;
  initialDraft?: SupplierPaymentDraft;
}) {
  const suppliers = useRemote(loadSuppliers);
  const [supplier, setSupplier] = useState(record?.supplier.id ?? initialDraft?.supplierId ?? "");
  const [kind, setKind] = useState<PaymentKind>(record?.kind ?? initialDraft?.kind ?? "Payment");
  const [amount, setAmount] = useState(String(record?.amount ?? initialDraft?.amount ?? ""));
  const [date, setDate] = useState(record?.paymentDate ?? businessToday());
  const [method, setMethod] = useState<PaymentMethod>(record?.method ?? "Cash");
  const [reference, setReference] = useState(record?.bankReference ?? "");
  const [note, setNote] = useState(record?.note ?? initialDraft?.note ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  // One key per dialog so a retried submit is recognised as the same payment by the server.
  const [key] = useState(() => crypto.randomUUID());
  const [confirmAdvance, setAdvance] = useState(false);
  const [confirmDuplicate, setDuplicate] = useState(false);
  const [discount, setDiscount] = useState("");
  const editor = useOperationEditor(
    onClose,
    (!record && (!!supplier || !!amount || !!reference || !!note)) || !!reason,
  );
  const debt = useRemote(
    useMemo(
      () => (signal: AbortSignal) =>
        supplier
          ? payments.read("debt", { supplierId: supplier }, c.debt, signal)
          : Promise.resolve({ status: "success" as const, data: null }),
      [supplier],
    ),
  );

  async function save() {
    const parsed = c.paymentValues.safeParse({
      supplierId: supplier,
      kind,
      paymentDate: date,
      amount: Number(amount || 0),
      discountAmount: kind === "Payment" ? Number(discount || 0) : 0,
      method,
      bankReference: method === "BankTransfer" ? reference || null : null,
      note: note || null,
      confirmAdvance,
      confirmDuplicateBankReference: confirmDuplicate,
      deduplicationKey: key,
    });
    if (!parsed.success || date > businessToday() || (method === "BankTransfer" && !reference.trim())) {
      setError("Chọn nhà cung cấp, ngày không vượt hôm nay, số tiền hoặc chiết khấu lớn hơn 0 và mã giao dịch khi chuyển khoản.");
      return;
    }
    setError(undefined);
    const verb = kind === "Payment" ? "Chi trả" : "Nhận lại";
    const advanceNote = confirmAdvance ? "(đã xác nhận trả trước)" : "";
    const duplicateNote = confirmDuplicate ? " (đã xác nhận mã ngân hàng trùng)" : "";
    const discountNote =
      kind === "Payment" && Number(discount) > 0 ? `, chiết khấu ${formatVndWithSymbol(Number(discount))}` : "";
    const question = `${verb} ${formatVndWithSymbol(Number(amount || 0))}${discountNote} ${advanceNote}${duplicateNote}?`;
    if (await editor.submit(question, () => payments.write("create", parsed.data, c.payment))) onSaved();
  }

  const title = record
    ? `Giao dịch ${record.code}`
    : kind === "PaidBack"
      ? "Ghi nhận nhà cung cấp trả lại tiền"
      : "Ghi thanh toán nhà cung cấp";

  return (
    <Dialog
      open
      size="lg"
      dismissible={false}
      onCloseRequest={() => void editor.close()}
      title={title}
      onOpenChange={() => {}}
    >
      <div className={styles.paymentEditor}>
        {editor.dialog}
        <ErrorNotice error={error || editor.mutation.error || suppliers.error || debt.error} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          {/* Saved transactions are read-only. */}
          <fieldset disabled={!!record || !canWrite || editor.disabled} className="space-y-4">
            <Select
              label="Nhà cung cấp *"
              required
              value={supplier}
              onChange={(e) => {
                setSupplier(e.target.value);
                setAdvance(false);
                setDuplicate(false);
              }}
            >
              <option value="">Chọn nhà cung cấp</option>
              {record && !suppliers.data?.some((v) => v.id === record.supplier.id) && (
                <option value={record.supplier.id}>{record.supplier.name}</option>
              )}
              {suppliers.data?.map((v) => (
                <option key={v.id} value={v.id}>
                  {String(v.name)}
                </option>
              ))}
            </Select>
            <Select
              label="Loại giao dịch"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as PaymentKind);
                setAdvance(false);
              }}
            >
              <option value="Payment">Chi trả nhà cung cấp</option>
              <option value="PaidBack">Nhà cung cấp trả lại tiền</option>
            </Select>
            <Field
              label="Ngày thanh toán *"
              type="date"
              max={businessToday()}
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <MoneyField
              label="Số tiền *"
              min={0}
              autoThousands
              showWords
              required
              value={amount}
              onChange={(next) => {
                setAmount(next);
                setAdvance(false);
              }}
            />
            {kind === "Payment" && (
              <MoneyField
                label="Chiết khấu thanh toán"
                min={0}
                autoThousands
                value={record ? String((record as { discountAmount?: number }).discountAmount ?? 0) : discount}
                onChange={(next) => {
                  setDiscount(next);
                  setAdvance(false);
                }}
              />
            )}
            <Select
              label="Phương thức"
              value={method}
              onChange={(e) => {
                setMethod(e.target.value as PaymentMethod);
                setDuplicate(false);
              }}
            >
              <option value="Cash">Tiền mặt</option>
              <option value="BankTransfer">Chuyển khoản</option>
            </Select>
            {method === "BankTransfer" && (
              <Field
                label="Mã giao dịch ngân hàng *"
                required
                value={reference}
                onChange={(e) => {
                  setReference(e.target.value);
                  setDuplicate(false);
                }}
              />
            )}
            <Note label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
            {editor.mutation.failure?.code === "MSG-PURCHASE-05" && (
              <label className="flex gap-2 text-sm">
                <input type="checkbox" checked={confirmAdvance} onChange={(e) => setAdvance(e.target.checked)} />
                Xác nhận khoản vượt công nợ được ghi là trả trước
              </label>
            )}
            {editor.mutation.failure?.code === "MSG-PURCHASE-06" && (
              <label className="flex gap-2 text-sm">
                <input type="checkbox" checked={confirmDuplicate} onChange={(e) => setDuplicate(e.target.checked)} />
                Đã đối chiếu và xác nhận dùng mã ngân hàng đã ghi trước đó
              </label>
            )}
            {!record && <Button type="submit">Lưu giao dịch</Button>}
          </fieldset>
        </form>
        {debt.data && (
          <>
            <p className="my-4">
              Công nợ hiện tại: <Money value={debt.data.debtToday} />. Số âm là tiền đã trả trước.
            </p>
            <DataTable headings={["Phiếu chưa thanh toán hết", "Còn lại"]} empty={!debt.data.unpaidReceipts.length}>
              {debt.data.unpaidReceipts.map((v) => (
                <tr key={v.id}>
                  <td>{v.code}</td>
                  <td>
                    <Money value={v.remaining} />
                  </td>
                </tr>
              ))}
            </DataTable>
          </>
        )}
        {record && (
          <>
            <p className="my-4">
              {record.statusId === 1802 ? "Đã hủy" : "Đã ghi nhận"}
              {record.cancelReason ? ` · ${record.cancelReason}` : ""}
            </p>
            {record.statusId !== 1802 && canWrite && (
              <>
                <Note
                  label="Lý do hủy giao dịch *"
                  disabled={editor.disabled}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <Button
                  className="mt-3"
                  variant="secondary"
                  disabled={editor.disabled || !reason.trim()}
                  onClick={async () => {
                    if (
                      await editor.submit("Hủy giao dịch ghi nhầm? Công nợ sẽ được tính lại.", () =>
                        payments.write("cancel", { reason, rowVersion: record.rowVersion }, c.payment, record.id),
                      )
                    )
                      onSaved();
                  }}
                >
                  Hủy giao dịch
                </Button>
              </>
            )}
          </>
        )}
        <EditorClose editor={editor} />
      </div>
    </Dialog>
  );
}
