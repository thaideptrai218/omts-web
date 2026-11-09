import { createOperationsRepository } from "@/features/operations/repository";

/** Mọi truy cập dữ liệu khiếu nại đi qua BFF /api/operations/<vùng>; component không gọi HTTP trực tiếp. */
export const reportRepository = createOperationsRepository("claim-reports");
export const claimRepository = createOperationsRepository("quality-claims");
