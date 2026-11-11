import { EvidenceGallery } from "@/components/ui/evidence-gallery";
import type * as c from "./contracts";
import type { WaterRecognition } from "./water-measurement-shared";

/** Explains OCR failure, the indicators it could not read, or the fields it is unsure about. */
export function MeasurementOcrNotices({ ocr }: { ocr?: WaterRecognition }) {
  if (!ocr) return null;
  const uncertainFields = [
    ocr.ph?.uncertain && "pH",
    ocr.salinity?.uncertain && "độ mặn",
    ocr.temperature?.uncertain && "nhiệt độ",
    ocr.measuredAt?.uncertain && "thời điểm",
  ].filter(Boolean);

  return (
    <>
      {ocr.status === "Failed" && (
        <p role="status" className="mb-4 rounded-control bg-primary-soft p-4">Chưa đọc được số đo từ ảnh; các giá trị đã được nhập tay.</p>
      )}
      {ocr.status !== "Failed" && ocr.warning && <p role="status" className="mb-4 rounded-control bg-primary-soft p-4">{ocr.warning.text}</p>}
      {uncertainFields.length > 0 && <p className="mb-4">OCR chưa chắc chắn ở: {uncertainFields.join(", ")}. Hãy đối chiếu ảnh.</p>}
    </>
  );
}

const range = (min: number | null, max: number | null) => `${min ?? "Chưa đặt"} – ${max ?? "Chưa đặt"}`;

/** Left column of the editor: original photo, the thresholds saved with the measurement and record metadata. */
export function MeasurementEvidenceAside({ record }: { record: c.WaterMeasurement }) {
  const photos = record.photoUrl ? [{ id: record.id, url: record.photoUrl, label: "Ảnh được lưu cùng phép đo" }] : [];
  const meta = [
    ["Vùng", record.zoneName],
    ["Bè", record.raftCode],
    ["Người đo", record.measuredBy?.name ?? "—"],
  ];
  const { thresholdsUsed } = record;

  return (
    <aside className="min-w-0 space-y-5">
      <EvidenceGallery title="Ảnh đồng hồ đo gốc" images={photos} />
      <section className="rounded-control bg-surface-subtle p-4">
        <h3 className="mb-3 text-sm font-semibold">Ngưỡng khi ghi phép đo</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3"><dt>pH</dt><dd>{range(thresholdsUsed.phMin, thresholdsUsed.phMax)}</dd></div>
          <div className="flex justify-between gap-3"><dt>Độ mặn (‰)</dt><dd>{range(thresholdsUsed.salinityMin, thresholdsUsed.salinityMax)}</dd></div>
          <div className="flex justify-between gap-3"><dt>Nhiệt độ (°C)</dt><dd>{range(thresholdsUsed.temperatureMin, thresholdsUsed.temperatureMax)}</dd></div>
        </dl>
      </section>
      <dl className="my-5 grid gap-3 sm:grid-cols-2">
        {meta.map(([label, value]) => (
          <div key={label}><dt className="text-sm text-text-muted">{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
    </aside>
  );
}
