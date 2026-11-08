import { useEffect, useRef, useState } from "react";
import type { AccountFollowUp, EmployeeProfile } from "../domain/employee-management";
import type { EmployeeManagementService } from "../services/employee-management-service";
import { createEmployeeMutationTracker } from "../state/employee-mutation";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

export type EmployeeEmploymentService = Pick<EmployeeManagementService, "endEmployment" | "reinstate">;
export function useEmployeeEmployment({ employee, service, hasDraft, onOpenChange, onPendingChange, onChanged }: Readonly<{
  employee: EmployeeProfile;
  service: EmployeeEmploymentService;
  hasDraft: boolean;
  onOpenChange(open: boolean): void;
  onPendingChange(pending: boolean): void;
  onChanged(employee: EmployeeProfile, followUp?: AccountFollowUp): void;
}>) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [mutations] = useState(createEmployeeMutationTracker);
  const pendingRef = useRef(false);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => () => mutations.invalidate(), [mutations]);
  useEffect(() => { if (feedback && !pending) feedbackRef.current?.focus(); }, [feedback, pending]);

  async function confirm(endDate: string) {
    if (hasDraft) return;
    const operation = mutations.start();
    if (!operation) return;
    setFeedback(""); pendingRef.current = true; setPending(true); onPendingChange(true);
    const finish = () => {
      if (operation.finish()) { pendingRef.current = false; setPending(false); onPendingChange(false); }
    };
    try {
      const identity = { employeeId: employee.id, recordVersion: employee.recordVersion };
      const result = employee.status === "employed"
        ? await service.endEmployment({ ...identity, endDate }) : await service.reinstate(identity);
      if (!operation.isCurrent()) return;
      if (result.status === "changed") {
        finish(); onOpenChange(false); onChanged(result.employee, result.followUp);
      } else if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
      } else if (result.status === "not-found") {
        setFeedback("Không tìm thấy hồ sơ nhân viên. Vui lòng tải lại danh sách.");
      } else {
        setFeedback(formatMessage(result.message));
      }
    } catch {
      if (operation.isCurrent()) setFeedback("Chưa xác nhận được kết quả. Vui lòng tải lại danh sách để kiểm tra trước khi thử lại.");
    } finally { finish(); }
  }
  return { pending, isPending: () => pendingRef.current, feedback, feedbackRef, clearFeedback: () => setFeedback(""), confirm };
}
