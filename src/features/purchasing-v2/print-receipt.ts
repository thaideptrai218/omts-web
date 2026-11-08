import type { z } from "zod";
import type { receipt } from "./contracts";
import { formatVietnameseDate } from "@/shared/format/date-only";
const escape = (value: unknown) => String(value ?? "—").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]!);
const amount = (value: number | null) => value == null ? "—" : value.toLocaleString("vi-VN");
/** Print a read-only snapshot; the browser provides the Save as PDF destination. */
export function printReceipt(record: z.infer<typeof receipt>) {
  const frame = document.createElement("iframe");
  frame.title = `Bản in phiếu ${record.code}`;
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0";
  const rows = record.lines.map(line => `<tr><td>${escape(line.itemCode)}<br>${escape(line.itemName)}</td><td>${escape(line.unit)}</td><td class="number">${escape(amount(line.quantity))}</td><td class="number">${escape(amount(line.unitPrice))}</td><td>${escape(line.raft ? `${line.raft.code} (${line.raft.zoneCode})` : null)}</td><td class="number">${escape(amount(line.lineAmount))}</td></tr>`).join("");
  frame.srcdoc = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Phiếu nhập ${escape(record.code)}</title><style>@page{size:A4 landscape;margin:16mm}body{font:14px/1.6 Arial,sans-serif;color:#111}h1{font-size:24px;margin:0 0 12px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:9px;border:1px solid #aaa;text-align:left}th{background:#eee}.number{text-align:right;white-space:nowrap}.notes{white-space:pre-wrap}.total{text-align:right;font-size:18px;font-weight:bold}</style></head><body><h1>Phiếu nhập hàng ${escape(record.code)}</h1><p>Trạng thái: ${record.statusId === 1701 ? "Nháp" : record.statusId === 1702 ? "Hoàn thành" : "Đã hủy"}<br>Ngày nhập: ${escape(formatVietnameseDate(record.receiptDate))}<br>Nhà cung cấp: ${escape(record.supplier.name)}<br>Người lập: ${escape(record.recordedBy.name)}</p><table><thead><tr><th>Mã / tên hàng</th><th>Đơn vị</th><th>Số lượng</th><th>Đơn giá (đồng)</th><th>Bè sử dụng</th><th>Thành tiền (đồng)</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Tổng tiền phiếu: ${escape(amount(record.total))} đồng</p><p class="notes">Ghi chú: ${escape(record.notes || "Không có")}</p>${record.cancelReason ? `<p>Lý do hủy: ${escape(record.cancelReason)}</p>` : ""}</body></html>`;
  const remove = () => frame.remove();
  frame.onload = () => { const target = frame.contentWindow; if (!target) { remove(); return; } target.addEventListener("afterprint", remove, { once: true }); target.focus(); target.print(); };
  document.body.appendChild(frame);
  // afterprint is not emitted by every browser when the user cancels.
  setTimeout(remove, 300_000);
}
