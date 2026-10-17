import { describe, expect, it } from "vitest";
import { accountEditorSchema } from "@/features/account-management/schemas/account-editor-schema";

describe("accountEditorSchema", () => {
  it("accepts the SCR-09 required fields and an empty optional email", () => {
    expect(
      accountEditorSchema.parse({
        displayName: " Nguyễn Văn An ",
        email: "",
        phone: "0901234567",
        username: "nguyen.an",
      }),
    ).toEqual({
      displayName: "Nguyễn Văn An",
      email: "",
      phone: "0901234567",
      username: "nguyen.an",
    });
  });

  it("rejects missing required fields, invalid email and whitespace in username", () => {
    const result = accountEditorSchema.safeParse({
      displayName: "",
      email: "not-an-email",
      phone: "",
      username: "nguyen an",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(["displayName", "email", "phone", "username"]),
      );
    }
  });
});
