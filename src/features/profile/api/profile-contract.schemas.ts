import { z } from "zod";
import {
  apiIdSchema,
  apiTextSchema,
  subjectTypeSchema,
} from "@/features/auth/api/auth-contract.schemas";

const profileGrantSchema = z.object({
  role: apiTextSchema,
  zoneId: apiIdSchema.nullable(),
  zoneName: z.string().nullable(),
  allZones: z.boolean(),
});

export const profileViewSchema = z.object({
  accountId: apiIdSchema,
  username: apiTextSchema,
  displayName: apiTextSchema,
  subjectType: subjectTypeSchema,
  email: z.string().nullable(),
  emailVerified: z.boolean(),
  phoneNumber: z.string().nullable(),
  phoneVerified: z.boolean(),
  grants: z.array(profileGrantSchema),
  rowVersion: apiTextSchema,
});

// Only the display-name endpoint, not contact changes or a shared Save action.
export const updateProfileRequestSchema = z.strictObject({
  displayName: apiTextSchema.max(200),
  rowVersion: apiTextSchema,
});

// Controller response differs from its ProfileView Swagger annotation.
export const profileUpdatedSchema = z.object({
  profile: profileViewSchema,
  message: z.string(),
});

export type ProfileViewDto = z.infer<typeof profileViewSchema>;
export type ProfileUpdatedDto = z.infer<typeof profileUpdatedSchema>;
