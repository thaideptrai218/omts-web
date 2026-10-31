import { describe, expect, it, vi } from "vitest";
import { createRegistrationSchema } from "@/features/registration/schemas/registration-schema";

const isValidPhoneNumber = vi.fn((value: string) => /^0\d{9}$/.test(value));
const schema = createRegistrationSchema({ isValidPhoneNumber });

function getIssues(values: {
  confirmPassword: string;
  identifier: string;
  method: "email" | "phone";
  password: string;
}) {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues;
}

describe("registration schema", () => {
  it("accepts a valid email registration draft", () => {
    expect(
      schema.safeParse({
        confirmPassword: "Matkhau1",
        identifier: "trader@example.com",
        method: "email",
        password: "Matkhau1",
      }).success,
    ).toBe(true);
  });

  it("validates an email without calling the phone contract", () => {
    isValidPhoneNumber.mockClear();

    const issues = getIssues({
      confirmPassword: "Matkhau1",
      identifier: "not-an-email",
      method: "email",
      password: "Matkhau1",
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        message: "Email chưa đúng định dạng.",
        path: ["identifier"],
      }),
    );
    expect(isValidPhoneNumber).not.toHaveBeenCalled();
  });

  it("delegates phone format to the injected contract", () => {
    isValidPhoneNumber.mockClear();

    const issues = getIssues({
      confirmPassword: "Matkhau1",
      identifier: "123",
      method: "phone",
      password: "Matkhau1",
    });

    expect(isValidPhoneNumber).toHaveBeenCalledWith("123");
    expect(issues).toContainEqual(
      expect.objectContaining({
        message: "Số điện thoại chưa đúng định dạng.",
        path: ["identifier"],
      }),
    );
  });

  it("uses the shared password policy", () => {
    const issues = getIssues({
      confirmPassword: "letters-only",
      identifier: "trader@example.com",
      method: "email",
      password: "letters-only",
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        message: "Mật khẩu phải có ít nhất một chữ số.",
        path: ["password"],
      }),
    );
  });

  it("reports confirmation mismatch on the confirmation field", () => {
    const issues = getIssues({
      confirmPassword: "Matkhau2",
      identifier: "trader@example.com",
      method: "email",
      password: "Matkhau1",
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        message: "Mật khẩu nhập lại chưa khớp.",
        path: ["confirmPassword"],
      }),
    );
  });
});
