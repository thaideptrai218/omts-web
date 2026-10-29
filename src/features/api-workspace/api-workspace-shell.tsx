"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { PermissionProjection } from "@/features/access/domain/function-permission";
import type { BrowserIdentityDto } from "@/server/backend/browser-dto";
import { logoutWithApi } from "@/features/auth/api/api-auth-client";
import { Button } from "@/components/ui/button";
import { resources, resourceKeys, resourceAllowed } from "./resources";
import { operationModules, operationAllowed } from "@/features/operations/permissions";
import { InboxDialog } from "@/features/inbox-api/inbox-dialog";

type Context = Readonly<{ identity: BrowserIdentityDto; permissions: PermissionProjection }>;
const WorkspaceContext = createContext<Context | null>(null);
export function useApiWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("API workspace context unavailable");
  return value;
}
export function ApiWorkspaceShell({ context, children }: { context: Context; children: ReactNode }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [inboxOpen, setInboxOpen] = useState(false);
  useEffect(() => {
    if (!globalThis.BroadcastChannel) return;
    const channel = new BroadcastChannel("omts-auth-lifecycle-v1");
    channel.onmessage = (event) => { if (event.data === "changed") window.location.reload(); };
    return () => channel.close();
  }, []);
  const visible = resourceKeys.filter((key) => resourceAllowed(key, context.identity, context.permissions.functionPermissions));
  return <WorkspaceContext.Provider value={context}>
    <div className="min-h-dvh bg-canvas text-text">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3">
        <a href="/dashboard" className="text-xl font-bold text-primary">OMTS</a>
        <div className="flex items-center gap-4"><span>{context.identity.username}</span>
          <Button className="w-auto" variant="secondary" isPending={pending} onClick={async () => {
            if (pending) return; setPending(true); setError(undefined);
            const result = await logoutWithApi();
            if (result.destination) window.location.replace(result.destination);
            else { setError("Chưa thể đăng xuất. Kiểm tra kết nối rồi thử lại."); setPending(false); }
          }}>Đăng xuất</Button></div>
      </header>
      {error && <p role="alert" className="p-4 text-danger">{error}</p>}
      {inboxOpen && <InboxDialog onClose={() => setInboxOpen(false)} />}
      <div className="mx-auto grid max-w-[1600px] gap-6 p-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:p-6">
        <nav aria-label="Chức năng" className="flex gap-2 overflow-x-auto rounded-card border border-border bg-surface p-3 lg:block lg:space-y-1 lg:self-start">
          <button className="block whitespace-nowrap rounded-control px-3 py-3 text-left hover:bg-primary-soft" onClick={() => setInboxOpen(true)}>Thông báo</button>
          <a className="block whitespace-nowrap rounded-control px-3 py-3 hover:bg-primary-soft" href="/dashboard">Khu vực làm việc</a>
          <a className="block whitespace-nowrap rounded-control px-3 py-3 hover:bg-primary-soft" href="/account">Hồ sơ cá nhân</a>
          <a className="block whitespace-nowrap rounded-control px-3 py-3 hover:bg-primary-soft" href="/account/security">Đổi mật khẩu</a>
          {context.identity.subjectType === "CooperativeOwner" && <a className="block whitespace-nowrap rounded-control px-3 py-3 hover:bg-primary-soft" href="/cooperative/profile">Hồ sơ hợp tác xã</a>}
          {visible.map((key) => <a key={key} className="block whitespace-nowrap rounded-control px-3 py-3 hover:bg-primary-soft" href={`/workspace/${key}`}>{resources[key].title}</a>)}
          {operationModules.filter((entry) => operationAllowed(entry.key, context.identity, context.permissions.functionPermissions)).map((entry) => <a key={entry.key} className="block whitespace-nowrap rounded-control px-3 py-3 hover:bg-primary-soft" href={`/operations/${entry.key}`}>{entry.title}</a>)}
        </nav>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  </WorkspaceContext.Provider>;
}
export function ApiWorkspaceHome() {
  const context = useApiWorkspace();
  const visible = resourceKeys.filter((key) => resourceAllowed(key, context.identity, context.permissions.functionPermissions));
  return <section><h1 className="text-3xl font-semibold">Khu vực làm việc</h1>
    <p className="mt-3 text-text-muted">Chọn công việc cần thực hiện.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map((key) => <a key={key} href={`/workspace/${key}`}
      className="rounded-card border border-border bg-surface p-6 text-lg font-semibold hover:border-primary">{resources[key].title}</a>)}</div>
    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{operationModules.filter((entry) => operationAllowed(entry.key, context.identity, context.permissions.functionPermissions)).map((entry) => <a key={entry.key} href={`/operations/${entry.key}`} className="rounded-card border border-border bg-surface p-6 text-lg font-semibold hover:border-primary">{entry.title}</a>)}</div>
    {!visible.length && <p className="mt-6 rounded-card border border-border bg-surface p-6">Tài khoản hiện chưa được cấp chức năng nghiệp vụ. Bạn có thể xem hồ sơ cá nhân.</p>}
  </section>;
}
