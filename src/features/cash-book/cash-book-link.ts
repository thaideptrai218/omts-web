import { allTime, presetValue, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import type { CashFund } from "./contracts";

/**
 * Where the cash book starts. A link from another screen (`?search=TT000012`) lands on that voucher code across every fund and the whole time,
 * otherwise the book opens on the cash fund of this month.
 */
export function cashBookStart(params: { get(name: string): string | null } | null | undefined): { fund: CashFund | "All"; time: TimeRangeValue; search: string } {
  const search = (params?.get("search") ?? "").trim().slice(0, 100);
  return search ? { fund: "All", time: allTime, search } : { fund: "Cash", time: presetValue("thisMonth"), search: "" };
}
