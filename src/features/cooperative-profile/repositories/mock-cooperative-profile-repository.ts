import type {
  BankOption,
  CooperativeProfile,
  CooperativeProfileField,
  SaveCooperativeProfileInput,
} from "@/features/cooperative-profile/domain/cooperative-profile";
import type { CooperativeProfileRepository } from "@/features/cooperative-profile/repositories/cooperative-profile-repository";
import { cooperativeProfileSchema } from "@/features/cooperative-profile/schemas/cooperative-profile-schema";

type MockCooperativeProfileOptions = Readonly<{
  banks: readonly BankOption[];
  duplicateTaxIds?: readonly string[];
  initialProfile: CooperativeProfile;
  isAuthorized?: boolean;
  isSessionExpired?: boolean;
  latencyMs?: number;
}>;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function cloneProfile(profile: CooperativeProfile): CooperativeProfile {
  return {
    ...profile,
    businessActivities: [...profile.businessActivities],
    receivingBankAccount: { ...profile.receivingBankAccount },
  };
}

function toProfileField(path: PropertyKey | undefined): CooperativeProfileField {
  if (path === "receivingBankAccount") return "bankId";

  const knownFields: readonly CooperativeProfileField[] = [
    "bankAccountHolder",
    "bankAccountNumber",
    "bankId",
    "businessActivities",
    "cooperativeName",
    "email",
    "legalRepresentative",
    "officeAddress",
    "phone",
    "taxId",
    "website",
  ];

  return knownFields.includes(path as CooperativeProfileField)
    ? (path as CooperativeProfileField)
    : "cooperativeName";
}

export function createMockCooperativeProfileRepository({
  banks,
  duplicateTaxIds = [],
  initialProfile,
  isAuthorized = true,
  isSessionExpired = false,
  latencyMs = 350,
}: MockCooperativeProfileOptions): CooperativeProfileRepository {
  let currentProfile = cloneProfile(initialProfile);
  let version = Number(initialProfile.recordVersion.replace(/\D/g, "")) || 1;
  const knownDuplicateTaxIds = new Set(duplicateTaxIds);

  async function prepareRequest() {
    if (latencyMs > 0) await wait(latencyMs);

    if (isSessionExpired) {
      return {
        message: { code: "MSG19" },
        status: "session-expired",
      } as const;
    }

    if (!isAuthorized) {
      return {
        message: { code: "MSG02" },
        status: "forbidden",
      } as const;
    }
  }

  return {
    async load() {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;

      return {
        banks: banks.map((bank) => ({ ...bank })),
        profile: cloneProfile(currentProfile),
        status: "loaded",
      };
    },

    async save(input: SaveCooperativeProfileInput) {
      const earlyResult = await prepareRequest();
      if (earlyResult) return earlyResult;

      const validation = cooperativeProfileSchema.safeParse({
        bankAccountHolder: input.receivingBankAccount.accountHolder,
        bankAccountNumber: input.receivingBankAccount.accountNumber,
        bankId: input.receivingBankAccount.bankId,
        businessActivities: input.businessActivities,
        cooperativeName: input.cooperativeName,
        email: input.email ?? "",
        legalRepresentative: input.legalRepresentative,
        officeAddress: input.officeAddress,
        phone: input.phone,
        taxId: input.taxId,
        website: input.website ?? "",
      });

      if (!validation.success) {
        return {
          field: toProfileField(validation.error.issues[0]?.path[0]),
          message: { code: "MSG01" },
          status: "invalid-input",
        };
      }

      if (!banks.some((bank) => bank.id === input.receivingBankAccount.bankId)) {
        return {
          field: "bankId",
          message: { code: "MSG01" },
          status: "invalid-input",
        };
      }

      if (input.recordVersion !== currentProfile.recordVersion) {
        return {
          message: {
            code: "MSG06",
            params: { time: "vừa xong", user_name: "một người dùng khác" },
          },
          status: "conflict",
        };
      }

      if (
        input.taxId !== currentProfile.taxId &&
        knownDuplicateTaxIds.has(input.taxId)
      ) {
        return {
          field: "taxId",
          message: {
            code: "MSG03",
            params: { object_name: "Mã số thuế" },
          },
          status: "duplicate-tax-id",
        };
      }

      version += 1;
      currentProfile = {
        ...input,
        businessActivities: [...input.businessActivities],
        email: input.email ?? null,
        receivingBankAccount: { ...input.receivingBankAccount },
        recordVersion: `cooperative-v${version}`,
        status: "completed",
        website: input.website ?? null,
      };

      return {
        message: {
          code: "MSG10",
          params: { object_name: "Hồ sơ hợp tác xã" },
        },
        profile: cloneProfile(currentProfile),
        publicProjection: {
          cooperativeName: currentProfile.cooperativeName,
          officeAddress: currentProfile.officeAddress,
        },
        status: "saved",
      };
    },
  };
}
