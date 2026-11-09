import { Button } from "@/components/ui/button";
import { EffectivePermissionPreview } from "@/features/account-management/components/effective-permission-preview";
import type {
  EffectivePermissionZone,
  ManagedAccount,
} from "@/features/account-management/domain/account-management";
import type { AccountEditorValues } from "@/features/account-management/schemas/account-editor-schema";
import type { FeatureCatalogItem } from "@/features/role-management/domain/role-management";

type AccountEditorPreviewStepProps = Readonly<{
  /** Undefined while creating a new account. */
  account?: ManagedAccount;
  catalog: readonly FeatureCatalogItem[];
  isSaving: boolean;
  onBack(): void;
  onConfirm(): void;
  preview: readonly EffectivePermissionZone[];
  values: AccountEditorValues;
}>;

/** Step 2: show per-zone effective permissions and the contact summary before saving. */
export function AccountEditorPreviewStep({
  account,
  catalog,
  isSaving,
  onBack,
  onConfirm,
  preview,
  values,
}: AccountEditorPreviewStepProps) {
  return (
    <div className="mt-6 space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">
          Kiểm tra trước khi lưu
        </p>
        <h3
          className="mt-1 text-xl font-semibold text-text outline-none"
          id="permission-preview-heading"
          tabIndex={-1}
        >
          Quyền hiệu lực theo từng vùng
        </h3>
        <p className="mt-2 leading-7 text-text-muted">
          Đây là hợp quyền từ tất cả vai trò của tài khoản trong từng vùng,
          không phải một role toàn cục.
        </p>
      </div>
      <EffectivePermissionPreview catalog={catalog} zones={preview} />
      <div className="rounded-card border border-border bg-surface-subtle p-4">
        <p className="font-semibold text-text">
          {values.fullName}
          {account ? ` · @${account.username}` : ""}
        </p>
        <p className="mt-1 text-sm text-text-muted">
          {values.phone}
          {values.phone && values.email ? " · " : ""}
          {values.email}
        </p>
        {!account && (
          <p className="mt-2 text-sm font-medium text-primary">
            Thông tin kích hoạt sẽ được gửi qua{" "}
            {values.deliveryChannel === "email" ? "email" : "SMS"}.
          </p>
        )}
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button
          className="sm:w-auto"
          disabled={isSaving}
          onClick={onBack}
          variant="secondary"
        >
          Quay lại chỉnh sửa
        </Button>
        <Button
          className="sm:w-auto"
          isPending={isSaving}
          onClick={onConfirm}
          pendingLabel="Đang lưu..."
        >
          Xác nhận và lưu
        </Button>
      </div>
    </div>
  );
}
