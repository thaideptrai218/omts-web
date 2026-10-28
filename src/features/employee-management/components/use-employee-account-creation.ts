import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AccountEditorValues } from "@/features/account-management/schemas/account-editor-schema";
import type { GrantDraft } from "@/features/account-management/domain/account-management";
import type { EmployeeProfile } from "../domain/employee-management";
import type { CreateEmployeeAccountResult } from "../domain/employee-account-creation";
import type { EmployeeManagementService } from "../services/employee-management-service";
import { employeeAccountSchema } from "../schemas/employee-account-schema";
import { createEmployeeMutationTracker } from "../state/employee-mutation";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

export function useEmployeeAccountCreation({ employee, service, onPendingChange, onCreated }: Readonly<{
  employee: EmployeeProfile;
  service: Pick<EmployeeManagementService, "createLoginAccount">;
  onPendingChange(pending: boolean): void;
  onCreated(result: Extract<CreateEmployeeAccountResult, { status: "created" }>): void;
}>) {
  const form = useForm<AccountEditorValues>({ resolver: zodResolver(employeeAccountSchema), defaultValues: {
    fullName: employee.fullName, phone: employee.phone, email: "", deliveryChannel: "phone",
  } });
  const [drafts, setDrafts] = useState<readonly GrantDraft[]>([]);
  const [step, setStep] = useState<"edit" | "preview">("edit");
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);
  const [mutations] = useState(createEmployeeMutationTracker);
  const pendingRef = useRef(false);
  const validation = useRef(0);
  const [focusTarget, setFocusTarget] = useState<keyof AccountEditorValues | "grants" | "feedback">();
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const grantsRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => { validation.current++; mutations.invalidate(); }, [mutations]);
  useEffect(() => {
    if (step !== "edit" || !focusTarget) return;
    const frame = requestAnimationFrame(() => {
      if (focusTarget === "grants") grantsRef.current?.focus();
      else if (focusTarget === "feedback") summaryRef.current?.focus();
      else form.setFocus(focusTarget);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusTarget, step, form, feedback]);

  async function preview() {
    const attempt = ++validation.current;
    if (!await form.trigger() || attempt !== validation.current) return;
    if (!drafts.length) { setFeedback("Thêm ít nhất một cặp vùng và vai trò trước khi tiếp tục."); setFocusTarget("grants"); return; }
    setFeedback(""); setFocusTarget(undefined); setStep("preview");
  }
  async function create() {
    if (step !== "preview") return;
    const operation = mutations.start();
    if (!operation) return;
    pendingRef.current = true; setPending(true); onPendingChange(true); setFeedback("");
    const finish = () => {
      if (operation.finish()) { pendingRef.current = false; setPending(false); onPendingChange(false); }
    };
    try {
      const result = await service.createLoginAccount({ employeeId: employee.id, recordVersion: employee.recordVersion,
        account: { ...form.getValues(), newGrants: drafts.map((draft) => ({ ...draft })) } });
      if (!operation.isCurrent()) return;
      if (result.status === "created") { finish(); onCreated(result); return; }
      if (result.status === "session-expired") { sessionExpiryChannel.publish(result.message); return; }
      setStep("edit");
      if (result.status === "invalid-input" || result.status === "duplicate") {
        if (result.field !== "grants") form.setError(result.field, { message: formatMessage(result.message) });
        setFocusTarget(result.field); setFeedback(result.field === "grants" ? "Kiểm tra lại vùng, vai trò và thời gian hiệu lực." : formatMessage(result.message));
      } else {
        setFocusTarget("feedback");
        setFeedback("message" in result ? formatMessage(result.message) : result.status === "already-linked"
          ? "Hồ sơ này đã có tài khoản đăng nhập. Vui lòng tải lại danh sách để kiểm tra."
          : "Chưa thể tạo tài khoản từ hồ sơ này. Vui lòng tải lại danh sách để kiểm tra.");
      }
    } catch {
      if (operation.isCurrent()) { setStep("edit"); setFocusTarget("feedback"); setFeedback("Chưa xác nhận được kết quả tạo tài khoản. Vui lòng tải lại danh sách để kiểm tra trước khi thử lại."); }
    } finally { finish(); }
  }
  return { form, drafts, setDrafts, step, setStep, feedback, pending, isPending: () => pendingRef.current,
    summaryRef, grantsRef, preview, create };
}
