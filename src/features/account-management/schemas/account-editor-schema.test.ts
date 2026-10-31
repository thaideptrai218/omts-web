import { describe, expect, it } from "vitest";
import { accountEditorSchema } from "@/features/account-management/schemas/account-editor-schema";

describe("accountEditorSchema", () => {
  it("accepts a phone-only Staff contact", () => {
    expect(
      accountEditorSchema.parse({
        deliveryChannel: "phone",
        email: "",
        fullName: " Nguyễn Văn An ",
        phone: "0901234567",
      }),
    ).toEqual({
      deliveryChannel: "phone",
      email: "",
      fullName: "Nguyễn Văn An",
      phone: "0901234567",
    });
  });

  it("accepts an email-only Staff contact", () => {
    expect(
      accountEditorSchema.parse({
        deliveryChannel: "email",
        email: "nhanvien@omts.test",
        fullName: "Lê Minh",
        phone: "",
      }),
    ).toMatchObject({ deliveryChannel: "email", phone: "" });
  });

  it("rejects a missing full name and missing contacts", () => {
    const result = accountEditorSchema.safeParse({
      deliveryChannel: "phone",
      email: "",
      fullName: "",
      phone: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(["fullName", "email", "phone"]),
      );
    }
  });

  it("requires the selected delivery channel to have a contact", () => {
    const result = accountEditorSchema.safeParse({
      deliveryChannel: "email",
      email: "",
      fullName: "Lê Minh",
      phone: "0911222333",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["deliveryChannel"]);
    }
  });
});
