"use client";
import { z } from "zod";
import { Dialog } from "@/components/ui/dialog";
import * as c from "./contracts";
import { DataTable, Money } from "./ui";

/** Material cost per raft for the current filters; each receipt code opens that receipt. */
export function ReceiptRaftCostsDialog({
  costs,
  onClose,
  onOpenReceipt,
}: {
  costs: z.infer<typeof c.raftCostsSchema>;
  onClose(): void;
  onOpenReceipt(receiptId: string): void;
}) {
  return (
    <Dialog
      open
      title="Chi phí vật tư bè"
      size="lg"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DataTable headings={["Vùng", "Bè", "Chi phí", "Phiếu nhập"]} empty={!costs.length}>
        {costs.map((row) => (
          <tr key={row.raft.id}>
            <td>{row.zone.name}</td>
            <td>{row.raft.code}</td>
            <td>
              <Money value={row.materialCost} />
            </td>
            <td>
              {row.receipts.map((receipt) => (
                <button
                  key={receipt.receiptId}
                  className="mr-3 text-primary underline"
                  onClick={() => {
                    onClose();
                    onOpenReceipt(receipt.receiptId);
                  }}
                >
                  {receipt.code}
                </button>
              ))}
            </td>
          </tr>
        ))}
      </DataTable>
    </Dialog>
  );
}
