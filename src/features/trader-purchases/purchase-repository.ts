import { createOperationsRepository } from "@/features/operations/repository";

/** Mọi truy cập dữ liệu của "Đơn mua của tôi" đi qua BFF /api/operations/purchase-requests; component không gọi HTTP trực tiếp. */
export const purchaseRepository = createOperationsRepository("purchase-requests");
export const productRepository = createOperationsRepository("sales-products");
