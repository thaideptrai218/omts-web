"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { StatusPill } from "@/components/ui/management-page";
import type { AccountFollowUp, EmployeeProfile } from "../domain/employee-management";
import { employeeBusinessDate } from "../schemas/employee-date-only";
import { createEmployeeEndDateSchema } from "../schemas/employee-employment-schema";
import { useEmployeeEmployment, type EmployeeEmploymentService } from "./use-employee-employment";

export function EmployeeEmploymentActions(props: Readonly<{
  employee: EmployeeProfile;
  service: EmployeeEmploymentService;
  hasDraft: boolean;
  disabled: boolean;
  onOpenChange(open: boolean): void;
  onPendingChange(pending: boolean): void;
  onChanged(employee: EmployeeProfile, followUp?: AccountFollowUp): void;
}>) {
  const [open, setOpen] = useState(false);
  const validationAttempt = useRef(0);
  useEffect(() => () => { validationAttempt.current++; }, []);
  const { pending, isPending, feedback, feedbackRef, clearFeedback, confirm } = useEmployeeEmployment({ ...props, onOpenChange: setDialogOpen });
  const form = useForm<{ endDate: string }>({ defaultValues: { endDate: "" }, resolver: zodResolver(createEmployeeEndDateSchema()) });
  const ending = props.employee.status === "employed";
  const label = ending ? "Nghỉ việc" : "Đi làm lại";
  function setDialogOpen(value: boolean) {
    validationAttempt.current++;
    setOpen(value); props.onOpenChange(value);
  }
  function changeOpen(value: boolean) {
    if (isPending()) return;
    if (value) {
      if (props.hasDraft || props.disabled) return;
      form.reset({ endDate: employeeBusinessDate(new Date()) }); clearFeedback();
    }
    setDialogOpen(value);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (props.hasDraft || props.disabled || isPending()) return;
    const attempt = ++validationAttempt.current;
    if (ending) void form.handleSubmit((values) => {
      // Validation can finish after cancel/reopen or unmount. Only this visit may submit.
      if (attempt === validationAttempt.current) return confirm(values.endDate);
    })(event);
    else void confirm("");
  }
  return (
    <section aria-label="Tình trạng làm việc" className="mb-6 border-b border-border pb-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-text">Tình trạng làm việc</h3>
          <div className="mt-2"><StatusPill tone={ending ? "success" : "neutral"}>{ending ? "Đang làm việc" : "Đã nghỉ"}</StatusPill></div>
          {!ending && <p className="mt-2 text-sm text-text-muted">{props.employee.employmentEndDate
            ? `Ngày nghỉ: ${props.employee.employmentEndDate.split("-").reverse().join("/")}` : "Chưa có thông tin ngày nghỉ."}</p>}
        </div>
        <Button variant="secondary" className="sm:w-auto" disabled={props.hasDraft || props.disabled} onClick={() => changeOpen(true)}>{label}</Button>
      </div>
      {props.hasDraft && <p className="mt-3 text-sm text-text-muted">Hãy lưu hoặc hủy các thay đổi đang nhập trước khi đổi tình trạng làm việc.</p>}
      <Dialog title={`${label}?`} description={ending ? "Hồ sơ và lịch sử lao động được giữ lại. Tài khoản đăng nhập không tự bị khóa." : "Nhân viên trở lại làm việc. Việc mở khóa tài khoản và cấp quyền được kiểm tra riêng."}
        open={open} onOpenChange={changeOpen} dismissible={!pending}>
        <form onSubmit={submit} noValidate className="space-y-5">
          {ending && <div>
            <label htmlFor="employee-end-date" className="text-sm font-medium text-text">Ngày nghỉ việc</label>
            <input id="employee-end-date" type="date" max={employeeBusinessDate(new Date())} aria-required="true"
              disabled={pending} aria-invalid={Boolean(form.formState.errors.endDate)}
              aria-describedby={form.formState.errors.endDate ? "employee-end-date-error" : undefined}
              className="mt-2 min-h-12 w-full rounded-control border border-border bg-surface px-3 text-text aria-[invalid=true]:border-danger focus-visible:outline-2 focus-visible:outline-primary active:border-primary disabled:bg-surface-subtle disabled:text-text-muted" {...form.register("endDate")} />
            {form.formState.errors.endDate && <p id="employee-end-date-error" className="mt-2 text-sm text-danger">{form.formState.errors.endDate.message}</p>}
          </div>}
          {feedback && <p ref={feedbackRef} tabIndex={-1} role="alert" className="text-sm text-danger focus-visible:outline-2 focus-visible:outline-primary">{feedback}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" className="sm:w-auto" disabled={pending} onClick={() => changeOpen(false)}>Hủy</Button>
            <Button variant={ending ? "danger" : "primary"} className="sm:w-auto" type="submit" isPending={pending} pendingLabel="Đang cập nhật…">Xác nhận {label.toLocaleLowerCase("vi")}</Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
