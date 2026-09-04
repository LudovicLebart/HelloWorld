import { describe, expect, it } from "vitest";
import { sampleLogSpiral } from "./logSpiral";

describe("sampleLogSpiral", () => {
  it("part toujours de l'origine", () => {
    const { points } = sampleLogSpiral({ turns: 1.6, growthRate: 0.15, startRadius: 10, samplesPerTurn: 10, clockwise: false });
    expect(points[0]).toEqual({ x: 0, y: 0 });
  });

  it("le rayon décroît au fil des échantillons", () => {
    const startRadius = 20;
    const { points } = sampleLogSpiral({ turns: 2, growthRate: 0.2, startRadius, samplesPerTurn: 12, clockwise: false });
    // Le centre de l'enroulement est fixe, à (-startRadius, 0) dans le repère décalé (origine au
    // point de départ) : le rayon décroît vers ce centre au fil de l'échantillonnage.
    const center = { x: -startRadius, y: 0 };
    const distances = points.map((p) => Math.hypot(p.x - center.x, p.y - center.y));
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]).toBeLessThanOrEqual(distances[i - 1] + 1e-9);
    }
  });

  it("anti-horaire et horaire sont des images miroir (même |y|, x opposé en tendance)", () => {
    const ccw = sampleLogSpiral({ turns: 1, growthRate: 0.15, startRadius: 10, samplesPerTurn: 8, clockwise: false });
    const cw = sampleLogSpiral({ turns: 1, growthRate: 0.15, startRadius: 10, samplesPerTurn: 8, clockwise: true });
    expect(ccw.startTangent.y).toBeCloseTo(-cw.startTangent.y, 5);
    expect(ccw.startTangent.x).toBeCloseTo(cw.startTangent.x, 5);
  });

  it("startTangent est unitaire", () => {
    const { startTangent } = sampleLogSpiral({ turns: 1.6, growthRate: 0.15, startRadius: 10, samplesPerTurn: 10, clockwise: false });
    expect(Math.hypot(startTangent.x, startTangent.y)).toBeCloseTo(1, 5);
  });

  it("plus de tours -> plus de points échantillonnés", () => {
    const short = sampleLogSpiral({ turns: 1, growthRate: 0.15, startRadius: 10, samplesPerTurn: 10, clockwise: false });
    const long = sampleLogSpiral({ turns: 2, growthRate: 0.15, startRadius: 10, samplesPerTurn: 10, clockwise: false });
    expect(long.points.length).toBeGreaterThan(short.points.length);
  });
});
