# Backend contracts (OMTS-227 KiotViet-style reports)

API base `http://127.0.0.1:8080`. JSON camelCase, enums as strings, dates `yyyy-MM-dd`, money VND (decimal), kg decimal. Errors: 400 MSG-GEN-01 (`field`), 403 MSG-GEN-08. Empty result: 200 with `message`/`messageCode` = MSG-GEN-10 (never on dashboard).
Access: Owner + Accountant (all zones). Zone Manager/Trader 403. Repeated params: `zoneIds=a&zoneIds=b`. `/export` = same params, returns xlsx (needs Export right).

## GET api/dashboard?from&to&zoneId  (old fields unchanged)
Added: `today`, `yesterday`: `{date, invoiceCount, revenue, returnCount, returnValue, netRevenue}`;
`dueDebts`: `{debtorCount, overdueCount, dueSoonCount, policyEnabled, maxDays|null}` (overdue/dueSoon = 0 when policy off; no per-invoice due date).
Accountant: `pendingTasks` = `{total:0, groups:[]}`. Zone-limited accountant: 403.

## GET api/reports/product-stock?from&to&groupBy=product|category&productIds&categoryIds  (+/export)
`{computedAt, from, to, groupBy, filters:{products:[{id,name}], categories:[{id,name}]}, groups:[G], totals:F, message, messageCode}`
F = `{openingKg, receivedKg, soldKg, disposedKg, adjustmentKg, closingKg, closingValue}`; G = F + `{key, label, code|null, unitPrice|null}` (key = product id | category id | `uncategorized`). closingValue = closing kg x list price. soldKg/disposedKg positive. Zone-limited user 403.

## GET api/reports/purchases?from&to&groupBy=supplier|item&supplierIds&kind=Seed|Supply|all  (+/export)
`{computedAt, from, to, groupBy, filters:{suppliers:[{id,name}], kind}, groups:[G], totals:F, message, messageCode}`
F = `{receiptCount, returnCount, receivedValue, returnedValue, netValue, receivedQuantity|null, returnedQuantity|null}` (quantities only when groupBy=item, base units).
G = F fields + `{key, label, code|null, unit|null}`; item grouping has extra group key `receipt-discounts` (negative, document discounts).
`GET api/reports/purchases/lines?...same params...&groupKey=` -> `{from,to,groupBy,groupKey,documents:[{id,code,date,isReturn,receiptKind:"Seed"|"Supply"|null,supplier:{id,name},value}], message,messageCode}` (receipt PN / return TH ids; value positive).

## GET api/reports/end-of-day?date&zoneIds&method=Cash|Bank|EWallet&createdBy  (+/export)
`date` default today (UTC+7). zoneIds limit sales+lots only; method limits money only; createdBy = account id (invoices, returns, vouchers).
```
{computedAt, date, filters:{zones:[{id,name}], method:"all"|..., createdBy|null},
 sales:{invoices:[{id,code,invoicedAt,customer:{id,name}|null,zoneName,kg,total,paidNow}],
        returns:[{id,code,invoiceId,invoiceCode,customerName|null,zoneName,value}],
        totals:{invoiceCount,kg,revenue,paidNow,returnCount,returnValue,netRevenue}},
 money:{entries:[{source,code,occurredAt,direction:"Receipt"|"Payment",fund:"Cash"|"Bank"|"EWallet",partyName|null,amount,note|null}],
        byFund:[{fund,receipts,payments,net}], totals:{receipts,payments,net}},
 goods:{products:[{productId,code,name,kg}], lots:[{id,lotCode,zoneName,weighedKg,weighedAt}], totals:{soldKg,lotCount,weighedKg}},
 message, messageCode}
```
source: CustomerPayment | CustomerPaidBack | SupplierPayment | SupplierPaidBack | CashVoucher. Money = cash-book lines (same as api/cash-book; cash awaiting Accountant confirmation is NOT in it, but IS counted in `paidNow`).

## GET api/reports/financial?from&to&unit=month|quarter|year  (+/export)
Default period 1 Jan..today. No `groupBy`.
```
{computedAt, from, to, unit, columns:[{key,label,from,to}],
 rows:[{code,section,isTotal,values:[per column],total}], message, messageCode}
```
Row order/codes: `revenue`, `invoice-discounts`, `price-cuts`, `sales-returns`, `payment-discounts` (section deduction), `net-revenue` (isTotal), `input-use-cost`, `input-disposal-cost`, `labor-cost`, `other-expense` (cost), `other-income`, `profit` (isTotal). Values SIGNED (deductions/costs negative); net-revenue = sum of revenue+deductions; profit = sum of all. Labor = net pay of finalized payrolls by expense month. Purchases not counted. Zone-limited user 403.

Notes: sales-performance totals.netRevenue == financial net-revenue when no payment discounts exist (verified 6,200,000). Product-stock closing == `/api/products` on-hand when `to` >= today.
