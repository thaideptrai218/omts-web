import type {
  ProfileContact,
  ProfileIdentifierKind,
} from "@/features/profile/domain/personal-profile";

export function describeProfileContact(contact: ProfileContact | null, kind: ProfileIdentifierKind) {
  return {
    isVerified: contact?.isVerified ?? false,
    statusLabel: !contact ? "Chưa thêm" : contact.isVerified ? "Đã xác minh" : "Chưa xác minh",
    value: contact?.value ?? (kind === "email" ? "Chưa thêm email" : "Chưa thêm số điện thoại"),
  };
}
