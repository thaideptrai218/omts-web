"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { PermissionProjection } from "@/features/access/domain/function-permission";
import type { BrowserIdentityDto } from "@/server/backend/browser-dto";
import { logoutWithApi } from "@/features/auth/api/api-auth-client";
import { resources, resourceKeys, resourceAllowed } from "./resources";
import { operationModules, operationAllowed } from "@/features/operations/permissions";
import { InboxDialog } from "@/features/inbox-api/inbox-dialog";
import { TraderRequestsDialog } from "@/features/trader-requests-api/requests-dialog";
import { NavigationGroup } from "@/components/layout/navigation-group";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { InterfaceIcon, type InterfaceIconName } from "@/components/ui/interface-icon";
import { ManagementHeading } from "@/components/ui/management-page";
import styles from "@/components/layout/app-shell.module.css";
import type { ResourceKey } from "./resources";
import type { OperationArea } from "@/features/operations/permissions";
import { workspaceRoleLabel } from "@/shared/presentation/actor-label";

const resourceIcons: Record<ResourceKey, InterfaceIconName> = {
  zones: "zone", rafts: "raft", "input-items": "material", suppliers: "supplier",
  employees: "employee", accounts: "id-card", roles: "roles",
};
const operationIcons: Record<OperationArea, InterfaceIconName> = {
  "purchase-receipts": "receipt", "supplier-payments": "payment", water: "water",
  "sales-products": "product", "purchase-requests": "request", workforce: "attendance", "my-work": "work",
};

const workspaceGroups = [
  { label: "Nuôi trồng", resources: ["zones", "rafts"], operations: ["water"] },
  { label: "Vật tư & mua hàng", resources: ["input-items", "suppliers"], operations: ["purchase-receipts", "supplier-payments"] },
  { label: "Nhân sự & phân quyền", resources: ["employees", "accounts", "roles"], operations: ["workforce", "my-work"] },
  { label: "Kinh doanh", resources: [], operations: ["sales-products", "purchase-requests"] },
];

type Context = Readonly<{ identity: BrowserIdentityDto; permissions: PermissionProjection }>;
const WorkspaceContext = createContext<Context | null>(null);
export function useApiWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("API workspace context unavailable");
  return value;
}
export function ApiWorkspaceShell({ context, children }: { context: Context; children: ReactNode }) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [inboxOpen, setInboxOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  useEffect(() => {
    if (!globalThis.BroadcastChannel) return;
    const channel = new BroadcastChannel("omts-auth-lifecycle-v1");
    channel.onmessage = (event) => { if (event.data === "changed") window.location.reload(); };
    return () => channel.close();
  }, []);
  const visible = resourceKeys.filter((key) => resourceAllowed(key, context.identity, context.permissions.functionPermissions));
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const navigation = ({ compact, onNavigate }: { compact: boolean; onNavigate?: () => void }) => {
    const link = (href: string, label: string, icon: InterfaceIconName) => <a key={href} className={styles.navigationLink} href={href} aria-current={active(href) ? "page" : undefined} aria-label={label} title={compact ? label : undefined} onClick={onNavigate}><span className={styles.iconSlot}><InterfaceIcon name={icon}/></span><span className={styles.linkLabel}>{label}</span></a>;
    const action = (label: string, icon: InterfaceIconName, run: () => void) => <button className={styles.navigationLink} aria-label={label} title={compact ? label : undefined} onClick={() => { run(); onNavigate?.(); }}><span className={styles.iconSlot}><InterfaceIcon name={icon}/></span><span className={styles.linkLabel}>{label}</span></button>;
    return <nav aria-label="Chức năng" className={styles.navigation}>
      <NavigationGroup label="Điều hành" compact={compact}><div className={styles.navigationItems}>
        {link("/dashboard", "Tổng quan HTX", "dashboard")}
        {context.identity.subjectType === "CooperativeOwner" && link("/audit", "Nhật ký thao tác", "search")}
        {(context.identity.subjectType === "CooperativeOwner" || context.permissions.functionPermissions.some(p => p.functionCode === "CULTIVATION_CYCLES" && p.action === "View")) && link("/farming/cycles", "Chu kỳ nuôi", "raft")}
        {action("Thông báo", "inbox", () => setInboxOpen(true))}
        {context.identity.subjectType === "CooperativeOwner" && action("Yêu cầu thương lái", "request", () => setRequestsOpen(true))}
      </div></NavigationGroup>
      {workspaceGroups.map((group) => {
        const rows = visible.filter((key) => group.resources.includes(key));
        const modules = operationModules.filter((entry) => group.operations.includes(entry.key) && operationAllowed(entry.key, context.identity, context.permissions.functionPermissions));
        return rows.length || modules.length ? <NavigationGroup key={group.label} label={group.label} compact={compact}><div className={styles.navigationItems}>
          {rows.map((key) => link(`/workspace/${key}`, resources[key].title, resourceIcons[key]))}
          {modules.map((entry) => link(`/operations/${entry.key}`, entry.title, operationIcons[entry.key]))}
        </div></NavigationGroup> : null;
      })}
      <NavigationGroup label="Tài khoản" compact={compact}><div className={styles.navigationItems}>
        {link("/account", "Hồ sơ cá nhân", "account")}
        {link("/account/security", "Đổi mật khẩu", "security")}
        {context.identity.subjectType === "CooperativeOwner" && link("/cooperative/profile", "Hồ sơ hợp tác xã", "cooperative")}
      </div></NavigationGroup>
    </nav>;
  };
  return <WorkspaceContext.Provider value={context}>
    <AppShell navigation={navigation} accountLabel={context.identity.username} accountInitials={context.identity.username.slice(0,2).toUpperCase()} accountRole={workspaceRoleLabel(context.identity.subjectType, context.permissions.functionPermissions)} isLoggingOut={pending} onLogout={async () => {
      if (pending) return;
      setPending(true); setError(undefined);
      const result = await logoutWithApi();
      if (result.destination) window.location.replace(result.destination);
      else { setError("Chưa thể đăng xuất. Kiểm tra kết nối rồi thử lại."); setPending(false); }
    }}>
      {error && <p role="alert" className="mb-4 rounded-control border border-danger/30 bg-surface p-4 text-danger">{error}</p>}
      {inboxOpen && <InboxDialog onClose={() => setInboxOpen(false)} />}
      {requestsOpen && context.identity.subjectType === "CooperativeOwner" && <TraderRequestsDialog onClose={() => setRequestsOpen(false)} />}
      {children}
    </AppShell>
  </WorkspaceContext.Provider>;
}

export function ApiWorkspaceHome() {
  const context = useApiWorkspace();
  const visible = resourceKeys.filter((key) => resourceAllowed(key, context.identity, context.permissions.functionPermissions));
  return <section><ManagementHeading title="Tổng quan hoạt động" description="Chọn công việc trong phạm vi được cấp." icon="dashboard" />
    <div className="mt-7 grid gap-6 xl:grid-cols-2"><section className="min-w-0"><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Danh mục quản lý</h2><div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">{visible.map((key) => <a key={key} href={`/workspace/${key}`}
      className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 text-sm font-semibold hover:bg-surface-subtle hover:text-primary">{resources[key].title}<span aria-hidden="true">↗</span></a>)}</div></section>
    <section className="min-w-0"><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Công việc</h2><div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">{operationModules.filter((entry) => operationAllowed(entry.key, context.identity, context.permissions.functionPermissions)).map((entry) => <a key={entry.key} href={`/operations/${entry.key}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 text-sm font-semibold hover:bg-surface-subtle hover:text-primary">{entry.title}<span aria-hidden="true">↗</span></a>)}</div></section></div>
    {!visible.length && !operationModules.some((entry) => operationAllowed(entry.key, context.identity, context.permissions.functionPermissions)) && <p className="mt-6 rounded-card border border-border bg-surface p-6">Tài khoản hiện chưa được cấp chức năng nghiệp vụ. Bạn có thể xem hồ sơ cá nhân.</p>}
  </section>;
}
