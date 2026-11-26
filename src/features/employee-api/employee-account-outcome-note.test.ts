import { expect, it } from "vitest";
import { accountOutcomeNote } from "./employee-account-outcome-note";

const account = { id: "00000000-0000-4000-8000-000000000001", username: "an.tv", displayName: "An", status: "Active" as const };

it("says the account made for a thời vụ person uses the cooperative's default password, and never prints a password", () => {
  const note = accountOutcomeNote({ account, accountOutcome: { fixedPassword: true, accountNote: false } });
  expect(note).toBe(" Đã tạo tài khoản an.tv. Họ dùng mật khẩu mặc định của hợp tác xã và phải đổi ở lần đăng nhập đầu.");
  expect(note).not.toMatch(/OMTS@/);
});

it("warns that the profile was saved without a login when the phone or username belongs to another account", () => {
  expect(accountOutcomeNote({ account: null, accountOutcome: { fixedPassword: false, accountNote: true } })).toContain("hồ sơ đã lưu nhưng chưa tạo được tài khoản");
});

it("says nothing when the save did nothing about accounts", () => {
  expect(accountOutcomeNote({ account: null, accountOutcome: undefined })).toBe("");
  expect(accountOutcomeNote({ account, accountOutcome: { fixedPassword: false, accountNote: false } })).toBe("");
});
