import type { ReactNode } from "react";
import styles from "./workforce-layout.module.css";

function dateLabel(day: string) {
  const date = new Date(`${day}T12:00:00+07:00`);
  return Number.isNaN(date.getTime())
    ? day
    : new Intl.DateTimeFormat("vi-VN", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(date);
}

export function WorkforceHero({
  day, total, awaiting, completed, loading, actions,
}: {
  day: string;
  total: number;
  awaiting: number;
  completed: number;
  loading: boolean;
  actions?: ReactNode;
}) {
  return <header className={styles.hero}>
    <div className={styles.heroContent}>
      <p className={styles.eyebrow}>Nhân sự <span aria-hidden="true" /> Vận hành</p>
      <h1>Phân công và chấm công</h1>
      <p className={styles.heroDescription}>Theo dõi công việc và giờ làm trong phạm vi vùng được cấp.</p>
      <div className={styles.heroActions}>{actions}</div>
    </div>
    <div className={styles.heroSummary} aria-busy={loading}>
      <p className={styles.summaryLabel}>Lịch làm việc · Ngày đang chọn</p>
      <p className={styles.summaryDate}>{dateLabel(day)}</p>
      <dl className={styles.metrics}>
        <div><dt>Phân công</dt><dd>{loading ? "—" : total}</dd></div>
        <div><dt>Chưa vào làm</dt><dd>{loading ? "—" : awaiting}</dd></div>
        <div><dt>Đã ra về</dt><dd>{loading ? "—" : completed}</dd></div>
      </dl>
    </div>
  </header>;
}

export function WorkforceFilterSection({ children }: { children: ReactNode }) {
  return <section className={styles.filterSection} aria-label="Bộ lọc phân công">
    <div className={styles.sectionHeading}><div><h2>Lọc lịch làm việc</h2><p>Chọn ngày và phạm vi để đối chiếu phân công.</p></div></div>
    <div className={styles.filters}>{children}</div>
  </section>;
}

export function WorkforceListSection({ count, children }: { count?: number; children: ReactNode }) {
  return <section className={styles.listSection} aria-label="Danh sách phân công">
    <div className={styles.listHeading}><div><p className={styles.listKicker}>DANH SÁCH TRONG NGÀY</p><h2>Phân công</h2></div><span className={styles.count}>{count ?? "—"} phân công</span></div>
    {children}
  </section>;
}

export function WorkforceFormSection({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <section className={styles.formSection}>
    <div className={styles.formHeading}><span className={styles.sectionNumber}>{number} /</span><h3>{title}</h3></div>
    <div className={styles.formFields}>{children}</div>
  </section>;
}

export function WorkforceEmpty({ filtered }: { filtered: boolean }) {
  return <div className={styles.empty}>
    <p className={styles.emptyKicker}>{filtered ? "Không có kết quả" : "Lịch làm việc trống"}</p>
    <h3>{filtered ? "Không tìm thấy phân công phù hợp" : "Chưa có phân công cho ngày này"}</h3>
    <p>{filtered ? "Thử đổi vùng hoặc từ khóa tìm kiếm để xem các phân công khác." : "Dùng nút Tạo phân công ở đầu trang để lập lịch làm việc cho nhân viên."}</p>
  </div>;
}
