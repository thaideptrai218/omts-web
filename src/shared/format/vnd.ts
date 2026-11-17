/**
 * The one display format for money: whole dong grouped with vi-VN dots, then the symbol: "1.250.000 ₫".
 * Use `formatVndWithSymbol` for any amount shown to a person; `formatVnd` only where the unit is already
 * visible (input boxes with a ₫ suffix, table columns headed "₫").
 */
export const MONEY_SYMBOL = "₫";

export const groupDigits = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
/** 1250000 -> "1.250.000" (no symbol). */
export const formatVnd = (value: number) => groupDigits(String(Math.round(value)));
/** 1250000 -> "1.250.000 ₫". */
export const formatVndWithSymbol = (value: number) => `${formatVnd(value)} ${MONEY_SYMBOL}`;
