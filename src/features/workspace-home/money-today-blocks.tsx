"use client";
import { awaiting } from "@/features/customer-payments/contracts";
import { createOperationsRepository } from "@/features/operations/repository";
import { money, useRemote } from "@/features/operations/ui";
import * as purchasing from "@/features/purchasing-v2/contracts";
import { paymentsRepository } from "@/features/purchasing-v2/purchasing-shared";
import { HomeBlock } from "./home-block";

const customerPayments = createOperationsRepository("customer-payments");
// Same read the real "Thanh toán nhà cung cấp" screen uses (/api/supplier-debts); the old /api/suppliers/debts shape no longer fits.
const loadDebts = (signal: AbortSignal) => paymentsRepository.read("debts", { page: "1", pageSize: "10" }, purchasing.debts, signal);
// pageSize 20 is the size the real awaiting panel asks for; the BFF refuses sizes it does not know.
const loadAwaiting = (signal: AbortSignal) => customerPayments.read("awaiting", { page: "1", pageSize: "20" }, awaiting, signal);

/** Công nợ nhà cung cấp còn phải trả (từ các phiếu nhập chưa trả hết). */
export function SupplierDebtsBlock() {
  const remote = useRemote(loadDebts);
  return <HomeBlock title="Phiếu nhập chờ thanh toán" remote={remote} moreHref="/operations/supplier-payments" moreLabel="Thanh toán" empty="Không còn khoản nào phải trả nhà cung cấp."
    rows={(debts) => debts.page.total > 0
      ? [{ key: "debts", title: `${debts.page.total} nhà cung cấp còn nợ`, detail: `Còn phải trả ${money(debts.totalOwed)}`, href: "/operations/supplier-payments" }] : []} />;
}

/** Khoản thương lái đã chuyển hoặc đưa, chờ Kế toán xác nhận. */
export function CustomerAwaitingBlock() {
  const remote = useRemote(loadAwaiting);
  return <HomeBlock title="Khoản của khách chờ xác nhận" remote={remote} moreHref="/operations/customer-payments" moreLabel="Xác nhận" empty="Không có khoản nào chờ xác nhận."
    rows={(data) => data.page.total ? [{ key: "awaiting", title: `${data.page.total} khoản chờ xác nhận`, detail: `Tổng ${money(data.totalAmount)}`, href: "/operations/customer-payments" }] : []} />;
}
