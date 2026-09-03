import { describe, expect, it } from "vitest";
import { deserializeCanvas, nodesFromClicks, nodesFromStroke, regenerateVine, serializeCanvas, type VineParams } from "./vine";

const params: VineParams = {
  stemWidth: 8,
  brush: { spacing: 30, sequence: [{ motifId: "leaf", scale: 16, jitter: 0 }] },
};

describe("nodesFromStroke / nodesFromClicks", () => {
  it("simplifie un tracé bruyant en nœuds éditables", () => {
    const raw = Array.from({ length: 50 }, (_, i) => ({ x: i * 4, y: Math.sin(i / 5) * 2 }));
    const nodes = nodesFromStroke(raw, 5);
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.length).toBeLessThan(raw.length);
  });

  it("un nœud par clic en mode Points", () => {
    const clicks = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }];
    expect(nodesFromClicks(clicks)).toHaveLength(3);
  });
});

describe("regenerateVine", () => {
  it("produit courbe, polygone de tige et feuilles cohérents", () => {
    const nodes = nodesFromClicks([{ x: 0, y: 0 }, { x: 200, y: 0 }]);
    const result = regenerateVine(nodes, params);
    expect(result.curve.length).toBeGreaterThan(0);
    expect(result.stemPolygon.length).toBeGreaterThan(0);
    expect(result.stemPathD).toContain("M");
    expect(result.leaves.length).toBeGreaterThan(0);
  });
});

describe("serializeCanvas / deserializeCanvas", () => {
  it("round-trip : ce qui est sérialisé se retrouve identique après désérialisation", () => {
    const nodes = nodesFromClicks([{ x: 0, y: 0 }, { x: 50, y: 50 }]);
    const vines = new Map([["vine-1", { nodes, parentId: undefined, params }]]);
    const mask = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
    const json = serializeCanvas(vines, mask);
    const restored = deserializeCanvas(json);
    expect(restored).not.toBeNull();
    expect(restored!.vines).toHaveLength(1);
    expect(restored!.vines[0].id).toBe("vine-1");
    expect(restored!.vines[0].nodes).toEqual(nodes);
    expect(restored!.mask).toEqual(mask);
  });

  it("masque null se conserve tel quel", () => {
    const json = serializeCanvas(new Map(), null);
    expect(deserializeCanvas(json)!.mask).toBeNull();
  });

  it("JSON invalide -> null, ne plante pas", () => {
    expect(deserializeCanvas("{ceci n'est pas du JSON")).toBeNull();
  });

  it("chaîne vide -> null", () => {
    expect(deserializeCanvas("")).toBeNull();
  });

  it("JSON valide mais de forme incompatible -> null", () => {
    expect(deserializeCanvas(JSON.stringify({ pas: "la bonne forme" }))).toBeNull();
    expect(deserializeCanvas(JSON.stringify([{ id: "x" }]))).toBeNull(); // ancien format (tableau nu, pas {vines, mask})
  });

  it("un nœud de forme invalide dans la liste rejette tout l'instantané", () => {
    const corrupted = JSON.stringify({ vines: [{ id: "v", nodes: "pas un tableau", params: {} }], mask: null });
    expect(deserializeCanvas(corrupted)).toBeNull();
  });

  it("accepte un nœud avec le champ optionnel `corner`", () => {
    const json = JSON.stringify({
      vines: [
        {
          id: "v",
          nodes: [{ point: { x: 0, y: 0 }, handleIn: { x: 0, y: 0 }, handleOut: { x: 1, y: 1 }, corner: true }],
          params,
        },
      ],
      mask: null,
    });
    const restored = deserializeCanvas(json);
    expect(restored).not.toBeNull();
    expect(restored!.vines[0].nodes[0].corner).toBe(true);
  });

  it("rejette un nœud dont `corner` n'est pas un booléen", () => {
    const json = JSON.stringify({
      vines: [
        {
          id: "v",
          nodes: [{ point: { x: 0, y: 0 }, handleIn: { x: 0, y: 0 }, handleOut: { x: 1, y: 1 }, corner: "oui" }],
          params,
        },
      ],
      mask: null,
    });
    expect(deserializeCanvas(json)).toBeNull();
  });
});
