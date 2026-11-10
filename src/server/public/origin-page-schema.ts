import { z } from "zod";

// Hợp đồng GET api/public/provenance/{qrToken} (OMTS-222). Bỏ qua trường lạ, không bao giờ hiển thị trường ngoài danh sách này.
const text = z.string().max(2000);
const shortText = z.string().max(300);
const url = z.string().max(2048);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);
const messageParams = z.record(z.string(), z.unknown()).nullish();

const certificationSchema = z.object({
  name: shortText,
  number: shortText.nullish(),
  issuer: shortText.nullish(),
  expiryDate: isoDate.nullish(),
  state: z.enum(["Valid", "ExpiringSoon", "Expired"]),
  fileUrl: url.nullish(),
});

const cooperativeSchema = z.object({
  fullName: shortText,
  shortName: shortText.nullish(),
  yearEstablished: z.number().int().min(1800).max(3000).nullish(),
  officeAddress: text.nullish(),
  phoneNumber: shortText.nullish(),
  email: shortText.nullish(),
  website: url.nullish(),
  socialLink: url.nullish(),
  logoUrl: url.nullish(),
  coverPhotoUrl: url.nullish(),
  introduction: z.string().max(10_000).nullish(),
  certifications: z.array(certificationSchema).max(50),
});

const originSchema = z.object({
  harvestDate: isoDate,
  raftCode: shortText,
  zoneName: shortText,
  map: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    source: z.enum(["Raft", "Zone"]),
  }).nullish(),
  seedings: z.array(z.object({ seedingDate: isoDate, seedItemName: shortText })).max(100),
  daysOfFarming: z.number().int().min(0).max(5000).nullish(),
  harvestPhotoUrls: z.array(url).max(50),
  raftPhotoUrls: z.array(url).max(50),
});

const lotSchema = z.object({
  lotCode: shortText,
  products: z.array(shortText).max(100),
  originState: z.enum(["Published", "Withdrawn"]),
  withdrawalDate: isoDate.nullish(),
  message: text.nullish(),
  messageCode: shortText.nullish(),
  messageParams,
  origin: originSchema.nullish(),
});

export const provenancePageSchema = z.object({
  language: z.enum(["vi", "en"]),
  status: z.enum(["Ok", "NoLots", "Cancelled"]),
  message: text.nullish(),
  messageCode: shortText.nullish(),
  messageParams,
  invoice: z.object({ code: shortText, date: isoDate }).nullish(),
  cooperative: cooperativeSchema,
  lots: z.array(lotSchema).max(200),
});

export type ProvenancePage = z.infer<typeof provenancePageSchema>;
export type ProvenanceLot = ProvenancePage["lots"][number];
export type ProvenanceCooperative = ProvenancePage["cooperative"];

/** Thân lỗi problem+json của backend: chỉ đọc `detail` (đã theo ngôn ngữ trang). */
export const problemSchema = z.object({ detail: text.nullish(), code: shortText.nullish() });
