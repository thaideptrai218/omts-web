"use client";
import { deriveAccessBoundExpiry, checkAccessBoundExpiry } from "../../../../src/server/auth/session-expiry";
import { createEmployeeMutationAdapter } from "../../../../src/server/employees/employee-mutation-adapter";
import { createEmployeeReadAdapter } from "../../../../src/server/employees/employee-read-adapter";
import { sameEmployeeSession } from "../../../../src/server/employees/employee-session";

export default function InvalidExpiryClientPage() {
  const derived = deriveAccessBoundExpiry(null, () => 0);
  const checked = checkAccessBoundExpiry(null, () => 0);
  return <p>{derived.status}/{checked.status}/{typeof createEmployeeMutationAdapter}/{typeof createEmployeeReadAdapter}/{typeof sameEmployeeSession}</p>;
}
