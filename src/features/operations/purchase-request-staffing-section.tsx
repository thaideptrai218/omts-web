"use client";
import { EmployeeTypeBadge } from "@/features/employee-api/employee-type-badge";
import { EmployeeTwoGroupPicker } from "@/features/employee-api/employee-two-group-picker";
import { useEmployeeKinds } from "@/features/employee-api/use-employee-types";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { cagesWithEstimate } from "@/shared/format/cage-request-quantity";
import { formatDate } from "@/features/trader-purchases/presentation";
import { createOperationsRepository } from "./repository";
import * as c from "./new-module-contracts";
import { ErrorNotice, Field, businessToday, useMutation, useRemote } from "./ui";
import { buildStaffingPayload } from "./purchase-request-staffing-model";

const requests = createOperationsRepository("purchase-requests");

/**
 * "Kế hoạch nhân sự" của Chủ HTX trong chi tiết yêu cầu mua: chọn số lồng, ngày lấy hàng và nhân viên; lưu xong, nhân viên được phân công ngay (không chờ họ đồng ý)
 * và nút Chấp nhận mở ra. Sau khi lưu, số lồng và ngày được giữ nguyên, chỉ chọn thêm được nhân viên cho đến khi Chủ HTX chấp nhận.
 */
export function PurchaseRequestStaffingSection({ request, kgPerCage, onSaved }: { request: c.PurchaseRequest; kgPerCage?: number; onSaved(request: c.PurchaseRequest): void }) {
  const sent = request.staffing, mutation = useMutation();
  const [cages, setCages] = useState(String(sent?.cages ?? request.requestedCages)), [pickupDate, setPickupDate] = useState(sent?.pickupDate ?? request.pickupDate);
  const kindOf = useEmployeeKinds();
  const [selected, setSelected] = useState<string[]>([]), [problem, setProblem] = useState<string>(), [saved, setSaved] = useState(false);
  const day = sent?.workDate ?? pickupDate;
  const chosenRemote = useRemote(useCallback((signal: AbortSignal) => requests.read("staffing", { id: request.id }, c.staffingChosenSchema, signal), [request.id]));
  const employeesRemote = useRemote(useCallback((signal: AbortSignal) => day >= businessToday() ? requests.read("staffing-employees", { id: request.id, day }, c.staffingEmployeesSchema, signal) : Promise.resolve({ status: "success" as const, data: [] }), [request.id, day]));
  const chosen = useMemo(() => chosenRemote.data ?? [], [chosenRemote.data]);
  const chosenIds = useMemo(() => chosen.map((row) => row.employeeId), [chosen]);
  const options = useMemo(() => (employeesRemote.data ?? []).filter((employee) => !chosenIds.includes(employee.id)), [employeesRemote.data, chosenIds]);

  async function save() {
    const built = buildStaffingPayload({ cages, pickupDate, selectedIds: selected, chosenIds }, request, businessToday());
    if (!built.ok) { setProblem(built.error); return; }
    setProblem(undefined); setSaved(false);
    const updated = await mutation.run(async () => {
      const result = await requests.write("staffing", built.value, c.staffingSchema, request.id);
      if (result.status !== "success") return result;
      // The staffing answer is not the request: read it again for the new row version and the plan the Chấp nhận button needs.
      return requests.read("detail", { id: request.id }, c.purchaseRequestSchema);
    });
    if (!updated) return;
    setSaved(true); setSelected([]); chosenRemote.reload(); employeesRemote.reload();
    onSaved(updated);
  }

  return <section className="mt-5 border-t border-border pt-4" aria-labelledby="request-staffing"><h3 id="request-staffing" className="font-semibold">Kế hoạch nhân sự</h3>
    {sent
      ? <p className="mt-2 text-sm">Đã lập kế hoạch: {cagesWithEstimate(sent.cages, kgPerCage)}, lấy ngày {formatDate(sent.pickupDate)}. Số lồng và ngày giữ nguyên; bạn vẫn chọn thêm được nhân viên cho đến khi chấp nhận.</p>
      : <p className="mt-2 text-sm text-text-muted">Lập kế hoạch nhân sự trước khi chấp nhận yêu cầu. Nhân viên được phân công ngay, không cần chờ đồng ý.</p>}
    {!sent && <div className="mt-3 grid gap-4 sm:grid-cols-2">
      <Field label="Số lồng cần lấy *" type="number" inputMode="numeric" min={1} max={request.requestedCages} step={1} value={cages} onChange={(event) => setCages(event.target.value)} />
      <DatePickerField label="Ngày lấy hàng *" required min={businessToday()} value={pickupDate} onChange={setPickupDate} />
    </div>}
    <div className="mt-4"><h4 className="text-sm font-medium">Nhân viên đã chọn</h4>
      {chosenRemote.loading ? <p className="mt-1 text-sm text-text-muted" role="status">Đang tải…</p>
        : chosen.length ? <ul className="mt-1 list-disc pl-5 text-sm">{chosen.map((row) => <li key={row.id}>{row.employeeName}<EmployeeTypeBadge type={kindOf(row.employeeId)} className="ml-1.5" /></li>)}</ul>
        : <p className="mt-1 text-sm text-text-muted">Chưa chọn nhân viên nào.</p>}
    </div>
    <div className="mt-4"><h4 className="mb-2 text-sm font-medium">{sent ? "Chọn thêm nhân viên" : "Chọn nhân viên *"}</h4>
      {employeesRemote.loading ? <p className="mt-2 text-sm text-text-muted" role="status">Đang tải danh sách nhân viên…</p>
        : employeesRemote.error ? <><ErrorNotice error={employeesRemote.error} /><Button className="mt-2 w-auto" variant="secondary" onClick={employeesRemote.reload}>Tải lại danh sách nhân viên</Button></>
        : options.length ? <EmployeeTwoGroupPicker name="staffing-employee" label="Nhân viên có thể chọn" values={selected} onChange={setSelected}
          people={options.map((employee) => ({ id: employee.id, name: employee.name, disabled: !employee.available || mutation.pending, note: !employee.available ? <small className="block">{employee.unavailableReason ?? "Không chọn được"}</small> : undefined }))} />
        : <p className="mt-2 text-sm text-text-muted">Không có nhân viên nào phù hợp.</p>}
    </div>
    <ErrorNotice error={problem || mutation.error} />
    {saved && <p className="mt-3 text-sm text-success" role="status">Đã lưu kế hoạch nhân sự. Nhân viên được phân công ngay, bạn có thể chấp nhận yêu cầu.</p>}
    <Button className="mt-3 w-auto" isPending={mutation.pending} disabled={mutation.blocked} onClick={() => void save()}>Lưu kế hoạch nhân sự</Button>
  </section>;
}
