import { Button } from "@/components/ui/button";
import { EvidenceGallery } from "@/components/ui/evidence-gallery";
import type * as c from "./contracts";
import { DataTable, displayTime, statusLabel } from "./ui";
import type { WaterRecognition } from "./water-measurement-shared";

/** Explains OCR failure or lists fields the OCR result is unsure about. */
export function MeasurementOcrNotices({ ocr }: { ocr?: WaterRecognition }) {
  if (!ocr) return null;
  const uncertainFields = [
    ocr.ph?.uncertain && "pH",
    ocr.salinity?.uncertain && "độ mặn",
    ocr.measuredAt?.uncertain && "thời điểm",
  ];

  return (
    <>
      {ocr.status === "Failed" && (
        <p role="status" className="mb-4 rounded-control bg-primary-soft p-4">
          Ảnh và bản nháp đã được lưu. Chưa đọc được số đo từ ảnh; hãy nhập tay, đối chiếu ảnh rồi xác nhận.
        </p>
      )}
      {uncertainFields.some(Boolean) && (
        <p className="mb-4">OCR chưa chắc chắn ở: {uncertainFields.filter(Boolean).join(", ")}. Hãy đối chiếu ảnh.</p>
      )}
    </>
  );
}

/** Left column of the editor: original photo, thresholds used at confirmation and record metadata. */
export function MeasurementEvidenceAside({ record }: { record: c.WaterMeasurement }) {
  const photos = record.photoUrl ? [{ id: record.id, url: record.photoUrl, label: "Ảnh được lưu cùng phép đo" }] : [];
  const meta = [
    ["Vùng", record.zoneName],
    ["Điểm đo", record.measurementPoint ?? "—"],
    ["Người đo", record.measuredBy?.name ?? "—"],
    ["Người xác nhận", record.confirmedBy?.name ?? "—"],
    ["Nguồn nhập", record.inputSource === "Ocr" ? "OCR" : "Nhập tay"],
    ["OCR ban đầu", `pH ${record.ocrDraft.ph ?? "—"} · Độ mặn ${record.ocrDraft.salinity ?? "—"} ‰`],
  ];

  return (
    <aside className="min-w-0 space-y-5">
      <EvidenceGallery title="Ảnh đồng hồ đo gốc" images={photos} />
      <section className="rounded-control bg-surface-subtle p-4">
        <h3 className="mb-3 text-sm font-semibold">Ngưỡng khi xác nhận phép đo</h3>
        {record.thresholdsUsed ? (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt>pH</dt>
              <dd>{record.thresholdsUsed.phMin ?? "Chưa đặt"} – {record.thresholdsUsed.phMax ?? "Chưa đặt"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Độ mặn (‰)</dt>
              <dd>{record.thresholdsUsed.salinityMin ?? "Chưa đặt"} – {record.thresholdsUsed.salinityMax ?? "Chưa đặt"}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-text-muted">Phép đo chưa có ngưỡng xác nhận được lưu.</p>
        )}
      </section>
      <dl className="my-5 grid gap-3 sm:grid-cols-2">
        {meta.map(([label, value]) => (
          <div key={label}><dt className="text-sm text-text-muted">{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
    </aside>
  );
}

type MeasurementVersionHistoryProps = {
  disabled: boolean;
  onOpenVersion(id: string): void;
  versions: c.WaterMeasurement["versions"];
};

export function MeasurementVersionHistory({ disabled, onOpenVersion, versions }: MeasurementVersionHistoryProps) {
  return (
    <>
      <h3 className="mt-6 font-semibold">Lịch sử phiên bản</h3>
      <DataTable headings={["Phiên bản", "Thời điểm đo", "pH", "Độ mặn", "Trạng thái", "Lý do"]}>
        {versions.map((row) => (
          <tr key={row.id}>
            <td>
              <button className="text-primary underline" disabled={disabled} onClick={() => onOpenVersion(row.id)}>
                v{row.recordVersion}
              </button>
            </td>
            <td>{displayTime(row.measuredAt)}</td>
            <td>{row.ph ?? "—"}</td>
            <td>{row.salinity ?? "—"}</td>
            <td>{statusLabel(row.statusCode)}</td>
            <td>{row.correctionReason ?? row.voidReason ?? "—"}</td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}

type MeasurementLatestVersionReviewProps = {
  canKeepDraft: boolean;
  latest?: c.WaterMeasurement;
  onKeepDraft(latest: c.WaterMeasurement): void;
  onLoadLatest(): void;
  onUseLatest(latest: c.WaterMeasurement): void;
  pending: boolean;
};

/** Shown after a version conflict: load the newest version, then keep the draft on top of it or switch to it. */
export function MeasurementLatestVersionReview({
  canKeepDraft,
  latest,
  onKeepDraft,
  onLoadLatest,
  onUseLatest,
  pending,
}: MeasurementLatestVersionReviewProps) {
  return (
    <div className="my-4 rounded-control border border-border p-4">
      <p>Bản đang nhập được giữ. Hãy đối chiếu phiên bản mới nhất.</p>
      <Button className="mt-3 w-auto" variant="secondary" disabled={pending} onClick={onLoadLatest}>
        Tải bản mới để đối chiếu
      </Button>
      {latest && (
        <div className="mt-4 space-y-3">
          <p>
            v{latest.recordVersion} · {statusLabel(latest.statusCode)} · {displayTime(latest.measuredAt)} · pH {latest.ph ?? "—"} · Độ mặn {latest.salinity ?? "—"} ‰
          </p>
          <p>Lý do: {latest.correctionReason ?? latest.voidReason ?? "—"}</p>
          {canKeepDraft && (
            <Button className="w-auto" variant="secondary" onClick={() => onKeepDraft(latest)}>
              Đã đối chiếu, giữ nháp để hiệu chỉnh bản mới
            </Button>
          )}
          <Button className="w-auto" variant="secondary" onClick={() => onUseLatest(latest)}>Dùng bản mới</Button>
        </div>
      )}
    </div>
  );
}
