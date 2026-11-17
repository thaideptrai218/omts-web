import { describe, expect, it } from "vitest";
import { vndInWords } from "./vnd-in-words";

describe("vndInWords", () => {
  it.each([
    [0, "không đồng"],
    [300000, "ba trăm nghìn đồng"],
    [1500000, "một triệu năm trăm nghìn đồng"],
    [1000000000, "một tỷ đồng"],
    [25000, "hai mươi lăm nghìn đồng"],
    [21000, "hai mươi mốt nghìn đồng"],
    [15000, "mười lăm nghìn đồng"],
    [1005000, "một triệu không trăm lẻ năm nghìn đồng"],
    [2250000000, "hai tỷ hai trăm năm mươi triệu đồng"],
    [-50000, "âm năm mươi nghìn đồng"],
  ])("reads %i", (amount, words) => {
    expect(vndInWords(amount)).toBe(words);
  });

  it("returns an empty string for non-finite input", () => {
    expect(vndInWords(Number.NaN)).toBe("");
  });
});
