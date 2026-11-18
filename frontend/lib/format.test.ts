import { describe, expect, it } from "vitest";
import { formatContext, formatPrice, formatScore, parseSlugs } from "./format";

describe("format", () => {
  it("formats context windows", () => {
    expect(formatContext(1_000_000)).toBe("1M");
    expect(formatContext(256_000)).toBe("256K");
  });
  it("formats prices", () => {
    expect(formatPrice(0)).toBe("Self-hosted");
    expect(formatPrice(0.4)).toBe("$0.40");
    expect(formatPrice(15)).toBe("$15");
  });
  it("formats scores", () => {
    expect(formatScore(null)).toBe("-");
    expect(formatScore(84.123)).toBe("84.1");
  });
  it("parses and de-duplicates slugs, capped at 5", () => {
    expect(parseSlugs("a, b,a,,c,d,e,f")).toEqual(["a", "b", "c", "d", "e"]);
    expect(parseSlugs(undefined)).toEqual([]);
  });
});
