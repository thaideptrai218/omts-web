type LotStock = { onHand?: number | null };

/** A lot is used up only when its stock is known and not above zero; an unknown stock is left selectable. */
export const lotIsEmpty = (lot: LotStock) => lot.onHand != null && lot.onHand <= 0;

/** Lots with stock first (original order kept inside each group), used-up lots last, so the first choices are the ones that can be used. */
export function lotsWithStockFirst<T extends LotStock>(lots: readonly T[]): T[] {
  return [...lots.filter(lot => !lotIsEmpty(lot)), ...lots.filter(lotIsEmpty)];
}
