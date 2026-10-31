import { profileViewSchema } from "@/features/profile/api/profile-contract.schemas";
import type { PersonalProfile } from "@/features/profile/domain/personal-profile";

export type ProfileMappingResult =
  | Readonly<{ status: "mapped"; profile: PersonalProfile }>
  | Readonly<{ status: "invalid-profile" | "account-mismatch" }>;

export function mapProfileResponse(input: unknown, expectedAccountId: string): ProfileMappingResult {
  const parsed = profileViewSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid-profile" };
  const dto = parsed.data;
  if (dto.accountId.toLowerCase() !== expectedAccountId.toLowerCase()) {
    return { status: "account-mismatch" };
  }

  const contacts = [
    { value: dto.email, verified: dto.emailVerified },
    { value: dto.phoneNumber, verified: dto.phoneVerified },
  ];
  const invalidContact = contacts.some(({ value, verified }) =>
    value === null ? verified : !value.trim(),
  );
  const invalidGrant = dto.grants.some((grant) => grant.allZones !== (grant.zoneId === null));
  if (invalidContact || invalidGrant) return { status: "invalid-profile" };

  return {
    status: "mapped",
    profile: {
      accountId: dto.accountId,
      username: dto.username,
      displayName: dto.displayName,
      email: dto.email === null ? null : { value: dto.email, isVerified: dto.emailVerified },
      phone: dto.phoneNumber === null ? null : { value: dto.phoneNumber, isVerified: dto.phoneVerified },
      recordVersion: dto.rowVersion,
      roles: dto.grants.map((grant) => ({
        roleLabel: grant.role,
        zoneId: grant.zoneId,
        scopeLabel: grant.allZones ? "Toàn bộ vùng nuôi" : grant.zoneName?.trim() || "Vùng chưa có tên",
      })),
    },
  };
}
