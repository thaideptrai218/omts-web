import type { ProvenancePage } from "@/server/public/origin-page-schema";

/** Đường dẫn trang truy xuất mẫu. */
export const SAMPLE_PATH = "/xem-mau";

/** Ảnh minh họa của trang mẫu (Wikimedia Commons, nguồn ở /landing/nguon-anh.txt), không phải ảnh của một lô thật. */
export const samplePhotos = {
  harvest: "/landing/mau/ro-hau.webp",
  ropes: "/landing/mau/gian-be.webp",
  floats: "/landing/mau/khu-nuoi-hau.webp",
} as const;

/** Dữ liệu cố định cho trang mẫu: cùng hình dạng với dữ liệu công khai thật nên dùng đúng giao diện thật. */
export function samplePage(cooperativeName: string): ProvenancePage {
  return {
    language: "vi",
    status: "Ok",
    invoice: { code: "HD-MAU", date: "2026-10-27" },
    cooperative: {
      fullName: cooperativeName,
      officeAddress: "Vân Đồn, Quảng Ninh",
      introduction: "Nuôi hàu Thái Bình Dương trên bè tại vùng biển Vân Đồn, Quảng Ninh. Mỗi lô thu hoạch đều truy được về bè nuôi.",
      certifications: [],
      coverPhotoUrl: samplePhotos.floats,
      logoUrl: "/brand/trung-nam-oyster.webp",
    },
    lots: [{
      lotCode: "B03-20261026",
      products: ["Hàu Thái Bình Dương"],
      originState: "Published",
      origin: {
        harvestDate: "2026-10-26",
        raftCode: "B03",
        zoneName: "Vùng nuôi mẫu, Vân Đồn",
        map: { latitude: 21.0712, longitude: 107.4321, source: "Raft" },
        seedings: [{ seedingDate: "2026-03-26", seedItemName: "Giống hàu Thái Bình Dương", supplierName: "Trại giống mẫu" }],
        daysOfFarming: 214,
        harvestPhotoUrls: [samplePhotos.harvest],
        raftPhotoUrls: [samplePhotos.ropes, samplePhotos.floats],
      },
    }],
  };
}
