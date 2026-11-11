"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { StatusPill } from "@/components/ui/management-page";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { ErrorNotice } from "@/features/operations/ui";
import { ISSUE, issueStatusLabel, type IssueType } from "@/features/input-items/contracts";
import { inputRepository, problemText } from "@/features/input-items/repository";

export function IssueStatus({ statusId }: { statusId: number }) {
  return <StatusPill tone={statusId === ISSUE.completed ? "success" : statusId === ISSUE.cancelled ? "danger" : "neutral"}>{issueStatusLabel[statusId] ?? ""}</StatusPill>;
}

/** "Tạo mới" next to the issue types: the Owner adds one by name; the system types are fixed. */
export function IssueTypeDialog({ onClose, onSaved }: { onClose(): void; onSaved(created: IssueType): void }) {
  const [name, setName] = useState(""), [pending, setPending] = useState(false), [error, setError] = useState<string>(), { notify } = useToast();
  async function save() {
    if (pending || !name.trim()) return;
    setPending(true); setError(undefined);
    const result = await inputRepository.saveIssueType(name.trim());
    setPending(false);
    if (result.status === "success") { notify({ tone: "success", title: `Đã tạo loại xuất ${result.data.name}.` }); onSaved(result.data); } else setError(problemText(result));
  }
  return <Dialog open title="Tạo loại xuất" mobileLayout="compact" dismissible={!pending} onOpenChange={(open) => { if (!open) onClose(); }}><div className={managementStyles.theme}>
    <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <label className="block text-xs font-medium text-text-muted">Tên loại xuất *<input className="omts-control mt-1" autoFocus maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <ErrorNotice error={error} />
      <div className="mt-4 flex justify-end gap-2"><Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>Bỏ qua</Button><Button className="w-auto" type="submit" isPending={pending} disabled={!name.trim()}>Lưu</Button></div>
    </form>
  </div></Dialog>;
}
