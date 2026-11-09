"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "@/features/operations/permissions";
import { ErrorNotice, OperationHeading, Skeleton, useRemote } from "@/features/operations/ui";
import { myPurchasesSchema, type TraderRequest } from "./contracts";
import { CancelRequestDialog } from "./cancel-request-dialog";
import { countByStatus, filterByStatus, STATUS_ORDER, STATUS_PRESENTATION, type RequestStatusKey } from "./presentation";
import { PlaceRequestDialog } from "./place-request-dialog";
import { purchaseRepository } from "./purchase-repository";
import { RequestCard } from "./request-card";
import { RequestDetailDialog } from "./request-detail-dialog";
import s from "./trader-purchases.module.css";

const PAGE_SIZE = 20;

/** SCR-SALE-01 "Đơn mua của tôi" (SALE-01, SALE-02, SALE-10 phần yêu cầu). Phần hóa đơn chưa có API nên chưa hiển thị. */
export function TraderPurchasesScreen() {
  const { identity, permissions } = useApiWorkspace();
  if (!operationAllowed("purchase-requests", identity, permissions.functionPermissions, "Mine")) {
    return <section><OperationHeading title="Đơn mua của tôi" description="Theo dõi yêu cầu mua đã gửi và phản hồi của hợp tác xã." icon="request" />
      <p role="alert" className={s.denied}>Chỉ tài khoản thương lái mới xem được đơn mua của mình.</p></section>;
  }
  return <PurchasesWorkspace />;
}

function PurchasesWorkspace() {
  const [page, setPage] = useState(1), [wanted, setWanted] = useState<ReadonlySet<RequestStatusKey>>(new Set());
  const [creating, setCreating] = useState(false), [detail, setDetail] = useState<TraderRequest>(), [cancelling, setCancelling] = useState<TraderRequest>();
  const [notice, setNotice] = useState<string>();
  const list = useRemote(useMemo(() => (signal: AbortSignal) => purchaseRepository.read("mine", { page: String(page), pageSize: String(PAGE_SIZE) }, myPurchasesSchema, signal), [page]));
  const rows = list.data?.requests ?? [], visible = filterByStatus(rows, wanted), counts = countByStatus(rows);
  const total = list.data?.total ?? 0, modalOpen = creating || !!detail || !!cancelling;

  const toggle = (key: RequestStatusKey) => setWanted((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const refresh = () => { setNotice(undefined); list.reload(); };

  return (
    <section>
      <OperationHeading title="Đơn mua của tôi" description="Gửi yêu cầu mua hàu và theo dõi phản hồi của hợp tác xã: số kg được chấp nhận, ngày lấy hàng, trả sau." icon="request">
        <Button className="w-auto" variant="secondary" disabled={list.loading} onClick={refresh}>Tải lại</Button>
        <Button className="w-auto" onClick={() => setCreating(true)}>Gửi yêu cầu mua</Button>
      </OperationHeading>
      {notice && <p role="status" className={s.hint} style={{ color: "var(--omts-color-primary)", fontWeight: 600 }}>{notice}</p>}
      <div className={s.toolbar}>
        <fieldset className={s.filters} disabled={list.loading}>
          <legend>Trạng thái</legend>
          {STATUS_ORDER.map((key) => <label key={key} className={s.chip}><input type="checkbox" checked={wanted.has(key)} onChange={() => toggle(key)} />
            <span aria-hidden="true">{STATUS_PRESENTATION[key].icon}</span>{STATUS_PRESENTATION[key].label}<span className={s.count}>{list.data ? counts[key] : ""}</span></label>)}
        </fieldset>
        {wanted.size > 0 && <Button className="w-auto" variant="secondary" onClick={() => setWanted(new Set())}>Xóa bộ lọc</Button>}
      </div>
      <ErrorNotice error={list.error} />
      {list.error && !list.loading && <div className={s.footer} style={{ justifyContent: "flex-start" }}><Button className="w-auto" variant="secondary" onClick={refresh}>Thử tải lại</Button></div>}
      {list.loading ? <Skeleton /> : list.data && (
        <>
          <p className={s.summary} aria-live="polite">{total ? `Hiển thị ${visible.length}/${rows.length} đơn ở trang này · tổng ${total} đơn${wanted.size ? " (bộ lọc chỉ áp dụng cho trang đang xem)" : ""}` : ""}</p>
          {!rows.length ? <EmptyState onCreate={() => setCreating(true)} />
            : !visible.length ? <div className={s.state}><h2>Không có đơn phù hợp bộ lọc</h2><p>Trang này không có đơn ở trạng thái đã chọn. Hãy bỏ bộ lọc hoặc xem trang khác.</p><Button className="w-auto" variant="secondary" onClick={() => setWanted(new Set())}>Xóa bộ lọc</Button></div>
              : <ul className={s.list} aria-label="Danh sách đơn mua">{visible.map((request) => <RequestCard key={request.id} request={request} busy={modalOpen} onOpen={() => setDetail(request)} onCancel={() => setCancelling(request)} />)}</ul>}
          {total > PAGE_SIZE && (
            <nav className={s.paging} aria-label="Phân trang đơn mua"><span>Trang {list.data.page}</span>
              <span style={{ display: "flex", gap: ".5rem" }}><Button className="w-auto" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trang trước</Button>
                <Button className="w-auto" variant="secondary" disabled={page * PAGE_SIZE >= total} onClick={() => setPage(page + 1)}>Trang sau</Button></span></nav>
          )}
        </>
      )}
      {creating && <PlaceRequestDialog onClose={() => setCreating(false)} onSent={() => { setCreating(false); setNotice("Đã gửi yêu cầu mua. Hợp tác xã sẽ phản hồi trong thời gian sớm nhất."); setPage(1); list.reload(); }} />}
      {detail && !cancelling && <RequestDetailDialog request={detail} onClose={() => setDetail(undefined)} onCancel={(current) => { setDetail(undefined); setCancelling(current); }} />}
      {cancelling && <CancelRequestDialog request={cancelling} onClose={() => setCancelling(undefined)} onReload={() => { setCancelling(undefined); refresh(); }}
        onCancelled={() => { setCancelling(undefined); setNotice("Đã hủy yêu cầu mua."); list.reload(); }} />}
    </section>
  );
}

function EmptyState({ onCreate }: { onCreate(): void }) {
  return <div className={s.state}><h2>Bạn chưa có yêu cầu mua nào</h2><p>Khi bạn gửi yêu cầu mua, đơn và phản hồi của hợp tác xã sẽ hiện ở đây.</p><Button className="w-auto" onClick={onCreate}>Gửi yêu cầu mua</Button></div>;
}
