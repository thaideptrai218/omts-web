import { z } from "zod";
export const banksSchema = z.array(z.object({ bin: z.string(), shortName: z.string(), name: z.string() }));
export const receivingAccountSchema = z.object({ account: z.object({ bankBin: z.string(), bankName: z.string(), accountNumber: z.string(), accountHolderName: z.string(), acceptedAt: z.iso.datetime({ offset: true }) }).nullable(), rowVersion: z.string().min(1) });
export const saveReceivingAccountSchema = z.strictObject({ bankBin: z.string().regex(/^\d{6}$/), accountNumber: z.string().trim().regex(/^[0-9A-Za-z]{1,19}$/), accountHolderName: z.string().trim().min(1).max(200), confirmAccount: z.boolean(), rowVersion: z.string().min(1) });
