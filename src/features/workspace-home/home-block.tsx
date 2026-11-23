"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { OverviewCard, type RemoteView } from "@/features/api-workspace/overview-card";
import styles from "@/features/api-workspace/owner-overview.module.css";

export type HomeRow = Readonly<{ key: string; title: string; detail?: string; href: string }>;

type Props<T> = Readonly<{ title: string; remote: RemoteView<T>; rows(data: T): HomeRow[]; empty: string; moreHref?: string; moreLabel?: string }>;

/**
 * Một khối việc trên màn Tổng quan theo vai trò: tự tải (khung chờ, lỗi có nút Thử lại do OverviewCard lo),
 * mỗi dòng là liên kết tới màn thật; không có việc thì ghi rõ "không có".
 */
export function HomeBlock<T>({ title, remote, rows, empty, moreHref, moreLabel = "Xem" }: Props<T>) {
  return (
    <OverviewCard title={title} remote={remote} actions={moreHref ? <Link href={moreHref} className={styles.more}>{moreLabel}</Link> : undefined}>
      {(data) => {
        const items = rows(data);
        return items.length
          ? <ul className={styles.feed}>{items.map((row) => <li key={row.key}><Link href={row.href} className={styles.row}><div><strong>{row.title}</strong>{row.detail && <small>{row.detail}</small>}</div><span aria-hidden="true">→</span></Link></li>)}</ul>
          : <p className={styles.empty}>{empty}</p>;
      }}
    </OverviewCard>
  );
}

/** Lưới các khối của một vai trò. */
export function HomeBlockGrid({ title, hint, children }: Readonly<{ title: string; hint: string; children: ReactNode }>) {
  return (
    <section className={styles.page} aria-label={title}>
      <header className={styles.heading}><div><h2>{title}</h2><p>{hint}</p></div></header>
      <div className={styles.tiles} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))", alignItems: "start" }}>{children}</div>
    </section>
  );
}
