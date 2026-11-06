import { z } from "zod";
export const cultivationLog = z.object({ id: z.guid(), cycleId: z.guid(), raftId: z.guid(), raftCode: z.string(), visitDate: z.string(), notes: z.string().nullable(), photos: z.array(z.object({ key: z.string(), sortOrder: z.number(), url: z.string() })), recordedByAccountId: z.guid(), recordedByName: z.string().nullable(), recordedAt: z.string(), canCorrect: z.boolean(), rowVersion: z.string() });
export type CultivationLog = z.infer<typeof cultivationLog>;
export const logInput = z.strictObject({ visitDate: z.iso.date(), notes: z.string().nullable(), keepPhotoKeys: z.array(z.string()).max(10).optional(), reason: z.string().optional() });
