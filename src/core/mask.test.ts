import { describe, expect, it } from "vitest";
import { isPointInMask } from "./mask";

const square = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

describe("isPointInMask", () => {
  it("point clairement à l'intérieur", () => {
    expect(isPointInMask({ x: 5, y: 5 }, square)).toBe(true);
  });

  it("point clairement à l'extérieur", () => {
    expect(isPointInMask({ x: 50, y: 50 }, square)).toBe(false);
    expect(isPointInMask({ x: -5, y: 5 }, square)).toBe(false);
  });

  it("fonctionne pour un polygone non convexe (en L)", () => {
    const lShape = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 5, y: 5 },
      { x: 5, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(isPointInMask({ x: 2, y: 8 }, lShape)).toBe(true);
    // Dans le creux du L, donc hors du polygone.
    expect(isPointInMask({ x: 8, y: 8 }, lShape)).toBe(false);
  });
});
