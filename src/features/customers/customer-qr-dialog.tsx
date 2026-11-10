"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage, managementStyles } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { AccountPicker, Field } from "@/features/cash-book/cash-pickers";
import type { CashAccount } from "@/features/cash-book/contracts";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { MoneyInput, fmt } from "@/features/purchase-documents/document-parts";
import { QrCodeImage } from "@/features/sales-invoices/qr-code-image";
import type { PaymentDetails, QrView } from "./contracts";
import { customerRepository, errorText } from "./repository";
import styles from "./customers.module.css";
import cashStyles from "@/features/cash-book/cash-book.module.css";

export type QrShown = { payment: Pick<PaymentDetails, "id" | "code">; qr: QrView };
/** The bank accounts of the payment form as the picker of the cash book wants them. */
export const asCashAccounts = (rows: readonly { id: string; bankBin?: string | null; providerName: string; accountNumber: string; holderName: string }[]): CashAccount[] =>
  rows.map((row) => ({ id: row.id, kind: "Bank", bankBin: row.bankBin ?? null, providerName: row.providerName, accountNumber: row.accountNumber, holderName: row.holderName, note: null, isActive: true, isVietQr: false, rowVersion: "" }));

/** The QR as a PNG: the SVG is drawn on a canvas at a size a banking app reads easily. */
async function qrBlob(svg: SVGSVGElement): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("QR")); image.src = url; });
    const canvas = document.createElement("canvas"), size = 640;
    canvas.width = size; canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("QR");
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("QR")), "image/png"));
  } finally { URL.revokeObjectURL(url); }
}

/** The code with its transfer details; "Tải QR" saves the image and "Sao chép" puts it on the clipboard (the transfer details as text where images cannot be copied). */
function QrBody({ shown }: { shown: QrShown }) {
  const box = useRef<HTMLDivElement>(null), [note, setNote] = useState<string>(), [failure, setFailure] = useState<string>();
  const { qr, payment } = shown;
  const svg = () => box.current?.querySelector("svg") ?? undefined;
  async function download() {
    const element = svg();
    if (!element) { setFailure("Chưa tạo được ảnh QR; hãy chuyển khoản theo thông tin bên cạnh."); return; }
    try {
      const url = URL.createObjectURL(await qrBlob(element)), link = document.createElement("a");
      link.href = url; link.download = `QR-${payment.code}.png`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setFailure(undefined); setNote("Đã tải ảnh QR.");
    } catch { setFailure("Không tải được ảnh QR."); }
  }
  async function copy() {
    const element = svg(), text = `${qr.bankName} - ${qr.accountNumber} - ${qr.accountHolderName}\nSố tiền: ${fmt(qr.amount)} đ\nNội dung: ${qr.content}`;
    try {
      if (element && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) { await navigator.clipboard.write([new ClipboardItem({ "image/png": qrBlob(element) })]); setNote("Đã sao chép ảnh QR."); }
      else { await navigator.clipboard.writeText(text); setNote("Đã sao chép thông tin chuyển khoản."); }
      setFailure(undefined);
    } catch { setFailure("Không sao chép được; hãy dùng Tải QR."); }
  }
  return <div className="space-y-3">
    <div className={styles.qrLayout}>
      <div ref={box} className={styles.qrBox}><QrCodeImage value={qr.payload} label={`Mã QR chuyển khoản phiếu ${payment.code}`} /></div>
      <div className={styles.qrInfo}>
        <dl><dt>Ngân hàng</dt><dd>{qr.bankName}</dd><dt>Số tài khoản</dt><dd>{qr.accountNumber}</dd><dt>Chủ tài khoản</dt><dd>{qr.accountHolderName}</dd><dt>Số tiền</dt><dd>{fmt(qr.amount)} đ</dd><dt>Nội dung</dt><dd>{qr.content}</dd><dt>Phiếu thu</dt><dd>{payment.code}</dd></dl>
        <div className={styles.qrActions}>
          <Button className="w-auto" variant="secondary" onClick={() => void download()}><InterfaceIcon name="download" className="mr-1 size-4" />Tải QR</Button>
          <Button className="w-auto" variant="secondary" onClick={() => void copy()}><InterfaceIcon name="document" className="mr-1 size-4" />Sao chép</Button>
        </div>
        {note && <p role="status" className={styles.hint}>{note}</p>}
        <p className={styles.qrNote}>Phiếu thu hoàn tất tự động khi tiền chuyển về với đúng nội dung chuyển khoản. Trước đó phiếu chưa tính vào công nợ và sổ quỹ.</p>
      </div>
    </div>
    <ErrorNotice error={failure} />
  </div>;
}

function Compose({ customerId, onCreated }: { customerId: string; onCreated(shown: QrShown): void }) {
  const form = useRemote(useCallback((signal: AbortSignal) => customerRepository.paymentForm(customerId, signal), [customerId]));
  const { notify } = useToast(), [accountId, setAccountId] = useState<string>(), [amount, setAmount] = useState<number>(), [pending, setPending] = useState(false), [error, setError] = useState<string>(), [key] = useState(() => crypto.randomUUID());
  const accounts = useMemo(() => asCashAccounts(form.data?.bankAccounts ?? []), [form.data]);
  if (form.loading) return <Skeleton />;
  if (form.error || !form.data) return <ListStateMessage error={form.error ?? "Không tải được thông tin thanh toán."} onRetry={form.reload} />;
  const chosen = accountId ?? form.data.bankAccounts.find((row) => row.isDefault)?.id ?? form.data.bankAccounts[0]?.id ?? "";
  const money = amount ?? Math.max(0, form.data.debt);
  async function create() {
    if (money <= 0) { setError("Nhập số tiền lớn hơn 0."); return; }
    if (!chosen) { setError("Chọn tài khoản nhận tiền."); return; }
    setPending(true); setError(undefined);
    const result = await customerRepository.pendingTransfer({ customerId, amount: money, cashAccountId: chosen, deduplicationKey: key });
    setPending(false);
    if (result.status !== "success" || !result.data.payment || !result.data.qr) { setError(result.status === "success" ? "Chưa nhận được mã QR từ hệ thống." : errorText(result)); return; }
    notify({ tone: "success", title: `Đã tạo phiếu thu ${result.data.payment.code}, chờ khách chuyển khoản.` });
    onCreated({ payment: result.data.payment, qr: result.data.qr });
  }
  return <div className="space-y-3">
    <p className="text-sm">{form.data.customer.name}{form.data.debt > 0 && <span className={styles.owedChip}> Nợ hiện tại: <strong>{fmt(form.data.debt)}</strong></span>}</p>
    <div className={cashStyles.formGrid}>
      <Field label="Tài khoản nhận" wide><AccountPicker label="Tài khoản nhận" accounts={accounts} value={chosen} onChange={setAccountId} /></Field>
      <Field label="Số tiền" wide><MoneyInput label="Số tiền cần thu" className={`${cashStyles.input} ${cashStyles.num}`} value={money} onChange={setAmount} /></Field>
    </div>
    <p className={styles.hint}>Số tiền được phân bổ vào các hóa đơn cũ nhất trước. Mã QR có nội dung là mã phiếu thu.</p>
    <ErrorNotice error={error} />
    <div className="flex justify-end"><Button className="w-auto" isPending={pending} onClick={() => void create()}>Tạo mã QR</Button></div>
  </div>;
}

/** An existing code shown again: the payment waiting for its transfer, read from the system. */
function Reprint({ id }: { id: string }) {
  const remote = useRemote(useCallback(async (signal: AbortSignal) => {
    const [payment, qr] = await Promise.all([customerRepository.payment(id, signal), customerRepository.paymentQr(id, signal)]);
    if (payment.status !== "success") return payment;
    if (qr.status !== "success") return qr;
    return { status: "success" as const, data: { payment: payment.data, qr: qr.data } };
  }, [id]));
  if (remote.loading) return <Skeleton />;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được mã QR."} onRetry={remote.reload} />;
  return <QrBody shown={remote.data} />;
}

/** "Tạo QR" (account and amount, then the code), the code just made by "Tạo phiếu thu & In QR", or a pending payment's code again. */
export function CustomerQrDialog({ customerId, shown, reprintId, onClose }: { customerId?: string; shown?: QrShown; reprintId?: string; onClose(changed: boolean): void }) {
  const [made, setMade] = useState<QrShown | undefined>(shown), changed = !!shown || !!made;
  return <Dialog open size="lg" title="Mã QR chuyển khoản" onOpenChange={(open) => { if (!open) onClose(changed); }}><div className={managementStyles.theme}>
    {made ? <QrBody shown={made} /> : reprintId ? <Reprint id={reprintId} /> : customerId ? <Compose customerId={customerId} onCreated={setMade} /> : null}
    <footer className="mt-4 flex justify-end"><Button className="w-auto" variant="secondary" onClick={() => onClose(changed)}>Đóng</Button></footer>
  </div></Dialog>;
}
