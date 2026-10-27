import type { NotificationPreferenceCell, NotificationPreferenceSettings } from "../domain/notification-preferences";
import { formatMessage } from "@/shared/messages/message-catalog";

type Props = Readonly<{
  settings: NotificationPreferenceSettings;
  disabled: boolean;
  onToggle(itemId: string, channelId: string, enabled: boolean): void;
}>;

function ChannelOption({ cell, label, itemId, itemLabel, disabled, onToggle }: {
  cell: NotificationPreferenceCell; label: string; itemId: string; itemLabel: string;
  disabled: boolean; onToggle: Props["onToggle"];
}) {
  const reasonId = `notification-${itemId}-${cell.channelId}-reason`;
  return (
    <div className="rounded-control bg-surface-subtle p-3">
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-medium">
        <span>{label}</span>
        <input
          aria-label={`${itemLabel} · ${label}`}
          aria-describedby={cell.isEditable ? undefined : reasonId}
          type="checkbox"
          className="size-5 accent-primary"
          checked={cell.enabled}
          disabled={disabled || !cell.isEditable}
          onChange={(event) => onToggle(itemId, cell.channelId, event.target.checked)}
        />
      </label>
      {!cell.isEditable && (
        <p className="mt-1 text-xs leading-5 text-text-muted" id={reasonId}>{formatMessage(cell.reason)}</p>
      )}
    </div>
  );
}

export function NotificationPreferenceMatrix({ settings, disabled, onToggle }: Props) {
  if (!settings.items.length) {
    return <p className="rounded-control bg-surface-subtle p-4 text-text-muted">Chưa có tùy chọn thông báo dành cho tài khoản này.</p>;
  }
  return (
    <div className="space-y-4">
      {settings.items.map((item) => (
        <fieldset className="rounded-card border border-border p-4" key={item.id}>
          <legend className="px-1 font-semibold text-text">{item.label}</legend>
          {item.description && <p className="mb-3 text-sm text-text-muted">{item.description}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {item.channels.map((cell) => (
              <ChannelOption key={cell.channelId} cell={cell} itemId={item.id} itemLabel={item.label}
                label={settings.channels.find((channel) => channel.id === cell.channelId)?.label ?? cell.channelId}
                disabled={disabled} onToggle={onToggle} />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
