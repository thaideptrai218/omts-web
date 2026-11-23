"use client";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { AttendanceBlock, AssignedPlansBlock, NurseryBlock, OpenLotsBlock, WaterBlock } from "./field-today-blocks";
import { HomeBlockGrid } from "./home-block";
import { fieldBlocks, moneyBlocks } from "./home-blocks";
import { CustomerAwaitingBlock, SupplierDebtsBlock } from "./money-today-blocks";

const FIELD = { attendance: AttendanceBlock, plans: AssignedPlansBlock, lots: OpenLotsBlock, nursery: NurseryBlock, water: WaterBlock } as const;
const MONEY = { "supplier-debts": SupplierDebtsBlock, "customer-awaiting": CustomerAwaitingBlock } as const;

/** Khối việc đầu màn Tổng quan: "Việc hôm nay trong vùng" cho hiện trường, "Việc tiền hôm nay" cho Kế toán; vai trò khác không có. */
export function RoleToday() {
  const { identity, permissions } = useApiWorkspace();
  const grants = permissions.functionPermissions;
  const field = fieldBlocks(identity, grants), money = moneyBlocks(identity, grants);
  if (field.length) return <HomeBlockGrid title="Việc hôm nay trong vùng" hint="Những việc cần làm trong vùng được giao cho bạn.">{field.map((key) => { const Block = FIELD[key]; return <Block key={key} />; })}</HomeBlockGrid>;
  if (money.length) return <HomeBlockGrid title="Việc tiền hôm nay" hint="Khoản cần thu, cần trả và cần xác nhận.">{money.map((key) => { const Block = MONEY[key]; return <Block key={key} />; })}</HomeBlockGrid>;
  return null;
}
