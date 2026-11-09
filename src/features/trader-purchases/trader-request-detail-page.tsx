"use client";
import { useMemo, useState } from "react";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { CancelRequestDialog } from "./cancel-request-dialog";
import { traderRequestSchema, type TraderRequest } from "./contracts";
import { purchaseRepository } from "./purchase-repository";
import { RequestDetailDialog } from "./request-detail-dialog";

/** Trang /operations/purchase-requests/{id} của thương lái (mở từ thông báo phản hồi, SALE-10.2): đơn của người khác trả 404. */
export function TraderRequestDetailPage({ id }: { id: string }) {
  const loaded = useRemote(useMemo(() => (signal: AbortSignal) => purchaseRepository.read("mine-detail", { id }, traderRequestSchema, signal), [id]));
  const [cancelling, setCancelling] = useState<TraderRequest>();
  if (loaded.loading) return <Skeleton />;
  if (loaded.error) return <ErrorNotice error={loaded.error} />;
  if (!loaded.data) return <p role="alert" className="rounded-card border border-border p-5">Không tìm thấy yêu cầu mua.</p>;
  const back = () => window.history.back();
  return cancelling
    ? <CancelRequestDialog request={cancelling} onClose={() => setCancelling(undefined)} onReload={() => window.location.reload()} onCancelled={() => window.location.reload()} />
    : <RequestDetailDialog request={loaded.data} onClose={back} onCancel={setCancelling} />;
}
