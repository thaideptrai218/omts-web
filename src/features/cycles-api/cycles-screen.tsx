"use client";
import { FilterChecks } from "@/components/ui/filter-checks";
import { matchesSelection } from "@/shared/presentation/filter-selection";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { LaneBoard, CyclePlanSummary } from "@/features/cultivation-api/lane-board";
import { CycleLaneDetail } from "./cycle-lane-detail";
import { Button } from "@/components/ui/button";

import { loadOptions } from "@/features/operations/lookups";
import { ErrorNotice, Field, Paging, Select, Skeleton, businessToday, useMutation, useRemote } from "@/features/operations/ui";
import { readCycles } from "./repository";
import { zoneCycles, cycleHistory, cycleProgress } from "./contracts";
import { CycleWorkPlanPreview } from "./cycle-work-plan-preview";
import { CyclePlanTracking } from "./cycle-plan-tracking";
import { CycleEditor } from "./cycle-editor";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { CultivationLogsDialog } from "./log-screen";
import { formatVietnameseDate } from "@/shared/format/date-only";
import styles from "./cycles-screen.module.css";
const raftStatusLabel = (value: string) => ({ "In Use": "Đang sử dụng", "Discontinued": "Ngừng sử dụng" }[value] ?? value);
const loadZones = (signal: AbortSignal) => loadOptions("zones", signal);

export function CyclesScreen() {
  const context = useApiWorkspace();
  const permitted = (action: string) => context.identity.subjectType === "CooperativeOwner" || context.permissions.functionPermissions.some(p => p.functionCode === "CULTIVATION_CYCLES" && p.action === action);
  const [starting, setStarting] = useState<{ id: string; code: string }>(), [editing, setEditing] = useState(false), [notice, setNotice] = useState("");
  const [logsOpen, setLogsOpen] = useState(false), [selectedLane, setSelectedLane] = useState<number>();
  const zones = useRemote(loadZones), mutation = useMutation();
  const [zoneId, setZoneId] = useState(""), [raft, setRaft] = useState<{ id: string; code: string }>(), [date, setDate] = useState(businessToday()), [cycleId, setCycleId] = useState("");
  const [progress, setProgress] = useState<z.infer<typeof cycleProgress>>();
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState(""), [cycleFilter, setCycleFilter] = useState(""), [usageFilter, setUsageFilter] = useState("");
  const list = useRemote(useCallback((signal: AbortSignal) => zoneId ? readCycles({ action: "zone", zoneId }, zoneCycles, signal) : Promise.resolve({ status: "success" as const, data: [] }), [zoneId]));
  const history = useRemote(useCallback((signal: AbortSignal) => raft ? readCycles({ action: "history", raftId: raft.id }, cycleHistory, signal) : Promise.resolve({ status: "success" as const, data: [] }), [raft]));
  const activeRaft = useRef<string | undefined>(undefined), progressRequest = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => progressRequest.current?.abort(), []);
  function back() { activeRaft.current=undefined; progressRequest.current?.abort(); setRaft(undefined); setProgress(undefined); setSelectedLane(undefined); }
  async function showProgress(id: string, selectedCycle = "", selectedDate = businessToday()) {
    progressRequest.current?.abort(); const request = new AbortController(); progressRequest.current=request;
    const next = await mutation.run(() => readCycles({ action: "progress", raftId: id, ...(selectedCycle ? { cycleId: selectedCycle } : { date: selectedDate }) }, cycleProgress, request.signal), true);
    if (next && !request.signal.aborted && activeRaft.current === id) setProgress(next);
  }
  const rows = list.data?.filter(row => row.raftCode.toLocaleLowerCase("vi-VN").includes(search.trim().toLocaleLowerCase("vi-VN")) && matchesSelection(usageFilter,String(row.raftStatusId)) && matchesSelection(cycleFilter,row.cycle ? row.cycle.closeDate ? "closed" : "open" : "none")) ?? [];
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const detail = raft && <section className={styles.detail} id="cycle-selected-detail">
    <div className={styles.detailHeader}><div><span className={styles.eyebrow}>HỒ SƠ BÈ NUÔI</span><h2>Lịch sử và tiến độ · {raft.code}</h2></div><Button className="w-auto" variant="secondary" onClick={back}>Thu gọn hồ sơ</Button></div>
    <ErrorNotice error={history.error || mutation.error} />
    <div className={styles.detailActions}>
      {progress?.cycle && permitted("View") && <div className={styles.flowLinks}><Link href={`/operations/seeding?zoneId=${encodeURIComponent(zoneId)}&raftId=${encodeURIComponent(raft.id)}`}>Thả giống →</Link><Link href={`/operations/material-usages?zoneId=${encodeURIComponent(zoneId)}&raftId=${encodeURIComponent(raft.id)}`}>Sử dụng vật tư →</Link></div>}
      <div className={styles.secondaryActions}>
        {progress?.cycle?.canEdit && permitted("Edit") && <Button variant="secondary" onClick={() => setEditing(true)}>Sửa kế hoạch</Button>}
        {progress?.cycle && (context.identity.subjectType === "CooperativeOwner" || context.permissions.functionPermissions.some(p => p.functionCode === "CULTIVATION_LOGS" && p.action === "View")) && <Button variant="secondary" onClick={() => setLogsOpen(true)}>Nhật ký chăm sóc</Button>}
      </div>
    </div>
    <div className={styles.progressControls}>
      <Select label="Chu kỳ" value={cycleId} onChange={e => { setCycleId(e.target.value); setSelectedLane(undefined); }}><option value="">Tra cứu theo ngày</option>{history.data?.map(cycle => <option key={cycle.id} value={cycle.id}>{formatVietnameseDate(cycle.startDate)} → {cycle.closeDate ? formatVietnameseDate(cycle.closeDate) : "Đang nuôi"}</option>)}</Select>
      <Field label="Ngày xem" type="date" max={businessToday()} disabled={!!cycleId} value={date} onChange={e => { setDate(e.target.value); setSelectedLane(undefined); }} />
      <Button disabled={mutation.pending || !cycleId && !date} onClick={() => void showProgress(raft.id, cycleId, date)}>{mutation.pending ? "Đang tải…" : "Xem tiến độ"}</Button>
    </div>
    {mutation.pending ? <Skeleton /> : progress && <div className={styles.progressLayout}>
      <div className={styles.progressMain}><div className={styles.sectionHeading}><h3>Tiến độ làn nuôi</h3><span>{formatVietnameseDate(progress.date)}{progress.cycle ? ` · ${progress.cycle.daysOfFarming} ngày nuôi` : ""}</span></div>
        {!progress.cycle && <p className={styles.detailHint}>Chưa có chu kỳ trong ngày này.</p>}
        <LaneBoard lanes={progress.lanes} selected={selectedLane} onSelect={setSelectedLane} />
        {selectedLane ? <CycleLaneDetail key={`${raft.id}:${progress.cycle?.id}:${selectedLane}`} raftId={raft.id} zoneId={zoneId} cycleId={progress.cycle?.id} lane={selectedLane} onClose={() => setSelectedLane(undefined)} /> : !!progress.lanes.length && <p className={styles.detailHint}>Chọn một làn để xem các lần thả giống.</p>}
        {progress.cycle?.canEdit && permitted("Edit") && <CycleWorkPlanPreview key={progress.cycle.id} />}
      </div>
      {progress.cycle && <aside className={styles.planPanel}><CyclePlanSummary plan={progress.cycle} /><CyclePlanTracking cycleId={progress.cycle.id} zoneId={zoneId} /></aside>}
    </div>}
    {permitted("Create") && list.data?.find(row => row.raftId === raft.id)?.canStart && <Button className="my-4 w-auto" onClick={() => setStarting(raft)}>Bắt đầu chu kỳ nuôi cho bè {raft.code}</Button>}
  </section>;
  return <section className={styles.page}><header className={styles.heading}><div><span className={styles.eyebrow}>NUÔI TRỒNG / QUẢN LÝ CHU KỲ</span><h1>Chu kỳ nuôi</h1><p>Theo dõi từng bè, tra cứu tiến độ làn và kế hoạch nuôi.</p></div><Button className="w-auto" variant="secondary" disabled={!zoneId || list.loading} onClick={list.reload}>Tải lại danh sách</Button></header>
    <div className={styles.workspace}><aside className={styles.filters} aria-label="Bộ lọc chu kỳ nuôi"><div className={styles.filterTitle}>Bộ lọc <button type="button" onClick={() => { back(); setPage(1); setSearch(""); setCycleFilter(""); setUsageFilter(""); }}>Đặt lại</button></div><Select label="Vùng nuôi" value={zoneId} onChange={e => { back(); setPage(1); setZoneId(e.target.value); }}><option value="">Chọn vùng nuôi</option>{zones.data?.map(zone => <option key={zone.id} value={zone.id}>{String(zone.name)}</option>)}</Select><FilterChecks label="Chu kỳ gần nhất" value={cycleFilter} options={[["open","Đang mở"],["closed","Đã đóng"],["none","Chưa có chu kỳ"]]} onChange={value=>{back();setPage(1);setCycleFilter(value);}}/><FilterChecks label="Trạng thái bè" value={usageFilter} options={[["101","Đang sử dụng"],["102","Ngừng sử dụng"]]} onChange={value=>{back();setPage(1);setUsageFilter(value);}}/><p className={styles.filterHint}>Chọn một bè trong bảng để xem kế hoạch và tiến độ từng làn.</p></aside>
    <div className={styles.results}><ErrorNotice error={zones.error || list.error} />{notice && <p role="status" className={styles.notice}>{notice}</p>}<div className={styles.toolbar}><Field label="Tìm bè nuôi" type="search" placeholder="Nhập mã bè…" value={search} onChange={e => { back(); setPage(1); setSearch(e.target.value); }} /><span aria-live="polite">{list.loading ? "Đang tải…" : `${rows.length} bè`}</span></div>
    {list.loading ? <Skeleton /> : !zoneId ? <div className={styles.empty}><h2>Chọn vùng nuôi để bắt đầu</h2><p>Danh sách bè và chu kỳ tương ứng sẽ xuất hiện tại đây.</p></div> : <><div className={styles.tableFrame}><table className={styles.table}><caption className="sr-only">Danh sách chu kỳ theo bè nuôi</caption><thead><tr>{["Bè nuôi", "Trạng thái bè", "Chu kỳ gần nhất", "Ngày bắt đầu", "Ngày đóng"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{pageRows.map(row => <Fragment key={row.raftId}><tr data-selected={raft?.id === row.raftId}><td data-label="Bè nuôi"><button type="button" aria-label={`Xem bè ${row.raftCode}`} aria-expanded={raft?.id === row.raftId} aria-controls={raft?.id === row.raftId ? "cycle-selected-detail" : undefined} disabled={mutation.pending} onClick={() => { if (raft?.id === row.raftId) { back(); return; } activeRaft.current=row.raftId; setRaft({ id: row.raftId, code: row.raftCode }); setDate(businessToday()); setCycleId(""); setSelectedLane(undefined); setProgress(undefined); void showProgress(row.raftId); }}><span className={styles.chevron} aria-hidden="true">{raft?.id === row.raftId ? "−" : "+"}</span><span><strong>{row.raftCode}</strong><small>{row.laneCount} làn nuôi</small></span></button></td><td data-label="Trạng thái bè">{raftStatusLabel(row.raftStatus)}</td><td data-label="Chu kỳ gần nhất"><span className={styles.status} data-state={row.cycle ? row.cycle.closeDate ? "closed" : "open" : "none"}>{row.cycle ? row.cycle.closeDate ? "Đã đóng" : "Đang mở" : "Chưa có chu kỳ"}</span></td><td data-label="Ngày bắt đầu">{row.cycle ? formatVietnameseDate(row.cycle.startDate) : "—"}</td><td data-label="Ngày đóng">{row.cycle?.closeDate ? formatVietnameseDate(row.cycle.closeDate) : "—"}</td></tr>{raft?.id === row.raftId && <tr className={styles.detailRow}><td colSpan={5}>{detail}</td></tr>}</Fragment>)}</tbody></table>{!rows.length && <div className={styles.empty}><h2>Không có bè phù hợp</h2><p>Thử đổi vùng nuôi hoặc điều chỉnh bộ lọc.</p></div>}</div><div className={styles.pagination}><Select label="Số bè mỗi trang" value={String(pageSize)} onChange={e => { back(); setPage(1); setPageSize(Number(e.target.value)); }}>{[10,20,50].map(size => <option key={size} value={size}>{size} bè</option>)}</Select><Paging page={currentPage} total={rows.length} pageSize={pageSize} disabled={mutation.pending} onChange={next => { back(); setPage(next); }} /></div><p className={styles.footer}>Đang hiển thị {pageRows.length} / {rows.length} bè phù hợp · {list.data?.length ?? 0} bè trong vùng.</p></>}
    </div></div>
    {logsOpen && progress?.cycle && <CultivationLogsDialog cycleId={progress.cycle.id} openCycle={progress.cycle.canEdit} onClose={() => setLogsOpen(false)} />}
    {(starting || editing && progress?.cycle) && <CycleEditor raftId={starting?.id ?? progress!.raftId} raftCode={starting?.code ?? progress!.raftCode} record={starting ? undefined : progress!.cycle!} canCancel={!!progress?.cycle?.canCancel && permitted("Delete")} onClose={() => { setStarting(undefined); setEditing(false); }} onSaved={() => { setStarting(undefined); setEditing(false); setRaft(undefined); setProgress(undefined); list.reload(); setNotice("Đã cập nhật chu kỳ nuôi."); }} />}
  </section>;
}
