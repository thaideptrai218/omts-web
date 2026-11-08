import { z } from "zod";
export const cultivationLog = z.object({ id: z.guid(), cycleId: z.guid(), raftId: z.guid(), raftCode: z.string(), visitDate: z.iso.date(), notes: z.string().nullable(), photos: z.array(z.object({ key: z.string(), sortOrder: z.number(), url: z.string() })), recordedByName: z.string().nullable(), recordedAt: z.string(), canCorrect: z.boolean(), rowVersion: z.string() });
export const logValues = z.strictObject({ visitDate: z.iso.date(), notes: z.string().trim().max(2000).nullable() });
export const logCorrection = logValues.extend({ keepPhotoKeys: z.array(z.string().min(1)).max(10), reason: z.string().trim().min(1).max(1000) });
