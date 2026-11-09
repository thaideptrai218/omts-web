import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { PublicCooperativePreview } from "@/features/cooperative-profile/components/public-cooperative-preview";
import type { SaveCooperativeProfileInput } from "@/features/cooperative-profile/domain/cooperative-profile";

type CooperativeProfilePreviewStepProps = Readonly<{
  draft: SaveCooperativeProfileInput;
  headingRef: RefObject<HTMLHeadingElement | null>;
  isSaving: boolean;
  onBack(): void;
  onConfirm(): void;
}>;

/** Second step: shows only the public projection (name + address) before the owner confirms the save. */
export function CooperativeProfilePreviewStep({
  draft,
  headingRef,
  isSaving,
  onBack,
  onConfirm,
}: CooperativeProfilePreviewStepProps) {
  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-7">
      <div className="mx-auto max-w-2xl">
        <h2
          className="text-2xl font-semibold tracking-tight text-text outline-none"
          ref={headingRef}
          tabIndex={-1}
        >
          Kiểm tra thông tin công khai
        </h2>
        <p className="mt-2 leading-7 text-text-muted">
          Đây là phần thông tin HTX sẽ xuất hiện trên trang truy xuất từ lần công bố tiếp theo.
        </p>

        <div className="mt-6">
          <PublicCooperativePreview
            projection={{
              cooperativeName: draft.cooperativeName,
              officeAddress: draft.officeAddress,
            }}
          />
        </div>

        <div className="mt-5 rounded-control border border-border bg-surface-subtle p-4 text-sm leading-6 text-text-muted">
          Mã số thuế, thông tin liên hệ, ngành nghề và tài khoản ngân hàng không xuất hiện trong phần xem trước công khai này.
          Các QR đã công bố trước đó vẫn giữ thông tin tại thời điểm công bố.
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button className="sm:w-auto" disabled={isSaving} onClick={onBack} variant="secondary">
            Quay lại chỉnh sửa
          </Button>
          <Button
            className="sm:w-auto sm:min-w-48"
            isPending={isSaving}
            onClick={onConfirm}
            pendingLabel="Đang lưu hồ sơ..."
          >
            Xác nhận và lưu
          </Button>
        </div>
      </div>
    </section>
  );
}
