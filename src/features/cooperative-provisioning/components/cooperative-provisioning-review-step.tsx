import type { ReactNode, RefObject } from "react";
import { Button } from "@/components/ui/button";
import type { CooperativeProvisioningFormValues } from "@/features/cooperative-provisioning/schemas/cooperative-provisioning-schema";

export type CooperativeProvisioningReviewDraft = Readonly<{
  evidenceImages: readonly File[];
  values: CooperativeProvisioningFormValues;
}>;

function ReviewRow({ children, label }: Readonly<{ children: ReactNode; label: string }>) {
  return (
    <div className="py-4 sm:grid sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm font-semibold text-text-muted">{label}</dt>
      {children}
    </div>
  );
}

function ReviewSummary({ draft }: { draft: CooperativeProvisioningReviewDraft }) {
  return (
    <dl className="divide-y divide-border rounded-card border border-border bg-surface-subtle/50 px-4">
      <ReviewRow label="Tên hợp tác xã">
        <dd className="mt-1 break-words font-medium text-text sm:mt-0">{draft.values.cooperativeName}</dd>
      </ReviewRow>
      <ReviewRow label="Mã sơ bộ">
        <dd className="mt-1 break-words font-medium text-text sm:mt-0">{draft.values.preliminaryCode}</dd>
      </ReviewRow>
      <ReviewRow label="Danh tính và liên hệ của Chủ nhiệm HTX">
        <dd className="mt-1 whitespace-pre-wrap break-words text-text sm:mt-0">
          {draft.values.ownerIdentityContact}
        </dd>
      </ReviewRow>
      <ReviewRow label="Ảnh xác minh">
        <dd className="mt-2 space-y-1 sm:mt-0">
          {draft.evidenceImages.map((file) => (
            <p
              className="break-all text-sm font-medium text-text"
              key={`${file.name}:${file.size}:${file.lastModified}`}
            >
              {file.name}
            </p>
          ))}
        </dd>
      </ReviewRow>
    </dl>
  );
}

type CooperativeProvisioningReviewStepProps = Readonly<{
  draft?: CooperativeProvisioningReviewDraft;
  headingRef: RefObject<HTMLHeadingElement | null>;
  isProvisioning: boolean;
  onBack(): void;
  onConfirm(): void;
}>;

/** Confirmation step: read-only summary of the draft before the cooperative and owner account are created. */
export function CooperativeProvisioningReviewStep({
  draft,
  headingRef,
  isProvisioning,
  onBack,
  onConfirm,
}: CooperativeProvisioningReviewStepProps) {
  return (
    <section aria-labelledby="provisioning-review-title" className="space-y-5">
      <div>
        <h2
          className="text-xl font-semibold text-text outline-none"
          id="provisioning-review-title"
          ref={headingRef}
          tabIndex={-1}
        >
          Xác nhận trước khi tạo
        </h2>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          Hãy đối chiếu lại hồ sơ giấy.
          Sau khi xác nhận, hệ thống tạo HTX sơ bộ và tài khoản Chủ nhiệm HTX đầu tiên cùng lúc.
        </p>
      </div>

      {draft && <ReviewSummary draft={draft} />}

      <div className="rounded-control border border-warning/30 bg-warning-soft p-4 text-sm leading-6 text-text">
        <p className="font-semibold text-warning">Chuẩn bị bàn giao trực tiếp</p>
        <p className="mt-1">
          Mật khẩu tạm thời chỉ hiển thị một lần sau khi tạo và có hiệu lực trong 24 giờ.
        </p>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button className="sm:w-auto" disabled={isProvisioning} onClick={onBack} variant="secondary">
          Quay lại chỉnh sửa
        </Button>
        <Button
          className="sm:w-auto sm:min-w-48"
          isPending={isProvisioning}
          onClick={onConfirm}
          pendingLabel="Đang khởi tạo..."
        >
          Xác nhận và tạo
        </Button>
      </div>
    </section>
  );
}
