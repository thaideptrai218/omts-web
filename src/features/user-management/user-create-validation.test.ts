import { describe, expect, it } from "vitest";
import { emptyGrantSelection } from "./user-grant-selection";
import { firstInvalidField, validateCreateUser } from "./user-create-validation";

const empty = { displayName: "", username: "", phoneNumber: "", email: "", employeeId: "" };
const valid = { displayName: "Lan", username: "lan.kt", phoneNumber: "0912345678", email: "", employeeId: "" };

describe("create user validation", () => {
  it("reports every empty required field at once", () => {
    const errors = validateCreateUser(empty, emptyGrantSelection);
    expect(Object.keys(errors)).toEqual(["displayName", "username", "phoneNumber"]);
    expect(errors.displayName).toBe("Vui lòng nhập tên hiển thị.");
    expect(firstInvalidField(errors)).toBe("displayName");
  });
  it("accepts a complete form", () => expect(validateCreateUser(valid, emptyGrantSelection)).toEqual({}));
  it("rejects a bad username, phone, email and a Quản lý vùng without a zone, each on its own field", () => {
    const errors = validateCreateUser({ ...valid, username: "12", phoneNumber: "123", email: "abc" }, { ...emptyGrantSelection, zoneManager: true });
    expect(Object.keys(errors).sort()).toEqual(["email", "grants", "phoneNumber", "username"]);
    expect(errors.phoneNumber).toMatch(/10 chữ số/);
  });
});
