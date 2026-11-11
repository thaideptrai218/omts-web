"use client";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { Subtabs } from "@/components/ui/management-screen/management-table";
import { StatusPill } from "@/components/ui/management-page";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { Money } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { DISCONTINUED, NO_RATE, statusLabel, validateName, type Job } from "./job-types-model";
import { JobTypeRateHistory } from "./job-types-rate-history";
import { JobTypeWriteFeedback, useJobTypeWrite } from "./job-types-write";
import styles from "./job-types-screen.module.css";

type Tab = "info" | "history";
const tabs = [{ key: "info" as const, label: "Thông tin" }, { key: "history" as const, label: "Lịch sử đơn giá" }];

/**
 * The open row of Loại công việc: two subtabs, each with its own footer and in-place editing. Both stay mounted so a draft
 * in one is not lost by looking at the other; `record` is replaced whenever a write returns the saved job.
 */
export function JobTypeDetailPanel({ record, canEdit, onSynced, onStateChanged }: { record: Job; canEdit: boolean; onSynced(job: Job): void; onStateChanged(): void }) {
  const [tab, setTab] = useState<Tab>("info"), prefix = useId();
  return <section className={styles.detail} aria-label="Chi tiết loại công việc">
    <Subtabs<Tab> label="Nội dung loại công việc" tabs={tabs} value={tab} onChange={setTab} idPrefix={prefix} />
    <div role="tabpanel" id={`${prefix}-panel-info`} aria-labelledby={`${prefix}-tab-info`} hidden={tab !== "info"} className={styles.tabBody}><InfoTab record={record} canEdit={canEdit} onSynced={onSynced} onStateChanged={onStateChanged} /></div>
    <div role="tabpanel" id={`${prefix}-panel-history`} aria-labelledby={`${prefix}-tab-history`} hidden={tab !== "history"} className={styles.tabBody}><JobTypeRateHistory record={record} canEdit={canEdit} onSynced={onSynced} /></div>
  </section>;
}

function InfoTab({ record, canEdit, onSynced, onStateChanged }: { record: Job; canEdit: boolean; onSynced(job: Job): void; onStateChanged(): void }) {
  const [name, setName] = useState<string>(), [nameError, setNameError] = useState<string>();
  const write = useJobTypeWrite(record, onSynced), confirmation = useActionDialog();
  const { mutation } = write, editing = name !== undefined, discontinued = record.statusId === DISCONTINUED;
  const nameId = useId();
  const stop = () => { setName(undefined); setNameError(undefined); };
  async function save(event: FormEvent) {
    event.preventDefault();
    if (name === undefined || mutation.pending) return;
    const checked = validateName(name);
    if (!checked.ok) { setNameError(checked.errors.name); return; }
    setNameError(undefined);
    if (checked.value === record.name) { stop(); return; }
    if (await write.write("rename", { name: checked.value })) stop();
  }
  async function toggle() {
    if (mutation.pending || !(await confirmation.confirm(`${discontinued ? "Khôi phục" : "Ngừng dùng"} loại công việc ${record.name}?`))) return;
    if (await write.write(discontinued ? "resume" : "discontinue", {})) onStateChanged();
  }
  const busy = mutation.pending || mutation.blocked;
  return <>{confirmation.dialog}<form noValidate onSubmit={event => void save(event)}>
    <dl className={styles.facts}>
      <div><dt><label htmlFor={editing ? nameId : undefined}>Tên loại công việc</label></dt><dd>{editing
        ? <><input id={nameId} className={styles.input} value={name} maxLength={100} required disabled={busy} aria-invalid={!!nameError} aria-describedby={nameError ? `${nameId}-error` : undefined} autoFocus onChange={event => setName(event.target.value)} />{nameError && <p id={`${nameId}-error`} role="alert" className={styles.fieldError}>{nameError}</p>}</>
        : record.name}</dd></div>
      <div><dt>Đơn giá hiện tại</dt><dd>{record.currentRate ? <><Money value={record.currentRate.hourlyRate} />/giờ</> : NO_RATE}</dd></div>
      <div><dt>Hiệu lực từ</dt><dd>{record.currentRate ? formatVietnameseDate(record.currentRate.effectiveFrom) : "—"}</dd></div>
      <div><dt>Trạng thái</dt><dd><StatusPill tone={discontinued ? "neutral" : "success"}>{statusLabel(record.statusId)}</StatusPill></dd></div>
    </dl>
    <JobTypeWriteFeedback write={write} />
    {canEdit && <footer className={styles.tabFooter}>
      <div />
      <div>{editing
        ? <><Button key="cancel" className="w-auto" type="button" variant="secondary" disabled={mutation.pending} onClick={stop}>Bỏ qua</Button><Button key="save" className="w-auto" type="submit" isPending={mutation.pending} pendingLabel="Đang lưu..." disabled={mutation.blocked}>Lưu</Button></>
        : <><Button key="state" className="w-auto" type="button" variant="secondary" disabled={busy} onClick={() => void toggle()}><InterfaceIcon name="lock" className="size-4" />{discontinued ? "Dùng lại" : "Ngừng dùng"}</Button>
          <Button key="edit" className="w-auto" type="button" disabled={busy} onClick={() => { write.clearNotice(); setName(record.name); }}><InterfaceIcon name="pencil" className="size-4" />Chỉnh sửa</Button></>}</div>
    </footer>}
  </form></>;
}
