import type { ReactNode } from "react";
import { SortableHeader, type SortState } from "./management-screen/management-table";
import styles from "./data-grid.module.css";

/** Optional click-to-sort headers: `keys[i]` is the sort key of heading `i` (undefined keeps a plain header). */
export type DataGridSort = { state: SortState; keys: readonly (string | undefined)[]; onSort(next: SortState): void };

export function DataGrid({ headings, children, empty, responsive = false, sort }: {
  headings: readonly string[];
  children: ReactNode;
  empty?: boolean;
  responsive?: boolean;
  sort?: DataGridSort;
}) {
  return (
    <div className={`${styles.frame} ${responsive ? styles.responsive : ""}`}>
      <table className={styles.table}>
        <thead><tr>{headings.map((heading, index) => sort?.keys[index]
          ? <SortableHeader key={`${heading}-${index}`} label={heading} sortKey={sort.keys[index]} sort={sort.state} onSort={sort.onSort} />
          : <th key={`${heading}-${index}`} scope="col">{heading}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
      {empty && <p className={styles.empty}>Không có dữ liệu phù hợp.</p>}
    </div>
  );
}
