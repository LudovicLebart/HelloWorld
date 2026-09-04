import { describe, expect, it } from "vitest";
import { planAutoBranches, buildAutoBranchPoints } from "./branching";
import { buildCurveFromNodes, autoHandles } from "./spline";
import { AUTO_BRANCH } from "../config";

function straightCurve(length: number) {
  return buildCurveFromNodes(autoHandles([{ x: 0, y: 0 }, { x: length, y: 0 }]));
}

describe("planAutoBranches", () => {
  it("courbe trop courte -> aucun point d'accroche", () => {
    expect(planAutoBranches(straightCurve(AUTO_BRANCH.spacing * 0.5))).toEqual([]);
  });

  it("moins de 2 échantillons -> aucun point d'accroche", () => {
    expect(planAutoBranches([])).toEqual([]);
  });

  it("le nombre de points d'accroche croît avec la longueur totale", () => {
    const short = planAutoBranches(straightCurve(AUTO_BRANCH.spacing * 3));
    const long = planAutoBranches(straightCurve(AUTO_BRANCH.spacing * 10));
    expect(long.length).toBeGreaterThan(short.length);
  });

  it("les côtés alternent strictement", () => {
    const plans = planAutoBranches(straightCurve(AUTO_BRANCH.spacing * 8));
    expect(plans.length).toBeGreaterThan(2);
    for (let i = 1; i < plans.length; i++) {
      expect(plans[i].side).not.toBe(plans[i - 1].side);
    }
  });

  it("aucun point d'accroche dans la marge des extrémités", () => {
    const total = AUTO_BRANCH.spacing * 8;
    const plans = planAutoBranches(straightCurve(total));
    for (const p of plans) {
      expect(p.point.x).toBeGreaterThan(0);
      expect(p.point.x).toBeLessThan(total);
    }
  });
});

describe("buildAutoBranchPoints", () => {
  const plans = planAutoBranches(straightCurve(AUTO_BRANCH.spacing * 6));
  const attachment = plans[0];

  it("part du point d'accroche", () => {
    const points = buildAutoBranchPoints(attachment, 5, 0);
    expect(points[0].x).toBeCloseTo(attachment.point.x, 5);
    expect(points[0].y).toBeCloseTo(attachment.point.y, 5);
  });

  it("la taille décroît géométriquement avec generationIndex", () => {
    const extent = (points: ReturnType<typeof buildAutoBranchPoints>) =>
      Math.max(...points.map((p) => Math.hypot(p.x - attachment.point.x, p.y - attachment.point.y)));
    const first = extent(buildAutoBranchPoints(attachment, 5, 0));
    const later = extent(buildAutoBranchPoints(attachment, 5, 3));
    expect(later).toBeLessThan(first);
  });

  it("les deux côtés partent dans des directions différentes (jamais tout droit)", () => {
    const left = buildAutoBranchPoints({ ...attachment, side: -1 }, 5, 0);
    const right = buildAutoBranchPoints({ ...attachment, side: 1 }, 5, 0);
    expect(left[1]).not.toEqual(right[1]);
  });
});
