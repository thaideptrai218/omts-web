import { Button } from "@/components/ui/button";
import { EvidenceGallery } from "@/components/ui/evidence-gallery";
import type * as c from "./contracts";
import { displayTime, statusLabel } from "./ui";
import { formatMeasuredValue } from "./water-measurement-shared";
import styles from "./water-screen.module.css";

/** Inline read-only detail shown under the selected history row. */
export function WaterReadSummary({ record, onFullDetail }: { record: c.WaterMeasurement; onFullDetail(): void }) {
  const photos = record.photoUrl
    ? [{ id: record.id, url: record.photoUrl, label: `Ảnh phép đo ${displayTime(record.measuredAt)}` }]
    : [];

  return (
    <section id="water-selected-detail" className={styles.readDetail} aria-label="Chi tiết phép đo đang chọn">
      <div className={styles.readHeading}>
        <div>
          <h3>Phép đo · {displayTime(record.measuredAt)}</h3>
          <p>{record.zoneName} · {record.measurementPoint ?? "Chưa ghi điểm đo"}</p>
        </div>
        <Button variant="secondary" className="w-auto" onClick={onFullDetail}>Xem đầy đủ & lịch sử</Button>
      </div>
      {record.thresholdExceeded && (
        <p className={styles.warning}>Vượt ngưỡng: {record.violatedValues ?? "Kiểm tra các giá trị và ngưỡng đã áp dụng."}</p>
      )}
      <div className={styles.evidenceGrid}>
        <EvidenceGallery title="Ảnh máy đo" images={photos} />
        <div>
          <h4>Giá trị và ngưỡng của phép đo</h4>
          <table className={styles.thresholdTable}>
            <thead>
              <tr><th>Chỉ số</th><th>Đã ghi</th><th>Ngưỡng đã dùng</th></tr>
            </thead>
            <tbody>
              <tr>
                <th>pH</th>
                <td>{formatMeasuredValue(record.ph)}</td>
                <td>{record.thresholdsUsed?.phMin ?? "—"} – {record.thresholdsUsed?.phMax ?? "—"}</td>
              </tr>
              <tr>
                <th>Độ mặn (‰)</th>
                <td>{formatMeasuredValue(record.salinity)}</td>
                <td>{record.thresholdsUsed?.salinityMin ?? "—"} – {record.thresholdsUsed?.salinityMax ?? "—"}</td>
              </tr>
            </tbody>
          </table>
          <dl className={styles.recordMeta}>
            <div><dt>Người đo</dt><dd>{record.measuredBy?.name ?? "Chưa có thông tin"}</dd></div>
            <div><dt>Nguồn ghi nhận</dt><dd>{record.inputSource === "Ocr" ? "Nhận dạng từ ảnh" : "Nhập tay"}</dd></div>
            <div><dt>Trạng thái</dt><dd>{statusLabel(record.statusCode)}</dd></div>
            {record.correctionReason && <div><dt>Lý do hiệu chỉnh</dt><dd>{record.correctionReason}</dd></div>}
            {record.voidReason && <div><dt>Lý do hủy</dt><dd>{record.voidReason}</dd></div>}
          </dl>
        </div>
      </div>
    </section>
  );
}
