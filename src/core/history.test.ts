import { describe, expect, it } from "vitest";
import { SnapshotHistory } from "./history";

describe("SnapshotHistory", () => {
  it("canUndo/canRedo faux au départ", () => {
    const h = new SnapshotHistory(10);
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
  });

  it("undo() sans push retourne null", () => {
    const h = new SnapshotHistory(10);
    expect(h.undo("current")).toBeNull();
  });

  it("push puis undo restaure l'instantané précédent et permet un redo", () => {
    const h = new SnapshotHistory(10);
    h.push("a");
    expect(h.canUndo).toBe(true);
    const prev = h.undo("b");
    expect(prev).toBe("a");
    expect(h.canRedo).toBe(true);
    const next = h.redo("a");
    expect(next).toBe("b");
  });

  it("push efface le redo en cours (une nouvelle branche invalide l'ancien futur)", () => {
    const h = new SnapshotHistory(10);
    h.push("a");
    h.undo("b");
    expect(h.canRedo).toBe(true);
    h.push("c");
    expect(h.canRedo).toBe(false);
  });

  it("respecte la limite : les plus anciens instantanés sont abandonnés", () => {
    const h = new SnapshotHistory(2);
    h.push("a");
    h.push("b");
    h.push("c"); // "a" doit être abandonné
    expect(h.undo("d")).toBe("c");
    expect(h.undo("c")).toBe("b");
    expect(h.undo("b")).toBeNull();
  });

  it("séquence complète undo/undo/redo/redo cohérente", () => {
    const h = new SnapshotHistory(10);
    h.push("v1");
    h.push("v2");
    // état courant simulé : "v3"
    let current = "v3";
    let prev = h.undo(current)!;
    current = prev;
    expect(current).toBe("v2");
    prev = h.undo(current)!;
    current = prev;
    expect(current).toBe("v1");
    let next = h.redo(current)!;
    current = next;
    expect(current).toBe("v2");
    next = h.redo(current)!;
    current = next;
    expect(current).toBe("v3");
  });
});
