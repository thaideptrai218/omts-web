import { describe, expect, it } from "vitest";
import { employeeEditorSchema } from "@/features/employee-management/schemas/employee-editor-schema";

const validEmployee = {
  accountId: "",
  address: "",
  area: "",
  birthday: "",
  fullName: "Nguyễn Văn An",
  notes: "",
  otherInformation: "",
  phone: "0901234567",
  status: "employed",
  wardCommune: "",
} as const;

describe("employeeEditorSchema", () => {
  it("accepts the two required identity fields and optional account", () => {
    expect(employeeEditorSchema.safeParse(validEmployee).success).toBe(true);
  });

  it.each(["fullName", "phone"] as const)(
    "rejects a missing %s",
    (field) => {
      const result = employeeEditorSchema.safeParse({
        ...validEmployee,
        [field]: "   ",
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0]?.path).toEqual([field]);
    },
  );

  it("accepts both confirmed employee statuses", () => {
    expect(
      employeeEditorSchema.safeParse({ ...validEmployee, status: "left" }).success,
    ).toBe(true);
  });
});
