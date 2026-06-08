import path from "path";
import fs from "fs";

export type DomainBucket =
  | "10M+"
  | "1M - 10M"
  | "100K - 1M"
  | "10K - 100K"
  | "1K - 10K"
  | "< 1K"
  | null;

export type SchemaClass = "Itemtype" | "Predicate";

interface RawRecord {
  Class: SchemaClass;
  Name: string;
  "Domain Bucket": string;
}

let _map: Map<string, DomainBucket> | null = null;

function getMap(): Map<string, DomainBucket> {
  if (_map) return _map;

  const filePath = path.join(process.cwd(), "public", "2026_05.json");
  const raw: RawRecord[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  _map = new Map(
    raw.map((r) => [r.Name, r["Domain Bucket"] as DomainBucket])
  );
  return _map;
}

export function lookupSchema(name: string): DomainBucket {
  return getMap().get(name) ?? null;
}

export const BUCKET_ORDER: DomainBucket[] = [
  "10M+",
  "1M - 10M",
  "100K - 1M",
  "10K - 100K",
  "1K - 10K",
  "< 1K",
];

export function isMainstream(bucket: DomainBucket): boolean {
  return bucket === "10M+" || bucket === "1M - 10M";
}
