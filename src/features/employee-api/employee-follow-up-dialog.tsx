"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { EmploymentChange } from "./contracts";

type FollowUp = NonNullable<EmploymentChange["followUp"]>;

/** Reminder after an employment change: review (and possibly lock) the linked internal account. */
export function EmployeeFollowUpDialog({
  change,
  followUp,
  onClose,
}: {
  change: EmploymentChange;
  followUp: FollowUp;
  onClose(): void;
}) {
  return (
    <Dialog
      open
      title={followUp.action === "review-lock" ? "Nhắc xử lý tài khoản" : "Nhắc kiểm tra quyền truy cập"}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <p>
        {change.employee.fullName} · @{change.employee.account?.username}
      </p>
      <p className="my-4">
        {followUp.action === "review-lock"
          ? "Nhân viên đã nghỉ việc. Hãy kiểm tra tài khoản và khóa nếu cần."
          : "Nhân viên đã đi làm lại. Hãy kiểm tra trạng thái tài khoản và quyền truy cập."}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button className="w-auto" variant="secondary" onClick={onClose}>
          Để sau
        </Button>
        <Link
          className="inline-flex min-h-12 items-center rounded-control bg-primary px-4 text-white"
          href={`/workspace/accounts?accountId=${followUp.accountId}`}
        >
          Mở tài khoản nội bộ
        </Link>
      </div>
    </Dialog>
  );
}
