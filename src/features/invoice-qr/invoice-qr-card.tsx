"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useCooperativeName } from "@/components/brand/cooperative-name-context";
import { Button } from "@/components/ui/button";
import { QrCodeImage } from "@/features/sales-invoices/qr-code-image";

export type InvoiceQrLine = Readonly<{ lotCode: string; productName: string; harvestDate?: string | null }>;

/** Khi in: ẩn mọi thứ khác trên trang, chỉ còn nhãn (khổ nhãn ~ 90 mm, in được trên A4 hoặc giấy nhãn). */
const PRINT_CSS = `
@media screen { .omts-qr-label { display: none; } }
@media print {
  @page { margin: 8mm; }
  body > *:not(.omts-qr-label) { display: none !important; }
  .omts-qr-label { display: block; width: 90mm; padding: 4mm; border: 1px solid #000; color: #000; background: #fff; font-family: system-ui, sans-serif; text-align: center; break-inside: avoid; }
  .omts-qr-label h2 { margin: 0 0 1mm; font-size: 13pt; }
  .omts-qr-label p { margin: 0; font-size: 9pt; }
  .omts-qr-label ul { margin: 2mm 0; padding: 0; list-style: none; font-size: 10pt; text-align: left; }
  .omts-qr-label li { margin-bottom: 1mm; }
  .omts-qr-label svg { width: 55mm; height: 55mm; }
  .omts-qr-label .omts-qr-url { word-break: break-all; font-size: 7pt; }
}`;

const dayText = (iso?: string | null) => (iso && /^(\d{4})-(\d{2})-(\d{2})/.test(iso) ? iso.slice(0, 10).split("-").reverse().join("/") : null);

/**
 * Mã QR nguồn gốc của hóa đơn: ảnh QR để dán/in cùng hàng và nút "In nhãn QR". Nhãn gồm tên hợp tác xã (lấy từ hồ sơ HTX),
 * sản phẩm, mã lô, ngày thu hoạch và mã QR; in bằng hộp thoại in của trình duyệt (CSS in), không mở trang riêng.
 */
export function InvoiceQrCard({ url, invoiceCode, lines }: Readonly<{ url: string; invoiceCode: string; lines: readonly InvoiceQrLine[] }>) {
  const cooperative = useCooperativeName();
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  // Clipboard is unavailable on insecure origins or when denied: say so instead of failing silently.
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(url); setCopied("done"); } catch { setCopied("failed"); }
  };
  // Cổng (portal) chỉ có ở trình duyệt: false khi máy chủ vẽ, true sau khi hydrate.
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const lots = useMemo(() => {
    const byCode = new Map<string, { products: Set<string>; harvestDate: string | null }>();
    for (const line of lines) {
      const entry = byCode.get(line.lotCode) ?? { products: new Set<string>(), harvestDate: dayText(line.harvestDate) };
      entry.products.add(line.productName);
      byCode.set(line.lotCode, entry);
    }
    return [...byCode.entries()].map(([lotCode, entry]) => ({ lotCode, products: [...entry.products].join(", "), harvestDate: entry.harvestDate }));
  }, [lines]);
  return (
    <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
      <QrCodeImage value={url} size={176} label={`Mã QR nguồn gốc của hóa đơn ${invoiceCode}`} />
      <div>
        <p style={{ margin: 0 }}>Khách quét mã này để xem nguồn gốc hàu của hóa đơn {invoiceCode}.</p>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <Button type="button" variant="secondary" className="mt-2 w-auto" onClick={() => void copyLink()}>Sao chép liên kết</Button>
          <Button type="button" variant="secondary" className="mt-2 w-auto" onClick={() => window.print()}>In nhãn QR</Button>
        </div>
        <p role="status" style={{ margin: ".25rem 0 0", fontSize: ".85em" }}>{copied === "done" ? "Đã sao chép liên kết." : copied === "failed" ? "Không sao chép được, hãy mở liên kết và chép thủ công." : ""}</p>
      </div>
      {mounted && createPortal(
        <div className="omts-qr-label" aria-hidden="true">
          <style>{PRINT_CSS}</style>
          <h2>{cooperative}</h2>
          <p>Truy xuất nguồn gốc · Hóa đơn {invoiceCode}</p>
          <ul>
            {lots.map((lot) => (
              <li key={lot.lotCode}><strong>{lot.products}</strong><br />Lô {lot.lotCode}{lot.harvestDate ? ` · thu hoạch ${lot.harvestDate}` : ""}</li>
            ))}
          </ul>
          <QrCodeImage value={url} size={208} label="Mã QR nguồn gốc" />
          <p>Quét mã QR để xem nguồn gốc sản phẩm</p>
          <p className="omts-qr-url">{url}</p>
        </div>,
        document.body,
      )}
    </div>
  );
}
