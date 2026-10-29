"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { LicenseWorkspace } from "./license-screen";
import { RaftWorkspace } from "./raft-screen";
import { AccountGrantHistory } from "@/features/personal-api/account-grants";
import { RolePermissionReadView } from "@/features/personal-api/role-read-view";
export function ResourceExtras({ resource, record, busy, dirty, blocked, onSaved }: { resource: string; record: ApiRecord; busy: boolean; dirty: boolean; blocked: boolean; onSaved(record: ApiRecord): void }) {
  const context = useApiWorkspace(), [open, setOpen] = useState(false);
  const owner = context.identity.subjectType === "CooperativeOwner";
  if (resource === "roles" && owner) return <RolePermissionReadView record={record} />;
  if (resource === "accounts" && owner) return <div className="mt-5 border-t border-border pt-4"><Button className="w-auto" variant="secondary" disabled={busy} onClick={() => setOpen((value) => !value)}>{open ? "Ẩn phân quyền vùng" : "Xem phân quyền vùng"}</Button>{open && <AccountGrantHistory accountId={record.id} canRevoke />}</div>;
  if (resource !== "rafts" && (resource !== "zones" || !owner)) return null;
  return <div className="mt-5 border-t border-border pt-4"><Button className="w-auto" variant="secondary" disabled={busy || resource === "rafts" && (dirty || blocked)} onClick={() => setOpen(true)}>{resource === "zones" ? "Giấy tờ và gia hạn" : "Ảnh và sơ đồ tình trạng bè"}</Button>
    {resource === "rafts" && dirty && <p className="mt-2 text-sm text-text-muted">Lưu hoặc hủy thay đổi thông tin bè trước khi mở ảnh và sơ đồ.</p>}
    {open && (resource === "zones" ? <LicenseWorkspace zoneId={record.id} zoneName={String(record.name)} onClose={() => setOpen(false)} />
      : <RaftWorkspace raftId={record.id} canEdit={owner} onClose={(saved) => { setOpen(false); if (saved) onSaved(saved); }} />)}
  </div>;
}
