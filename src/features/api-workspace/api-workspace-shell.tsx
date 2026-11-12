"use client";
import { Suspense, createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import type { PermissionProjection } from "@/features/access/domain/function-permission";
import type { BrowserIdentityDto } from "@/server/backend/browser-dto";
import { LOCAL_SIGN_OUT_MESSAGE, logoutWithApi } from "@/features/auth/api/api-auth-client";
import { setDisplayedAccount } from "@/features/auth/api/displayed-account";
import { resources, resourceKeys, resourceAllowed } from "./resources";
import { operationModules, operationAllowed } from "@/features/operations/permissions";
import { OwnerOverview } from "./owner-overview";
import { InboxBell } from "@/features/inbox-api/inbox-bell";
import { SelectedZonesProvider } from "./selected-zones";
import { ZonePicker } from "./zone-picker";
import { NavigationGroup } from "@/components/layout/navigation-group";
import { FarmingWorkflowNav } from "@/features/farming-management/farming-workflow-nav";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import type { SettingsSection } from "@/components/layout/header-menu";
import { InterfaceIcon, type InterfaceIconName } from "@/components/ui/interface-icon";
import { ManagementHeading } from "@/components/ui/management-page";
import styles from "@/components/layout/app-shell.module.css";
import type { ResourceKey } from "./resources";
import type { OperationArea } from "@/features/operations/permissions";
import { workspaceRoleLabel } from "@/shared/presentation/actor-label";
import { createPersonalRepository } from "@/features/personal-api/repository";

const resourceIcons: Record<ResourceKey, InterfaceIconName> = {
  zones: "zone", rafts: "raft", "input-items": "material", suppliers: "supplier",
  employees: "employee", accounts: "id-card", roles: "roles",
  customers: "users",
};
const operationIcons: Record<OperationArea, InterfaceIconName> = {
  "job-types": "work",
  seeding: "product", "material-usages": "material", harvest: "work",
  "cultivation-cycles": "raft",
  "purchase-receipts": "receipt", "supplier-payments": "payment", water: "water",
  "sales-products": "product", "sales-invoices": "receipt", "customer-payments": "payment", "lot-tracing": "search", "harvest-yield": "waves", "claim-reports": "request", "quality-claims": "request", "sales-returns": "receipt", "sales-invoice-list": "receipt", payroll: "payment", "payroll-payments": "payment", "sales-report": "dashboard", "price-trend-report": "grid", "after-sales-report": "list", "purchase-requests": "request", workforce: "attendance", "my-work": "work",
};

const settingsDescriptions: Partial<Record<ResourceKey, string>> = {
  accounts: "Tài khoản nội bộ, trạng thái truy cập và vai trò được phân công theo vùng.",
  roles: "Đối chiếu vai trò và quyền hiện hành của hệ thống.",
};

/** The group whose links are the input catalogue and the two issue lists; they are built from permissions, not from the generic resource list. */
const INPUT_GROUP = "Vật tư & Giống";
const inputReaders = ["PURCHASE_RECEIPTS", "SUPPLIER_PAYMENTS", "CULTIVATION_CYCLES", "INPUT_ISSUES"];
const workspaceGroups = [
  { label: "Nuôi trồng", resources: ["zones", "rafts"], operations: ["cultivation-cycles", "seeding", "harvest", "material-usages", "harvest-yield", "lot-tracing", "water"] },
  { label: INPUT_GROUP, resources: [], operations: [] },
  { label: "Mua hàng", resources: ["suppliers"], operations: ["supplier-payments"] },
  { label: "Nhân sự", resources: ["employees"], operations: ["workforce", "job-types", "payroll", "payroll-payments", "my-work"] },
  { label: "Kinh doanh", resources: ["customers"], operations: ["sales-invoices", "sales-invoice-list", "sales-returns", "quality-claims", "claim-reports", "sales-products", "purchase-requests"] },
  { label: "Báo cáo", resources: [], operations: ["sales-report", "price-trend-report", "after-sales-report"] },
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
  // A layout effect runs before any child data fetch, so every request carries the account this page shows.
  const accountId = context.identity.accountId;
  useLayoutEffect(() => {
    setDisplayedAccount(accountId);
    return () => setDisplayedAccount(undefined);
  }, [accountId]);
  useEffect(() => {
    if (!globalThis.BroadcastChannel) return;
    const channel = new BroadcastChannel("omts-auth-lifecycle-v1");
    channel.onmessage = (event) => { if (event.data === "changed") window.location.reload(); };
    return () => channel.close();
  }, []);
  const visible = resourceKeys.filter((key) => resourceAllowed(key, context.identity, context.permissions.functionPermissions));
  const financeWorkspace = context.identity.subjectType === "Staff" && context.permissions.functionPermissions.some(p => p.functionCode === "SUPPLIER_PAYMENTS" && p.action === "Create") && !context.permissions.functionPermissions.some(p => ["CULTIVATION_CYCLES", "WATER_MEASUREMENTS", "HARVESTS"].includes(p.functionCode) && ["Create", "Edit"].includes(p.action));
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const isOwner = context.identity.subjectType === "CooperativeOwner";
  const holds = (fn: string, action: string) => isOwner || context.identity.subjectType === "Staff" && context.permissions.functionPermissions.some((p) => p.functionCode === fn && p.action === action);
  const cashSettings = holds("CASH_BOOK_SETTINGS", "View"), cashBook = holds("CASH_BOOK", "View");
  const cashItems: SettingsSection["items"] = cashSettings ? [{ href: "/settings?section=cash-book", panel: "cash-book", label: "Sổ quỹ", icon: "payment", description: "Tài khoản ngân hàng, ví điện tử và loại thu chi dùng cho phiếu thu chi." }] : [];
  const inputSettings: SettingsSection["items"] = inputReaders.some((fn) => holds(fn, "View")) ? [{ href: "/settings?section=input-inventory", panel: "input-inventory", label: INPUT_GROUP, icon: "material", description: "Đơn vị tính, nhóm hàng, loại xuất, cách tính giá vốn và cho phép xuất khi hết." }] : [];
  const customerSettings: SettingsSection["items"] = holds("CUSTOMERS", "View") ? [{ href: "/settings?section=customers", panel: "customers", label: "Khách hàng", icon: "users", description: "Cảnh báo công nợ và thông tin bắt buộc khi thêm khách hàng." }] : [];
  const inputLinks: [string, string, InterfaceIconName][] = [
    ...(resourceAllowed("input-items", context.identity, context.permissions.functionPermissions) ? [["/inputs/items", "Danh mục", "material"] as [string, string, InterfaceIconName]] : []),
    ...(holds("INPUT_ISSUES", "View") ? [["/inputs/uses", "Xuất dùng", "work"] as [string, string, InterfaceIconName]] : []),
    ...(holds("INPUT_DISPOSALS", "View") ? [["/inputs/disposals", "Xuất hủy", "trash"] as [string, string, InterfaceIconName]] : []),
  ];
  const settingsSections: SettingsSection[] = [
    { label: "Quản lý", items: [...cashItems, ...inputSettings, ...customerSettings, ...(isOwner ? [{ href: "/settings?section=harvest", panel: "harvest" as const, label: "Thiết lập thu hoạch", icon: "work" as const, description: "Khối lượng trung bình mỗi lồng và số ngày tự động đóng lô." }] : [])] },
    { label: "Phân quyền", items: (["accounts", "roles"] as const).filter((key) => visible.includes(key)).map((key) => ({ href: `/workspace/${key}`, label: resources[key].title, icon: resourceIcons[key], description: settingsDescriptions[key] })) },
    { label: "Hợp tác xã", items: isOwner ? [{ href: "/cooperative/profile", label: "Hồ sơ hợp tác xã", icon: "cooperative", description: "Thông tin pháp lý, kênh liên hệ và tài khoản nhận chuyển khoản của hợp tác xã." }, { href: "/cooperative/receiving-bank-account", label: "Ngân hàng nhận tiền", icon: "payment", description: "Tài khoản dùng để nhận chuyển khoản và tạo mã VietQR." }] : [] },
    { label: "Cấu hình nghiệp vụ", items: operationModules.filter((entry) => entry.key === "job-types" && operationAllowed(entry.key, context.identity, context.permissions.functionPermissions)).map((entry) => ({ href: `/operations/${entry.key}`, label: entry.title, icon: operationIcons[entry.key], description: "Đơn giá theo giờ và lịch sử ngày hiệu lực của từng loại công việc." })) },
  ];
  const navigation = ({ compact, onNavigate }: { compact: boolean; onNavigate?: () => void }) => {
    const link = (href: string, label: string, icon: InterfaceIconName) => <Link key={href} className={styles.navigationLink} href={href} aria-current={active(href) ? "page" : undefined} aria-label={label} title={compact ? label : undefined} onClick={onNavigate}><span className={styles.iconSlot}><InterfaceIcon name={icon}/></span><span className={styles.linkLabel}>{label}</span></Link>;
    return <nav aria-label="Chức năng" className={styles.navigation}>
      <NavigationGroup label="Điều hành" compact={compact}><div className={styles.navigationItems}>
        {link("/dashboard", "Tổng quan HTX", "dashboard")}
        {context.identity.subjectType === "CooperativeOwner" && link("/audit", "Nhật ký thao tác", "search")}
        {context.identity.subjectType === "CooperativeOwner" && link("/cooperative/certifications", "Chứng nhận HTX", "document")}
        {(context.identity.subjectType === "CooperativeOwner" || context.permissions.functionPermissions.some(p => p.functionCode === "SUPPLIER_PAYMENTS" && p.action === "View")) && link("/operations/supplier-debts", "Đối chiếu công nợ", "payment")}
        {context.identity.subjectType === "CooperativeOwner" && link("/trader-requests", "Yêu cầu đăng ký thương lái", "request")}
      </div></NavigationGroup>
      {context.identity.subjectType === "SystemAdministrator" && <NavigationGroup label="Quản trị hệ thống" compact={compact}><div className={styles.navigationItems}>{link("/system/accounts", "Tài khoản & nhật ký", "roles")}</div></NavigationGroup>}
      {workspaceGroups.map((group) => {
        if (financeWorkspace && group.label === "Nuôi trồng") return null;
        const rows = visible.filter((key) => group.resources.includes(key));
        const modules = operationModules.filter((entry) => group.operations.includes(entry.key) && operationAllowed(entry.key, context.identity, context.permissions.functionPermissions)).sort((a, b) => group.operations.indexOf(a.key) - group.operations.indexOf(b.key));
        const purchasing = operationAllowed("purchase-receipts", context.identity, context.permissions.functionPermissions);
        const inputs = group.label === INPUT_GROUP ? inputLinks : [];
        return rows.length || modules.length || inputs.length || (group.label === "Mua hàng" && purchasing) ? <NavigationGroup key={group.label} label={group.label} compact={compact}><div className={styles.navigationItems}>
          {rows.map((key) => link(`/workspace/${key}`, resources[key].title, resourceIcons[key]))}
          {inputs.map(([href, label, icon]) => link(href, label, icon))}
          {modules.map((entry) => link(entry.key === "cultivation-cycles" ? "/farming/cycles" : `/operations/${entry.key}`, entry.title, operationIcons[entry.key]))}
          {group.label === "Mua hàng" && purchasing && <>{link("/operations/purchase-receipts", "Nhập hàng", "receipt")}{link("/operations/purchase-returns", "Trả hàng nhập", "upload")}</>}
        </div></NavigationGroup> : null;
      })}
      {cashBook && <NavigationGroup label="Sổ quỹ" compact={compact}><div className={styles.navigationItems}>{link("/operations/cash-book", "Sổ quỹ", "payment")}</div></NavigationGroup>}
    </nav>;
  };
  const accountPhone = useAccountPhone(context.identity.accountId);
  return <WorkspaceContext.Provider value={context}><SelectedZonesProvider accountId={context.identity.accountId} enabled={resourceAllowed("zones", context.identity, context.permissions.functionPermissions)}>
    <AppShell navigation={navigation} settingsSections={settingsSections} topAction={() => <><ZonePicker /><InboxBell /></>} accountLabel={context.identity.username} accountPhone={accountPhone} accountInitials={context.identity.username.slice(0,2).toUpperCase()} accountRole={workspaceRoleLabel(context.identity.subjectType, context.permissions.functionPermissions)} isLoggingOut={pending} onLogout={async () => {
      if (pending) return;
      setPending(true); setError(undefined);
      const result = await logoutWithApi();
      if (result.status === "signed-out-local") setError(`${LOCAL_SIGN_OUT_MESSAGE} Hãy đăng nhập lại để tiếp tục.`);
      else if (result.destination) window.location.replace(result.destination);
      else { setError("Chưa thể đăng xuất. Kiểm tra kết nối rồi thử lại."); setPending(false); }
    }}>
      {error && <p role="alert" className="mb-4 rounded-control border border-danger/30 bg-surface p-4 text-danger">{error}</p>}
      {!financeWorkspace && <Suspense><FarmingWorkflowNav identity={context.identity} permissions={context.permissions} /></Suspense>}
      {children}
    </AppShell>
  </SelectedZonesProvider></WorkspaceContext.Provider>;
}

export function ApiWorkspaceHome() {
  const context = useApiWorkspace();
  if (context.identity.subjectType === "SystemAdministrator") return <section><ManagementHeading title="Quản trị hệ thống" description="Quản lý truy cập của các tài khoản trên hệ thống." icon="roles" /><Link href="/system/accounts" className="mt-6 flex items-center justify-between rounded-card border border-border bg-surface p-5 font-semibold hover:border-primary">Tài khoản và nhật ký quản trị<span aria-hidden="true">→</span></Link></section>;
  if (context.identity.subjectType === "CooperativeOwner") return <OwnerOverview />;
  const visible = resourceKeys.filter((key) => resourceAllowed(key, context.identity, context.permissions.functionPermissions));
  return <section><ManagementHeading title="Tổng quan hoạt động" description="Chọn công việc trong phạm vi được cấp." icon="dashboard" />
    <div className="mt-7 grid gap-6 xl:grid-cols-2"><section className="min-w-0"><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Danh mục quản lý</h2><div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">{visible.map((key) => <a key={key} href={`/workspace/${key}`}
      className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 text-sm font-semibold hover:bg-surface-subtle hover:text-primary">{resources[key].title}<span aria-hidden="true">↗</span></a>)}</div></section>
    <section className="min-w-0"><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Công việc</h2><div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">{operationModules.filter((entry) => entry.key !== "customer-payments" && operationAllowed(entry.key, context.identity, context.permissions.functionPermissions)).map((entry) => <a key={entry.key} href={entry.key === "cultivation-cycles" ? "/farming/cycles" : `/operations/${entry.key}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 text-sm font-semibold hover:bg-surface-subtle hover:text-primary">{entry.title}<span aria-hidden="true">↗</span></a>)}</div></section></div>
    {!visible.length && !operationModules.some((entry) => entry.key !== "customer-payments" && operationAllowed(entry.key, context.identity, context.permissions.functionPermissions)) && <p className="mt-6 rounded-card border border-border bg-surface p-6">Tài khoản hiện chưa được cấp chức năng nghiệp vụ. Bạn có thể xem hồ sơ cá nhân.</p>}
  </section>;
}

/** The phone number of the signed-in account for the account menu; null until loaded or when it has none. */
function useAccountPhone(accountId: string) {
  const [phone, setPhone] = useState<{ accountId: string; value: string | null }>();
  useEffect(() => {
    const controller = new AbortController();
    void createPersonalRepository().profile(controller.signal).then((result) => {
      if (result.status === "success") setPhone({ accountId, value: result.data.phoneNumber ?? null });
    });
    return () => controller.abort();
  }, [accountId]);
  return phone?.accountId === accountId ? phone.value : null;
}
