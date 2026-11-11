import { foldVietnamese } from "@/shared/presentation/fold-text";
import type { InputGroup, ItemRow, ItemView, UnitView } from "./contracts";

/** Pure parts of the catalogue screens: unit conversion, the form's values and the body of a save. */

export const baseUnitOf = (units: readonly UnitView[]) => units.find((unit) => unit.isBase) ?? units[0];
/** What one row shows in the unit picked for it: quantities divide by the factor, prices multiply by it. */
export const inUnitQuantity = (base: number | null | undefined, factor: number) => base == null ? null : base / factor;
export const inUnitPrice = (price: number | null | undefined, factor: number) => price == null ? null : price * factor;
export const chosenUnit = (row: Pick<ItemRow, "units">, unitId: string | undefined) => row.units.find((unit) => unit.id === unitId) ?? baseUnitOf(row.units);

export type GroupNode = InputGroup & { depth: 0 | 1 };
/** The item groups in tree order: each top-level group (by its order) followed by its child groups; a child whose parent is missing counts as top-level. */
export function groupTree(groups: readonly InputGroup[]): GroupNode[] {
  const roots = groups.filter((group) => !group.parentId || !groups.some((parent) => parent.id === group.parentId));
  return roots.flatMap((root) => [{ ...root, depth: 0 as const }, ...groups.filter((child) => child.parentId === root.id).map((child) => ({ ...child, depth: 1 as const }))]);
}
/** The name of a group in a picker: a child is indented under its parent. */
export const groupLabel = (group: GroupNode) => group.depth ? ` └ ${group.name}` : group.name;

export const signed =(value: number, format: (value: number) => string) => value > 0 ? `+${format(value)}` : value < 0 ? `−${format(-value)}` : format(0);

export const movementKindLabel: Record<string, string> = {
  Opening: "Còn lại ban đầu", Receipt: "Nhập hàng", PurchaseReturn: "Trả hàng nhập", Issue: "Xuất dùng", Disposal: "Xuất hủy", Reversal: "Điều chỉnh",
};
/** The list that opens on the document of a movement, searched by its code; the opening row and corrections have no document to open. */
export function movementHref(kind: string, code: string | null | undefined) {
  if (!code) return undefined;
  const target = kind === "Receipt" ? "/operations/purchase-receipts" : kind === "PurchaseReturn" ? "/operations/purchase-returns" : kind === "Issue" ? "/inputs/uses" : kind === "Disposal" ? "/inputs/disposals" : undefined;
  return target ? `${target}?code=${encodeURIComponent(code)}` : undefined;
}

/** Default code of a unit: the item code, a dash and the first letter of the unit name without diacritics. */
export function suggestUnitCode(itemCode: string, unitName: string) {
  const letter = foldVietnamese(unitName).replace(/[^a-z0-9]/g, "").slice(0, 1).toUpperCase();
  return itemCode && letter ? `${itemCode}-${letter}` : "";
}

export type UnitDraft = { key: string; id: string | null; unitId: string; factor: string; code: string; isBase: boolean; isUsed: boolean };
export type FormValues = {
  code: string; name: string; group: string; itemGroupId: string; description: string; notes: string;
  minQuantity: string; maxQuantity: string; costPrice: string; openingQuantity: string; units: UnitDraft[];
};
export const MAX_PHOTOS = 5;

const text = (value: number | null | undefined) => value == null ? "" : String(value);
let counter = 0;
export const newKey = () => `unit-${++counter}`;

export function initialValues(record: ItemView | null, copy: boolean): FormValues {
  const units: UnitDraft[] = record
    ? record.units.map((unit) => ({ key: newKey(), id: copy ? null : unit.id, unitId: unit.unitId, factor: unit.isBase ? "" : String(unit.factor), code: copy ? "" : unit.code, isBase: unit.isBase, isUsed: copy ? false : unit.isUsed === true }))
    : [{ key: newKey(), id: null, unitId: "", factor: "", code: "", isBase: true, isUsed: false }];
  return {
    code: record && !copy ? record.code : "", name: record ? (copy ? `${record.name} (bản sao)` : record.name) : "", group: record?.group ?? "Material", itemGroupId: record?.itemGroupId ?? "",
    description: record?.description ?? "", notes: record?.notes ?? "", minQuantity: text(record?.minQuantity), maxQuantity: text(record?.maxQuantity), costPrice: text(record?.costPrice),
    openingQuantity: copy ? "" : text(record?.openingQuantity), units: units.sort((a, b) => Number(b.isBase) - Number(a.isBase)),
  };
}

/** Empty text is "no value"; anything that is not a number is NaN so validation can name the field. */
export function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed.replace(",", "."));
}
const decimals = (value: number) => { const part = String(value).split(".")[1]; return part ? part.length : 0; };
const invalid = (value: number | null) => value !== null && !Number.isFinite(value);

/** The first thing wrong with the form, in the user's words; undefined when it can be sent. */
export function validateForm(values: FormValues): string | undefined {
  if (!values.name.trim()) return "Nhập tên hàng.";
  if (values.code && !/^[A-Za-z0-9_.-]{1,30}$/.test(values.code)) return "Mã hàng chỉ gồm chữ, số, dấu chấm, gạch ngang và gạch dưới, tối đa 30 ký tự.";
  const min = parseNumber(values.minQuantity), max = parseNumber(values.maxQuantity), cost = parseNumber(values.costPrice), opening = parseNumber(values.openingQuantity);
  if ([min, max, cost, opening].some(invalid) || [min, max, cost, opening].some((value) => value !== null && value < 0)) return "Giá vốn, định mức và số còn lại ban đầu phải là số không âm.";
  if (cost !== null && decimals(cost) > 4) return "Giá vốn tối đa 4 chữ số thập phân.";
  if (opening !== null && decimals(opening) > 2) return "Số còn lại ban đầu tối đa 2 chữ số thập phân.";
  if (min !== null && max !== null && max < min) return "Định mức tối đa phải lớn hơn hoặc bằng định mức tối thiểu.";
  const base = values.units.find((unit) => unit.isBase);
  if (!base?.unitId) return "Chọn đơn vị tính cơ bản.";
  const seen = new Set<string>();
  for (const unit of values.units) {
    if (!unit.unitId) return "Chọn đơn vị cho mỗi dòng đơn vị tính.";
    if (seen.has(unit.unitId)) return "Mỗi đơn vị chỉ xuất hiện một lần trong một vật tư.";
    seen.add(unit.unitId);
    if (unit.code && !/^[A-Za-z0-9_.-]{1,30}$/.test(unit.code)) return "Mã đơn vị chỉ gồm chữ, số, dấu chấm, gạch ngang và gạch dưới, tối đa 30 ký tự.";
    if (unit.isBase) continue;
    const factor = parseNumber(unit.factor);
    if (factor === null || !Number.isFinite(factor) || factor <= 0 || factor > 1_000_000 || decimals(factor) > 3) return "Quy đổi phải là số lớn hơn 0, tối đa 3 chữ số thập phân.";
  }
  return undefined;
}

/**
 * The body of a save. On an update the opening quantity is sent only when it changed: the API takes a different value
 * only while the opening row is the item's one movement, and says so itself otherwise.
 */
export function buildSaveBody(values: FormValues, record: ItemView | null): Record<string, unknown> {
  const blank = (value: string) => value.trim() || null;
  const opening = parseNumber(values.openingQuantity);
  const openingChanged = record === null || (opening ?? 0) !== (record.openingQuantity ?? 0);
  return {
    code: blank(values.code), name: values.name.trim(), group: values.group, itemGroupId: values.itemGroupId || null, description: blank(values.description), notes: blank(values.notes),
    minQuantity: parseNumber(values.minQuantity), maxQuantity: parseNumber(values.maxQuantity), costPrice: parseNumber(values.costPrice),
    ...(openingChanged ? { openingQuantity: opening } : {}),
    units: values.units.map((unit) => ({ id: unit.id, unitId: unit.unitId, factor: unit.isBase ? 1 : parseNumber(unit.factor), code: blank(unit.code), isBase: unit.isBase })),
    ...(record ? { rowVersion: record.rowVersion } : {}),
  };
}
