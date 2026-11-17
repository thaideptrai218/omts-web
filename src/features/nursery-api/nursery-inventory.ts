/** UnitField passes ungrouped text; keep the draft unchanged until checking or sending. */
export function nurseryDraftNumber(text: string): number {
  const normalized = text.trim().replace(",", ".");
  return /^\d+(\.\d{0,2})?$/.test(normalized) ? Number(normalized) : NaN;
}

export function estimatedLoss(quantityIn: number, survivors: number, closeLossPieces = 0) {
  const lossPieces = Math.round((quantityIn - survivors + closeLossPieces) * 100) / 100;
  return { lossPieces, lossPercent: quantityIn > 0 ? Math.round(lossPieces / quantityIn * 10_000) / 100 : 0, estimated: true as const };
}
