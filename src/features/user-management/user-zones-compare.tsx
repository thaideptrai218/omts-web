import Link from "next/link";
import type { EmployeeLookup } from "./use-user-accounts";
import { missingWorkingZones, pairZoneLabel, roleLabel, type UserAccount } from "./user-account-model";

/**
 * Decision D8: the employee's "vùng làm việc" and the account's "phân quyền vùng" side by side, so the Owner sees both in one place.
 * When a Zone Manager grant covers a zone the employee does not work in, only a hint is shown: the existing employee API replaces
 * the whole profile (it has no light "add a working zone" call), so a one-click change would silently rewrite unrelated fields.
 */
export function UserZonesCompare({ account, employee, zoneNames }: { account: UserAccount; employee?: EmployeeLookup; zoneNames: ReadonlyMap<string, string> }) {
  const missing = employee ? missingWorkingZones(account.pairs, employee.workingZoneIds) : [];
  return <section aria-label="Vùng làm việc và phân quyền vùng" className="grid gap-3 rounded-control border border-border p-3 sm:grid-cols-2">
    <div>
      <h3 className="font-semibold">Vùng làm việc (hồ sơ nhân viên)</h3>
      {!account.employeeId ? <p className="mt-1 text-sm text-text-muted">Tài khoản chưa liên kết nhân viên.</p>
        : !employee ? <p className="mt-1 text-sm text-text-muted">Chưa đọc được hồ sơ nhân viên liên kết.</p>
        : <>
          <p className="mt-1 text-sm">{employee.code} · {employee.fullName}</p>
          <ul className="mt-1 list-disc pl-5 text-sm">{employee.workingZoneIds.length ? employee.workingZoneIds.map((id) => <li key={id}>{zoneNames.get(id) ?? "Vùng đã ngừng sử dụng"}</li>) : <li className="list-none text-text-muted">Chưa có vùng làm việc.</li>}</ul>
        </>}
    </div>
    <div>
      <h3 className="font-semibold">Phân quyền vùng (tài khoản)</h3>
      {account.pairs.length ? <ul className="mt-1 list-disc pl-5 text-sm">{account.pairs.map((pair) => <li key={pair.id}>{roleLabel(pair.role, pair.roleName)} · {pairZoneLabel(pair)}</li>)}</ul>
        : <p className="mt-1 text-sm text-text-muted">Chưa có phân quyền: người dùng chưa đăng nhập được.</p>}
    </div>
    {missing.length > 0 && account.employeeId && <p role="note" className="rounded-control bg-surface-subtle p-2 text-sm sm:col-span-2">
      Quản lý vùng được cấp {missing.map(pairZoneLabel).join(", ")} nhưng nhân viên chưa có vùng này trong vùng làm việc. Hãy bổ sung ở{" "}
      <Link className="font-semibold underline" href={`/workspace/employees?recordId=${encodeURIComponent(account.employeeId)}`}>hồ sơ nhân viên</Link>.
    </p>}
  </section>;
}
