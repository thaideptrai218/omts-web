"use client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EffectivePermissionPreview } from "@/features/account-management/components/effective-permission-preview";
import { buildEffectivePermissionPreview } from "@/features/account-management/lib/effective-permissions";
import type { EmployeeProfile } from "../domain/employee-management";
import type { CreateEmployeeAccountResult, EmployeeAccountCreationOptions } from "../domain/employee-account-creation";
import type { EmployeeManagementService } from "../services/employee-management-service";
import { EmployeeAccountForm } from "./employee-account-form";
import { useEmployeeAccountCreation } from "./use-employee-account-creation";

export function EmployeeAccountDialog({ employee, options, service, onClose, onPendingChange, onCreated }: Readonly<{
  employee: EmployeeProfile;
  options: EmployeeAccountCreationOptions;
  service: Pick<EmployeeManagementService, "createLoginAccount">;
  onClose(): void;
  onPendingChange(pending: boolean): void;
  onCreated(result: Extract<CreateEmployeeAccountResult, { status: "created" }>): void;
}>) {
  const { form, drafts, setDrafts, step, setStep, feedback, pending, isPending, summaryRef, grantsRef, preview, create } =
    useEmployeeAccountCreation({ employee, service, onCreated, onPendingChange });
  function close() { if (!isPending()) onClose(); }
  const permissionPreview = buildEffectivePermissionPreview({ currentGrants: [], newGrants: drafts,
    featureCatalog: options.featureCatalog, roles: options.roles, zones: options.zones });
  return <Dialog open size="lg" title={`Tạo tài khoản cho ${employee.fullName}`} description="Username được tạo tự động. Thông tin kích hoạt được gửi trực tiếp cho nhân viên; Chủ HTX không xem mật khẩu."
    dismissible={!pending} onOpenChange={(open) => { if (!open) close(); }}>
    <form noValidate onSubmit={(event) => { event.preventDefault(); if (step === "preview") void create(); else void preview(); }} className="space-y-5">
      {feedback && <p role="alert" tabIndex={-1} ref={summaryRef} className="text-sm text-danger focus-visible:outline-2 focus-visible:outline-primary">{feedback}</p>}
      {step === "edit" ? <>
        <p className="text-sm leading-6 text-text-muted">Tên và liên hệ bên dưới dành cho tài khoản đăng nhập. Hồ sơ nhân viên đã lưu không bị sửa theo.</p>
        <div className="space-y-5">
          <EmployeeAccountForm form={form} options={options} drafts={drafts} onDraftsChange={setDrafts} grantsRef={grantsRef} disabled={pending} />
        </div>
      </> : <section aria-label="Kiểm tra tài khoản và quyền">
        <h3 className="text-lg font-semibold text-text">Kiểm tra trước khi tạo</h3>
        <p className="my-3 break-words text-sm text-text-muted">{form.getValues("fullName")}. Nhận thông tin qua {form.getValues("deliveryChannel") === "email" ? "email" : "SMS"}.</p>
        <EffectivePermissionPreview catalog={options.featureCatalog} zones={permissionPreview} />
      </section>}
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button variant="secondary" className="sm:w-auto active:bg-surface-subtle disabled:opacity-60" disabled={pending} onClick={step === "preview" ? () => setStep("edit") : close}>{step === "preview" ? "Quay lại chỉnh sửa" : "Hủy"}</Button>
        <Button className="sm:w-auto active:bg-primary-hover disabled:opacity-60" type="submit" isPending={pending} pendingLabel="Đang tạo tài khoản…">{step === "preview" ? "Xác nhận tạo tài khoản" : "Xem quyền trước khi tạo"}</Button>
      </div>
    </form>
  </Dialog>;
}
