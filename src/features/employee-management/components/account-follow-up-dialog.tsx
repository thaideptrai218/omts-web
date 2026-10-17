"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { AccountFollowUp } from "@/features/employee-management/domain/employee-management";

type AccountFollowUpDialogProps = Readonly<{
  followUp: AccountFollowUp;
  onClose(): void;
}>;

export function AccountFollowUpDialog({
  followUp,
  onClose,
}: AccountFollowUpDialogProps) {
  const isLeaving = followUp.action === "review-lock";

  return (
    <Dialog
      description={
        isLeaving
          ? "Hồ sơ nhân viên đã chuyển sang Đã nghỉ. Tài khoản đăng nhập không bị khóa tự động."
          : "Hồ sơ nhân viên đã chuyển sang Đang làm việc. Hãy kiểm tra trạng thái và quyền hiện tại của tài khoản."
      }
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
      title={isLeaving ? "Nhắc xử lý tài khoản" : "Nhắc kiểm tra quyền truy cập"}
    >
      <div className="rounded-control border border-border bg-surface-subtle p-4">
        <p className="font-semibold text-text">{followUp.account.displayName}</p>
        <p className="mt-1 text-sm text-text-muted">
          @{followUp.account.username} · {followUp.account.phone}
        </p>
      </div>
      <p className="mt-4 text-sm leading-6 text-text-muted">
        {isLeaving
          ? "Nếu người này không còn được đăng nhập OMTS, hãy sang Tài khoản nội bộ để khóa account theo UC11. Dữ liệu nhân sự, chấm công và tiền công vẫn được giữ nguyên."
          : "Nếu cần, hãy mở khóa account hoặc cấp lại cặp vùng–vai trò theo UC11. Việc đổi trạng thái nhân viên không tự cấp quyền đăng nhập."}
      </p>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button className="sm:w-auto" onClick={onClose} variant="secondary">
          Để sau
        </Button>
        <Link
          className="inline-flex min-h-12 items-center justify-center rounded-control border border-primary bg-primary px-5 py-3 text-center font-semibold text-white transition hover:border-primary-hover hover:bg-primary-hover"
          href="/access/accounts"
        >
          Mở tài khoản nội bộ
        </Link>
      </div>
    </Dialog>
  );
}
