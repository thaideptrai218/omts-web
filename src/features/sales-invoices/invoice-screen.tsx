"use client";
import { useEffect } from "react";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { OperationHeading, ErrorNotice, money } from "@/features/operations/ui";
import { InvoiceFinishPanel } from "./invoice-finish-panel";
import { InvoiceLinesPanel } from "./invoice-lines-panel";
import { InvoiceQuestionDialog } from "./invoice-question-dialog";
import { InvoiceSummaryPanel } from "./invoice-summary-panel";
import { VietQrDialog } from "./vietqr-dialog";
import { VietQrResumeNotice } from "./vietqr-resume-notice";
import { useInvoiceEditor } from "./use-invoice-editor";
import s from "./invoice-screen.module.css";

/** SCR-SALE-04 Lập hóa đơn bán: dòng hàng bên trái, tổng tiền và thanh toán dính bên phải. */
export function SalesInvoiceScreen() {
  const { identity } = useApiWorkspace();
  const e = useInvoiceEditor();
  const locked = e.saving || !!e.pending; // đang gửi hoặc đang chờ chuyển khoản: không sửa bản nháp, không lập thêm
  // Cảnh báo khi rời trang giữa chừng để không mất bản nháp.
  useEffect(() => {
    if (!e.draft.lines.length || e.saved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [e.draft.lines.length, e.saved]);

  return (
    <section>
      <OperationHeading title="Lập hóa đơn bán" description="Chọn lô thu hoạch, nhập số kg và nhận thanh toán. Mỗi hóa đơn gắn với từng lô để truy xuất nguồn gốc." icon="receipt" />
      <ErrorNotice error={e.products.error} />
      {!e.saved && !e.pending && <VietQrResumeNotice sales={e.pendingList.data ?? []} onResume={e.resume} />}
      {e.saved ? (
        <div className={s.doneWrap}><InvoiceFinishPanel invoice={e.saved.invoice} change={e.saved.change} subtracted={e.saved.subtractedFromDebt} onNew={e.reset} /></div>
      ) : (
        <div className={s.layout}>
          <InvoiceLinesPanel lots={e.lots} draft={e.draft} active={e.active} listPrice={e.listPrice} disabled={locked} harvestSettingsOwnerId={identity.subjectType === "CooperativeOwner" ? identity.accountId : undefined} onAdd={e.addLot} onChange={e.setDraft} />
          <InvoiceSummaryPanel draft={e.draft} sums={e.sums} problem={e.problem} error={e.error} saving={locked} savingMode={e.savingMode} canVietQr={e.canVietQr} onChange={e.setDraft} onSubmit={(mode) => void e.submit(mode)} />
        </div>
      )}
      {/* Màn nhỏ: tổng tiền luôn trong tầm mắt, một chạm tới phần thanh toán. */}
      {!e.saved && !e.pending && e.draft.lines.length > 0 && (
        <a className={s.stickyBar} href="#invoice-summary"><span>Tổng cộng<strong>{money(e.sums.total)}</strong></span><span className={s.stickyGo}>Thanh toán ↓</span></a>
      )}
      {e.pending && <VietQrDialog key={e.pending.code} sale={e.pending} ask={e.ask} onInvoice={e.finishPending} onLeave={e.leavePending} />}
      {e.question && <InvoiceQuestionDialog question={e.question} />}
    </section>
  );
}
