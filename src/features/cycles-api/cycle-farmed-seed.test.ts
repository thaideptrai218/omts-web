import { describe, expect, it } from "vitest";
import { farmedSeedName, farmedSeedText } from "./cycle-farmed-seed";

describe("the seed a raft farms", () => {
  it("names the seed, its lot and its nursery batch, never the sold product", () => {
    const cycle = { seedItemName: "Hàu giống bản địa Vân Đồn 3 cm", seedLot: { code: "PN000013-1", itemName: "Hàu giống bản địa Vân Đồn 3 cm" }, nurseryCode: "NU000007", productName: "Hàu sống loại nhỏ" };
    expect(farmedSeedText(cycle)).toBe("Hàu giống bản địa Vân Đồn 3 cm · lô PN000013-1 · đợt ươm NU000007");
  });
  it("falls back to the item name of the seed lot and skips what is unknown", () => {
    expect(farmedSeedName({ seedLot: { code: "", itemName: "Hàu giống A" } })).toBe("Hàu giống A");
    expect(farmedSeedText({ seedItemName: "  ", seedLot: { code: "", itemName: "Hàu giống A" }, nurseryCode: "NU1" })).toBe("Hàu giống A · đợt ươm NU1");
  });
  it("says the seed is unknown for a legacy cycle without any", () => {
    expect(farmedSeedText({ seedLot: null })).toBe("Chưa xác định giống");
    expect(farmedSeedText(null)).toBe("Chưa xác định giống");
  });
});
