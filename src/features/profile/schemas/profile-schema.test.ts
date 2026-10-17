import { describe, expect, it } from "vitest";
import {
  createProfileIdentifierCandidateSchema,
  profileDetailsSchema,
} from "@/features/profile/schemas/profile-schema";

describe("profileDetailsSchema", () => {
  it("trims and accepts a display name", () => {
    expect(profileDetailsSchema.parse({ displayName: "  Nguyễn An  " })).toEqual({
      displayName: "Nguyễn An",
    });
  });

  it("rejects an empty display name", () => {
    expect(profileDetailsSchema.safeParse({ displayName: "   " }).success).toBe(
      false,
    );
  });
});

describe("profile identifier candidate schema", () => {
  it("rejects the current email and an invalid email", () => {
    const schema = createProfileIdentifierCandidateSchema({
      currentValue: "owner@omts.test",
      isValidPhoneNumber: () => true,
      kind: "email",
    });

    expect(schema.safeParse({ value: "owner@omts.test" }).success).toBe(false);
    expect(schema.safeParse({ value: "not-an-email" }).success).toBe(false);
    expect(schema.safeParse({ value: "new@omts.test" }).success).toBe(true);
  });

  it("delegates phone syntax to the injected validator", () => {
    const schema = createProfileIdentifierCandidateSchema({
      currentValue: "0900000000",
      isValidPhoneNumber: (value) => value === "+84911111111",
      kind: "phone",
    });

    expect(schema.safeParse({ value: "0911111111" }).success).toBe(false);
    expect(schema.safeParse({ value: "+84911111111" }).success).toBe(true);
  });
});
