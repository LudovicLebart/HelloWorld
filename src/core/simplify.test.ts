import { describe, expect, it } from "vitest";
import { simplifyRDP } from "./simplify";

describe("simplifyRDP", () => {
  it("garde toujours le premier et le dernier point", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 5 },
      { x: 2, y: -3 },
      { x: 10, y: 0 },
    ];
    const result = simplifyRDP(points, 100);
    expect(result[0]).toEqual(points[0]);
    expect(result[result.length - 1]).toEqual(points[points.length - 1]);
  });

  it("réduit une ligne quasi-droite à ses deux extrémités avec un epsilon large", () => {
    const points = Array.from({ length: 20 }, (_, i) => ({ x: i, y: Math.sin(i) * 0.01 }));
    const result = simplifyRDP(points, 5);
    expect(result).toHaveLength(2);
  });

  it("garde les points significatifs d'un virage net même avec un epsilon large", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 100 }, // coin net
      { x: 10, y: 100 },
    ];
    const result = simplifyRDP(points, 1);
    expect(result.length).toBeGreaterThan(2);
  });

  it("epsilon quasi nul garde (presque) tous les points", () => {
    const points = Array.from({ length: 10 }, (_, i) => ({ x: i, y: Math.sin(i) * 3 }));
    const result = simplifyRDP(points, 0.001);
    expect(result.length).toBeGreaterThanOrEqual(8);
  });

  it("moins de 3 points : retourné tel quel", () => {
    const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    expect(simplifyRDP(points, 10)).toEqual(points);
  });
});
