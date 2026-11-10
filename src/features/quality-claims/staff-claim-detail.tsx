"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { CLAIM_STATUS, staffClaim, type StaffClaim } from "./claim-contracts";
import { claimStatus, claimTone } from "./claim-labels";
import { claimRepository } from "./claim-repositories";
import { ClaimRespondDialog, type RespondKind } from "./claim-respond-dialog";
import { ClaimInfoTab, ClaimInvoiceTab, ClaimSendingsTab } from "./staff-claim-tabs";
import { FrameTabs } from "./frame-kit";
import s from "./claims.module.css";
import f from "./frame-kit.module.css";

type Props = { id: string; canRespond: boolean; onChanged(): void };

/**
 * Chi tiết khiếu nại mở ngay dưới dòng được chọn (CLAIM-02): các tab Khiếu nại / Hóa đơn / Tin đã gửi.
 * Nút Chấp nhận / Từ chối chỉ hiện cho Chủ HTX và chỉ khi khiếu nại còn Chờ phản hồi; Quản lý vùng chỉ xem.
 */
export function StaffClaimDetail({ id, canRespond, onChanged }: Props) {
  const remote = useRemote(useCallback((signal: AbortSignal) => claimRepository.read("detail", { id }, staffClaim, signal), [id]));
  const [fresh, setFresh] = useState<StaffClaim>(), [dialog, setDialog] = useState<RespondKind>();
  const claim = fresh ?? remote.data;
  if (remote.loading && !claim) return <Skeleton />;
  if (remote.error || !claim) {
    return <div role="alert" className="py-4"><ErrorNotice error={remote.error ?? "Chưa tải được chi tiết khiếu nại."} /><Button className="w-auto" variant="secondary" onClick={remote.reload}>Tải lại chi tiết</Button></div>;
  }
  const reload = () => { setFresh(undefined); setDialog(undefined); remote.reload(); onChanged(); };
  const done = (next: StaffClaim) => { setFresh(next); setDialog(undefined); onChanged(); };
  return (
    <div className={s.detailBox}>
      <div className={s.detailHead}>
        <h3>{claim.code}</h3><span className={s.chip} data-tone={claimTone(claim.statusId)}>{claimStatus(claim.statusId)}</span>
        <span className={s.muted}>Hóa đơn {claim.invoice.code}</span>
      </div>
      {fresh?.message && <p role="status" className={s.notice}>{fresh.message}</p>}
      <FrameTabs label={`Khiếu nại ${claim.code}`} tabs={[
        { id: "info", label: "Khiếu nại", content: <ClaimInfoTab claim={claim} /> },
        { id: "invoice", label: "Hóa đơn", content: <ClaimInvoiceTab claim={claim} /> },
        { id: "sendings", label: "Tin đã gửi", content: <ClaimSendingsTab claim={claim} /> },
      ]} />
      {claim.statusId === CLAIM_STATUS.awaiting && canRespond && (
        <div className={f.footer} role="group" aria-label={`Phản hồi khiếu nại ${claim.code}`}>
          <Button className="w-auto" variant="secondary" onClick={() => setDialog("reject")}>Từ chối</Button>
          <Button className="w-auto" onClick={() => setDialog("accept")}>Chấp nhận</Button>
        </div>
      )}
      {claim.statusId === CLAIM_STATUS.awaiting && !canRespond && <p className={s.muted}>Chỉ Chủ hợp tác xã được chấp nhận hoặc từ chối khiếu nại; bạn có thể xem nội dung và ảnh.</p>}
      {dialog && <ClaimRespondDialog kind={dialog} claim={claim} onClose={() => setDialog(undefined)} onDone={done} onReload={reload} />}
    </div>
  );
}
