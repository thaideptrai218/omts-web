"use client";
import Link from "next/link";
import { useCallback } from "react";
import { z } from "zod";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { StatusPill } from "@/components/ui/management-page";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { loadOptions } from "@/features/operations/lookups";
import { Skeleton, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { IN_USE } from "./zone-model";

const raftRows = z.array(z.object({ id: z.string(), code: z.string(), statusId: z.number(), status: z.string(), laneCount: z.number().optional() }));
/** "Bè nuôi": rafts of the zone. Each code opens that raft on the raft screen (`?zoneId=&recordId=`). */
export function ZoneRaftsTab({ zoneId }: { zoneId: string }) {
  const remote = useRemote(useCallback(async (signal: AbortSignal) => {
    const result = await loadOptions("rafts", signal, { zoneId });
    if (result.status !== "success") return result;
    const parsed = raftRows.safeParse(result.data);
    return parsed.success ? { status: "success" as const, data: parsed.data } : { status: "error" as const, httpStatus: 502, uncertain: false };
  }, [zoneId]));
  const listHref = `/workspace/rafts?zoneId=${encodeURIComponent(zoneId)}`;
  if (remote.loading) return <Skeleton />;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được danh sách bè."} onRetry={remote.reload} retryLabel="Tải lại" />;
  return <>
    {remote.data.length === 0 ? <p className={styles.hint}>Vùng chưa có bè nuôi.</p>
      : <table className={styles.subTable}><thead><tr><th scope="col">Mã bè</th><th scope="col">Số làn</th><th scope="col">Trạng thái</th></tr></thead>
        <tbody>{remote.data.map(raft => <tr key={raft.id}>
          <td><Link className={styles.link} href={`${listHref}&recordId=${encodeURIComponent(raft.id)}`}>{raft.code}</Link></td>
          <td>{raft.laneCount ?? "—"}</td>
          <td><StatusPill tone={raft.statusId === IN_USE ? "success" : "neutral"}>{raft.statusId === IN_USE ? "Đang sử dụng" : "Ngừng sử dụng"}</StatusPill></td>
        </tr>)}</tbody></table>}
    <TabFooter right={<Link className={styles.footerLink} href={listHref}>Mở danh sách bè của vùng</Link>} />
  </>;
}
