import { z } from "zod";
import { profileViewSchema } from "@/features/profile/api/profile-contract.schemas";
export const cooperativeViewSchema = z.object({ id: z.guid(), fullName: z.string(), taxCode: z.string(), officeAddress: z.string(),
  phoneNumber: z.string(), email: z.string().nullable(), website: z.string().nullable(), legalRepresentative: z.string(),
  businessLines: z.array(z.string()), status: z.string(), rowVersion: z.string().min(1) });
export const singletonDefinitions = {
  profile: { title: "Hồ sơ cá nhân", path: "/api/me/profile", fields: [["displayName", "Tên hiển thị"]], schema: profileViewSchema },
  cooperative: { title: "Hồ sơ hợp tác xã", path: "/api/cooperative/profile", fields: [["fullName", "Tên hợp tác xã"], ["taxCode", "Mã số thuế"],
    ["officeAddress", "Địa chỉ trụ sở"], ["phoneNumber", "Số điện thoại"], ["email", "Email"], ["website", "Website"], ["legalRepresentative", "Người đại diện pháp luật"]], schema: cooperativeViewSchema },
} as const;
export type SingletonKey = keyof typeof singletonDefinitions;
