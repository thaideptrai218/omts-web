"use client";
import { ManagementHeading } from "@/components/ui/management-page";
import { PayrollSettingsButton } from "./payroll-settings-dialog";

/** Gear destination "Thiết lập kỳ lương": a page of its own (so the settings sidebar stays), the period dialog opens from here. */
export function PayrollSettingsPage() {
  return <div className="space-y-4">
    <ManagementHeading title="Thiết lập kỳ lương" description="Chọn ngày bắt đầu kỳ lương và bật hoặc tắt tự tạo bảng lương. Hai kỳ tiếp theo được tính lại theo lựa chọn." icon="payment" />
    <PayrollSettingsButton />
  </div>;
}
