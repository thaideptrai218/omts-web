"use client";
import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { OperationHeading, useRemote } from "@/features/operations/ui";
import { CLAIM_STATUS, claimsPage } from "./claim-contracts";
import { reportRepository } from "./claim-repositories";
import { ClaimReportForm } from "./claim-report-form";
import { MyClaimsList, MY_CLAIMS_PAGE_SIZE } from "./my-claims-list";
import s from "./claims.module.css";

const heading = <OperationHeading title="Báo vấn đề chất lượng" description="Mô tả vấn đề và đính kèm ảnh cho hóa đơn của bạn để hợp tác xã xem xét; theo dõi phản hồi ngay bên dưới." icon="request" />;

/**
 * SCR-CLAIM-01 Báo vấn đề chất lượng (CLAIM-01): thương lái gửi mô tả + ảnh cho một hóa đơn của mình và xem báo cáo cũ cùng phản hồi.
 * Backend chưa có danh sách hóa đơn của thương lái, nên hóa đơn được chọn bằng `?invoiceId=` trên đường dẫn hoặc nút "Báo thêm cho hóa đơn này" ở một báo cáo cũ.
 */
export function ClaimReportScreen() {
  const { identity } = useApiWorkspace();
  if (identity.subjectType !== "Trader") {
    return <section>{heading}<p role="alert" className={s.warning}>Chỉ tài khoản thương lái mới báo được vấn đề chất lượng của hóa đơn mình đã mua.</p></section>;
  }
  return <ReportWorkspace />;
}

function ReportWorkspace() {
  const fromLink = z.guid().safeParse(useSearchParams().get("invoiceId"));
  const [invoiceId, setInvoiceId] = useState<string | undefined>(fromLink.success ? fromLink.data : undefined);
  const [page, setPage] = useState(1), [notice, setNotice] = useState<string>();
  const list = useRemote(useCallback((signal: AbortSignal) => reportRepository.read("mine", { page: String(page), pageSize: String(MY_CLAIMS_PAGE_SIZE) }, claimsPage, signal), [page]));
  const known = invoiceId ? list.data?.items.find((claim) => claim.invoice.id === invoiceId) : undefined;
  const waiting = invoiceId ? list.data?.items.find((claim) => claim.invoice.id === invoiceId && claim.statusId === CLAIM_STATUS.awaiting) : undefined;

  return (
    <section>
      {heading}
      {notice && <p role="status" className={s.notice}>{notice}</p>}
      <div className={s.grid}>
        <section className={s.panel} aria-labelledby="claim-form-title">
          <h2 id="claim-form-title">Báo cáo mới</h2>
          {invoiceId ? (
            <ClaimReportForm key={invoiceId} invoiceId={invoiceId} invoiceCode={known?.invoice.code}
              blockedReason={waiting ? `Hóa đơn ${waiting.invoice.code} đang có báo cáo ${waiting.code} chờ hợp tác xã phản hồi. Hãy đợi phản hồi trước khi báo thêm.` : undefined}
              onReview={() => { setPage(1); list.reload(); }}
              onSent={(claim, message) => { setInvoiceId(undefined); setNotice(`${message} Mã báo cáo ${claim.code}; hợp tác xã sẽ phản hồi cho bạn.`); setPage(1); list.reload(); }} />
          ) : (
            <div className={s.state}><h2>Chưa chọn hóa đơn</h2><p>Hãy mở báo cáo từ hóa đơn bạn muốn phản ánh, hoặc chọn &quot;Báo thêm cho hóa đơn này&quot; ở một báo cáo cũ.</p></div>
          )}
        </section>
        <MyClaimsList data={list.data} loading={list.loading} error={list.error} page={page} onPage={setPage} onReload={list.reload}
          onClaimAgain={(id) => { setNotice(undefined); setInvoiceId(id); window.scrollTo?.({ top: 0 }); }} />
      </div>
    </section>
  );
}
