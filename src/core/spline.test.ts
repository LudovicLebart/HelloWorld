import { describe, expect, it } from "vitest";
import { autoHandles, buildCurveFromNodes, insertNodeAt, nearestSegmentIndex, removeNodeAt, setNodeCorner } from "./spline";
import type { EditableNode } from "./types";

const square = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
];

describe("autoHandles", () => {
  it("produit un nœud par point, à la même position", () => {
    const nodes = autoHandles(square);
    expect(nodes).toHaveLength(3);
    nodes.forEach((n, i) => expect(n.point).toEqual(square[i]));
  });

  it("les poignées d'extrémité restent proches du point (pas de tangente aux bouts)", () => {
    const nodes = autoHandles(square);
    expect(nodes[0].handleIn).toEqual(nodes[0].point);
    const last = nodes[nodes.length - 1];
    expect(last.handleOut).toEqual(last.point);
  });
});

describe("buildCurveFromNodes", () => {
  it("moins de 2 nœuds -> courbe vide", () => {
    expect(buildCurveFromNodes(autoHandles([{ x: 0, y: 0 }]))).toEqual([]);
  });

  it("échantillonne du début à la fin (t=0..1, arcLength croissante)", () => {
    const nodes = autoHandles(square);
    const curve = buildCurveFromNodes(nodes);
    expect(curve[0].t).toBeCloseTo(0);
    expect(curve[curve.length - 1].t).toBeCloseTo(1);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].arcLength).toBeGreaterThanOrEqual(curve[i - 1].arcLength);
    }
  });

  it("tangente et normale toujours unitaires et perpendiculaires", () => {
    const curve = buildCurveFromNodes(autoHandles(square));
    for (const sample of curve) {
      expect(Math.hypot(sample.tangent.x, sample.tangent.y)).toBeCloseTo(1, 5);
      expect(Math.hypot(sample.normal.x, sample.normal.y)).toBeCloseTo(1, 5);
      expect(sample.tangent.x * sample.normal.x + sample.tangent.y * sample.normal.y).toBeCloseTo(0, 5);
    }
  });
});

describe("nearestSegmentIndex", () => {
  it("trouve le segment le plus proche d'un point", () => {
    const nodes = autoHandles([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }]);
    expect(nearestSegmentIndex(nodes, { x: 5, y: 1 })).toBe(0);
    expect(nearestSegmentIndex(nodes, { x: 15, y: 1 })).toBe(1);
  });
});

describe("insertNodeAt / removeNodeAt", () => {
  it("insertNodeAt ajoute un nœud entre index et index+1", () => {
    const nodes = autoHandles([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
    const result = insertNodeAt(nodes, 0);
    expect(result).toHaveLength(3);
    // Le nouveau nœud est entre les deux points d'origine sur l'axe X.
    expect(result[1].point.x).toBeGreaterThan(0);
    expect(result[1].point.x).toBeLessThan(10);
  });

  it("removeNodeAt retire exactement le nœud visé", () => {
    const nodes = autoHandles(square);
    const result = removeNodeAt(nodes, 1);
    expect(result).toHaveLength(2);
    expect(result[0].point).toEqual(square[0]);
    expect(result[1].point).toEqual(square[2]);
  });

  it("insertNodeAt/removeNodeAt ne relissent jamais un nœud marqué coin", () => {
    let nodes = autoHandles([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 5 }]);
    nodes = setNodeCorner(nodes, 1, true);
    const cornerHandleIn = { ...nodes[1].handleIn };
    const withInserted = insertNodeAt(nodes, 0);
    // Le nœud coin (désormais à l'index 2 après insertion en position 0-1) garde sa poignée.
    const cornerAfter = withInserted.find((n) => n.corner);
    expect(cornerAfter?.handleIn).toEqual(cornerHandleIn);
  });
});

describe("setNodeCorner", () => {
  it("passer en coin ne change aucune géométrie", () => {
    const nodes = autoHandles(square);
    const before = JSON.parse(JSON.stringify(nodes[1]));
    const result = setNodeCorner(nodes, 1, true);
    expect(result[1].corner).toBe(true);
    expect(result[1].point).toEqual(before.point);
    expect(result[1].handleIn).toEqual(before.handleIn);
    expect(result[1].handleOut).toEqual(before.handleOut);
  });

  it("repasser en lisse réaligne handleOut en miroir de handleIn", () => {
    const nodes: EditableNode[] = [
      { point: { x: 5, y: 5 }, handleIn: { x: 0, y: 5 }, handleOut: { x: 8, y: 2 }, corner: true },
    ];
    const result = setNodeCorner(nodes, 0, false);
    const n = result[0];
    expect(n.corner).toBe(false);
    // handleOut doit être le symétrique de handleIn par rapport au point.
    expect(n.handleOut.x).toBeCloseTo(2 * n.point.x - n.handleIn.x);
    expect(n.handleOut.y).toBeCloseTo(2 * n.point.y - n.handleIn.y);
  });

  it("un nœud auto-lissé (déjà en miroir) revient identique après un aller-retour coin/lisse", () => {
    const nodes = autoHandles([{ x: 0, y: 0 }, { x: 10, y: 3 }, { x: 20, y: 0 }]);
    const before = JSON.parse(JSON.stringify(nodes[1]));
    const toggled = setNodeCorner(nodes, 1, true);
    const back = setNodeCorner(toggled, 1, false);
    expect(back[1].handleIn.x).toBeCloseTo(before.handleIn.x);
    expect(back[1].handleIn.y).toBeCloseTo(before.handleIn.y);
    expect(back[1].handleOut.x).toBeCloseTo(before.handleOut.x);
    expect(back[1].handleOut.y).toBeCloseTo(before.handleOut.y);
  });
});
