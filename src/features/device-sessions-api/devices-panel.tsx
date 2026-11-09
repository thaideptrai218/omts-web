"use client";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorNotice, Skeleton, displayTime, useMutation, useRemote } from "@/features/operations/ui";
import { createDeviceSessionsRepository } from "./repository";
import type { DeviceView } from "./contracts";

// A device is a browser or an app install. The name the client sent wins; otherwise it is read from the browser string.
export function describeDevice(device: Pick<DeviceView, "deviceName" | "userAgent" | "clientType" | "authMethod">): string {
  if (device.deviceName?.trim()) return device.deviceName.trim();
  if (device.authMethod === "ZaloMiniApp") return "Zalo Mini App";
  const agent = device.userAgent ?? "";
  const browser = /Edg\//.test(agent) ? "Edge" : /OPR\/|Opera/.test(agent) ? "Opera" : /Firefox\//.test(agent) ? "Firefox"
    : /Chrome\//.test(agent) ? "Chrome" : /Safari\//.test(agent) ? "Safari" : undefined;
  const system = /Windows/.test(agent) ? "Windows" : /Android/.test(agent) ? "Android" : /iPhone|iPad|iOS/.test(agent) ? "iOS"
    : /Mac OS X|Macintosh/.test(agent) ? "macOS" : /Linux/.test(agent) ? "Linux" : undefined;
  if (browser && system) return `${browser} trên ${system}`;
  return browser ?? system ?? (device.clientType === "Mobile" ? "Thiết bị di động" : "Thiết bị không xác định");
}

type Pending = { kind: "device"; device: DeviceView } | { kind: "others" };

export function DevicesPanel() {
  const repository = useMemo(() => createDeviceSessionsRepository(), []);
  const load = useCallback((signal: AbortSignal) => repository.devices(signal), [repository]);
  const remote = useRemote(load), mutation = useMutation();
  const [pending, setPending] = useState<Pending>(), [notice, setNotice] = useState<string>();
  const devices = remote.data ?? [];
  const others = devices.filter((device) => !device.isCurrent).length;

  function leaveSession() {
    // Other tabs of this browser learn that the session ended.
    if (globalThis.BroadcastChannel) { const channel = new BroadcastChannel("omts-auth-lifecycle-v1"); channel.postMessage("changed"); channel.close(); }
    window.location.replace("/login");
  }
  async function confirm() {
    if (!pending) return;
    setNotice(undefined);
    if (pending.kind === "others") {
      const result = await mutation.run(() => repository.revokeOthers());
      if (!result) return;
      setPending(undefined); setNotice(result.count > 0 ? `Đã đăng xuất ${result.count} phiên trên các thiết bị khác.` : "Không có thiết bị khác đang đăng nhập.");
      remote.reload(); return;
    }
    const device = pending.device;
    const result = await mutation.run(() => repository.revoke(device.deviceKey ? { deviceKey: device.deviceKey } : { sessionId: device.sessionIds[0] }));
    if (!result) return;
    if (result.signedOut) { leaveSession(); return; }
    setPending(undefined); setNotice("Đã đăng xuất thiết bị."); remote.reload();
  }
  function close(open: boolean) { if (!open && !mutation.pending) { setPending(undefined); mutation.reviewed(); } }

  return <section aria-label="Thiết bị đang đăng nhập" className="space-y-4">
    <header><h2 className="text-xl font-semibold">Thiết bị đang đăng nhập</h2>
      <p className="mt-1 text-sm text-text-muted">Mỗi thiết bị là một trình duyệt hoặc một ứng dụng đã đăng nhập vào tài khoản của bạn. Hãy đăng xuất thiết bị bạn không nhận ra, rồi đổi mật khẩu.</p></header>
    {notice && <p role="status" className="rounded-control bg-primary-soft p-3">{notice}</p>}
    {remote.loading && <Skeleton />}<ErrorNotice error={remote.error} />
    {!remote.loading && remote.error && <Button className="w-auto" variant="secondary" onClick={remote.reload}>Tải lại danh sách</Button>}
    {!remote.loading && remote.data && (devices.length === 0 ? <p className="text-text-muted">Chưa có thiết bị nào đang đăng nhập.</p>
      : <ul className="space-y-3">{devices.map((device) => <li key={device.deviceKey ?? device.sessionIds[0]} className="space-y-3 rounded-card border border-border p-4">
        <div className="flex flex-wrap items-center gap-2"><p className="break-words font-semibold">{describeDevice(device)}</p>
          {device.isCurrent && <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">Thiết bị này</span>}</div>
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <div><dt className="text-text-muted">Địa chỉ IP gần nhất</dt><dd>{device.maskedIpAddress ?? "Không rõ"}</dd></div>
          <div><dt className="text-text-muted">Đăng nhập lần đầu</dt><dd>{displayTime(device.firstSignedInAt)}</dd></div>
          <div><dt className="text-text-muted">Hoạt động gần nhất</dt><dd>{displayTime(device.lastActiveAt)}</dd></div>
        </dl>
        <Button className="w-auto" variant="secondary" disabled={mutation.pending || mutation.blocked} onClick={() => { mutation.reviewed(); setPending({ kind: "device", device }); }}>{device.isCurrent ? "Đăng xuất thiết bị này" : "Đăng xuất thiết bị"}</Button>
      </li>)}</ul>)}
    {others > 0 && <Button className="w-auto" variant="secondary" disabled={mutation.pending || mutation.blocked} onClick={() => { mutation.reviewed(); setPending({ kind: "others" }); }}>Đăng xuất tất cả thiết bị khác</Button>}
    {mutation.blocked && <section className="space-y-3 rounded-card border border-border p-4"><p>Chưa xác định được kết quả lần đăng xuất vừa rồi. Hãy tải lại danh sách để đối chiếu trước khi thử lại.</p>
      <Button className="w-auto" variant="secondary" onClick={() => { mutation.reviewed(); setPending(undefined); remote.reload(); }}>Tải lại danh sách</Button></section>}
    {pending && <ConfirmDialog open title={pending.kind === "others" ? "Đăng xuất các thiết bị khác?" : pending.device.isCurrent ? "Đăng xuất thiết bị này?" : "Đăng xuất thiết bị?"}
      description={pending.kind === "others" ? "Mọi thiết bị khác sẽ bị đăng xuất ngay và cần đăng nhập lại. Thiết bị bạn đang dùng được giữ nguyên."
        : pending.device.isCurrent ? "Bạn sẽ bị đăng xuất khỏi thiết bị này và quay lại trang đăng nhập."
        : pending.device.authMethod === "ZaloMiniApp" ? "Zalo Mini App trên thiết bị này sẽ bị đăng xuất ngay. Muốn dùng lại, hãy bấm Liên kết tài khoản trong ứng dụng."
        : "Thiết bị này sẽ bị đăng xuất ngay và cần đăng nhập lại."}
      confirmLabel="Đăng xuất" tone="danger" error={mutation.error} isPending={mutation.pending} onConfirm={() => void confirm()} onOpenChange={close} />}
  </section>;
}
