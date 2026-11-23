import type { FunctionPermission } from "@/features/access/domain/function-permission";
import { operationAllowed } from "@/features/operations/permissions";
import { roleProfile } from "./role-profile";

export type FieldBlock = "attendance" | "plans" | "lots" | "nursery" | "water";
export type MoneyBlock = "supplier-debts" | "customer-awaiting";
type Who = Readonly<{ subjectType: string }>;

const held = (permissions: readonly FunctionPermission[], code: string) => permissions.some((item) => item.functionCode === code && item.action === "View");

/** Các khối "Việc hôm nay trong vùng" mà tài khoản hiện trường được thấy; mỗi khối theo đúng quyền xem màn đích. Rỗng nếu không phải hiện trường. */
export function fieldBlocks(identity: Who, permissions: readonly FunctionPermission[]): FieldBlock[] {
  if (roleProfile(identity, permissions) !== "field") return [];
  const blocks: [FieldBlock, boolean][] = [
    ["attendance", operationAllowed("workforce", identity, permissions, "View")],
    ["plans", held(permissions, "HARVEST_PLANS") && held(permissions, "HARVESTS")],
    ["lots", operationAllowed("harvest", identity, permissions)],
    ["nursery", operationAllowed("cultivation-cycles", identity, permissions)],
    ["water", operationAllowed("water", identity, permissions)],
  ];
  return blocks.filter(([, show]) => show).map(([key]) => key);
}

/** Các khối "Việc tiền hôm nay" của Kế toán; không có khoản nào về lương (lương tạm hoãn). */
export function moneyBlocks(identity: Who, permissions: readonly FunctionPermission[]): MoneyBlock[] {
  if (roleProfile(identity, permissions) !== "finance") return [];
  const blocks: [MoneyBlock, boolean][] = [
    ["supplier-debts", operationAllowed("supplier-payments", identity, permissions, "View")],
    ["customer-awaiting", operationAllowed("customer-payments", identity, permissions, "View")],
  ];
  return blocks.filter(([, show]) => show).map(([key]) => key);
}
