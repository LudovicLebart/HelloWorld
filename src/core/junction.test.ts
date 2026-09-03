import { describe, expect, it } from "vitest";
import { unionStemPolygons } from "./junction";

// Détecteur d'auto-intersection segment-segment, brute-force — sert à vérifier que le
// contour d'export ne se replie jamais sur lui-même (voir "corner join").
function segmentsIntersect(p1: any, p2: any, p3: any, p4: any): boolean {
  function cross(o: any, a: any, b: any) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
function polygonSelfIntersects(points: { x: number; y: number }[]): boolean {
  const n = points.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
      if (segmentsIntersect(points[i], points[(i + 1) % n], points[j], points[(j + 1) % n])) return true;
    }
  }
  return false;
}
function parseSubpaths(d: string): { x: number; y: number }[][] {
  const subpaths = d.trim().split(/(?=M )/).filter(Boolean);
  return subpaths.map((sp) => [...sp.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(([, x, y]) => ({ x: Number(x), y: Number(y) })));
}

describe("unionStemPolygons", () => {
  it("aucun polygone -> chaîne vide", () => {
    expect(unionStemPolygons([])).toBe("");
  });

  it("un seul polygone simple : un unique sous-chemin, forme conservée", () => {
    const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    const d = unionStemPolygons([square]);
    const subpaths = parseSubpaths(d);
    expect(subpaths).toHaveLength(1);
    expect(polygonSelfIntersects(subpaths[0])).toBe(false);
  });

  it("corner join : un polygone auto-intersectant (nœud papillon) ressort toujours propre", () => {
    // Un contour "papillon" — ce qu'un offset de tige peut produire dans un virage
    // extrêmement serré (voir docs Étape 1 / TODO "vrai corner join").
    const bowtie = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 10, y: 0 }, { x: 0, y: 10 }];
    const d = unionStemPolygons([bowtie]);
    const subpaths = parseSubpaths(d);
    expect(subpaths.length).toBeGreaterThan(0);
    for (const sub of subpaths) {
      expect(polygonSelfIntersects(sub)).toBe(false);
    }
  });

  it("fusionne deux polygones qui se chevauchent (jonction en Y) en un contour sans double-trait", () => {
    const parent = [{ x: 0, y: -5 }, { x: 20, y: -5 }, { x: 20, y: 5 }, { x: 0, y: 5 }];
    const branch = [{ x: 15, y: -5 }, { x: 30, y: -5 }, { x: 30, y: 5 }, { x: 15, y: 5 }];
    const d = unionStemPolygons([parent, branch]);
    const subpaths = parseSubpaths(d);
    // Fusionnés en un seul contour continu (les deux rectangles se chevauchent largement).
    expect(subpaths).toHaveLength(1);
    expect(polygonSelfIntersects(subpaths[0])).toBe(false);
  });

  it("découpe le résultat par intersection avec un masque fourni", () => {
    const square = [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }];
    const mask = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 20 }, { x: 0, y: 20 }]; // moitié gauche
    const d = unionStemPolygons([square], mask);
    const subpaths = parseSubpaths(d);
    expect(subpaths).toHaveLength(1);
    // Aucun point du contour découpé ne doit dépasser x=10 (bord droit du masque).
    for (const p of subpaths[0]) {
      expect(p.x).toBeLessThanOrEqual(10.001);
    }
  });

  it("polygone dégénéré (moins de 3 points) est ignoré", () => {
    const valid = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
    const degenerate = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    const d = unionStemPolygons([valid, degenerate]);
    expect(parseSubpaths(d)).toHaveLength(1);
  });
});
