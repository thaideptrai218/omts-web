export type DemoReceiptStatus = "pending-payment" | "paid";

export type DemoReceipt = Readonly<{
  amount: number;
  code: string;
  createdAt: string;
  createdBy: string;
  id: string;
  invoiceReference: string;
  note: string;
  paidAt: string | null;
  status: DemoReceiptStatus;
  supplierName: string;
  zoneId: string;
  zoneName: string;
}>;

export type DemoOwnerNotice = Readonly<{
  id: string;
  text: string;
  time: string;
}>;

const zones = [
  { id: "zone-east", name: "Khu Đông" },
  { id: "zone-south", name: "Khu Nam" },
] as const;

const managerScope: Readonly<Record<string, readonly string[]>> = {
  "account-nguyen-an": ["zone-east"],
  "account-pham-cuong": ["zone-south"],
};

function allowedZoneIds(accountId: string): readonly string[] {
  if (accountId === "account-owner-demo" || accountId === "account-tran-binh") {
    return zones.map((zone) => zone.id);
  }
  return managerScope[accountId] ?? [];
}
export function createDemoAccountingRepository(now = () => new Date()) {
  let nextNumber = 1;
  let receipts: DemoReceipt[] = [];
  let notices: DemoOwnerNotice[] = [];
  return Object.freeze({
    load(accountId: string) {
      const allowed = new Set(allowedZoneIds(accountId));
      return {
        notices: accountId === "account-owner-demo" ? [...notices] : [],
        receipts: receipts.filter((receipt) => allowed.has(receipt.zoneId)),
        zones: zones.filter((zone) => allowed.has(zone.id)),
      };
    },
    submit(input: Readonly<{
      accountId: string;
      amount: number;
      invoiceReference: string;
      note: string;
      supplierName: string;
      zoneId: string;
    }>) {
      if (!managerScope[input.accountId]?.includes(input.zoneId)) {
        return { status: "forbidden" } as const;
      }
      const zone = zones.find((candidate) => candidate.id === input.zoneId);
      const supplierName = input.supplierName.trim();
      const invoiceReference = input.invoiceReference.trim();
      if (!zone || !supplierName || !invoiceReference || !Number.isInteger(input.amount) || input.amount <= 0) {
        return { status: "invalid" } as const;
      }
      const createdAt = now().toISOString();
      const sequence = nextNumber++;
      const receipt: DemoReceipt = {
        amount: input.amount,
        code: `YC-TT-${String(sequence).padStart(3, "0")}`,
        createdAt,
        createdBy: input.accountId === "account-nguyen-an" ? "Nguyễn Văn An" : "Phạm Quốc Cường",
        id: `demo-receipt-${sequence}`,
        invoiceReference,
        note: input.note.trim(),
        paidAt: null,
        status: "pending-payment",
        supplierName,
        zoneId: zone.id,
        zoneName: zone.name,
      };
      receipts = [receipt, ...receipts];
      notices = [{
        id: `notice-submit-${receipt.id}`,
        text: `${receipt.createdBy} đã gửi ${receipt.code} cho Kế toán thanh toán.`,
        time: createdAt,
      }, ...notices];
      return { data: receipt, status: "saved" } as const;
    },
    pay(accountId: string, receiptId: string) {
      if (accountId !== "account-tran-binh") return { status: "forbidden" } as const;
      const current = receipts.find((receipt) => receipt.id === receiptId);
      if (!current || current.status !== "pending-payment") return { status: "invalid" } as const;
      const paidAt = now().toISOString();
      const paid = { ...current, paidAt, status: "paid" as const };
      receipts = receipts.map((receipt) => receipt.id === receiptId ? paid : receipt);
      notices = [{
        id: `notice-paid-${paid.id}`,
        text: `Kế toán đã thanh toán ${paid.code} cho ${paid.supplierName}.`,
        time: paidAt,
      }, ...notices];
      return { data: paid, status: "saved" } as const;
    },
  });
}

