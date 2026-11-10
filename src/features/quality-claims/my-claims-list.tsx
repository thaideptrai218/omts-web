"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Paging, Skeleton } from "@/features/operations/ui";
import { CLAIM_STATUS, type ClaimsPage } from "./claim-contracts";
import { claimStatus, claimTone, dateTimeText } from "./claim-labels";
import { TraderClaimDetail } from "./trader-claim-detail";
import s from "./claims.module.css";

export const MY_CLAIMS_PAGE_SIZE = 20;
type Props = { data?: ClaimsPage; loading: boolean; error?: string; page: number; onPage(page: number): void; onReload(): void; onClaimAgain(invoiceId: string): void };

/** "Báo cáo của tôi": thẻ cho từng báo cáo (hợp với điện thoại), trạng thái và chi tiết mở ngay dưới thẻ. Báo cáo đã có phản hồi cho phép báo thêm cho cùng hóa đơn. */
export function MyClaimsList({ data, loading, error, page, onPage, onReload, onClaimAgain }: Props) {
  const base = useId(), [open, setOpen] = useState<string>();
  return (
    <section className={s.panel} aria-labelledby={`${base}-title`}>
      <h2 id={`${base}-title`}>Báo cáo của tôi</h2>
      <div aria-live="polite" aria-busy={loading}>
        {loading && !data && <Skeleton />}
        {error && <div role="alert"><ErrorNotice error={error} /><Button className="w-auto" variant="secondary" onClick={onReload}>Thử tải lại</Button></div>}
        {data && !data.items.length && <div className={s.state}><h2>Bạn chưa gửi báo cáo nào</h2><p>Khi bạn báo vấn đề chất lượng của một hóa đơn, báo cáo và phản hồi của hợp tác xã sẽ hiện ở đây.</p></div>}
        {data && data.items.length > 0 && (
          <>
            <ul className={s.cards} aria-label="Danh sách báo cáo của tôi">
              {data.items.map((claim) => {
                const expanded = open === claim.id, panel = `${base}-${claim.id}`;
                return (
                  <li key={claim.id} className={s.card}>
                    <div className={s.cardTop}>
                      <strong>{claim.code}</strong><span className={s.chip} data-tone={claimTone(claim.statusId)}>{claimStatus(claim.statusId)}</span>
                      <span className={s.muted}>{dateTimeText(claim.sentAt)}</span>
                    </div>
                    <p className={s.muted} style={{ margin: ".375rem 0" }}>Hóa đơn {claim.invoice.code} · {claim.photoCount} ảnh</p>
                    <p className={`${s.clip} m-0 text-sm`}>{claim.description}</p>
                    <div className={s.cardActions}>
                      <Button className="w-auto" variant="secondary" aria-expanded={expanded} aria-controls={expanded ? panel : undefined} aria-label={`${expanded ? "Thu gọn" : "Xem chi tiết"} báo cáo ${claim.code}`} onClick={() => setOpen(expanded ? undefined : claim.id)}>{expanded ? "Thu gọn" : "Xem chi tiết"}</Button>
                      {claim.statusId !== CLAIM_STATUS.awaiting && <Button className="w-auto" variant="secondary" aria-label={`Báo thêm cho hóa đơn ${claim.invoice.code}`} onClick={() => onClaimAgain(claim.invoice.id)}>Báo thêm cho hóa đơn này</Button>}
                    </div>
                    {expanded && <div id={panel}><TraderClaimDetail id={claim.id} /></div>}
                  </li>
                );
              })}
            </ul>
            <div className={s.paging}><Paging page={page} total={data.total} pageSize={MY_CLAIMS_PAGE_SIZE} disabled={loading} onChange={onPage} /></div>
          </>
        )}
      </div>
    </section>
  );
}
