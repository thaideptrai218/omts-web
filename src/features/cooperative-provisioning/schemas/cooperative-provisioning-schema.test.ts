import { describe, expect, it } from "vitest";
import {
  cooperativeProvisioningSchema,
  validateEvidenceImage,
} from "@/features/cooperative-provisioning/schemas/cooperative-provisioning-schema";

describe("cooperativeProvisioningSchema", () => {
  it("accepts the three required SCR-56 text fields", () => {
    const result = cooperativeProvisioningSchema.safeParse({
      cooperativeName: " HTX Trung Nam ",
      ownerIdentityContact: " Nguyễn Văn An - 0900000000 ",
      preliminaryCode: " TN-PRELIM ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        cooperativeName: "HTX Trung Nam",
        ownerIdentityContact: "Nguyễn Văn An - 0900000000",
        preliminaryCode: "TN-PRELIM",
      });
    }
  });

  it("reports every missing required text field", () => {
    const result = cooperativeProvisioningSchema.safeParse({
      cooperativeName: " ",
      ownerIdentityContact: "",
      preliminaryCode: " ",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual([
        "cooperativeName",
        "ownerIdentityContact",
        "preliminaryCode",
      ]);
    }
  });
});

describe("validateEvidenceImage", () => {
  it("accepts image MIME types without inventing a size or count limit", () => {
    const file = { type: "image/jpeg" } as File;

    expect(validateEvidenceImage(file)).toBeUndefined();
  });

  it("rejects a non-image file", () => {
    const file = { type: "application/pdf" } as File;

    expect(validateEvidenceImage(file)).toBe("Tệp đã chọn không phải là ảnh.");
  });
});
