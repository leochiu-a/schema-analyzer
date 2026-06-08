import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import * as jsonld from "jsonld";
import type { JsonLdDocument } from "jsonld/jsonld";
import { lookupSchema } from "@/lib/schemaMap";

export const runtime = "nodejs";

type ExpandedNode = Record<string, unknown>;

interface PropertyResult {
  name: string;
  url: string;
  bucket: string | null;
  rawValue: unknown;
}

interface SchemaResult {
  type: string;
  typeUrl: string;
  typeBucket: string | null;
  properties: PropertyResult[];
}

export function processExpandedNode(node: ExpandedNode): SchemaResult | null {
  const types = node["@type"];
  if (!Array.isArray(types) || types.length === 0) return null;

  const typeUrl = String(types[0]).replace("https://schema.org/", "http://schema.org/");
  const typeName = typeUrl.replace(/^https?:\/\/schema\.org\//, "");

  const reservedKeys = new Set(["@type", "@id", "@value", "@language", "@graph"]);

  const properties: PropertyResult[] = Object.entries(node)
    .filter(([k]) => !reservedKeys.has(k))
    .map(([k, v]) => {
      const url = k.replace("https://schema.org/", "http://schema.org/");
      const name = url.replace(/^https?:\/\/schema\.org\//, "");
      return { name, url, bucket: lookupSchema(url), rawValue: v };
    });

  return { type: typeName, typeUrl, typeBucket: lookupSchema(typeUrl), properties };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  console.log("[analyze] request received", { targetUrl });

  if (!targetUrl) {
    return NextResponse.json({ success: false, error: "請提供有效的網址" }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(targetUrl);
  } catch {
    return NextResponse.json({ success: false, error: "網址格式不正確" }, { status: 400 });
  }

  try {
    console.log("[analyze] fetching target url", { url: url.toString() });
    const fetchStart = Date.now();
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    console.log("[analyze] fetch done", { status: response.status, ms: Date.now() - fetchStart });

    if (!response.ok) {
      console.error("[analyze] target responded with error", { status: response.status, url: url.toString() });
      return NextResponse.json(
        { success: false, error: `網站回應失敗，狀態碼: ${response.status}` },
        { status: 502 }
      );
    }

    const html = await response.text();
    console.log("[analyze] html size", { bytes: html.length });

    const $ = cheerio.load(html);
    const schemas: SchemaResult[] = [];
    const rawBlocks: string[] = [];

    const scriptEls = $('script[type="application/ld+json"]').toArray();
    console.log("[analyze] found ld+json blocks", { count: scriptEls.length });

    for (let i = 0; i < scriptEls.length; i++) {
      const el = scriptEls[i];
      try {
        const text = $(el).html();
        if (!text) continue;
        const parsed = JSON.parse(text.trim()) as JsonLdDocument;
        rawBlocks.push(JSON.stringify(parsed, null, 2));

        console.log("[analyze] expanding block", { index: i });
        const expandStart = Date.now();
        const expanded = await jsonld.expand(parsed);
        console.log("[analyze] expanded block", { index: i, nodes: expanded.length, ms: Date.now() - expandStart });

        for (const node of expanded) {
          const result = processExpandedNode(node as unknown as ExpandedNode);
          if (result) schemas.push(result);
        }
      } catch (err) {
        console.error("[analyze] failed to process block", { index: i, error: String(err) });
      }
    }

    console.log("[analyze] done", { schemas: schemas.length });
    return NextResponse.json({ success: true, url: targetUrl, schemas, rawBlocks });
  } catch (error) {
    console.error("[analyze] unhandled error", { error: String(error), stack: error instanceof Error ? error.stack : undefined });
    const message = error instanceof Error ? error.message : "無法連線到目標網站";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
