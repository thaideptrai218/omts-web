"use client";
// FRAME ONLY: no data source yet. Wire to the create sales-return endpoint once available.
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import s from "@/features/quality-claims/frame-kit.module.css";

/** Hộp thoại "Xác nhận phiếu trả hàng bán": bố cục như thiết kế, nút Có chưa dùng được. */
export function SalesReturnConfirmDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }} size="md" mobileLayout="compact" title="Xác nhận phiếu trả hàng bán">
      <p role="group" aria-label="Nội dung xác nhận" className={s.card}>
        Chủ hợp tác xã đã đồng ý nhận lại toàn bộ hàng của hóa đơn — (—) và quyết định lô nào bán lại chưa?
      </p>
      <p className={s.hint}>Khi chủ hợp tác xã chưa đồng ý, phiếu không được lưu.</p>
      {/* TODO(api): confirm creates the return slip (message MSG-CLAIM-04); resale/discard choice per lot goes in the request. */}
      <div className={s.footer}>
        <Button variant="secondary" className="w-auto" data-dialog-initial-focus onClick={onClose}>Không</Button>
        <Button className="w-auto" disabled aria-disabled="true">Có</Button>
      </div>
    </Dialog>
  );
}
