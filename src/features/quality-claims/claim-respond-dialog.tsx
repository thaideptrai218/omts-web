"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice, Note, useMutation } from "@/features/operations/ui";
import { acceptBody, MAX_NOTE, rejectBody, staffClaim, type ClaimOffer, type StaffClaim } from "./claim-contracts";
import { respondErrorText } from "./claim-errors";
import { offerLabel } from "./claim-labels";
import { claimRepository } from "./claim-repositories";
import s from "./claims.module.css";

export type RespondKind = "accept" | "reject";
type Props = { kind: RespondKind; claim: StaffClaim; onClose(): void; onDone(next: StaffClaim): void; onReload(): void };
const OFFERS: readonly ClaimOffer[] = ["ReturnAllGoods", "PriceCutWholeInvoice"];

/**
 * Hộp thoại Chấp nhận / Từ chối khiếu nại (CLAIM-02.0, CLAIM-02.1), chỉ Chủ HTX. Phản hồi chỉ được gửi một lần và không đổi được, nên nút xác nhận
 * nói rõ hậu quả. Chấp nhận chỉ ghi đề nghị, chưa đổi hóa đơn hay công nợ. Lỗi chưa rõ kết quả khóa nút gửi cho tới khi tải lại chi tiết.
 */
export function ClaimRespondDialog({ kind, claim, onClose, onDone, onReload }: Props) {
  const accepting = kind === "accept", send = useMutation();
  const [offer, setOffer] = useState<ClaimOffer>(), [note, setNote] = useState(""), [problem, setProblem] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = accepting ? acceptBody.safeParse({ offer, note: note.trim() || null, rowVersion: claim.rowVersion }) : rejectBody.safeParse({ note, rowVersion: claim.rowVersion });
    if (!parsed.success) return setProblem(accepting && !offer ? "Hãy chọn cách xử lý hợp tác xã đề nghị." : note.trim().length > MAX_NOTE ? `Ghi chú tối đa ${MAX_NOTE.toLocaleString("vi-VN")} ký tự.` : "Hãy nhập lý do từ chối để gửi cho thương lái.");
    setProblem(undefined);
    const next = await send.run(() => claimRepository.write(kind, parsed.data, staffClaim, claim.id));
    if (next) onDone(next);
  }
  const shown = send.failure ? respondErrorText(send.failure, accepting) ?? send.error : undefined;
  const answeredElsewhere = send.failure?.httpStatus === 409 && (send.failure.code === "MSG-GEN-09" || send.failure.code === "MSG61");
  const subtitle = `Khiếu nại ${claim.code} · hóa đơn ${claim.invoice.code} · ${claim.customer.name}.`;

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !send.pending) onClose(); }} dismissible={!send.pending} size="md" mobileLayout="compact"
      title={accepting ? "Chấp nhận khiếu nại" : "Từ chối khiếu nại"}
      description={accepting ? `${subtitle} Hợp tác xã đề nghị thương lái chọn một cách xử lý; việc trả hàng hoặc giảm giá thực hiện sau, ngoài bước này. Phản hồi gửi thương lái qua thông báo và tin nhắn và không thể đổi.` : `${subtitle} Lý do được gửi cho thương lái qua thông báo và tin nhắn; phản hồi không thể đổi.`}>
      <form className={s.form} onSubmit={(event) => void submit(event)} noValidate>
        {accepting && (
          <fieldset className="m-0 min-w-0 border-0 p-0" disabled={send.pending}>
            <legend className="mb-1 text-xs font-medium text-text-muted">Cách xử lý đề nghị *</legend>
            {OFFERS.map((value, index) => <label key={value} className={s.radio}><input type="radio" name="claim-offer" data-dialog-initial-focus={index === 0 || undefined} checked={offer === value} onChange={() => setOffer(value)} />{offerLabel(value)}</label>)}
          </fieldset>
        )}
        <Note data-dialog-initial-focus={accepting ? undefined : true} label={accepting ? "Ghi chú cho thương lái (không bắt buộc, ví dụ mức giảm giá đề nghị)" : "Lý do từ chối *"}
          required={!accepting} aria-required={!accepting} maxLength={MAX_NOTE} value={note} disabled={send.pending} onChange={(event) => setNote(event.target.value)} />
        {problem && <p role="alert" className="text-sm text-danger">{problem}</p>}
        <ErrorNotice error={shown} />
        <div className={s.cardActions} style={{ justifyContent: "flex-end" }}>
          <Button variant="secondary" className="w-auto" disabled={send.pending} onClick={onClose}>Bỏ qua</Button>
          {send.blocked || answeredElsewhere
            ? <Button className="w-auto" onClick={() => { send.reviewed(); onReload(); }}>Tải lại chi tiết</Button>
            : <Button className="w-auto" type="submit" variant={accepting ? "primary" : "danger"} isPending={send.pending} pendingLabel="Đang gửi...">{accepting ? "Xác nhận chấp nhận" : "Xác nhận từ chối"}</Button>}
        </div>
      </form>
    </Dialog>
  );
}
