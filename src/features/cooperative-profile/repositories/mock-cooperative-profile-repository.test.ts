import { describe, expect, it } from "vitest";
import type {
  BankOption,
  CooperativeProfile,
  SaveCooperativeProfileInput,
} from "@/features/cooperative-profile/domain/cooperative-profile";
import { createMockCooperativeProfileRepository } from "@/features/cooperative-profile/repositories/mock-cooperative-profile-repository";

const banks: readonly BankOption[] = [
  { id: "vcb", name: "Ngân hàng TMCP Ngoại thương Việt Nam", shortName: "Vietcombank" },
];

const initialProfile: CooperativeProfile = {
  businessActivities: [],
  cooperativeName: "Hợp tác xã Trung Nam",
  email: null,
  legalRepresentative: "",
  officeAddress: "",
  phone: "",
  receivingBankAccount: { accountHolder: "", accountNumber: "", bankId: "" },
  recordVersion: "cooperative-v1",
  status: "preliminary",
  taxId: "",
  website: null,
};

const validInput: SaveCooperativeProfileInput = {
  businessActivities: ["Nuôi trồng thủy sản"],
  cooperativeName: "Hợp tác xã Trung Nam",
  email: "contact@trungnam.vn",
  legalRepresentative: "Nguyễn Văn An",
  officeAddress: "Xã Hải Đông, tỉnh Quảng Ninh",
  phone: "02031234567",
  receivingBankAccount: {
    accountHolder: "Hợp tác xã Trung Nam",
    accountNumber: "0123456789",
    bankId: "vcb",
  },
  recordVersion: "cooperative-v1",
  taxId: "5701234567",
  website: "https://trungnam.vn",
};

function createRepository(
  options: Partial<Parameters<typeof createMockCooperativeProfileRepository>[0]> = {},
) {
  return createMockCooperativeProfileRepository({
    banks,
    initialProfile,
    latencyMs: 0,
    ...options,
  });
}

describe("mock cooperative profile repository", () => {
  it("completes a preliminary profile and returns only the public projection", async () => {
    const result = await createRepository().save(validInput);

    expect(result.status).toBe("saved");
    if (result.status !== "saved") return;

    expect(result.profile.status).toBe("completed");
    expect(result.publicProjection).toEqual({
      cooperativeName: validInput.cooperativeName,
      officeAddress: validInput.officeAddress,
    });
    expect(result.publicProjection).not.toHaveProperty("receivingBankAccount");
    expect(result.publicProjection).not.toHaveProperty("taxId");
  });

  it("denies load and save outside the Owner boundary", async () => {
    const repository = createRepository({ isAuthorized: false });

    await expect(repository.load()).resolves.toMatchObject({
      message: { code: "MSG02" },
      status: "forbidden",
    });
    await expect(repository.save(validInput)).resolves.toMatchObject({
      message: { code: "MSG02" },
      status: "forbidden",
    });
  });

  it("rejects an unknown bank option", async () => {
    const result = await createRepository().save({
      ...validInput,
      receivingBankAccount: {
        ...validInput.receivingBankAccount,
        bankId: "unknown-bank",
      },
    });

    expect(result).toMatchObject({ field: "bankId", status: "invalid-input" });
  });

  it("returns MSG03 for a tax id used by another cooperative", async () => {
    const result = await createRepository({
      duplicateTaxIds: [validInput.taxId],
    }).save(validInput);

    expect(result).toMatchObject({
      field: "taxId",
      message: { code: "MSG03" },
      status: "duplicate-tax-id",
    });
  });

  it("does not overwrite a newer record version", async () => {
    const result = await createRepository().save({
      ...validInput,
      recordVersion: "cooperative-stale",
    });

    expect(result).toMatchObject({
      message: { code: "MSG06" },
      status: "conflict",
    });
  });

  it("does not mutate state when input is invalid", async () => {
    const repository = createRepository();
    const result = await repository.save({
      ...validInput,
      businessActivities: [],
    });
    const loaded = await repository.load();

    expect(result).toMatchObject({
      field: "businessActivities",
      status: "invalid-input",
    });
    expect(loaded.status === "loaded" && loaded.profile.status).toBe("preliminary");
  });
});
