"use client";
import Link from "next/link";
import type { AuditPage } from "@/features/audit-api/contracts";
import { actionNames, auditAction, auditTime, recordNames } from "@/features/audit-api/presentation";
import { OverviewCard, type RemoteView } from "./overview-card";
import styles from "./owner-overview.module.css";

const SHOWN = 10;
type Event =AuditPage["page"]["items"][number];

/** Một dòng hoạt động: "Cập nhật Hóa đơn bán HD000001" (thao tác, loại bản ghi, mã), người làm và giờ. */
function describe(event: Event) {
  const verb = event.action.includes(".") ? actionNames[event.action.split(".").at(-1) ?? ""] ?? auditAction(event.action) : auditAction(event.action);
  return `${verb} ${(recordNames[event.recordType] ?? "bản ghi").toLocaleLowerCase("vi")}${event.recordCode ? ` ${event.recordCode}` : ""}`;
}

/** 10 thao tác gần nhất trong nhật ký (chỉ Chủ hợp tác xã xem được nhật ký). */
export function OverviewRecentActivity({ remote }: Readonly<{ remote: RemoteView<AuditPage | null> }>) {
  return (
    <OverviewCard title="Hoạt động gần đây" remote={remote}>
      {(data) => data && data.page.items.length
        ? <>
          <ul className={styles.feed}>{data.page.items.slice(0, SHOWN).map((event) => <li key={event.id} className={styles.event}><strong>{describe(event)}</strong><small>{event.actor.name} · {auditTime(event.occurredAt)}</small></li>)}</ul>
          <Link href="/audit" className={styles.more}>Xem nhật ký thao tác</Link>
        </>
        : <p className={styles.empty}>Chưa có hoạt động nào được ghi nhận.</p>}
    </OverviewCard>
  );
}
