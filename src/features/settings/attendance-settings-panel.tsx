"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { WorkforceSetupDialog } from "@/features/operations/workforce-setup-dialog";

/**
 * Cài đặt > Thiết lập chấm công: the break hours and the rounding of worked minutes, saved as a new version from a chosen date.
 * Selecting the item opens the form at once; closing it leaves a button to open it again. The attendance work screen itself stays in the main menu.
 */
export function AttendanceSettingsPanel() {
  const owner = useApiWorkspace().identity.subjectType === "CooperativeOwner";
  const [open, setOpen] = useState(true);
  if (!owner) return <p role="status">Chỉ Chủ hợp tác xã được quản lý thiết lập chấm công.</p>;
  return <section aria-label="Thiết lập chấm công" className="py-4">
    <p className="text-sm text-text-muted">Giờ nghỉ trưa, làm tròn số phút công và số giờ của 1 ca. Thay đổi áp dụng từ ngày bạn chọn, các ngày cũ giữ nguyên.</p>
    {!open && <Button type="button" variant="secondary" className="mt-3 w-auto" onClick={() => setOpen(true)}>Chỉnh thiết lập chấm công</Button>}
    {open && <WorkforceSetupDialog onClose={() => setOpen(false)} />}
  </section>;
}
