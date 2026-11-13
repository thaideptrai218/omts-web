"use client";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { EvidenceGallery } from "@/components/ui/evidence-gallery";
import { StatusPill } from "@/components/ui/management-page";
import { Subtabs } from "@/components/ui/management-screen/management-table";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import styles from "@/features/farming-management/farming-management.module.css";
import * as c from "./contracts";
import { ErrorNotice, Skeleton, displayTime, statusLabel, useMutation } from "./ui";
import { WaterMeasurementInfoTab } from "./water-measurement-info-tab";
import { waterRepository } from "./water-measurement-shared";
import { WaterReviewNotice } from "./water-review-notice";
import { WaterVoidDialog } from "./water-void-dialog";
import type { WaterZoneRef } from "./water-history-model";

type TabKey = "info" | "photo";

/** One measurement opened in place: its facts and thresholds, the meter photo, and the correction / void actions. */
export function WaterMeasurementPanel({ id, zone, canEdit, guard, onChanged }: { id: string; zone: WaterZoneRef; canEdit: boolean; guard: UnsavedGuard; onChanged(notice: string): void }) {
  const detail = useStickyRemote(useCallback((signal: AbortSignal) => waterRepository.read("detail", { id }, c.waterSchema, signal), [id]));
  const mutation = useMutation();
  const [tab, setTab] = useState<TabKey>("info"), [voiding, setVoiding] = useState(false), [reviewRequested, setReviewRequested] = useState(false);
  const record = detail.data, prefix = `water-${id}`;
  const tabs = useMemo(() => [{ key: "info" as const, label: "Thông tin" }, ...(record?.photoUrl ? [{ key: "photo" as const, label: "Hình ảnh" }] : [])], [record?.photoUrl]);
  const busy = detail.loading || mutation.pending || mutation.blocked;

  function saved(next: c.WaterMeasurement, notice: string) { detail.replace(next); onChanged(notice); }
  async function confirmVoid(reason: string) {
    if (!record || detail.loading || mutation.busy() || mutation.blocked) return;
    const result = await mutation.run(() => waterRepository.write("void", { reason }, c.waterSchema, id));
    if (result) { setVoiding(false); saved(result, `Đã hủy phép đo tại bè ${record.raftCode}.`); }
  }
  const content: Record<TabKey, ReactNode> = record ? {
    info: <WaterMeasurementInfoTab record={record} zoneName={zone.name} canChange={canEdit && record.statusCode === "ACTIVE"} busy={busy} dirtyRef={guard.dirty}
      onSaved={next => saved(next, `Đã hiệu chỉnh phép đo tại bè ${next.raftCode}.`)} onReload={detail.reload} onVoid={() => { mutation.reviewed(); setVoiding(true); }} />,
    photo: <EvidenceGallery title="Ảnh máy đo" images={[{ id: record.id, url: record.photoUrl, label: `Ảnh phép đo ${displayTime(record.measuredAt)}` }]} />,
  } : { info: null, photo: null };

  return <section id={`water-preview-${id}`} className={styles.detail} aria-label="Chi tiết phép đo">
    {detail.loading && !record && <Skeleton />}
    <ErrorNotice error={detail.error || mutation.error} />
    {detail.error && <Button key="retry" type="button" className="w-auto" variant="secondary" onClick={detail.reload}>Thử lại tải phép đo</Button>}
    {mutation.blocked && <WaterReviewNotice reloadLabel="Tải phép đo mới để đối chiếu" text="Chưa xác nhận được kết quả hủy. Hãy tải phép đo mới để đối chiếu trước khi thao tác tiếp." reloaded={reviewRequested} busy={detail.loading || mutation.pending}
      canContinue={!detail.error && !mutation.uncertain} onReload={() => { detail.reload(); setReviewRequested(true); }} onReviewed={() => { mutation.reviewed(); setReviewRequested(false); }} reviewedLabel="Đã đối chiếu phép đo" />}
    {record && <>
      <header className={styles.header}>
        <h3>Phép đo · {displayTime(record.measuredAt)}</h3>
        <StatusPill tone={record.statusCode === "ACTIVE" ? "success" : "neutral"}>{statusLabel(record.statusCode)}</StatusPill>
        {record.thresholdExceeded && <StatusPill tone="danger">Vượt ngưỡng</StatusPill>}
      </header>
      <Subtabs<TabKey> label="Hồ sơ phép đo" tabs={tabs} value={tab} idPrefix={prefix} onChange={key => { if (key !== tab) void guard.leave(() => setTab(key)); }} />
      <div role="tabpanel" id={`${prefix}-panel-${tab}`} aria-labelledby={`${prefix}-tab-${tab}`} tabIndex={0} className={styles.body}>{content[tab]}</div>
      {voiding && <WaterVoidDialog subject={`Bè ${record.raftCode} · ${record.zoneName} · ${displayTime(record.measuredAt)}`} pending={mutation.pending} busy={mutation.busy} blocked={mutation.blocked} error={mutation.error} onCancel={() => setVoiding(false)} onConfirm={reason => void confirmVoid(reason)} />}
    </>}
  </section>;
}
