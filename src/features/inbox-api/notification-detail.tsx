"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { ErrorNotice, displayTime, useMutation } from "@/features/operations/ui";
import { planHref } from "@/features/harvest-plans/plan-labels";
import { NotificationRecordDialog } from "./record-dialog";
import { markInboxRead, openInboxRecord } from "./repository";
import type { notificationSchema, OpenedNotification } from "./contracts";
export function NotificationDetailBody({ row, onMarked }: { row: z.infer<typeof notificationSchema>; onMarked(): void }) {
  const router = useRouter(), mutation = useMutation();
  const [opened, setOpened] = useState<OpenedNotification>(), [notice, setNotice] = useState<string>();
  async function mark() {
    if (await mutation.run(() => markInboxRead({ action: "read", id: row.id }))) { setNotice("Đã đánh dấu là đã đọc."); onMarked(); }
  }
  async function openRecord() {
    const result = await mutation.run(() => openInboxRecord(row.id), true);
    if (!result) return;
    if (result.recordType === "Account") router.push(`/workspace/accounts?accountId=${encodeURIComponent(result.recordId)}`);
    else if (result.recordType === "HarvestPlan" && result.recordCode) router.push(planHref(result.recordCode));
    else setOpened(result);
  }
  const action = { PurchaseReceipt: "Mở phiếu nhập", SupplierPayment: "Mở giao dịch", HarvestPlan: "Mở kế hoạch thu hoạch", HarvestLot: "Mở lô thu hoạch", CooperativeCertification: "Xem chứng nhận HTX", ZoneComplianceDocument: "Xem giấy tờ vùng", Account: "Mở tài khoản", WaterMeasurement: "Xem phép đo nước", FarmingZone: "Mở vùng nuôi" }[row.relatedRecordType ?? ""] ?? "Mở hồ sơ liên quan";
  return <article className="min-w-0 space-y-4"><header><h2 className="text-base font-semibold">{row.title}</h2><p className="mt-1 text-xs text-text-muted">Gửi lúc {displayTime(row.createdAt)}{row.readAt ? ` · Đã đọc lúc ${displayTime(row.readAt)}` : " · Chưa đọc"}</p></header>{row.body && <p className="max-w-4xl whitespace-pre-wrap break-words text-sm leading-7">{row.body}</p>}{row.relatedRecordCode && <p className="text-xs text-text-muted">Hồ sơ liên quan: <span className="font-mono font-medium text-text">{row.relatedRecordCode}</span></p>}
    <ErrorNotice error={mutation.error} />{mutation.uncertain && <p role="alert" className="text-sm">Chưa xác định được kết quả. Hãy tải lại để đối chiếu; thao tác không được tự gửi lại.</p>}{notice && <p role="status" className="text-sm text-primary">{notice}</p>}
    <div className="flex flex-wrap gap-2">{!row.readAt && <Button className="w-auto" variant="secondary" disabled={mutation.pending || mutation.blocked} onClick={() => void mark()}>Đánh dấu đã đọc</Button>}{row.canOpenRecord && <Button className="w-auto" disabled={mutation.pending} onClick={() => void openRecord()}>{action}</Button>}</div>{opened && <NotificationRecordDialog opened={opened} onClose={() => setOpened(undefined)} />}
  </article>;
}
