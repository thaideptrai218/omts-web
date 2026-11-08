import { z } from "zod";
export const adminAccount = z.object({ id: z.guid(), username: z.string(), displayName: z.string(), subjectType: z.enum(["SystemAdministrator", "CooperativeOwner", "Staff", "Trader"]), statusId: z.number().int(), phoneNumber: z.string().nullable(), email: z.string().nullable(), createdAt: z.string(), lastLoginAt: z.string().nullable(), mustChangePassword: z.boolean(), rowVersion: z.string().min(1) });
export const adminPage = z.object({ items: z.array(adminAccount), page: z.number(), pageSize: z.literal(20), total: z.number() });
export const adminActivity = z.array(z.object({ id: z.guid(), recordCode: z.string().nullable(), action: z.string(), reason: z.string().nullable(), occurredAt: z.string(), actorAccountId: z.guid().nullable(), actorName: z.string().nullable().optional() }));
export const adminStatusChange = z.strictObject({ id: z.guid(), action: z.enum(["lock", "unlock"]), reason: z.string().trim().min(1).max(1000), rowVersion: z.string().min(1) });
