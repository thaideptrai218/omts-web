import { describe, expect, it } from "vitest";
import { cooperativeProfileSchema } from "@/features/cooperative-profile/schemas/cooperative-profile-schema";

const validForm = {
  bankAccountHolder: "Hợp tác xã Trung Nam",
  bankAccountNumber: "0123456789",
  bankId: "vcb",
  businessActivities: ["Nuôi trồng thủy sản"],
  cooperativeName: "Hợp tác xã Trung Nam",
  email: "contact@trungnam.vn",
  legalRepresentative: "Nguyễn Văn An",
  officeAddress: "Xã Hải Đông, tỉnh Quảng Ninh",
  phone: "02031234567",
  taxId: "5701234567",
  website: "https://trungnam.vn",
};

describe("cooperative profile schema", () => {
  it("accepts the complete SCR-07 form", () => {
    expect(cooperativeProfileSchema.safeParse(validForm).success).toBe(true);
  });

  it("allows optional email and website to be empty", () => {
    const result = cooperativeProfileSchema.safeParse({
      ...validForm,
      email: "",
      website: "",
    });

    expect(result.success).toBe(true);
  });

  it.each(["570123456", "57012345678", "5701234567-12"])(
    "rejects malformed tax id %s",
    (taxId) => {
      expect(
        cooperativeProfileSchema.safeParse({ ...validForm, taxId }).success,
      ).toBe(false);
    },
  );

  it("requires at least one non-empty business activity", () => {
    expect(
      cooperativeProfileSchema.safeParse({
        ...validForm,
        businessActivities: [],
      }).success,
    ).toBe(false);

    expect(
      cooperativeProfileSchema.safeParse({
        ...validForm,
        businessActivities: ["   "],
      }).success,
    ).toBe(false);
  });

  it("accepts only http or https websites", () => {
    expect(
      cooperativeProfileSchema.safeParse({
        ...validForm,
        website: "ftp://trungnam.vn",
      }).success,
    ).toBe(false);
  });
});
