"use client";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { useToast } from "@/components/ui/toast-provider";
import { QrCodeImage } from "@/features/sales-invoices/qr-code-image";

type Props = Readonly<{ code: string; url: string; onClose(): void }>;

/**
 * Mã QR nguồn gốc của một hóa đơn: hiện to để khách quét ngay trên màn hình, sao chép link, mở trang nguồn gốc,
 * hoặc in riêng mã QR (kèm mã hóa đơn) để dán lên thùng hàng. Mã vẽ bằng SVG nội tuyến, không tải ảnh từ ngoài.
 */
export function InvoiceOriginQrDialog({ code, url, onClose }: Props) {
  const box = useRef<HTMLDivElement>(null), { notify } = useToast();
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); notify({ tone: "success", title: "Đã sao chép link trang nguồn gốc." }); }
    catch { notify({ tone: "danger", title: "Chưa sao chép được link.", description: url }); }
  };
  // In riêng mã QR trong một cửa sổ mới (không in cả màn hình quản lý).
  const print = () => {
    const svg = box.current?.querySelector("svg")?.outerHTML;
    const page = svg && window.open("", "_blank", "width=480,height=640");
    if (!page) return;
    page.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>QR nguồn gốc ${code}</title>
<style>body{font-family:system-ui,sans-serif;text-align:center;margin:24px}svg{width:70mm;height:70mm}h1{font-size:18px;margin:12px 0 4px}p{margin:0;font-size:12px;color:#444}</style></head>
<body>${svg}<h1>Hóa đơn ${code}</h1><p>Quét mã để xem nguồn gốc hàu</p></body></html>`);
    page.document.close();
    page.focus();
    page.print();
  };
  return (
    <Dialog open size="md" title={`Mã QR nguồn gốc · ${code}`} onOpenChange={(open) => { if (!open) onClose(); }}>
      <div className="grid justify-items-center gap-3 p-5">
        <div ref={box} className="rounded-card border border-border bg-white p-3">
          <QrCodeImage value={url} label={`Mã QR trang nguồn gốc hóa đơn ${code}`} className="size-64" />
        </div>
        <p className="text-center text-sm text-text-muted">Khách quét mã bằng camera điện thoại để xem nguồn gốc lô hàu của hóa đơn này.</p>
        <a className="max-w-full break-all text-center text-xs text-primary underline" href={url} target="_blank" rel="noopener noreferrer">{url}</a>
        <div className="flex flex-wrap justify-center gap-2">
          <Button className="w-auto" variant="secondary" onClick={() => void copy()}><InterfaceIcon name="link" className="size-4" />Sao chép link</Button>
          <Button className="w-auto" variant="secondary" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}><InterfaceIcon name="eye" className="size-4" />Mở trang</Button>
          <Button className="w-auto" onClick={print}><InterfaceIcon name="print" className="size-4" />In mã QR</Button>
        </div>
      </div>
    </Dialog>
  );
}
