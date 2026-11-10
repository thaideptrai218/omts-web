"use client";
import { useState } from "react";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { OperationHeading } from "@/features/operations/ui";
import { operationAllowed } from "@/features/operations/permissions";
import { AwaitingPanel } from "./awaiting-panel";
import { PaymentRecordPanel } from "./payment-record-panel";
import s from "./payments-screen.module.css";

/** SCR-DEBT-03 Thanh toán của khách: ghi nhận thanh toán / trả lại tiền, và xác nhận các khoản chờ (kế toán và Chủ HTX). */
export function CustomerPaymentsScreen() {
  const { identity, permissions } = useApiWorkspace();
  const [tab, setTab] = useState<"record" | "awaiting">("record"), [version, setVersion] = useState(0);
  const can = (action: string) => operationAllowed("customer-payments", identity, permissions.functionPermissions, action);
  const bump = () => setVersion((v) => v + 1);
  return (
    <section>
      <OperationHeading title="Thanh toán của khách" description="Ghi nhận tiền khách đã trả hoặc tiền hợp tác xã trả lại, rồi xác nhận các khoản đang chờ để công nợ được cập nhật." icon="payment" />
      <nav className={s.tabs} aria-label="Thanh toán của khách">
        <button type="button" aria-current={tab === "record" ? "page" : undefined} onClick={() => setTab("record")}>Ghi nhận</button>
        <button type="button" aria-current={tab === "awaiting" ? "page" : undefined} onClick={() => setTab("awaiting")}>Chờ xác nhận</button>
      </nav>
      {tab === "record"
        ? (can("Create") ? <PaymentRecordPanel onRecorded={bump} /> : <p role="alert" className={s.error}>Bạn không có quyền ghi nhận thanh toán của khách.</p>)
        : <AwaitingPanel key={version} canEdit={can("Edit")} />}
    </section>
  );
}
