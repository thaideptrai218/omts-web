import { formatOriginDate } from "@/features/origin-page/origin-format";
import { SAMPLE_PATH, samplePhotos } from "@/features/origin-page/origin-sample";
import type { ProvenancePage } from "@/server/public/origin-page-schema";
import { sampleTrace } from "./landing-content";

export type TraceExample = {
  real: boolean;
  href: string;
  product: string;
  description: string;
  photo: string;
  lot: string;
  facts: readonly (readonly [string, string])[];
  /** Ảnh thu hoạch và ảnh bè của lô. */
  thumbs: readonly string[];
  /** Con giống của lô; thẻ minh họa không có. */
  seed?: { itemName: string; supplier: string | null; date: string; raft: string; zone: string; days: number | null };
  /** Các sản phẩm bán ra từ lô. */
  lotProducts: readonly string[];
  /** Giấy chứng nhận còn hiệu lực của hợp tác xã. */
  certificates: readonly { name: string; number: string }[];
};

const sample: TraceExample = {
  real: false, href: SAMPLE_PATH, thumbs: [samplePhotos.harvest, samplePhotos.ropes, samplePhotos.floats], lotProducts: [], certificates: [], ...sampleTrace,
};

/** Thẻ đầu trang: lô đang công bố đầu tiên của hóa đơn mẫu đã chọn, kèm giới thiệu sản phẩm; chưa có thì là thẻ minh họa. */
export function traceExample(page: ProvenancePage | null, qrToken: string | null): TraceExample {
  const lot = page?.lots.find((item) => item.originState === "Published" && item.origin);
  if (!page || !qrToken || !lot?.origin) return sample;
  const { origin } = lot;
  const detail = page.productDetails?.find((item) => lot.products.includes(item.name));
  const seeded = origin.seedings[0];
  return {
    real: true,
    href: `/origin/${qrToken}`,
    product: lot.products.join(", "),
    description: detail?.description ?? "",
    photo: detail?.photoUrls[0] ?? origin.harvestPhotoUrls[0] ?? samplePhotos.harvest,
    lot: lot.lotCode,
    lotProducts: lot.products,
    seed: seeded
      ? { itemName: seeded.seedItemName, supplier: seeded.supplierName ?? null, date: formatOriginDate(seeded.seedingDate), raft: origin.raftCode, zone: origin.zoneName, days: origin.daysOfFarming ?? null }
      : undefined,
    certificates: page.cooperative.certifications.flatMap((cert) => (cert.state !== "Expired" && cert.number ? [{ name: cert.name, number: cert.number }] : [])),
    facts: [
      ...(seeded ? [["Con giống", seeded.seedItemName] as const] : []),
      ...(seeded?.supplierName ? [["Nơi cung cấp giống", seeded.supplierName] as const] : []),
      ["Thả giống", seeded ? formatOriginDate(seeded.seedingDate) : "Chưa có"],
      ["Thu hoạch", formatOriginDate(origin.harvestDate)],
      ["Số ngày nuôi", origin.daysOfFarming == null ? "Chưa có" : `${origin.daysOfFarming} ngày`],
      ["Bè", origin.raftCode],
      ["Vùng nuôi", origin.zoneName],
    ],
    thumbs: [...origin.harvestPhotoUrls, ...origin.raftPhotoUrls].slice(0, 3),
  };
}
