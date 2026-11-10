"use client";
import { useState } from "react";
import { useMutation } from "@/features/operations/ui";
import { invoiceSent, type InvoiceDetail } from "./invoice-list-contracts";
import { invoiceRepository } from "./use-invoice-list";

/**
 * Gửi lại hóa đơn (POST .../resend, develop) và in hóa đơn ra Excel (GET .../{id}/print qua repository.download).
 * Gửi lại là thao tác ghi: kết quả không chắc chắn khóa nút cho tới khi tải lại; in là đọc nên không khóa.
 * Tệp in có tên mặc định "sales-invoice-list.xlsx" do repository đặt (không có tên theo mã hóa đơn).
 */
export function useInvoiceActions(invoiceId: string, onChanged: (invoice: InvoiceDetail) => void) {
  const resender = useMutation(), printer = useMutation();
  const [notice, setNotice] = useState<string>();
  async function resend() {
    setNotice(undefined);
    const sent = await resender.run(() => invoiceRepository.write("resend", {}, invoiceSent, invoiceId));
    if (!sent) return;
    // deliveryStatusId 1602 = Đã gửi; 1603 = chưa gửi được (khách lẻ hoặc chưa có số điện thoại, MSG-SALE-16); chuỗi tiếng Anh của backend không được hiển thị.
    setNotice(sent.deliveryStatusId === 1602 ? "Đã gửi lại hóa đơn cho khách." : sent.deliveryStatusId === 1601 ? "Hóa đơn đang được gửi cho khách."
      : "Chưa gửi được hóa đơn: khách lẻ hoặc khách chưa có số điện thoại.");
    onChanged(sent.invoice);
  }
  return {
    resend, print: () => { void printer.run(() => invoiceRepository.download({ id: invoiceId }), true); }, notice,
    resending: resender.pending, printing: printer.pending, blocked: resender.blocked, error: resender.error ?? printer.error,
  };
}
