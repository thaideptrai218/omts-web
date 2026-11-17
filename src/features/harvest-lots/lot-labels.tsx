"use client";
import { StatusPill } from "@/components/ui/management-page";
import { LOT } from "./contracts";

export const LOTS_PATH = "/farming/harvest-lots";
/** A lot is opened in its list by its code: names and ids do not belong in an address. */
export const lotsHref = (code: string) => `${LOTS_PATH}?code=${encodeURIComponent(code)}`;

/** The lot statuses by id (2904 is new: a lot waits for its weighing and is not for sale until then). */
export const lotStatusLabel: Record<number, string> = { [LOT.awaitingWeighing]: "Chờ cân", [LOT.open]: "Đang mở", [LOT.reopened]: "Mở lại", [LOT.closed]: "Đã đóng" };
/** The statuses by the name the API also sends, in either casing. */
const statusNames: Record<string, number> = { awaitingweighing: LOT.awaitingWeighing, open: LOT.open, reopened: LOT.reopened, closed: LOT.closed };
export const lotStatusIdOf = (status: string | undefined) => status ? statusNames[status.toLowerCase()] : undefined;
/** Label of a status given by id, or by name when the id is not known. */
export const lotStatusText = (statusId: number | undefined, status?: string) => lotStatusLabel[statusId ?? lotStatusIdOf(status) ?? 0] ?? status ?? "Không xác định";
export const closeReasonLabel: Record<string, string> = { SoldWholeLot: "Bán hết lô", Unsold: "Không bán hết", Spoiled: "Hư hỏng", TimeLimitReached: "Hết hạn" };
export const movementKindLabel: Record<string, string> = { Harvest: "Thu hoạch", Sale: "Bán", Disposal: "Xuất hủy", Return: "Trả hàng", Reversal: "Đảo bút toán", LotClose: "Đóng lô" };

/** A lot is for sale only while it is open or reopened. */
export const forSale = (statusId: number) => statusId === LOT.open || statusId === LOT.reopened;

export function LotStatus({ statusId, status }: { statusId: number | undefined; status?: string }) {
  const id = statusId ?? lotStatusIdOf(status);
  return <StatusPill tone={id === LOT.open || id === LOT.reopened ? "success" : "neutral"}>{lotStatusText(statusId, status)}</StatusPill>;
}
