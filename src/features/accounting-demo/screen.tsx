"use client";

import { useState } from "react";
import { DataGrid } from "@/components/ui/data-grid";
import { ManagementHeading } from "@/components/ui/management-page";
import { Button } from "@/components/ui/button";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";
import { useAuth } from "@/features/auth/state/auth-provider";
import { demoAccountingService } from "./service";

const inputClass = "min-h-11 lg:min-h-10 w-full rounded-control border border-border bg-surface px-3 text-sm";
const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
const time = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));

function useDemoAccounting() {
  const auth = useAuth();
  if (auth.state.status !== "authenticated") return null;
  return { account: auth.state.account, data: demoAccountingService.load(auth.state.account.accountId) };
}
export function DemoReceiptScreen() {
  const context = useDemoAccounting();
  const confirmation = useActionDialog();
  const [, refresh] = useState(0);
  const [zoneId, setZoneId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [invoiceReference, setInvoiceReference] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState("");
  if (!context) return null;
  const account = context.account;
  const canSubmit = hasEffectivePermission(account.access, "purchase.receipts.submit");
  async function submit() {
    if (!await confirmation.confirm("Gửi phiếu này trực tiếp cho Kế toán thanh toán? Chủ nhiệm HTX nhận thông báo để theo dõi.")) return;
    const result = demoAccountingService.submit({ accountId: account.accountId, zoneId, supplierName, invoiceReference, amount: Number(amount), note });
    if (result.status !== "saved") { setFeedback("Kiểm tra lại vùng, nhà cung cấp, mã hóa đơn và số tiền nguyên dương."); return; }
    setFeedback(`${result.data.code} đã gửi cho Kế toán.`); setSupplierName(""); setInvoiceReference(""); setAmount(""); setNote(""); refresh((value) => value + 1);
  }
  const data = demoAccountingService.load(account.accountId);
  return <div className="space-y-6"><header><h1 className="text-2xl font-semibold tracking-tight">Phiếu nhập và yêu cầu thanh toán</h1><p className="mt-2 text-sm text-text-muted">Quản lý vùng gửi phiếu trực tiếp cho Kế toán; Chủ nhiệm HTX nhận thông báo để theo dõi.</p></header>{confirmation.dialog}
    {context.account.accountId === "account-owner-demo" && <section className="rounded-card border border-border bg-surface p-5"><h2 className="text-xl font-semibold">Thông báo cho Chủ nhiệm HTX</h2><ul className="mt-3 space-y-2">{data.notices.length ? data.notices.map((notice) => <li key={notice.id}>{time(notice.time)} · {notice.text}</li>) : <li>Chưa có thông báo mới.</li>}</ul></section>}
    {canSubmit && <section className="rounded-card border border-border bg-surface p-5"><h2 className="text-xl font-semibold">Tạo và gửi yêu cầu</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label>Vùng *<select className={`mt-2 ${inputClass}`} value={zoneId} onChange={(event) => setZoneId(event.target.value)}><option value="">Chọn vùng</option>{data.zones.map((zone) => <option value={zone.id} key={zone.id}>{zone.name}</option>)}</select></label><label>Nhà cung cấp *<input className={`mt-2 ${inputClass}`} value={supplierName} onChange={(event) => setSupplierName(event.target.value)} /></label><label>Mã hóa đơn *<input className={`mt-2 ${inputClass}`} value={invoiceReference} onChange={(event) => setInvoiceReference(event.target.value)} /></label><label>Số tiền (đồng) *<input className={`mt-2 ${inputClass}`} type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label className="sm:col-span-2">Ghi chú<textarea className={`mt-2 ${inputClass} min-h-24 py-3`} value={note} onChange={(event) => setNote(event.target.value)} /></label></div><Button className="mt-4 w-auto" onClick={() => void submit()}>Gửi cho Kế toán</Button>{feedback && <p role="status" className="mt-3">{feedback}</p>}</section>}
    <ReceiptList receipts={data.receipts} /></div>;
}

export function DemoPaymentScreen() {
  const context = useDemoAccounting();
  const confirmation = useActionDialog();
  const [, refresh] = useState(0);
  const [feedback, setFeedback] = useState("");
  if (!context) return null;
  const data = demoAccountingService.load(context.account.accountId);
  return <div className="space-y-6"><ManagementHeading title="Thanh toán nhà cung cấp" description="Kế toán xử lý yêu cầu của mọi vùng trong HTX." icon="payment" />{confirmation.dialog}{feedback && <p role="status" className="rounded-control border border-border p-3">{feedback}</p>}<section className="space-y-3">{data.receipts.filter((receipt) => receipt.status === "pending-payment").map((receipt) => <article className="rounded-card border border-border bg-surface p-5" key={receipt.id}><h2 className="font-semibold">{receipt.code} · {receipt.supplierName}</h2><p>{receipt.zoneName} · {receipt.invoiceReference} · {money(receipt.amount)}</p><p className="text-sm text-text-muted">Người gửi: {receipt.createdBy} · {time(receipt.createdAt)}</p><Button className="mt-3 w-auto" onClick={async () => { if (!await confirmation.confirm(`Xác nhận đã thanh toán ${receipt.code} với số tiền ${money(receipt.amount)}?`)) return; const result = demoAccountingService.pay(context.account.accountId, receipt.id); if (result.status === "saved") { setFeedback(`${receipt.code} đã thanh toán.`); refresh((value) => value + 1); } }}>Xác nhận đã thanh toán</Button></article>)}{!data.receipts.some((receipt) => receipt.status === "pending-payment") && <p className="rounded-card border border-dashed border-border p-5">Chưa có yêu cầu chờ thanh toán.</p>}</section></div>;
}

function ReceiptList({ receipts }: { receipts: ReturnType<typeof demoAccountingService.load>["receipts"] }) {
  return <section><h2 className="text-base font-semibold">Danh sách phiếu</h2><div className="mt-3"><DataGrid headings={["Mã", "Vùng", "Nhà cung cấp / hóa đơn", "Số tiền", "Trạng thái"]}>{receipts.map((receipt) => <tr className="border-t border-border" key={receipt.id}><td className="p-3">{receipt.code}</td><td className="p-3">{receipt.zoneName}</td><td className="p-3">{receipt.supplierName} · {receipt.invoiceReference}</td><td className="p-3 text-right tabular-nums">{money(receipt.amount)}</td><td className="p-3">{receipt.status === "paid" ? "Đã thanh toán" : "Chờ Kế toán thanh toán"}</td></tr>)}</DataGrid>{!receipts.length && <p className="p-4">Chưa có phiếu.</p>}</div></section>;
}

