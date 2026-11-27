"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage, ManagementPagination, managementStyles } from "@/components/ui/management-screen/management-table";
import { StatusPill } from "@/components/ui/management-page";
import { useOptionalToast } from "@/components/ui/toast-provider";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { DataTable, Field, Select, Skeleton, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { RaftCreateDialog } from "@/features/rafts-api/raft-create-dialog";
import type { RaftAccess } from "@/features/rafts-api/raft-detail-panel";
import { readRaftPage } from "@/features/rafts-api/raft-page-repository";
import { formatRaftSize } from "@/features/rafts-api/raft-size";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { IN_USE } from "./zone-model";
import { FooterLink } from "./zone-tab-parts";
import local from "./zone-tabs.module.css";

const SEARCH_DELAY_MS = 300;

/** Search text that reaches the server only after the user pauses typing. */
function useSettled(value: string): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setSettled(value), SEARCH_DELAY_MS); return () => clearTimeout(timer); }, [value]);
  return settled;
}

/**
 * "Bè nuôi": the rafts of one zone, newest code first, filtered and paged by the server in one call (the open cycle comes with each raft).
 * A raft picked on the zone map arrives as `focus`: its code fills the search so the row is on the page. "Thêm bè" opens the raft create dialog for this zone.
 */
export function ZoneRaftsTab({ zoneId, zoneLabel, canCreate, raftAccess, guard, focus }: {
  zoneId: string; zoneLabel: string; canCreate: boolean; raftAccess: RaftAccess; guard: UnsavedGuard; focus?: { id: string; code: string };
}) {
  const router = useRouter(), toast = useOptionalToast();
  const [search, setSearch] = useState(focus?.code ?? ""), [statusId, setStatusId] = useState(""), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10), [creating, setCreating] = useState(false);
  const term = useSettled(search.trim());
  const remote = useRemote(useCallback((signal: AbortSignal) => readRaftPage({ zoneId, statusId, search: term, page, pageSize }, signal), [zoneId, statusId, term, page, pageSize]));
  useEffect(() => {
    if (!focus || !remote.data) return;
    const timer = setTimeout(() => document.getElementById(`zone-raft-row-${focus.id}`)?.scrollIntoView?.({ block: "nearest" }), 0);
    return () => clearTimeout(timer);
  }, [focus, remote.data]);
  const showCycles = raftAccess.cycles;
  const guarded = (href: string) => (event: { preventDefault(): void }) => {
    if (!guard.dirty.current) return;
    event.preventDefault();
    void guard.leave(() => router.push(href));
  };
  const created = () => {
    setCreating(false); setPage(1); toast?.notify({ tone: "success", title: "Đã thêm bè nuôi." }); remote.reload();
  };
  return <div className={local.tabBody}>
    <div className={styles.subToolbar}>
      <Field label="Tìm theo mã bè" type="search" placeholder="Mã bè" maxLength={100} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
      <Select label="Trạng thái" value={statusId} onChange={event => { setStatusId(event.target.value); setPage(1); }}><option value="">Tất cả</option><option value="101">Đang sử dụng</option><option value="102">Ngừng sử dụng</option></Select>
    </div>
    {remote.loading ? <Skeleton /> : remote.error || !remote.data ? <ListStateMessage error={remote.error ?? "Không tải được danh sách bè."} onRetry={remote.reload} retryLabel="Tải lại" />
      : <>
        <DataTable responsive headings={["Mã bè", "Kích thước", "Số làn", "Trạng thái", ...(showCycles ? ["Chu kỳ hiện tại"] : [])]} empty={!remote.data.items.length}>{remote.data.items.map(raft => {
          const raftHref = farmingReferenceHref("raft", { zoneId, search: raft.code }), cycle = raft.currentCycle;
          return <tr key={raft.id} id={`zone-raft-row-${raft.id}`} data-selected={focus?.id === raft.id || undefined}>
            <td data-label="Mã bè" className={local.nowrap}><Link className={managementStyles.linkButton} href={raftHref} aria-label={`Mở hồ sơ bè ${raft.code}`} onNavigate={guarded(raftHref)}>{raft.code}</Link></td>
            <td data-label="Kích thước">{formatRaftSize(raft.size) || "—"}</td>
            <td data-label="Số làn" className={local.number}>{raft.laneCount == null ? "—" : `${raft.laneCount} làn`}</td>
            <td data-label="Trạng thái" className={local.nowrap}><StatusPill tone={raft.statusId === IN_USE ? "success" : "neutral"}>{raft.statusId === IN_USE ? "Đang sử dụng" : "Ngừng sử dụng"}</StatusPill></td>
            {showCycles && <td data-label="Chu kỳ hiện tại" className={local.nowrap}>{cycle
              ? <Link className={managementStyles.linkButton} href={farmingReferenceHref("cycle", { zoneId, raftId: raft.id, search: raft.code })}>{`Đang nuôi từ ${formatVietnameseDate(cycle.startDate)}`}</Link>
              : "Chưa có chu kỳ"}</td>}
          </tr>;
        })}</DataTable>
        <ManagementPagination page={remote.data.page} pageSize={remote.data.pageSize} total={remote.data.total} unit="bè" onPage={setPage} onPageSize={size => { setPageSize(size); setPage(1); }} /></>}
    <TabFooter left={<FooterLink href={farmingReferenceHref("raft", { zoneId })} icon="raft">Mở danh sách bè của vùng</FooterLink>}
      right={canCreate ? <Button key="add" type="button" className="w-auto" onClick={() => setCreating(true)}><InterfaceIcon name="add" className="size-4" />Thêm bè</Button> : undefined} />
    {creating && <RaftCreateDialog zoneId={zoneId} zoneLabel={zoneLabel} onClose={() => setCreating(false)} onCreated={created} />}
  </div>;
}
