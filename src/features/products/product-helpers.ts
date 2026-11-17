import { foldVietnamese } from "@/shared/presentation/fold-text";
import type { ProductRow, ProductUnit, ProductView } from "./contracts";

/** Pure parts of the product screens: unit conversion, the form's values and the body of a save. The base unit of a product is always kg. */

export const baseUnitOf = (units: readonly ProductUnit[]) => units.find((unit) => unit.isBase) ?? units[0];
/** The unit of a row picked on the list (the base unit when none is picked). */
export const chosenUnit = (row: Pick<ProductRow, "units">, unitId: string | undefined) => row.units.find((unit) => unit.id === unitId) ?? baseUnitOf(row.units);
/** A quantity in kg shown in a unit that is `factor` kg; a price per kg becomes the price of one such unit. */
export const inUnitQuantity = (kg: number | null | undefined, factor: number) => kg == null ? null : kg / factor;
/** The price of one unit of a row: the stored price of the unit, else the kg price × the factor. */
export const unitSalePrice = (price: number | null | undefined, unit: ProductUnit) => price == null ? null : unit.salePrice ?? price * unit.factor;
export const inUnitPrice = (price: number | null | undefined, factor: number) => price == null ? null : price * factor;
/** The "Lồng" unit of a product (the harvest form counts in cages), looked up by name without diacritics. */
export const cageUnitOf = (units: readonly ProductUnit[]) => units.find((unit) => !unit.isBase && foldVietnamese(unit.name).toLowerCase() === "long");

export const signed = (value: number, format: (value: number) => string) => value > 0 ? `+${format(value)}` : value < 0 ? `−${format(-value)}` : format(0);

export const movementKindLabel: Record<string, string> = { Harvest: "Thu hoạch", Sale: "Bán hàng", Disposal: "Xuất hủy", Return: "Trả hàng", Reversal: "Điều chỉnh" };
/** The list or screen that opens on the document of a movement, searched by its code. */
export function movementHref(documentKind: string, code: string | null | undefined) {
  if (!code) return undefined;
  const target = documentKind === "HarvestLot" ? "/operations/lot-tracing" : documentKind === "SalesInvoice" ? "/operations/sales-invoice-list" : documentKind === "ProductDisposal" ? "/sales/disposals" : undefined;
  return target ? `${target}?code=${encodeURIComponent(code)}` : undefined;
}
export const productHref = (code: string) => `/sales/products?code=${encodeURIComponent(code)}`;
export const lotHref = (code: string) => `/operations/lot-tracing?code=${encodeURIComponent(code)}`;

/** Default code of a unit: the product code, a dash and the first letter of the unit name without diacritics. */
export function suggestUnitCode(productCode: string, unitName: string) {
  const letter = foldVietnamese(unitName).replace(/[^a-z0-9]/g, "").slice(0, 1).toUpperCase();
  return productCode && letter ? `${productCode}-${letter}` : "";
}

/** One extra unit row of the form; kg is the base and is not a row. */
/** `salePrice` is the price typed for the unit; null means "factor × the kg price", which a new unit follows until a price is typed. */
export type UnitDraft = { key: string; id: string | null; unitId: string; factor: string; code: string; salePrice: number | null };
export type FormValues = {
  code: string; name: string; categoryId: string; unitPrice: number; minKg: string; maxKg: string; description: string; note: string; units: UnitDraft[];
};
export const MAX_PHOTOS = 5;

const text = (value: number | null | undefined) => value == null ? "" : String(value);
let counter = 0;
export const newKey = () => `unit-${++counter}`;
export const blankUnit = (): UnitDraft => ({ key: newKey(), id: null, unitId: "", factor: "", code: "", salePrice: null });
/** The price a unit gets when none is typed: factor × the kg price, whole VND, at least 1 (the rule of the API). */
export function defaultUnitPrice(factor: number | null, unitPrice: number) {
  return factor && Number.isFinite(factor) && unitPrice > 0 ? Math.max(1, Math.round(factor * unitPrice)) : null;
}

/** The form's starting values; a copy starts from the record without its code, photos or unit codes. */
export function initialValues(record: ProductView | null, copy: boolean): FormValues {
  const units: UnitDraft[] = (record?.units ?? []).filter((unit) => !unit.isBase).map((unit) => ({ key: newKey(), id: copy ? null : unit.id, unitId: unit.unitId, factor: String(unit.factor), code: copy ? "" : unit.code, salePrice: unit.salePrice ?? null }));
  return {
    code: record && !copy ? record.code : "", name: record ? (copy ? `${record.name} (bản sao)` : record.name) : "", categoryId: record?.categoryId ?? "", unitPrice: record?.unitPrice ?? 0,
    minKg: text(record?.minKg), maxKg: text(record?.maxKg), description: record?.description ?? "", note: record?.note ?? "", units,
  };
}

/** Empty text is "no value"; anything that is not a number is NaN so validation can name the field. */
export function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed.replace(",", "."));
}
const decimals = (value: number) => { const part = String(value).split(".")[1]; return part ? part.length : 0; };
const invalid = (value: number | null) => value !== null && !Number.isFinite(value);
const codePattern = /^[A-Za-z0-9_.-]{1,30}$/;

/** The first thing wrong with the form, in the user's words; undefined when it can be sent. */
export function validateForm(values: FormValues): string | undefined {
  if (!values.name.trim()) return "Nhập tên sản phẩm.";
  if (values.code && !codePattern.test(values.code)) return "Mã sản phẩm chỉ gồm chữ, số, dấu chấm, gạch ngang và gạch dưới, tối đa 30 ký tự.";
  if (!Number.isInteger(values.unitPrice) || values.unitPrice <= 0) return "Nhập giá bán theo kg lớn hơn 0.";
  const min = parseNumber(values.minKg), max = parseNumber(values.maxKg);
  if ([min, max].some(invalid) || [min, max].some((value) => value !== null && value < 0)) return "Định mức phải là số không âm.";
  if ([min, max].some((value) => value !== null && decimals(value) > 3)) return "Định mức tối đa 3 chữ số thập phân.";
  if (min !== null && max !== null && max < min) return "Định mức tối đa phải lớn hơn hoặc bằng định mức tối thiểu.";
  const seen = new Set<string>();
  for (const unit of values.units) {
    if (!unit.unitId) return "Chọn đơn vị cho mỗi dòng đơn vị tính.";
    if (seen.has(unit.unitId)) return "Mỗi đơn vị chỉ xuất hiện một lần trong một sản phẩm.";
    seen.add(unit.unitId);
    if (unit.code && !codePattern.test(unit.code)) return "Mã đơn vị chỉ gồm chữ, số, dấu chấm, gạch ngang và gạch dưới, tối đa 30 ký tự.";
    if (unit.salePrice !== null && (!Number.isInteger(unit.salePrice) || unit.salePrice <= 0)) return "Giá bán của đơn vị phải lớn hơn 0.";
    const factor = parseNumber(unit.factor);
    if (factor === null || !Number.isFinite(factor) || factor <= 0 || factor > 1_000_000 || decimals(factor) > 3) return "Quy đổi phải là số kg lớn hơn 0, tối đa 3 chữ số thập phân.";
  }
  return undefined;
}

/** The body of a save. An update replaces every field, so each one is sent; the unit list replaces the units. */
export function buildSaveBody(values: FormValues, record: ProductView | null): Record<string, unknown> {
  const blank = (value: string) => value.trim() || null;
  return {
    code: blank(values.code), name: values.name.trim(), unitPrice: values.unitPrice, categoryId: values.categoryId || null, description: blank(values.description), note: blank(values.note),
    minKg: parseNumber(values.minKg), maxKg: parseNumber(values.maxKg),
    units: values.units.map((unit) => ({ id: unit.id, unitId: unit.unitId, factor: parseNumber(unit.factor), code: blank(unit.code), salePrice: unit.salePrice ?? defaultUnitPrice(parseNumber(unit.factor), values.unitPrice) })),
    ...(record ? { rowVersion: record.rowVersion } : {}),
  };
}
