/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { hueFromString } from "../wordVisual";

describe("hueFromString", () => {
  it("детерминирована и в диапазоне 0..359", () => {
    const h = hueFromString("apple");
    expect(h).toBe(hueFromString("apple"));
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(360);
  });

  it("разные строки дают разный оттенок", () => {
    expect(hueFromString("apple")).not.toBe(hueFromString("banana"));
  });
});
