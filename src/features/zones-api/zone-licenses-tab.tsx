"use client";
import { Fragment, useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { ListStateMessage, managementStyles } from "@/components/ui/management-screen/management-table";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { licenseOverviewSchema, licenseTypeLabel, stateLabel, type License } from "@/features/farming-api/contracts";
import { LicenseEditor } from "@/features/farming-api/license-editor";
import { useUnsavedGuard, type UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { createOperationsRepository } from "@/features/operations/repository";
import { businessToday, DataTable, Skeleton, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { licenseReminders, orderLicenses } from "./zone-license-display";
import { ZoneLicenseDetail } from "./zone-license-detail";
import local from "./zone-tabs.module.css";

type Editor = { mode: "create" | "update" | "replace"; record: License | null };
const day = (value: string | null) => value ? formatVietnameseDate(value) : "—";
const stateTone = { Valid: "success", ExpiringSoon: "warning", Expired: "danger", Missing: "danger", NotYetEffective: "info" } as const;
/** State pill: a replaced document says so explicitly; the others show their state as of today. */
const StatePill = ({ state, replaced }: { state: string; replaced: boolean }) =>
  <StatusPill tone={replaced ? "neutral" : stateTone[state as keyof typeof stateTone] ?? "neutral"}>{replaced ? "Đã thay thế" : stateLabel(state)}</StatusPill>;

/** "Giấy phép": every legal document of the zone, in force first then replaced; state is as of today. A row opens its details in place. */
/** `canDelete`: the Owner on a zone in use; the detail still hides "Xóa" for a document that replaced another or was replaced. */
export function ZoneLicensesTab({ zoneId, zones, guard: providedGuard, canDelete = false }: { zoneId: string; zones: ApiRecord[]; guard?: UnsavedGuard; canDelete?: boolean }) {
  const localGuard = useUnsavedGuard(), guard = providedGuard ?? localGuard;
  const repository = useMemo(() => createOperationsRepository("zone-licenses"), []);
  const [opened, setOpened] = useState<string>(), [editor, setEditor] = useState<Editor>(), [serial, setSerial] = useState(0);
  const overview = useRemote(useCallback((signal: AbortSignal) => repository.read("list", { zoneId, asOf: businessToday() }, licenseOverviewSchema, signal), [repository, zoneId]));
  const open = (mode: Editor["mode"], record: License | null) => { setEditor({ mode, record }); setSerial(value => value + 1); };
  // Reminders look at the newest document of each type only; they are notices, nothing changes from here.
  // The server answers with the date it judged the state on (today, read at request time).
  const asOf = overview.data?.asOf ?? "";
  const shown = overview.data ? orderLicenses(overview.data.licenses) : [];
  const reminders = overview.data ? licenseReminders(overview.data.licenses, asOf, licenseTypeLabel) : [];
  const saved = (record: License) => { setEditor(undefined); setOpened(record.id); overview.reload(); };
  return <div className={local.tabBody}>
    {!providedGuard && localGuard.dialog}
    {overview.loading ? <Skeleton /> : overview.error || !overview.data ? <ListStateMessage error={overview.error ?? "Không tải được hồ sơ giấy tờ."} onRetry={overview.reload} retryLabel="Tải lại hồ sơ" />
      : <>
        {reminders.length > 0 && <ul aria-label="Nhắc hạn giấy phép" className={styles.alert}>{reminders.map(item => <li key={item.key}>{item.text}</li>)}</ul>}
        {overview.data.licenses.some(row => row.state === "Missing") && <p className={styles.alert}>Thiếu hồ sơ còn hiệu lực tại ngày {day(overview.data.asOf)}.</p>}
        <DataTable responsive headings={["Loại giấy tờ", "Số", "Hiệu lực từ", "Hết hạn", "Tình trạng"]} empty={!shown.length}>{shown.map((row, index) => <Fragment key={row.documentId ?? `${row.documentType}-${index}`}>
          <tr><td data-label="Loại giấy tờ">{licenseTypeLabel(row.documentType)}</td>
            <td data-label="Số" className={local.nowrap}>{row.documentId ? <button type="button" className={managementStyles.linkButton} aria-expanded={opened === row.documentId} onClick={() => void guard.leave(() => { setOpened(current => current === row.documentId ? undefined : row.documentId!); setEditor(undefined); })}>{row.documentNumber ?? "Xem giấy tờ"}</button> : "—"}</td>
            <td data-label="Hiệu lực từ" className={local.nowrap}>{day(row.effectiveDate)}</td><td data-label="Hết hạn" className={local.nowrap}>{day(row.expiryDate)}</td>
            <td data-label="Tình trạng" className={local.nowrap}><StatePill state={row.state} replaced={row.isReplaced} /></td></tr>
          {row.documentId && opened === row.documentId && <tr><td colSpan={5}><ZoneLicenseDetail key={serial} id={row.documentId} asOf={asOf} canEdit canDelete={canDelete} onDeleted={() => { setOpened(undefined); overview.reload(); }} editor={editor?.mode === "update" && editor.record?.id === row.documentId ? <LicenseEditor key={serial} {...editor} zoneId={zoneId} zones={zones} dirtyRef={guard.dirty} onClose={() => setEditor(undefined)} onMode={() => {}} onNavigate={saved} onSaved={saved} /> : undefined} onOpen={setOpened} onEdit={record => open("update", record)} onReplace={record => open("replace", record)} /></td></tr>}
        </Fragment>)}</DataTable></>}
    <TabFooter right={<Button key="add" type="button" className="w-auto" disabled={!overview.data} onClick={() => void guard.leave(() => open("create", null))}><InterfaceIcon name="add" className="size-4" />Thêm giấy tờ</Button>} />
    {editor && editor.mode !== "update" && <LicenseEditor key={serial} {...editor} zoneId={zoneId} zones={zones} dirtyRef={guard.dirty} onClose={() => setEditor(undefined)} onMode={mode => { if (mode !== "view") open(mode, editor.record); }} onNavigate={saved} onSaved={saved} />}
  </div>;
}
