import { SelectBox } from "@/components/ui/select-box";
import { Button } from "@/components/ui/button";
import type {
  EmployeeAccountSummary,
  EmployeeProfile,
} from "@/features/employee-management/domain/employee-management";
import { EmployeeEditorField } from "./employee-editor-field";
import { employeeInputStyles } from "./employee-editor-form-model";
import type { EmployeeEditorSectionProps } from "./employee-editor-sections";

type EmployeeAccountLinkSectionProps = EmployeeEditorSectionProps &
  Readonly<{
    accountOptions: readonly EmployeeAccountSummary[];
    employee?: EmployeeProfile;
    onRequestCreateAccount?(): void;
    onRequestUnlink(): void;
  }>;

/** Links an existing internal account, or offers creating/unlinking one; never grants roles by itself. */
export function EmployeeAccountLinkSection({
  accountOptions,
  controlProps,
  employee,
  form,
  onRequestCreateAccount,
  onRequestUnlink,
}: EmployeeAccountLinkSectionProps) {
  const { formState: { errors, isDirty }, register } = form;

  return (
    <fieldset className="min-w-0 border-t border-border pt-6">
      <legend className="text-lg font-semibold text-text">Tài khoản đăng nhập</legend>
      <p className="mt-1 text-sm leading-6 text-text-muted">
        Chọn tài khoản nội bộ chưa liên kết với nhân viên khác.
        Liên kết tài khoản không tự cấp vai trò hoặc quyền truy cập.
      </p>
      <div className="mt-4">
        <EmployeeEditorField
          id={controlProps("accountId").id}
          label="Tài khoản hệ thống"
          optional
          error={errors.accountId?.message}
        >
          <SelectBox {...controlProps("accountId")} className={employeeInputStyles} {...register("accountId")}>
            <option value="">{employee?.account ? "Giữ tài khoản hiện tại" : "Chưa liên kết tài khoản"}</option>
            {accountOptions.map((account) => (
              <option key={account.id} value={account.id}>
                {account.displayName} · @{account.username}
                {account.status === "locked" ? " · Đã khóa" : ""}
              </option>
            ))}
          </SelectBox>
        </EmployeeEditorField>
      </div>
      {!employee && (
        <p className="mt-3 text-sm text-text-muted">Lưu hồ sơ trước để tạo tài khoản đăng nhập cho nhân viên.</p>
      )}
      {employee && !employee.account && onRequestCreateAccount && (
        <div className="mt-4 space-y-2">
          <Button
            className="sm:w-auto"
            variant="secondary"
            disabled={isDirty}
            onClick={() => { if (!isDirty) onRequestCreateAccount(); }}
          >
            Tạo tài khoản đăng nhập
          </Button>
          {isDirty && (
            <p className="text-sm text-text-muted">Lưu hoặc hủy các thay đổi hồ sơ trước khi tạo tài khoản.</p>
          )}
        </div>
      )}
      {employee?.account && (
        <div className="mt-4 flex flex-col items-start gap-3 rounded-control border border-border bg-surface-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm leading-6">
            <p className="font-semibold text-text">
              Đang liên kết: <span className="break-all">@{employee.account.username}</span>
            </p>
            <p className="text-text-muted">Bỏ liên kết không xóa hay khóa tài khoản đăng nhập.</p>
          </div>
          <Button className="shrink-0 sm:w-auto" onClick={onRequestUnlink} variant="secondary">
            Bỏ liên kết tài khoản
          </Button>
        </div>
      )}
    </fieldset>
  );
}
