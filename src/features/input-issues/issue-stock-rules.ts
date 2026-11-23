/** What the issue form knows about one line, in the shape the stock rules need. Quantities on hand are counted in the item's base unit. */
export type StockLine = {
  name: string; seed: boolean; quantity: number | null; unitFactor: number; unitName: string; onHand: number | null;
  /** Seed lines only: the chosen lot's stock (undefined while no lot is chosen) and the stock that has no lot. */
  lotOnHand?: number | null; unlotted?: number | null;
};

const fmt = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 3 });

/**
 * Why an item cannot be picked at all: nothing is left. Stock is only known for items the catalogue counted; the cooperative may allow
 * stock to go negative, which is the one case where an empty item is still usable. An unknown setting (staff may not read it) counts as "not allowed",
 * which is what the API enforces when it answers an empty item with a 400.
 */
export function outOfStockReason(onHand: number | null | undefined, allowNegative: boolean | undefined): string | undefined {
  return onHand != null && onHand <= 0 && allowNegative !== true ? "Hết hàng trong kho" : undefined;
}

/** One sentence per line that asks for more than is left, before the form is sent; empty when stock may go negative. */
export function stockProblems(lines: readonly StockLine[], allowNegative: boolean | undefined): string[] {
  if (allowNegative === true) return [];
  const found: string[] = [];
  lines.forEach((line, index) => {
    const available = line.seed ? (line.lotOnHand !== undefined ? line.lotOnHand : line.unlotted ?? line.onHand) : line.onHand;
    if (available == null || line.quantity == null) return;
    const where = `Dòng ${index + 1} (${line.name})`;
    if (available <= 0) found.push(`${where}: ${line.seed ? "lô giống đã chọn không còn giống, hãy chọn lô khác" : "hết hàng trong kho, hãy bỏ dòng này"}.`);
    else if (line.quantity * line.unitFactor > available) found.push(`${where}: số lượng vượt tồn kho (còn ${fmt(available / line.unitFactor)} ${line.unitName}).`);
  });
  return found;
}

/** True when the backend named the lines (or one of them) as the failed part of the save. */
export const failedOnLines = (names: readonly string[] | undefined) => !!names?.some(name => /^Lines?\b/.test(name));
