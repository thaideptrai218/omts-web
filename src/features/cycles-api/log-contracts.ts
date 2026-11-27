import { z } from "zod";
/** What a care log is about; OTHER is the default. */
export const logTypes = [["FEEDING", "Cho ăn"], ["CLEANING", "Vệ sinh bè/lồng"], ["INSPECTION", "Kiểm tra"], ["DISEASE", "Phòng/trị bệnh"], ["REPAIR", "Sửa chữa"], ["OTHER", "Khác"]] as const;
export type LogType = typeof logTypes[number][0];
export const DEFAULT_LOG_TYPE: LogType = "OTHER";
/** The Vietnamese name of a log type; a log from a backend without the field (or an unknown code) reads "Khác". */
export const logTypeLabel = (code?: string | null) => logTypes.find(([value]) => value === code)?.[1] ?? "Khác";
export const cultivationLog = z.object({ id: z.guid(), cycleId: z.guid(), raftId: z.guid(), raftCode: z.string(), visitDate: z.string(), logType: z.string().nullish(), zoneId: z.string().nullish(), zoneCode: z.string().nullish(), zoneName: z.string().nullish(), notes: z.string().nullable(), photos: z.array(z.object({ key: z.string(), sortOrder: z.number(), url: z.string() })), recordedByAccountId: z.guid(), recordedByName: z.string().nullable(), recordedAt: z.string(), canCorrect: z.boolean(), rowVersion: z.string() });
export type CultivationLog = z.infer<typeof cultivationLog>;
export const logInput = z.strictObject({ visitDate: z.iso.date(), logType: z.enum(logTypes.map(([code]) => code)).optional(), notes: z.string().nullable(), keepPhotoKeys: z.array(z.string()).max(10).optional(), reason: z.string().optional() });
