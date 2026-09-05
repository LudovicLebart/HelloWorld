import { describe, expect, it } from "vitest";
import { sampleCurvatureSpiral } from "./curvatureSpiral";
import type { Point } from "./types";

/** Angle de chaque segment consécutif de la courbe échantillonnée — sert à approximer la courbure
    discrète (variation d'angle par pas) sans dépendre de l'état interne de l'intégrateur. */
function segmentAngles(points: Point[]): number[] {
  const angles: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    angles.push(Math.atan2(points[i + 1].y - points[i].y, points[i + 1].x - points[i].x));
  }
  return angles;
}

/** Déroule une suite d'angles (évite les sauts de ±2π entre segments consécutifs), pour pouvoir
    comparer une rotation cumulée qui dépasse π sans discontinuité artificielle. */
function unwrap(angles: number[]): number[] {
  const result = [angles[0]];
  for (let i = 1; i < angles.length; i++) {
    let delta = angles[i] - angles[i - 1];
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    result.push(result[i - 1] + delta);
  }
  return result;
}

describe("sampleCurvatureSpiral", () => {
  it("part toujours de l'origine", () => {
    const { points } = sampleCurvatureSpiral({ length: 100, endCurvature: 0.05, curvatureExponent: 4, steps: 30, clockwise: false });
    expect(points[0]).toEqual({ x: 0, y: 0 });
  });

  it("startTangent est toujours (1, 0) par construction", () => {
    const { startTangent } = sampleCurvatureSpiral({ length: 100, endCurvature: 0.05, curvatureExponent: 4, steps: 30, clockwise: false });
    expect(startTangent).toEqual({ x: 1, y: 0 });
  });

  it("la courbure discrète croît de façon monotone le long du parcours", () => {
    const { points } = sampleCurvatureSpiral({ length: 100, endCurvature: 0.05, curvatureExponent: 3, steps: 40, clockwise: false });
    const angles = unwrap(segmentAngles(points));
    const turnPerStep = angles.map((a, i) => (i === 0 ? a : a - angles[i - 1]));
    for (let i = 1; i < turnPerStep.length; i++) {
      expect(turnPerStep[i]).toBeGreaterThanOrEqual(turnPerStep[i - 1] - 1e-9);
    }
  });

  it("un curvatureExponent plus grand retarde la croissance de la courbure", () => {
    const options = { length: 100, endCurvature: 0.05, steps: 40, clockwise: false };
    const linear = sampleCurvatureSpiral({ ...options, curvatureExponent: 1 });
    const delayed = sampleCurvatureSpiral({ ...options, curvatureExponent: 5 });
    const midIndex = Math.floor(options.steps / 2);
    const linearAngle = Math.abs(unwrap(segmentAngles(linear.points))[midIndex]);
    const delayedAngle = Math.abs(unwrap(segmentAngles(delayed.points))[midIndex]);
    expect(delayedAngle).toBeLessThan(linearAngle);
  });

  it("anti-horaire et horaire sont des images miroir (même x, y opposé)", () => {
    const ccw = sampleCurvatureSpiral({ length: 100, endCurvature: 0.05, curvatureExponent: 3, steps: 20, clockwise: false });
    const cw = sampleCurvatureSpiral({ length: 100, endCurvature: 0.05, curvatureExponent: 3, steps: 20, clockwise: true });
    for (let i = 0; i < ccw.points.length; i++) {
      expect(ccw.points[i].x).toBeCloseTo(cw.points[i].x, 5);
      expect(ccw.points[i].y).toBeCloseTo(-cw.points[i].y, 5);
    }
  });

  it("plus de steps -> plus de points échantillonnés", () => {
    const short = sampleCurvatureSpiral({ length: 100, endCurvature: 0.05, curvatureExponent: 3, steps: 20, clockwise: false });
    const long = sampleCurvatureSpiral({ length: 100, endCurvature: 0.05, curvatureExponent: 3, steps: 40, clockwise: false });
    expect(long.points.length).toBeGreaterThan(short.points.length);
  });
});
