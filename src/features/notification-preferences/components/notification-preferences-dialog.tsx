"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";
import type { NotificationPreferenceSettings } from "../domain/notification-preferences";
import type { NotificationPreferencesService } from "../services/notification-preferences-service";
import { NotificationPreferenceMatrix } from "./notification-preference-matrix";

type Props = Readonly<{ open: boolean; onOpenChange(open: boolean): void; service: NotificationPreferencesService }>;

export function NotificationPreferencesDialog({ open, onOpenChange, service }: Props) {
  const { notify } = useToast();
  const [settings, setSettings] = useState<NotificationPreferenceSettings>();
  const [saved, setSaved] = useState<NotificationPreferenceSettings>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [reload, setReload] = useState(0);

  function changeOpen(next: boolean) {
    if (!next) { setIsLoading(true); setSettings(undefined); setSaved(undefined); setError(undefined); }
    onOpenChange(next);
  }

  useEffect(() => {
    if (!open) return;
    let active = true;
    service.load().then((result) => {
      if (!active) return;
      if (result.status === "session-expired") { sessionExpiryChannel.publish(result.message); return; }
      setSettings(result.settings); setSaved(result.settings); setError(undefined);
    }).catch(() => { if (active) setError(formatMessage({ code: "MSG04" })); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [open, reload, service]);

  const isDirty = settings?.items.some((item) => item.channels.some((cell) => cell.enabled !== saved?.items
    .find((candidate) => candidate.id === item.id)?.channels.find((candidate) => candidate.channelId === cell.channelId)?.enabled)) ?? false;

  function toggle(itemId: string, channelId: string, enabled: boolean) {
    setSettings((current) => current ? { ...current, items: current.items.map((item) => item.id !== itemId ? item : {
      ...item, channels: item.channels.map((cell) => cell.channelId === channelId && cell.isEditable ? { ...cell, enabled } : cell),
    }) } : current);
  }

  async function save() {
    if (!settings || isSaving || !isDirty) return;
    setIsSaving(true); setError(undefined);
    try {
      const result = await service.save({ selections: settings.items.flatMap((item) => item.channels.filter((cell) => cell.isEditable)
        .map((cell) => ({ notificationTypeId: item.id, channelId: cell.channelId, enabled: cell.enabled }))) });
      if (result.status === "session-expired") { sessionExpiryChannel.publish(result.message); return; }
      if (result.status !== "saved") { setError(formatMessage(result.message)); return; }
      setSettings(result.settings); setSaved(result.settings);
      notify({ title: formatMessage(result.message), tone: "success" });
      changeOpen(false);
    } catch { setError(formatMessage({ code: "MSG04" })); }
    finally { setIsSaving(false); }
  }

  return <Dialog title="Tùy chọn thông báo" description="Chọn nơi nhận những cập nhật quan trọng. Push được quản lý trên ứng dụng di động."
    open={open} size="lg" dismissible={!isSaving} onOpenChange={changeOpen}>
    {isLoading ? <div role="status" aria-label="Đang tải tùy chọn thông báo" className="space-y-3">
      {[1, 2, 3].map((key) => <div key={key} className="h-24 animate-pulse rounded-card bg-surface-subtle" />)}
    </div> : <div className="space-y-5">
      {error && <p className="rounded-control border border-danger/20 bg-danger/5 p-3 text-sm text-danger" role="alert">{error}</p>}
      {settings ? <NotificationPreferenceMatrix settings={settings} disabled={isSaving} onToggle={toggle} />
        : <Button onClick={() => { setIsLoading(true); setReload((value) => value + 1); }}>Thử tải lại</Button>}
      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
        <Button variant="secondary" disabled={isSaving} onClick={() => changeOpen(false)}>Đóng</Button>
        {Boolean(settings?.items.length) && <Button disabled={isSaving || !isDirty} onClick={() => void save()}>{isSaving ? "Đang lưu..." : "Lưu tùy chọn"}</Button>}
      </div>
    </div>}
  </Dialog>;
}
