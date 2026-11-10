"use client";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import s from "./payroll-settings-screen.module.css";

/** Một dòng thiết lập: tiêu đề + một dòng giải thích bên trái, ô điều khiển bên phải (mẫu trang Thiết lập). */
export function SettingRow({ id, title, help, children }: { id: string; title: string; help: string; children: ReactNode }) {
  return (
    <div className={s.row} role="group" aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`}>
      <div className={s.rowText}>
        <span id={`${id}-title`} className={s.rowTitle}>{title}</span>
        <p id={`${id}-help`} className={s.hint}>{help}</p>
      </div>
      <div className={s.rowControl}>{children}</div>
    </div>
  );
}

/**
 * Chân nhóm: `Bỏ qua` / `Lưu` bên phải. Khi bản đã bị đổi (hoặc kết quả chưa rõ) nút Lưu được thay bằng `Đọc lại`; mỗi nút có key
 * riêng và type tường minh để React không tái dùng nút Lưu thành nút khác (nút tái dùng có thể trở thành submit trong trình duyệt thật).
 */
export function SettingsGroupFooter({ dirty, canSave, saving, disabled, blocked, reloading, onSave, onDiscard, onReload }: {
  dirty: boolean; canSave: boolean; saving: boolean; disabled: boolean; blocked: boolean; reloading: boolean;
  onSave(): void; onDiscard(): void; onReload(): void;
}) {
  return (
    <div className={s.actions}>
      <Button key="discard" type="button" className="w-auto" variant="secondary" disabled={!dirty || disabled} onClick={onDiscard}>Bỏ qua</Button>
      {blocked
        ? <Button key="reload" type="button" className="w-auto" variant="primary" isPending={reloading} pendingLabel="Đang đọc..." onClick={onReload}>Đọc lại thiết lập hiện tại</Button>
        : <Button key="save" type="button" className="w-auto" isPending={saving} pendingLabel="Đang lưu..." disabled={!dirty || !canSave || disabled} onClick={onSave}>Lưu</Button>}
    </div>
  );
}
