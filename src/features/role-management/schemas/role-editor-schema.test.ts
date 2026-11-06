import { describe, expect, it } from "vitest";
import { roleEditorSchema } from "@/features/role-management/schemas/role-editor-schema";

describe("roleEditorSchema", () => {
  it("requires a role name", () => {
    expect(roleEditorSchema.safeParse({ description: "", name: "   " }).success).toBe(
      false,
    );
  });

  it("accepts an optional description and trims the name", () => {
    const result = roleEditorSchema.parse({
      description: "Theo dõi hoạt động vùng nuôi",
      name: "  Quản lý vùng  ",
    });

    expect(result.name).toBe("Quản lý vùng");
  });
});
