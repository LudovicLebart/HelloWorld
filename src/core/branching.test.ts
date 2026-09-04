import { describe, expect, it } from "vitest";
import { planAutoBranches, buildAutoBranchPoints } from "./branching";
import { buildCurveFromNodes, autoHandles } from "./spline";
import { AUTO_BRANCH } from "../config";
import type { Point } from "./types";

function straightCurve(length: number) {
  return buildCurveFromNodes(autoHandles([{ x: 0, y: 0 }, { x: length, y: 0 }]));
}

/** Nœuds de contrôle sur un arc de cercle (courbure constante, un seul sens) — pour tester le choix
    du côté convexe/concave indépendamment de tout bruit de tracé à main levée. */
function arcNodes(center: Point, radius: number, fromDeg: number, toDeg: number, count: number): Point[] {
  const nodes: Point[] = [];
  for (let i = 0; i < count; i++) {
    const deg = fromDeg + ((toDeg - fromDeg) * i) / (count - 1);
    const rad = (deg * Math.PI) / 180;
    nodes.push({ x: center.x + radius * Math.cos(rad), y: center.y + radius * Math.sin(rad) });
  }
  return nodes;
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

  it("sur un virage à courbure constante, tous les points d'accroche choisissent le même côté (convexe)", () => {
    const center = { x: 0, y: 0 };
    const radius = 400;
    // Arc assez long pour produire plusieurs points d'accroche (spacing = 90px).
    const nodes = autoHandles(arcNodes(center, radius, 200, 340, 24));
    const curve = buildCurveFromNodes(nodes);
    const plans = planAutoBranches(curve);
    expect(plans.length).toBeGreaterThan(2);
    const sides = new Set(plans.map((p) => p.side));
    expect(sides.size).toBe(1);
  });

  it("le côté choisi est le côté convexe : la branche s'éloigne du centre de courbure, jamais vers le creux", () => {
    const center = { x: 0, y: 0 };
    const radius = 400;
    const nodes = autoHandles(arcNodes(center, radius, 200, 340, 24));
    const curve = buildCurveFromNodes(nodes);
    const plans = planAutoBranches(curve);
    for (const attachment of plans) {
      const points = buildAutoBranchPoints(attachment, 5, 0);
      const distAttachment = Math.hypot(attachment.point.x - center.x, attachment.point.y - center.y);
      // Un point pris un peu plus loin sur la volute (pas le tout premier, qui coïncide avec
      // l'accroche) : doit s'être éloigné du centre de l'arc, pas rapproché (vers le creux).
      const further = points[Math.min(3, points.length - 1)];
      const distFurther = Math.hypot(further.x - center.x, further.y - center.y);
      expect(distFurther).toBeGreaterThan(distAttachment);
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
