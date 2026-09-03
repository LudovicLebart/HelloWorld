import { afterEach, describe, expect, it, vi } from "vitest";
import { loadFromStorage, saveToStorage } from "./persistence";

describe("persistence", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("écrit puis relit la même valeur", () => {
    saveToStorage("k", "hello");
    expect(loadFromStorage("k")).toBe("hello");
  });

  it("clé absente -> null", () => {
    expect(loadFromStorage("does-not-exist")).toBeNull();
  });

  it("écriture qui échoue (quota dépassé, navigation privée...) n'est pas fatale", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => saveToStorage("k", "v")).not.toThrow();
  });

  it("lecture qui échoue retourne null plutôt que de planter", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(loadFromStorage("k")).toBeNull();
  });
});
