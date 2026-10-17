import type {
  CooperativeProvisioningField,
  ProvisionCooperativeInput,
  ProvisionCooperativeResult,
} from "@/features/cooperative-provisioning/domain/cooperative-provisioning";
import type { ProvisionedOwnerCredential } from "@/features/cooperative-provisioning/domain/provisioned-owner-credential";
import type { CooperativeProvisioningRepository } from "@/features/cooperative-provisioning/repositories/cooperative-provisioning-repository";

type MockCooperativeProvisioningOptions = Readonly<{
  credential?: ProvisionedOwnerCredential;
  hasExistingOwner?: boolean;
  isSessionActive?: () => boolean;
  latencyMs?: number;
  verifyEvidence?: (input: ProvisionCooperativeInput) => boolean;
}>;

const defaultCredential: ProvisionedOwnerCredential = {
  accountIdentifier: "owner.demo",
  temporaryPassword: "Omts#24001",
};

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function findInvalidField(
  input: ProvisionCooperativeInput,
): CooperativeProvisioningField | undefined {
  if (!input.cooperativeName.trim()) return "cooperativeName";
  if (!input.preliminaryCode.trim()) return "preliminaryCode";
  if (!input.ownerIdentityContact.trim()) return "ownerIdentityContact";
  if (
    input.evidenceImages.length === 0 ||
    input.evidenceImages.some((file) => !file.type.startsWith("image/"))
  ) {
    return "evidenceImages";
  }
  return undefined;
}

export function createMockCooperativeProvisioningRepository({
  credential = defaultCredential,
  hasExistingOwner = false,
  isSessionActive = () => true,
  latencyMs = 450,
  verifyEvidence = () => true,
}: MockCooperativeProvisioningOptions = {}): CooperativeProvisioningRepository {
  let ownerExists = hasExistingOwner;

  return {
    async provision(input): Promise<ProvisionCooperativeResult> {
      if (latencyMs > 0) await wait(latencyMs);

      if (!isSessionActive()) {
        return { message: { code: "MSG19" }, status: "session-expired" };
      }

      const invalidField = findInvalidField(input);
      if (invalidField) {
        return {
          field: invalidField,
          message: { code: "MSG01" },
          status: "invalid-input",
        };
      }

      if (!verifyEvidence(input)) {
        return {
          message: { code: "MSG55" },
          status: "verification-failed",
        };
      }

      if (ownerExists) {
        return {
          message: {
            code: "MSG03",
            params: { object_name: "Chủ hợp tác xã đầu tiên" },
          },
          status: "duplicate-owner",
        };
      }

      ownerExists = true;

      return {
        credential: { ...credential },
        status: "provisioned",
        summary: {
          cooperativeName: input.cooperativeName,
          preliminaryCode: input.preliminaryCode,
        },
      };
    },
  };
}
