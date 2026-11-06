import { describe, expect, it } from "vitest";
import { describeProfileContact } from "@/features/profile/lib/describe-profile-contact";

describe("contact presentation", () => {
  it.each([
    ["email", "Chưa thêm email"], ["phone", "Chưa thêm số điện thoại"],
  ] as const)("shows explicit absence for %s", (kind, value) => {
    expect(describeProfileContact(null, kind)).toEqual({
      value, isVerified: false, statusLabel: "Chưa thêm",
    });
  });

  it.each([true, false])("does not change the actual verified flag %s", (isVerified) => {
    expect(describeProfileContact({ value: "contact-value", isVerified }, "phone")).toEqual({
      value: "contact-value", isVerified,
      statusLabel: isVerified ? "Đã xác minh" : "Chưa xác minh",
    });
  });
});
