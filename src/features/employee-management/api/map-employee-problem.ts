import { employeeProblemMetadataSchema, type EmployeeProblemMetadata } from "./employee-problem-metadata";
import type { EmployeeIssueTarget, EmployeeMutationProblem } from "@/features/employee-management/domain/employee-problem";
export type { EmployeeIssueTarget, EmployeeMutationProblem } from "@/features/employee-management/domain/employee-problem";

const fieldTargets = {
  "Full name": "fullName", "Phone number": "phone", Birthday: "birthday", Address: "address",
  Area: "area", Ward: "wardCommune", "Other information": "otherInformation", Notes: "notes",
  "Working zones": "workingZoneIds", "Bank account": "bankAccount", Account: "accountId", RowVersion: "recordVersion",
} as const satisfies Readonly<Record<string, EmployeeIssueTarget>>;
type ProblemCode = "MSG01" | "MSG03" | "MSG24";

function matches(code: ProblemCode, metadata: EmployeeProblemMetadata) {
  return code === "MSG01" ? metadata.kind === "invalid-fields"
    : code === "MSG03" ? metadata.kind === "duplicate-employee" : metadata.kind === "account-already-linked";
}

// UI-neutral issue DTO, not message copy or a navigation instruction. Group and
// version targets must not be silently treated as editable legacy form fields.
export function mapEmployeeProblem(
  endpoint: string, httpStatus: number, code: unknown, metadata: unknown,
): EmployeeMutationProblem | undefined {
  if (endpoint !== "employeeUpdate" && endpoint !== "employeeUnlink") return undefined;
  if (code !== "MSG01" && code !== "MSG03" && code !== "MSG24") return undefined;
  const validation = httpStatus === 400 && code === "MSG01";
  const duplicate = endpoint === "employeeUpdate" && httpStatus === 409 && (code === "MSG03" || code === "MSG24");
  if (!validation && !duplicate) return undefined;
  const problemCode = code;
  const blocked = { status: "contract-blocked", reason: "employee-error-metadata", code: problemCode } as const;
  const parsed = employeeProblemMetadataSchema.safeParse(metadata);
  if (!parsed.success || !matches(problemCode, parsed.data)) return blocked;
  if (parsed.data.kind === "invalid-fields") {
    if (endpoint === "employeeUnlink" && parsed.data.fields.some((field) => field !== "RowVersion")) return blocked;
    return { status: "invalid-fields", code: "MSG01", fields: [...new Set(parsed.data.fields.map((field) => fieldTargets[field]))] };
  }
  return parsed.data.kind === "duplicate-employee"
    ? { status: "duplicate", code: "MSG03", existingEmployeeId: parsed.data.existingEmployeeId }
    : { status: "account-already-linked", code: "MSG24", existingEmployeeId: parsed.data.existingEmployeeId };
}
