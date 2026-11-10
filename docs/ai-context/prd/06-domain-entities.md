# 06 — Thực thể miền

Tên trạng thái "do backend trả" nghĩa là web không có enum riêng.

| Thực thể | Trường chính | Trạng thái / chuyển trạng thái | Nguồn |
| --- | --- | --- | --- |
| **Zone** (vùng nuôi) | `code, name, location, lat/lng, area (ha), waterMeasurementPoint, inUseRaftCount, licenseState` | `in-use ↔ discontinued`; không ngừng được khi còn bè đang dùng | `farming-zones/domain/farming-zone.ts` |
| **ZoneDocument** | loại `SEA_AREA_ALLOCATION`, `AQUACULTURE_LICENSE`, `FOOD_SAFETY_COMMITMENT`, `OTHER`; `number, effectiveDate, expiryDate, zoneIds[], replacesId` | `valid/expiring/expired/not-effective/superseded` (API thêm `Missing`) | `zone-document-state.ts` |
| **Raft** (bè) | `code, lat/lng, location, size, conditionNotes, layouts[] (version, validFrom/To, lanes), materialCostVnd` | `in-use ↔ discontinued`; chặn khi có chu kỳ mở hoặc làn đang dùng | `rafts/domain/raft.ts` |
| **Lane / Portion** | `number, length, markerA/B`; portion `from/to` | mock: `unseeded→growing→harvested/written-off`; API: `NotSeeded, Growing, PartiallyHarvested, FullyHarvested`; portion `NotSeeded, Growing, Harvested, WrittenOff` | `rafts/domain`, `farming-api/contracts.ts` |
| **RaftEvent** | `kind ∈ seeded, harvested, written-off, planned`; `from/to` | segment API: `Seeded, PlannedHarvest, Harvested, WrittenOff` | như trên |
| **CultivationCycle** | `startDate, closeDate, status, expectedSeedQuantity, expectedHarvestDate, targetYieldKg, seedingCompletedOn, assessment, closedEarly, daysOfFarming` | `canStart/canEdit/canCancel`; mỗi bè một chu kỳ mở; `seedingCompletedOn` đánh dấu thả xong | `cycles-api`, `cultivation-api/contracts.ts` |
| **Seeding record** | `seedingDate, seedLot, quantity, laneNumbers[]` | `canCorrect`; sửa có `rowVersion` | `records-contracts.ts` |
| **MaterialUsage** | `usageDate, repairReason, items[itemId, quantity]` | nhóm theo chu kỳ; `locked` khi chu kỳ đóng | như trên |
| **HarvestLot** | `lotCode, harvestDate, laneNumbers, finishedLaneNumbers, cageCount, kgPerCage, estimatedKg, invoicedKg, remainingKg` | origin `NotPublished→Published→Withdrawn`; tự đóng sau `daysBeforeAutoClose`; số liệu `invoicedKg, returnedKg, soldKg, remainingKg, lostKg, differenceKg` | `records-contracts.ts`, `lot-tracing/contracts.ts` |
| **Supplier** | `name, supplierType (Seed/Material/Other), phoneNumber, address, email` | `statusId` (in-use/discontinued) | `api-workspace/resources.ts` |
| **InputItem** (vật tư) | `code, name, group (Seed/Material/Other), unit, description` | `status`, `isUsed`, `rowVersion` | `resources.ts` |
| **SeedLot** | `code, receiptCode, supplierName, unit` | gắn dòng phiếu nhập (`seedLotId`); tồn thả `quantityReceived/quantitySeeded` | `operations/contracts.ts` |
| **PurchaseReceipt** | `code, receiptDate, supplier, zone, raft?, subtotal, discountAmount, payable, returned, paid, refunded, outstanding, amountPaidNow, lines[], payments[], returns[], invoicePhotoUrls` | Nháp → Hoàn thành (`completedAt`) → Hủy (`cancelledAt, cancelReason, cancelPayments`); `copiedFromReceiptId`. Quy trình: Manager gửi, Kế toán xử lý, Owner chỉ nhận thông báo (chờ backend phát event) | `operations/contracts.ts` |
| **ReceiptLine** | `itemId, quantity, unitPrice, supplierLotCode, actualSource, stocked, returnedQuantity, returnable` | — | như trên |
| **SupplierPayment** | `supplier, receiptId?, amount, paymentDate, method (Cash/BankTransfer/Other), referenceCode, cancelReason`; v2 thêm `kind Payment/PaidBack`, `deduplicationKey` (uuid) | có hủy; có `allocate` lên phiếu | `operations/contracts.ts`, `purchasing-v2` |
| **SupplierDebt** | `payable, returned, paid, refunded, unallocated, outstanding` | — | `debtRowSchema` |
| **WaterMeasurement** | `measuredAt, ph (0–14), salinity (0–100), measurementPoint, inputSource Manual/Ocr, recordVersion, alertState, thresholdExceeded, violatedValues, correctionReason, voidReason` | `alertState None→Active→Corrected/Voided`; phiên bản `versions[]`; OCR `Success/Failed/NotCalled`; ngưỡng `phMin/phMax/salinityMin/salinityMax` theo vùng | `operations/contracts.ts` |
| **Employee** (thời vụ) | `fullName, phone, birthday, address, area, ward, notes, otherInformation, workingZoneIds[], bankAccount, account?` | `Employed ↔ Left` (kèm `employmentEndDate`); follow-up `review-lock`, `review-access`; tài khoản `Active/Locked` | `employee-management` |
| **Account** | `username, displayName, phoneNumber, email, status (Active/Locked), subjectType, mustChangePassword, grants[]` | `active ↔ locked`; mock: `credentialDeliveryChannel`, `emailVerified`, `phoneVerified` | `account-management`, `resources.ts` |
| **AccessGrant** | `roleId, zoneId|null (all-zones), effectiveFrom/To, grantedBy, status (effective/revoked), revocationReason` | thu hồi có lý do | `account-management` |
| **Role** | `name, description, status, permissions[featureCode, actionKeys, dataScopeId]`, `impactAccounts`, `activeAccountCount`, `activeZoneCount` | chỉ chỉnh quyền/ngừng/kích hoạt; phải `confirmImpact` khi lưu | `role-management` |
| **Customer** | `name, phoneNumber, address, note, hasTraderAccount, traderAccount?, currentDebt, mergedIntoCustomerId, phoneLocked` | khách lẻ (`walkInCustomer`) không có hồ sơ | `resources.ts` |
| **TraderRequest** | `accountId, displayName, phoneNumber, note, requestedAt, rejectionReason` | `PENDING_APPROVAL → ACTIVE` hoặc `REJECTED` (cần lý do) | `trader-requests-api/contracts.ts` |
| **PurchaseRequest** | `customer, product, requestedKg, pickupDate, note, response{acceptedKg, pickupDate, payLaterAgreed, note}, fulfilled, sendings[]` | `3201` Chờ → `3202` Nhận / `3203` Từ chối / `3204` Hủy; accept cần `acceptedKg, pickupDate, payLaterAgreed`; decline cần `note`; gửi tin `1601` đang gửi, `1602` đã gửi, `1603` chưa gửi | `trader-purchases`, `operations/new-module-contracts.ts` |
| **SalesProduct** | `code, name, description, inUse, availableForPurchase` | `inUse` bật/tắt | `new-module-contracts.ts` |
| **SalesInvoice** | `code, invoicedAt, zone, customer?, walkInCustomer, purchaseRequestId?, lines[(lot, kg, unitPrice, listPrice, priceSource)], subtotal, discount, otherCharges, priceCutTotal, total, paymentTerm, payments[], qrToken/qrUrl, deliveryStatus, sendings[]` | `3501` Hoàn thành / `3502` Đã hủy; thanh toán `PayNow`/`PayLater`, phần dư `None/PayLater/VietQr`; hành động hợp lệ `Resend, CreateReturn, CancelReturn, Correct, Cancel, Print`; sửa `DataEntryError`/`PriceCutAfterClaim` | `sales-invoices`, `sales-invoice-list` |
| **CustomerPayment** | `code, customer, kind Payment/PaidBack, amount, paymentDate, method` | tiền mặt chờ xác nhận (`cashAwaitingConfirmation`); có `deduplication`; tạo tay chỉ `Cash`/`OtherTransfer`, `VietQrInvoice` do hệ thống | `customer-payments/contracts.ts` |
| **QualityClaim** | `code, sentAt, description, photos[], offer, invoice, customer, lines[], response{note, respondedAt}` | `3701→3702/3703` | `quality-claims` |
| **SalesReturn** | (frame) giá trị trả, công nợ sau trả | chưa có API tạo | `sales-returns`, `lot-tracing` |
| **JobType** | `name, hourlyRate (currentRate, otherRates), effectiveFrom` | cập nhật đơn giá có thể thay bản cùng ngày | `labor-api` |
| **WorkAssignment** | `employee, zone, raft?, jobType, date, checkedInAt/OutAt` | assign / move (`moveExisting`) / crew; chấm công thủ công | `new-module-contracts.ts` |
| **Attendance** | `date, periods[], jobs[hours], complete`; cài `breakFrom/To`, `roundingMinutes ∈ {0,15,30,60}`, `effectiveFrom` | — | như trên |
| **LeaveRequest** | `from, to, reason, approved (null/true/false), response, cancelledAt` | Staff xin/hủy; Owner duyệt (từ chối cần lý do) | như trên |
| **PayrollSheet** (frame) | `period, from-to, total` | `draft, pending, returned, final` | `payroll-screen.tsx` |
| **PayrollSettings** | `startDay 1–28, automaticPayroll` | preview 2 kỳ trước khi lưu | `payroll-settings/contracts.ts` |
| **CooperativeCertification** | `name, number, issuer, expiryDate, fileUrl` | `Valid/ExpiringSoon/Expired` | `certifications-api` |
| **ReceivingBankAccount** | `bankBin, bankName, accountNumber, accountHolderName, acceptedAt` | cần `confirmAccount`; thiếu tài khoản thì VietQR báo MSG-SALE-13 | `bank-api` |
| **Notification** | `notificationId, recordType` | read/unread; mở bản ghi liên quan, recheck quyền backend | `inbox-api` |
| **AuditEvent** | `occurredAt, actor, action, recordType, recordId, zoneId, reason, before/after` | — | `audit-api` |

Danh sách `recordType` đầy đủ của inbox chưa kiểm kê (bị cắt khi quét `inbox-api/contracts.ts`): đã thấy `WaterMeasurement, FarmingZone, ZoneComplianceDocument, Account, CooperativeCertification, HarvestLot, PurchaseReceipt…`.
