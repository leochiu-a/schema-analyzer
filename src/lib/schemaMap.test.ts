import { describe, it, expect } from "vitest";
import { lookupSchema, isMainstream, BUCKET_ORDER } from "./schemaMap";

describe("lookupSchema", () => {
  it("returns the correct bucket for a known type", () => {
    // http://schema.org/3DModel is "< 1K" in the 2026_05 dataset
    expect(lookupSchema("http://schema.org/3DModel")).toBe("< 1K");
  });

  it("returns null for an unknown name", () => {
    expect(lookupSchema("http://schema.org/DoesNotExist")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(lookupSchema("")).toBeNull();
  });

  it("caches the map across calls (same result on second call)", () => {
    const first = lookupSchema("http://schema.org/3DModel");
    const second = lookupSchema("http://schema.org/3DModel");
    expect(first).toBe(second);
  });
});

describe("isMainstream", () => {
  it.each([
    ["10M+" as const, true],
    ["1M - 10M" as const, true],
    ["100K - 1M" as const, false],
    ["10K - 100K" as const, false],
    ["1K - 10K" as const, false],
    ["< 1K" as const, false],
    [null, false],
  ])("isMainstream(%s) → %s", (bucket, expected) => {
    expect(isMainstream(bucket)).toBe(expected);
  });
});

describe("BUCKET_ORDER", () => {
  it("has 6 entries", () => {
    expect(BUCKET_ORDER).toHaveLength(6);
  });

  it("starts with the most popular bucket", () => {
    expect(BUCKET_ORDER[0]).toBe("10M+");
  });

  it("ends with the least popular bucket", () => {
    expect(BUCKET_ORDER[BUCKET_ORDER.length - 1]).toBe("< 1K");
  });

  it("does not include null", () => {
    expect(BUCKET_ORDER).not.toContain(null);
  });
});
