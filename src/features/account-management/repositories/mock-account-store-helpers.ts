import type {
  AccountManagementWorkspace,
  AssignableRole,
  CredentialDeliveryReceipt,
  FarmingZoneOption,
  ManagedAccount,
} from "@/features/account-management/domain/account-management";
import type { FeatureCatalogItem } from "@/features/role-management/domain/role-management";

/** Simulated network latency for mock mode. */
export function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function cloneAccount(account: ManagedAccount): ManagedAccount {
  return { ...account, grants: account.grants.map((grant) => ({ ...grant })) };
}

/** Deep-copies the workspace so callers cannot mutate the in-memory store. */
export function cloneAccountWorkspace({
  accounts,
  featureCatalog,
  roles,
  zones,
}: Readonly<{
  accounts: readonly ManagedAccount[];
  featureCatalog: readonly FeatureCatalogItem[];
  roles: readonly AssignableRole[];
  zones: readonly FarmingZoneOption[];
}>): AccountManagementWorkspace {
  return {
    accounts: accounts.map(cloneAccount),
    featureCatalog: featureCatalog.map((feature) => ({
      ...feature,
      supportedActions: [...feature.supportedActions],
    })),
    roles: roles.map((role) => ({
      ...role,
      permissions: role.permissions.map((permission) => ({
        ...permission,
        actionKeys: [...permission.actionKeys],
      })),
    })),
    zones: zones.map((zone) => ({ ...zone })),
  };
}

/** Bỏ dấu tiếng Việt và chuẩn hóa họ tên thành phần gốc của tên đăng nhập. */
function usernameBase(fullName: string): string {
  const normalized = fullName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");

  return normalized || "staff";
}

export function createUniqueUsername(
  fullName: string,
  accounts: readonly ManagedAccount[],
): string {
  const base = usernameBase(fullName);

  for (let suffix = accounts.length + 1; suffix < accounts.length + 10_001; suffix += 1) {
    const candidate = `${base}.${String(suffix).padStart(4, "0")}`;
    const exists = accounts.some(
      (account) => account.username.toLowerCase() === candidate.toLowerCase(),
    );
    if (!exists) return candidate;
  }

  throw new Error("Unable to generate a unique mock username.");
}

function maskRecipient(channel: "email" | "phone", value: string): string {
  if (channel === "email") {
    const [localPart, domain] = value.split("@");
    return localPart && domain ? `${localPart.slice(0, 2)}***@${domain}` : "***";
  }

  const digits = value.replace(/\D/g, "");
  return digits.length > 4 ? `••••••${digits.slice(-4)}` : "••••";
}

/** Biên nhận gửi thông tin đăng nhập; chỉ lộ người nhận đã được che. */
export function createDeliveryReceipt(account: ManagedAccount): CredentialDeliveryReceipt {
  const channel = account.credentialDeliveryChannel;
  const recipient = channel === "email" ? account.email : account.phone;

  return {
    channel,
    deliveryStatus: "sent",
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    maskedRecipient: maskRecipient(channel, recipient),
    username: account.username,
  };
}
