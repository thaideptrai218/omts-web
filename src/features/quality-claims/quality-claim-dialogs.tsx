"use client";
// FRAME ONLY: no data source yet. Wire to the accept / reject claim endpoints once available.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Note } from "@/features/operations/ui";
import s from "./frame-kit.module.css";

const SUBTITLE = "Khiếu nại — · hóa đơn — · khách hàng —.";

export type ClaimDialogKind = "accept" | "reject" | null;

/** Hộp thoại Chấp nhận / Từ chối khiếu nại: bố cục như thiết kế, nút xác nhận chưa dùng được. */
export function QualityClaimDialogs({ kind, onClose }: { kind: ClaimDialogKind; onClose(): void }) {
  const [note, setNote] = useState("");
  const accept = kind === "accept";
  return (
    <Dialog open={kind !== null} onOpenChange={(open) => { if (!open) { setNote(""); onClose(); } }} size="md" mobileLayout="compact"
      title={accept ? "Chấp nhận khiếu nại" : "Từ chối khiếu nại"}
      description={accept ? `${SUBTITLE} Chấp nhận nghĩa là hợp tác xã đề nghị thương lái chọn trả lại toàn bộ hàng hoặc giảm giá cả hóa đơn; chọn xong thương lái báo ngoài OMTS.` : `${SUBTITLE} Lý do được gửi cho thương lái.`}>
      <form className={s.form} onSubmit={(event) => event.preventDefault()}>
        {/* TODO(api): accept (optional note for the trader) / reject (required reason); surface MSG-CLAIM-03 and MSG-GEN-01 from the response. */}
        <Note data-dialog-initial-focus label={accept ? "Ghi chú cho thương lái (không bắt buộc, ví dụ mức giảm giá đề nghị)" : "Lý do từ chối *"} required={!accept} aria-required={!accept} value={note} onChange={(event) => setNote(event.target.value)} />
        <div className={s.footer}>
          <Button variant="secondary" className="w-auto" onClick={() => { setNote(""); onClose(); }}>Bỏ qua</Button>
          <Button className="w-auto" type="submit" disabled aria-disabled="true">{accept ? "Chấp nhận" : "Từ chối"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
