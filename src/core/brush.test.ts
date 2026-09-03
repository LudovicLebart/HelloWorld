import { describe, expect, it } from "vitest";
import { placeBrush, type MotifSequenceEntry } from "./brush";
import { autoHandles, buildCurveFromNodes } from "./spline";

const straightCurve = buildCurveFromNodes(autoHandles([{ x: 0, y: 0 }, { x: 400, y: 0 }]));

const oneMotif: MotifSequenceEntry[] = [{ motifId: "leaf", scale: 16, jitter: 0 }];

describe("placeBrush", () => {
  it("courbe trop courte -> aucun placement", () => {
    expect(placeBrush([], { spacing: 20, sequence: oneMotif })).toEqual([]);
  });

  it("place environ total/spacing instances le long de la courbe", () => {
    const placements = placeBrush(straightCurve, { spacing: 40, sequence: oneMotif });
    // ~400px de long, pas de 40px : autour de 10 instances.
    expect(placements.length).toBeGreaterThanOrEqual(8);
    expect(placements.length).toBeLessThanOrEqual(11);
  });

  it("fait alterner les motifs de la séquence dans l'ordre, en boucle", () => {
    const sequence: MotifSequenceEntry[] = [
      { motifId: "a", scale: 10, jitter: 0 },
      { motifId: "b", scale: 10, jitter: 0 },
    ];
    const placements = placeBrush(straightCurve, { spacing: 40, sequence });
    expect(placements.length).toBeGreaterThan(2);
    placements.forEach((p, i) => {
      expect(p.motifId).toBe(i % 2 === 0 ? "a" : "b");
    });
  });

  it("échelle nulle en jitter=0 : exactement l'échelle demandée au centre de la tige (taper=1)", () => {
    const placements = placeBrush(straightCurve, { spacing: 40, sequence: [{ motifId: "leaf", scale: 20, jitter: 0 }] });
    // Un placement bien au centre doit être à taper ~1, donc scale ~20 * (0.1+0.9*1) = 20.
    const central = placements[Math.floor(placements.length / 2)];
    expect(central.scale).toBeCloseTo(20, 0);
  });

  it("séquence vide -> repli sur un motif par défaut, ne plante pas", () => {
    const placements = placeBrush(straightCurve, { spacing: 40, sequence: [] });
    expect(placements.length).toBeGreaterThan(0);
    expect(placements[0].motifId).toBe("leaf");
  });

  it("taperStart=false : le tout premier placement n'est pas amenuisé à zéro", () => {
    const placements = placeBrush(straightCurve, {
      spacing: 40,
      sequence: [{ motifId: "leaf", scale: 20, jitter: 0 }],
      taperStart: false,
    });
    expect(placements[0].scale).toBeGreaterThan(5);
  });
});
