"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadOptions } from "@/features/operations/lookups";
import { ErrorNotice } from "@/features/operations/ui";

const EMPLOYEES = "/workspace/employees";

/**
 * Old links `/workspace/accounts?accountId=<id>` (notifications, bookmarks) end here. The login is now managed from the Nhân viên screen,
 * so this finds who holds it and opens that employee; a login no employee holds opens the "Tài khoản chưa gắn nhân viên" list with it open.
 * If the login cannot be found or read, the plain employee list opens instead.
 */
export function EmployeeAccountLinkRedirect({ accountId }: { accountId: string }) {
  const router = useRouter(), [problem, setProblem] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    void loadOptions("accounts", controller.signal).then(result => {
      if (controller.signal.aborted) return;
      const found = result.status === "success" ? result.data.find(record => record.id.toLowerCase() === accountId.toLowerCase()) : undefined;
      const employeeId = typeof found?.employeeId === "string" ? found.employeeId : undefined;
      if (found && employeeId) router.replace(`${EMPLOYEES}?recordId=${encodeURIComponent(employeeId)}&tab=account`);
      else if (found) router.replace(`${EMPLOYEES}?account=unlinked&openAccount=${encodeURIComponent(found.id)}`);
      else if (result.status === "success") router.replace(EMPLOYEES);
      else setProblem("Chưa mở được tài khoản này. Hãy chọn nhân viên trong danh sách.");
    });
    return () => controller.abort();
  }, [accountId, router]);
  return <div role="status" aria-label="Đang mở nhân viên" className="space-y-2 p-4"><p>Đang mở nhân viên có tài khoản này...</p><ErrorNotice error={problem} />{problem && <a className="font-semibold underline" href={EMPLOYEES}>Mở danh sách nhân viên</a>}</div>;
}
