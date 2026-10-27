export type EmployeeIssueTarget =
  | "fullName" | "phone" | "birthday" | "address" | "area" | "wardCommune"
  | "otherInformation" | "notes" | "workingZoneIds" | "bankAccount" | "accountId" | "recordVersion";

type ProblemCode = "MSG01" | "MSG03" | "MSG24";
export type EmployeeMutationProblem =
  | Readonly<{ status: "invalid-fields"; code: "MSG01"; fields: readonly EmployeeIssueTarget[] }>
  | Readonly<{ status: "duplicate"; code: "MSG03"; existingEmployeeId: string }>
  | Readonly<{ status: "account-already-linked"; code: "MSG24"; existingEmployeeId: string }>
  | Readonly<{ status: "contract-blocked"; reason: "employee-error-metadata"; code: ProblemCode }>;

// MSG24 without a name and contract-blocked results are not bindable to the
// current form. Keep them out until their message/data contracts are resolved.
export type BindableEmployeeProblem = Extract<EmployeeMutationProblem, { status: "invalid-fields" | "duplicate" }>;
