"use client";
import { HeaderMenu } from "@/components/layout/header-menu";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { useSelectedZones } from "./selected-zones";
import styles from "./zone-picker.module.css";

/** Header chip that chooses which farming zones the workspace screens follow. */
export function ZonePicker() {
  const { status, zones, selectedIds, allSelected, label, selectAll, toggle, reload } = useSelectedZones();
  if (status === "idle") return null;
  if (status === "loading") return <span className={styles.chip} role="status" aria-label="Đang tải khu nuôi"><InterfaceIcon name="zone" /><span className={styles.label}>Đang tải…</span></span>;
  if (status === "error") return <button type="button" className={`${styles.chip} ${styles.retry}`} aria-label="Không tải được danh sách khu nuôi. Thử lại" onClick={reload}><InterfaceIcon name="zone" /><span className={styles.label}>Không tải được khu nuôi · Thử lại</span></button>;
  if (!zones.length) return null;
  if (zones.length === 1) return <span className={styles.chip} title={zones[0].name}><InterfaceIcon name="zone" /><span className={styles.label}>{zones[0].name}</span></span>;
  const onlyOneLeft = !allSelected && selectedIds.length === 1;
  return <HeaderMenu
    label={`Khu nuôi: ${label}`}
    triggerClassName={`${styles.chip} ${styles.button}`}
    panelClassName={styles.panel}
    trigger={<><InterfaceIcon name="zone" /><span className={styles.label} title={label}>{label}</span><InterfaceIcon name="chevron-down" className={styles.caret} /></>}
  >
    <fieldset className={styles.options}>
      <legend>Khu nuôi hiển thị</legend>
      <label className={styles.option}><input type="checkbox" checked={allSelected} disabled={allSelected} onChange={selectAll} /><span>Tất cả khu nuôi</span></label>
      {zones.map((zone) => {
        const checked = selectedIds.includes(zone.id);
        return <label key={zone.id} className={styles.option}>
          <input type="checkbox" checked={checked} disabled={checked && onlyOneLeft} onChange={() => toggle(zone.id)} />
          <span>{zone.name}</span>
        </label>;
      })}
    </fieldset>
  </HeaderMenu>;
}
