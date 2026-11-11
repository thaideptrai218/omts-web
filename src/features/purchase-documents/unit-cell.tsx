"use client";
import { SelectBox } from "@/components/ui/select-box";
import { unitChoices, type ItemOption } from "./types";
import styles from "./purchases.module.css";

/**
 * The unit a line is typed in: a select over the item's units when it has more than one, otherwise just the name.
 * A line that already gave quantity away (seeded or returned) keeps its unit.
 */
export function UnitCell({ line, index, locked, onPick }: {
  line: { item: ItemOption; itemUnitId: string | null; unitName: string; unitFactor: number; floor?: number }; index: number; locked?: boolean; onPick(unitId: string): void;
}) {
  const choices = unitChoices(line.item, { itemUnitId: line.itemUnitId, unit: line.unitName, unitFactor: line.unitFactor });
  const chosen = choices.find((unit) => unit.id === line.itemUnitId) ?? choices.find((unit) => unit.isBase);
  if (choices.length < 2) return <>{chosen?.name ?? line.unitName}</>;
  return <SelectBox aria-label={`Đơn vị tính dòng ${index + 1}`} className={styles.cellSelect} value={chosen?.id ?? ""} disabled={locked || (line.floor ?? 0) > 0} onChange={(event) => onPick(event.target.value)}>
      {choices.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
    </SelectBox>;
}
