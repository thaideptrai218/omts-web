"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import { ManagementHeading } from "@/components/ui/management-page";
import { loadOptions } from "@/features/operations/lookups";
import { ErrorNotice, Money, Paging, Select, Skeleton, useRemote } from "@/features/operations/ui";
import * as c from "./contracts";
import { PaymentEditor } from "./payment-editor";
import { PaymentHistoryTable, SupplierDebtTable } from "./payments-tables";
import { paymentsRepository as payments, useAccess, type Payment } from "./purchasing-shared";
import { UnpaidReceiptQueue } from "./unpaid-receipt-queue";
import styles from "./purchasing.module.css";

const loadSuppliers = (signal: AbortSignal) => loadOptions("suppliers", signal);

/** Supplier payments: debt overview, unpaid receipts of the chosen supplier, transaction history. */
export function PaymentsV2Screen() {
  // Prefill for a new payment started from the unpaid-receipt queue.
  const [paymentDraft, setPaymentDraft] = useState<{ supplierId: string; amount?: number; note?: string }>();
  // Bumped to remount (and so reload) the unpaid-receipt queue.
  const [queueVersion, setQueueVersion] = useState(0);
  const { allowed } = useAccess("supplier-payments");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [debtPage, setDebtPage] = useState(1);
  // undefined = editor closed, null = new transaction.
  const [selected, setSelected] = useState<Payment | null>();
  const [supplier, setSupplier] = useState("");
  // Name shown for the chosen supplier even when it is missing from the option list.
  const [supplierLabel, setSupplierLabel] = useState("");
  const supplierOptions = useRemote(loadSuppliers);
  const remote = useRemote(
    useMemo(
      () => (signal: AbortSignal) =>
        payments.read(
          "list",
          { page: String(page), pageSize: String(pageSize), supplierId: supplier || undefined },
          c.paymentPage,
          signal,
        ),
      [page, pageSize, supplier],
    ),
  );
  const debts = useRemote(
    useMemo(
      () => (signal: AbortSignal) =>
        payments.read("debts", { page: String(debtPage), pageSize: "20" }, c.debts, signal),
      [debtPage],
    ),
  );
  // Fall back to suppliers listed in the debt table when the supplier catalogue is unavailable.
  const options =
    supplierOptions.data?.map((row) => ({ id: row.id, name: String(row.name) })) ??
    debts.data?.page.items.map((row) => ({ id: row.supplier.id, name: row.supplier.name })) ??
    [];

  const chooseSupplier = (id: string, name: string) => {
    setSupplier(id);
    setSupplierLabel(name);
    setPage(1);
  };
  const openPayment = (row: Payment) => {
    setPaymentDraft(undefined);
    setSelected(row);
  };

  return (
    <section className={`${styles.page} ${styles.paymentsPage}`}>
      <ManagementHeading
        title="Thanh toán nhà cung cấp"
        description="Đối chiếu phiếu còn nợ, ghi khoản chi và khoản nhà cung cấp trả lại tiền."
        icon="payment"
      >
        {allowed("Create") && (
          <Button
            className="w-auto"
            onClick={() => {
              setPaymentDraft(undefined);
              setSelected(null);
            }}
          >
            Ghi giao dịch
          </Button>
        )}
      </ManagementHeading>
      <FilterWorkspace
        label="Phạm vi thanh toán"
        filters={
          <>
            <Select
              label="Nhà cung cấp"
              value={supplier}
              onChange={(e) => chooseSupplier(e.target.value, e.currentTarget.selectedOptions[0]?.text ?? "")}
            >
              <option value="">Tất cả nhà cung cấp</option>
              {supplier && !options.some((row) => row.id === supplier) && (
                <option value={supplier}>{supplierLabel}</option>
              )}
              {options.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
            <p className={styles.filterNote}>
              Chọn nhà cung cấp để xem phiếu còn phải trả và lịch sử giao dịch tương ứng.
            </p>
            <Button
              variant="secondary"
              className="w-auto"
              disabled={remote.loading || debts.loading}
              onClick={() => {
                remote.reload();
                debts.reload();
                setQueueVersion((value) => value + 1);
              }}
            >
              Tải lại dữ liệu
            </Button>
          </>
        }
        reset={
          <button className={styles.textAction} type="button" onClick={() => chooseSupplier("", "")}>
            Đặt lại
          </button>
        }
      >
        <ErrorNotice error={remote.error || debts.error} />
        <div className={styles.paymentSummary}>
          <section>
            <h2>Công nợ toàn hợp tác xã</h2>
            <dl>
              <div>
                <dt>Còn phải trả</dt>
                <dd>
                  <Money value={debts.data?.totalOwed} />
                </dd>
              </div>
              <div>
                <dt>Đã trả trước</dt>
                <dd>
                  <Money value={debts.data?.totalAdvance} />
                </dd>
              </div>
            </dl>
          </section>
          <section>
            <h2>Giao dịch theo bộ lọc</h2>
            <dl>
              <div>
                <dt>Tổng chi</dt>
                <dd>
                  <Money value={remote.data?.totalPaid} />
                </dd>
              </div>
              <div>
                <dt>Nhà cung cấp trả lại</dt>
                <dd>
                  <Money value={remote.data?.totalPaidBack} />
                </dd>
              </div>
            </dl>
          </section>
        </div>
        <UnpaidReceiptQueue
          key={`${queueVersion}:${supplier}`}
          supplierId={supplier}
          canPay={allowed("Create")}
          onPay={(draft) => {
            setPaymentDraft(draft);
            setSelected(null);
          }}
        />
        <div className={styles.listHeading}>
          <div>
            <h2>Lịch sử giao dịch</h2>
            <p>
              {supplier ? supplierLabel : "Tất cả nhà cung cấp"} · {remote.data?.page.total ?? 0} giao dịch
            </p>
          </div>
        </div>
        {remote.loading ? <Skeleton /> : <PaymentHistoryTable items={remote.data?.page.items} onOpen={openPayment} />}
        {remote.data && (
          <div className={styles.paging}>
            <Select
              label="Số giao dịch mỗi trang"
              value={String(pageSize)}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size} giao dịch
                </option>
              ))}
            </Select>
            <Paging
              page={page}
              total={remote.data.page.total}
              pageSize={pageSize}
              disabled={remote.loading}
              onChange={setPage}
            />
          </div>
        )}
        <section className={styles.debtSection}>
          <div className={styles.listHeading}>
            <div>
              <h2>Đối chiếu công nợ nhà cung cấp</h2>
              <p>Phạm vi toàn HTX · số âm là tiền trả trước. Chọn tên nhà cung cấp để lọc giao dịch.</p>
            </div>
          </div>
          {debts.loading ? (
            <Skeleton />
          ) : (
            <SupplierDebtTable items={debts.data?.page.items} onChooseSupplier={chooseSupplier} />
          )}
          {debts.data && (
            <div className={styles.paging}>
              <Paging
                page={debtPage}
                total={debts.data.page.total}
                pageSize={20}
                disabled={debts.loading}
                onChange={setDebtPage}
              />
            </div>
          )}
        </section>
      </FilterWorkspace>
      {selected !== undefined && (
        <PaymentEditor
          record={selected}
          initialDraft={paymentDraft}
          canWrite={allowed("Create")}
          onClose={() => setSelected(undefined)}
          onSaved={() => {
            setSelected(undefined);
            setQueueVersion((value) => value + 1);
            remote.reload();
            debts.reload();
          }}
        />
      )}
    </section>
  );
}
