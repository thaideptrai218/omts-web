"use client";
import { Fragment, useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { licenseOverviewSchema, licenseTypeLabel, stateLabel, type License } from "@/features/farming-api/contracts";
import { LicenseEditor } from "@/features/farming-api/license-editor";
import { useUnsavedGuard, type UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { createOperationsRepository } from "@/features/operations/repository";
import { businessToday, Field, Skeleton, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { ZoneLicenseDetail } from "./zone-license-detail";

type Editor = { mode: "create" | "update" | "replace"; record: License | null };
const day = (value: string | null) => value ? formatVietnameseDate(value) : "—";
/** "Giấy phép": the legal documents of the zone as a list with the state on a chosen date; a row opens its details in place. */
export function ZoneLicensesTab({ zoneId, zones, guard: providedGuard }: { zoneId: string; zones: ApiRecord[]; guard?: UnsavedGuard }) {
  const localGuard = useUnsavedGuard(), guard = providedGuard ?? localGuard;
  const repository = useMemo(() => createOperationsRepository("zone-licenses"), []);
  const [asOf, setAsOf] = useState(businessToday), [opened, setOpened] = useState<string>(), [editor, setEditor] = useState<Editor>(), [serial, setSerial] = useState(0);
  const overview = useRemote(useCallback((signal: AbortSignal) => repository.read("list", { zoneId, asOf }, licenseOverviewSchema, signal), [repository, zoneId, asOf]));
  const open = (mode: Editor["mode"], record: License | null) => { setEditor({ mode, record }); setSerial(value => value + 1); };
  const saved = (record: License) => { setEditor(undefined); setOpened(record.id); overview.reload(); };
  return <>
    {!providedGuard && localGuard.dialog}
    <div className={styles.subToolbar}><Field label="Ngày xem tình trạng" type="date" required value={asOf} onChange={event => { if (event.target.value) { void guard.leave(() => { setAsOf(event.target.value); setOpened(undefined); setEditor(undefined); }); } }} /></div>
    {overview.loading ? <Skeleton /> : overview.error || !overview.data ? <ListStateMessage error={overview.error ?? "Không tải được hồ sơ giấy tờ."} onRetry={overview.reload} retryLabel="Tải lại hồ sơ" />
      : <>
        {overview.data.licenses.some(row => row.state === "Missing") && <p className={styles.alert}>Thiếu hồ sơ còn hiệu lực tại ngày {day(overview.data.asOf)}.</p>}
        <table className={styles.subTable}><thead><tr><th scope="col">Loại giấy tờ</th><th scope="col">Số</th><th scope="col">Hiệu lực từ</th><th scope="col">Hết hạn</th><th scope="col">Tình trạng</th></tr></thead>
          <tbody>{overview.data.licenses.map((row, index) => <Fragment key={row.documentId ?? `${row.documentType}-${index}`}>
            <tr><td>{licenseTypeLabel(row.documentType)}</td>
              <td>{row.documentId ? <button type="button" className={styles.link} aria-expanded={opened === row.documentId} onClick={() => void guard.leave(() => { setOpened(current => current === row.documentId ? undefined : row.documentId!); setEditor(undefined); })}>{row.documentNumber ?? "Xem giấy tờ"}</button> : "—"}</td>
              <td>{day(row.effectiveDate)}</td><td>{day(row.expiryDate)}</td><td>{stateLabel(row.state)}</td></tr>
            {row.documentId && opened === row.documentId && <tr><td colSpan={5}><ZoneLicenseDetail key={serial} id={row.documentId} asOf={asOf} canEdit editor={editor?.mode === "update" && editor.record?.id === row.documentId ? <LicenseEditor key={serial} {...editor} zoneId={zoneId} zones={zones} dirtyRef={guard.dirty} onClose={() => setEditor(undefined)} onMode={() => {}} onNavigate={saved} onSaved={saved} /> : undefined} onOpen={setOpened} onEdit={record => open("update", record)} onReplace={record => open("replace", record)} /></td></tr>}
          </Fragment>)}</tbody></table></>}
    <TabFooter right={<Button key="add" type="button" className="w-auto" disabled={!overview.data} onClick={() => void guard.leave(() => open("create", null))}>Thêm giấy tờ</Button>} />
    {editor && editor.mode !== "update" && <LicenseEditor key={serial} {...editor} zoneId={zoneId} zones={zones} dirtyRef={guard.dirty} onClose={() => setEditor(undefined)} onMode={mode => { if (mode !== "view") open(mode, editor.record); }} onNavigate={saved} onSaved={saved} />}
  </>;
}
