import type {
  PersonalProfile,
  ProfileIdentifierKind,
  SavePersonalProfileResult,
  StartProfileIdentifierChangeResult,
} from "@/features/profile/domain/personal-profile";
import type { PersonalProfileRepository } from "@/features/profile/repositories/personal-profile-repository";
import type { VerificationToken } from "@/features/verification/domain/verification-types";
import { maskVerificationRecipient } from "@/features/verification/lib/mask-verification-recipient";
import type { VerificationService } from "@/features/verification/services/verification-service";
import { requireMockPersonalProfile } from "@/features/profile/mocks/personal-profile-fixtures";

export type ConsumeProfileProofInput = Readonly<{
  kind: ProfileIdentifierKind;
  token: VerificationToken;
  value: string;
}>;

type MockPersonalProfileOptions = Readonly<{
  consumeVerificationProof(input: ConsumeProfileProofInput): void;
  hasVerificationProof(input: ConsumeProfileProofInput): boolean;
  initialProfile?: PersonalProfile;
  isAmbiguousTraderPhone?: (value: string) => boolean;
  isSessionActive?: () => boolean;
  latencyMs?: number;
  takenEmails?: readonly string[];
  takenPhones?: readonly string[];
  verificationService: VerificationService;
}>;

const defaultProfile = requireMockPersonalProfile("account-owner-demo");

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function cloneProfile(profile: PersonalProfile): PersonalProfile {
  return {
    ...profile,
    email: profile.email ? { ...profile.email } : null,
    phone: { ...profile.phone },
    roles: profile.roles.map((role) => ({ ...role })),
  };
}

function getVerificationDetails(kind: ProfileIdentifierKind) {
  return kind === "email"
    ? ({ channel: "email", purpose: "email-change" } as const)
    : ({ channel: "sms", purpose: "phone-change" } as const);
}

export function createMockPersonalProfileRepository({
  consumeVerificationProof,
  hasVerificationProof,
  initialProfile = defaultProfile,
  isAmbiguousTraderPhone = () => false,
  isSessionActive = () => true,
  latencyMs = 350,
  takenEmails = ["used@omts.test"],
  takenPhones = ["0999999999"],
  verificationService,
}: MockPersonalProfileOptions): PersonalProfileRepository & {
  simulateExternalUpdate(displayName: string): void;
} {
  let profile = cloneProfile(initialProfile);
  let versionNumber = 1;
  let lastUpdatedBy = "một phiên đăng nhập khác";
  let lastUpdatedAt = "vừa xong";
  const unavailableEmails = new Set(takenEmails);
  const unavailablePhones = new Set(takenPhones);

  async function simulateLatency() {
    if (latencyMs > 0) await wait(latencyMs);
  }

  function identifierIsUnavailable(kind: ProfileIdentifierKind, value: string) {
    const currentValue = kind === "email" ? profile.email?.value : profile.phone.value;
    const unavailableValues = kind === "email" ? unavailableEmails : unavailablePhones;
    return value === currentValue || unavailableValues.has(value);
  }

  return {
    async load() {
      await simulateLatency();
      if (!isSessionActive()) {
        return { message: { code: "MSG19" }, status: "session-expired" };
      }

      return { profile: cloneProfile(profile), status: "loaded" };
    },

    async startIdentifierChange(input): Promise<StartProfileIdentifierChangeResult> {
      await simulateLatency();
      if (!isSessionActive()) {
        return { message: { code: "MSG19" }, status: "session-expired" };
      }

      const value = input.value.trim();
      if (!value || identifierIsUnavailable(input.kind, value)) {
        return {
          field: input.kind,
          message: { code: "MSG01" },
          status: "invalid-identifier",
        };
      }

      const verification = getVerificationDetails(input.kind);
      const result = await verificationService.start({
        purpose: verification.purpose,
        recipient: {
          channel: verification.channel,
          maskedValue: maskVerificationRecipient(verification.channel, value),
          value,
        },
      });

      if (result.status === "rejected") {
        return { message: { code: "MSG04" }, status: "delivery-failed" };
      }

      return {
        challenge: result.challenge,
        message:
          input.kind === "email"
            ? {
                code: "MSG62",
                params: { masked_email: result.challenge.recipient.maskedValue },
              }
            : undefined,
        status: "verification-started",
      };
    },

    async save(input): Promise<SavePersonalProfileResult> {
      await simulateLatency();
      if (!isSessionActive()) {
        return { message: { code: "MSG19" }, status: "session-expired" };
      }

      const displayName = input.displayName.trim();
      if (!displayName) {
        return {
          field: "displayName",
          message: { code: "MSG01" },
          status: "invalid-change",
        };
      }

      if (input.recordVersion !== profile.recordVersion) {
        return {
          message: {
            code: "MSG06",
            params: { time: lastUpdatedAt, user_name: lastUpdatedBy },
          },
          status: "conflict",
        };
      }

      const changes = [
        input.emailChange
          ? ({ kind: "email", ...input.emailChange } as const)
          : undefined,
        input.phoneChange
          ? ({ kind: "phone", ...input.phoneChange } as const)
          : undefined,
      ].filter((change) => change !== undefined);

      for (const change of changes) {
        if (identifierIsUnavailable(change.kind, change.value)) {
          return {
            field: change.kind,
            message: { code: "MSG01" },
            status: "invalid-change",
          };
        }

        if (!hasVerificationProof(change)) {
          return {
            field: change.kind,
            message: { code: "MSG16" },
            status: "invalid-change",
          };
        }
      }

      changes.forEach(consumeVerificationProof);

      versionNumber += 1;
      profile = {
        ...profile,
        displayName,
        email: input.emailChange
          ? { isVerified: true, value: input.emailChange.value }
          : profile.email,
        phone: input.phoneChange
          ? { isVerified: true, value: input.phoneChange.value }
          : profile.phone,
        recordVersion: `profile-v${versionNumber}`,
      };
      lastUpdatedBy = displayName;
      lastUpdatedAt = "vừa xong";

      return {
        message: {
          code: "MSG10",
          params: { object_name: "Hồ sơ cá nhân" },
        },
        notice:
          input.phoneChange && isAmbiguousTraderPhone(input.phoneChange.value)
            ? { code: "MSG57" }
            : undefined,
        profile: cloneProfile(profile),
        status: "saved",
      };
    },

    simulateExternalUpdate(displayName) {
      versionNumber += 1;
      profile = {
        ...profile,
        displayName,
        recordVersion: `profile-v${versionNumber}`,
      };
      lastUpdatedBy = "một phiên đăng nhập khác";
      lastUpdatedAt = "vừa xong";
    },
  };
}
