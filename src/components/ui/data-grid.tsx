import type { ReactNode } from "react";
import styles from "./data-grid.module.css";

export function DataGrid({ headings, children, empty, responsive = false }: {
  headings: readonly string[];
  children: ReactNode;
  empty?: boolean;
  responsive?: boolean;
}) {
  return (
    <div className={`${styles.frame} ${responsive ? styles.responsive : ""}`}>
      <table className={styles.table}>
        <thead><tr>{headings.map((heading, index) => <th key={`${heading}-${index}`} scope="col">{heading}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
      {empty && <p className={styles.empty}>Không có dữ liệu phù hợp.</p>}
    </div>
  );
}
