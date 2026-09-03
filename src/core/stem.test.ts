import { describe, expect, it } from "vitest";
import { buildStemPolygon, polygonToPath, widthProfile } from "./stem";
import { buildCurveFromNodes, autoHandles } from "./spline";

describe("widthProfile", () => {
  it("nulle aux deux extrémités par défaut, pleine au centre", () => {
    expect(widthProfile(0, 10)).toBe(0);
    expect(widthProfile(1, 10)).toBe(0);
    expect(widthProfile(0.5, 10)).toBeCloseTo(10, 5);
  });

  it("taperStart=false : pleine largeur dès t=0", () => {
    expect(widthProfile(0, 10, { taperStart: false })).toBeCloseTo(10, 5);
  });

  it("taperEnd=false : pleine largeur jusqu'à t=1", () => {
    expect(widthProfile(1, 10, { taperEnd: false })).toBeCloseTo(10, 5);
  });

  it("jamais négative ni au-delà de baseWidth", () => {
    for (let t = 0; t <= 1; t += 0.1) {
      const w = widthProfile(t, 10);
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(10 + 1e-9);
    }
  });
});

describe("buildStemPolygon", () => {
  it("moins de 2 points de courbe -> polygone vide", () => {
    expect(buildStemPolygon([], 10)).toEqual([]);
  });

  it("produit deux points par échantillon (offset gauche + droit)", () => {
    const curve = buildCurveFromNodes(autoHandles([{ x: 0, y: 0 }, { x: 100, y: 0 }]));
    const polygon = buildStemPolygon(curve, 10);
    expect(polygon).toHaveLength(curve.length * 2);
  });

  it("les extrémités du polygone convergent (largeur nulle) avec le taper par défaut", () => {
    const curve = buildCurveFromNodes(autoHandles([{ x: 0, y: 0 }, { x: 100, y: 0 }]));
    const polygon = buildStemPolygon(curve, 10);
    const first = polygon[0];
    const last = polygon[polygon.length - 1];
    // Premier point (offset gauche du tout début) et dernier point (offset droit,
    // qui referme sur le même début après le .reverse()) doivent coïncider : largeur 0.
    expect(Math.hypot(first.x - last.x, first.y - last.y)).toBeCloseTo(0, 5);
  });
});

describe("polygonToPath", () => {
  it("polygone vide -> chaîne vide", () => {
    expect(polygonToPath([])).toBe("");
  });

  it("sérialise en sous-chemin M...Z fermé", () => {
    const d = polygonToPath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]);
    expect(d.startsWith("M ")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect(d).toContain("L");
  });
});
