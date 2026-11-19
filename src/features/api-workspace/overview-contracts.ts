import { z } from "zod";

/** Hình dạng JSON của GET api/dashboard (các trường tổng quan dùng cho màn Tổng quan); khớp OperationsDashboardDtos.cs của backend. */
const money = z.number(), whole = z.number().int().nonnegative();

const dayFigures = z.object({ date: z.iso.date(), invoiceCount: whole, revenue: money, returnCount: whole, returnValue: money, netRevenue: money });
export type DayFigures = z.infer<typeof dayFigures>;

export const dashboardSchema = z.object({
  zoneId: z.guid().nullable(),
  receivables: z.object({ receivables: money, owedBack: money }),
  openHarvestLots: z.object({ count: whole }),
  waterAlerts: z.object({ count: whole }),
  pendingTasks: z.object({ total: whole, groups: z.array(z.object({ kind: z.string(), count: whole })) }),
  today: dayFigures,
  yesterday: dayFigures,
  /** `overdueCount` và `dueSoonCount` luôn bằng 0 khi hợp tác xã chưa bật chính sách hạn nợ (`policyEnabled` = false). */
  dueDebts: z.object({ debtorCount: whole, overdueCount: whole, dueSoonCount: whole, policyEnabled: z.boolean(), maxDays: z.number().nullable() }),
});
export type Dashboard = z.infer<typeof dashboardSchema>;
