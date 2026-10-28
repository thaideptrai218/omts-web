import { z } from "zod";
import { functionActions } from "@/features/access/domain/function-permission";
import {
  apiIdSchema,
  apiTextSchema,
  subjectTypeSchema,
} from "@/features/auth/api/auth-contract.schemas";

const permissionActionSchema = z.enum(functionActions);
// Stored RolePermission.OtherPermissions is case-insensitive in the backend
// and the live demo returns EXPORT/PUBLISH; function summaries use Export/Publish.
const storedPermissionActionSchema = z.union([permissionActionSchema,
  z.enum(["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT", "IMPORT", "APPROVE", "PUBLISH"]),
]).transform((value) => functionActions.find((action) => action.toUpperCase() === value.toUpperCase())!);

const grantedPermissionSchema = z.object({
  functionCode: apiTextSchema,
  canView: z.boolean(),
  canCreate: z.boolean(),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
  otherPermissions: z.array(storedPermissionActionSchema),
  dataScope: z.enum(["OwnRecords", "AssignedZone"]),
});

const permissionGrantSchema = z.object({
  zoneId: apiIdSchema.nullable(),
  zoneCode: z.string().nullable(),
  zoneName: z.string().nullable(),
  allZones: z.boolean(),
  role: apiTextSchema,
  permissions: z.array(grantedPermissionSchema),
});

const functionAccessSchema = z.object({
  function: apiTextSchema,
  name: apiTextSchema,
  allZones: z.boolean(),
  zoneIds: z.array(apiIdSchema),
  actions: z.array(permissionActionSchema),
});

// Parsing these DTOs does not grant access. Action/zone mapping is a later task.
export const myPermissionsSchema = z.object({
  accountId: apiIdSchema,
  subjectType: subjectTypeSchema,
  isCooperativeOwner: z.boolean(),
  requiresPasswordChange: z.boolean(),
  requiresPhoneVerification: z.boolean(),
  functions: z.array(functionAccessSchema),
  grants: z.array(permissionGrantSchema),
});

export type MyPermissionsDto = z.infer<typeof myPermissionsSchema>;
