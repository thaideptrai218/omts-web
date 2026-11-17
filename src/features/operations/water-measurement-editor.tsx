"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { useUnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import * as c from "./contracts";
import { operationAllowed } from "./permissions";
import { ErrorNotice, useMutation } from "./ui";
import { MeasurementEvidenceAside, MeasurementOcrNotices } from "./water-measurement-editor-panels";
import { WaterMeasurementInfoTab } from "./water-measurement-info-tab";
import { waterRepository, type WaterRecognition } from "./water-measurement-shared";
import { WaterVoidDialog } from "./water-void-dialog";

type MeasurementEditorProps = {
  readOnly?: boolean; record: c.WaterMeasurement; ocr?: WaterRecognition;
  onClose(): void; onSaved(record: c.WaterMeasurement, ocr?: WaterRecognition): void; onOpen(id: string): Promise<void>;
};

/** Compatibility entry for linked measurements: the existing record is edited in place, with a separate status confirmation. */
export function MeasurementEditor({ record, ocr, onClose, onSaved, readOnly = false }: MeasurementEditorProps) {
  const context = useApiWorkspace(), guard = useUnsavedGuard(), mutation = useMutation(), { notify } = useToast();
  const [current, setCurrent] = useState(record), [voiding, setVoiding] = useState(false);
  const canEdit = !readOnly && current.statusCode === "ACTIVE" && operationAllowed("water", context.identity, context.permissions.functionPermissions, "Edit", current.zoneId);
  function saved(next: c.WaterMeasurement, title: string) { setCurrent(next); notify({ tone: "success", title }); onSaved(next); }
  async function confirmVoid(reason: string) {
    const result = await mutation.run(() => waterRepository.write("void", { reason }, c.waterSchema, current.id));
    if (result) { setVoiding(false); saved(result, `Đã hủy phép đo tại bè ${current.raftCode}.`); }
  }
  return <section aria-label={`Phép đo ${current.zoneCode}`}>
    {guard.dialog}
    <MeasurementOcrNotices ocr={ocr} />
    <MeasurementEvidenceAside record={current} />
    <WaterMeasurementInfoTab key={current.id} record={current} zoneName={current.zoneName} canChange={canEdit} busy={mutation.pending} dirtyRef={guard.dirty}
      onSaved={next => saved(next, `Đã hiệu chỉnh phép đo tại bè ${next.raftCode}.`)}
      onReload={() => { void mutation.run(() => waterRepository.read("detail", { id: current.id }, c.waterSchema), true).then(next => { if (next) setCurrent(next); }); }}
      onVoid={() => setVoiding(true)} />
    <ErrorNotice error={mutation.error} />
    {current.voidReason && <p>Lý do hủy: {current.voidReason}</p>}
    <TabFooter right={<Button key="close" type="button" className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => { void guard.leave(onClose); }}>Đóng</Button>} />
    {voiding && <WaterVoidDialog subject={`Bè ${current.raftCode}`} pending={mutation.pending} busy={mutation.busy} blocked={mutation.blocked} error={mutation.error} onCancel={() => setVoiding(false)} onConfirm={reason => { void confirmVoid(reason); }} />}
  </section>;
}
