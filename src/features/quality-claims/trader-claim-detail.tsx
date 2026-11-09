"use client";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { CLAIM_STATUS, traderClaim } from "./claim-contracts";
import { claimStatus, dateText, dateTimeText, offerLabel, vnd } from "./claim-labels";
import { ClaimLinesTable } from "./claim-lines-table";
import { ClaimPhotoGrid } from "./claim-photo-grid";
import { reportRepository } from "./claim-repositories";
import s from "./claims.module.css";

/** Chi tiết một báo cáo của thương lái (mở dưới thẻ): nội dung, ảnh, hóa đơn (không giá từng dòng) và phản hồi của hợp tác xã. */
export function TraderClaimDetail({ id }: { id: string }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => reportRepository.read("mine-detail", { id }, traderClaim, signal), [id]));
  if (remote.loading) return <Skeleton />;
  const claim = remote.data;
  if (remote.error || !claim) {
    return <div role="alert"><ErrorNotice error={remote.error ?? "Chưa tải được chi tiết báo cáo."} /><Button className="w-auto" variant="secondary" onClick={remote.reload}>Tải lại chi tiết</Button></div>;
  }
  const answered = claim.statusId !== CLAIM_STATUS.awaiting;
  return (
    <div>
      <h3 className={s.heading}>Nội dung bạn đã gửi</h3>
      <p className={s.text}>{claim.description}</p>
      <ClaimPhotoGrid area="claim-reports" claimId={claim.id} claimCode={claim.code} count={claim.photos.length} />
      <h3 className={s.heading}>Phản hồi của hợp tác xã</h3>
      {!claim.response ? <p className={s.muted}>Hợp tác xã chưa phản hồi. Khi có phản hồi, bạn sẽ nhận thông báo và tin nhắn.</p> : (
        <div className={s.response}>
          <strong>{claimStatus(claim.statusId)}</strong> <span className={s.muted}>lúc {dateTimeText(claim.response.respondedAt)}</span>
          {answered && claim.statusId === CLAIM_STATUS.accepted && <p>Hợp tác xã đề nghị: {offerLabel(claim.offer)}. Hãy liên hệ hợp tác xã để chọn cách xử lý.</p>}
          {claim.response.note && <p>{claim.response.note}</p>}
        </div>
      )}
      <h3 className={s.heading}>Hóa đơn {claim.invoice.code}</h3>
      <p className={s.muted}>Ngày {dateText(claim.invoiceDate)} · Tổng tiền {vnd(claim.invoiceTotal)}</p>
      <ClaimLinesTable lines={claim.lines} prices={false} />
    </div>
  );
}
