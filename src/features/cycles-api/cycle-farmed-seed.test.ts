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
  it("names a legacy cycle by the seed of its seeding records, without a nursery part", () => {
    expect(farmedSeedText({ seedItemName: "Hàu giống Thái Bình Dương 3 cm", seedLot: { code: "PN000008-1", itemName: "Hàu giống Thái Bình Dương 3 cm" }, nurseryCode: null })).toBe("Hàu giống Thái Bình Dương 3 cm · lô PN000008-1");
    expect(farmedSeedText({ seedItemName: "Hàu giống A", seedItemNames: ["Hàu giống A", "Hàu giống B"], seedLot: { code: "PN000002-1", itemName: "Hàu giống A" } })).toBe("Hàu giống A + Hàu giống B · lô PN000002-1");
    expect(farmedSeedName({ seedItemNames: ["Hàu giống A"] })).toBe("Hàu giống A");
  });
  it("says the seed is unknown for a legacy cycle without any", () => {
    expect(farmedSeedText({ seedLot: null })).toBe("Chưa xác định giống");
    expect(farmedSeedText(null)).toBe("Chưa xác định giống");
  });
});
