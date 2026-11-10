import { Button } from "@/components/ui/button";

/** Sticky guidance shown beside the detail form. */
export function CooperativeProfileDetailsSidebar() {
  return (
    <aside className="min-w-0 space-y-4 xl:sticky xl:top-24">
      <section className="rounded-card border border-primary/20 bg-primary-soft p-5 text-primary-hover">
        <p className="text-sm font-semibold">Bước tiếp theo</p>
        <h2 className="mt-2 text-lg font-semibold">Xem trước trước khi lưu</h2>
        <p className="mt-2 text-sm leading-6">
          Bạn sẽ kiểm tra riêng tên và địa chỉ xuất hiện trên trang truy xuất công khai.
        </p>
      </section>
      <section className="rounded-card border border-border bg-surface p-5 text-sm leading-6 text-text-muted shadow-card">
        <h2 className="font-semibold text-text">Dữ liệu được bảo vệ</h2>
        <p className="mt-2">
          Tài khoản ngân hàng, mã số thuế và thông tin liên hệ không hiển thị trong preview truy xuất.
        </p>
      </section>
    </aside>
  );
}

type CooperativeProfileFormErrorAlertProps = Readonly<{
  hasConflict: boolean;
  message: string;
  onReloadLatest(): void;
}>;

/** Form-level error; offers reloading the latest record when the save hit a version conflict. */
export function CooperativeProfileFormErrorAlert({
  hasConflict,
  message,
  onReloadLatest,
}: CooperativeProfileFormErrorAlertProps) {
  return (
    <div className="mt-6 rounded-control border border-danger/30 bg-danger/10 p-4 text-sm leading-6 text-danger" role="alert">
      <p>{message}</p>
      {hasConflict && (
        <button
          className="mt-2 min-h-11 rounded-control px-3 font-semibold underline underline-offset-4"
          onClick={onReloadLatest}
          type="button"
        >
          Tải dữ liệu mới nhất
        </button>
      )}
    </div>
  );
}

type CooperativeProfileFormActionBarProps = Readonly<{
  isDirty: boolean;
  onCancel(): void;
}>;

export function CooperativeProfileFormActionBar({ isDirty, onCancel }: CooperativeProfileFormActionBarProps) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-3 rounded-card border border-border bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-text-muted">
        {isDirty ? "Bạn có thay đổi chưa lưu." : "Hồ sơ đang hiển thị dữ liệu mới nhất."}
      </p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Button className="sm:w-auto" disabled={!isDirty} onClick={onCancel} variant="secondary">
          Hủy thay đổi
        </Button>
        <Button className="sm:w-auto sm:min-w-48" type="submit">
          Kiểm tra trước khi lưu
        </Button>
      </div>
    </div>
  );
}
