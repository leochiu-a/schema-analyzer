// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { processExpandedNode, GET } from "./route";

vi.mock("jsonld", () => ({
  expand: vi.fn().mockResolvedValue([
    {
      "@type": ["https://schema.org/Product"],
      "https://schema.org/name": [{ "@value": "Widget" }],
    },
  ]),
}));

vi.mock("@/lib/schemaMap", () => ({
  lookupSchema: vi.fn((url: string) => {
    const map: Record<string, string> = {
      "http://schema.org/Product": "10M+",
      "http://schema.org/name": "10M+",
      "http://schema.org/description": "10M+",
    };
    return map[url] ?? null;
  }),
}));

describe("processExpandedNode", () => {
  it("returns null when @type is missing", () => {
    expect(processExpandedNode({ "https://schema.org/name": ["foo"] })).toBeNull();
  });

  it("returns null when @type is an empty array", () => {
    expect(processExpandedNode({ "@type": [] })).toBeNull();
  });

  it("parses type and properties from a valid expanded node", () => {
    const node = {
      "@type": ["https://schema.org/Product"],
      "https://schema.org/name": [{ "@value": "Widget" }],
    };
    const result = processExpandedNode(node);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("Product");
    expect(result!.typeUrl).toBe("http://schema.org/Product");
    expect(result!.typeBucket).toBe("10M+");
    expect(result!.properties).toHaveLength(1);
    expect(result!.properties[0].name).toBe("name");
    expect(result!.properties[0].url).toBe("http://schema.org/name");
  });

  it("normalizes https schema.org URLs to http", () => {
    const node = {
      "@type": ["https://schema.org/Product"],
      "https://schema.org/name": [{ "@value": "Widget" }],
    };
    const result = processExpandedNode(node);
    expect(result!.typeUrl).toMatch(/^http:\/\/schema\.org\//);
    expect(result!.properties[0].url).toMatch(/^http:\/\/schema\.org\//);
  });

  it("filters out @type, @id, @value, @language, @graph reserved keys", () => {
    const node = {
      "@type": ["https://schema.org/Product"],
      "@id": "https://example.com/p1",
      "@value": "something",
      "@language": "zh",
      "@graph": [],
      "https://schema.org/name": [{ "@value": "Widget" }],
    };
    const result = processExpandedNode(node);
    expect(result!.properties).toHaveLength(1);
    expect(result!.properties[0].name).toBe("name");
  });

  it("returns empty properties array when no properties present", () => {
    const node = { "@type": ["https://schema.org/Product"] };
    const result = processExpandedNode(node);
    expect(result!.properties).toHaveLength(0);
  });

  it("sets bucket to null for unknown properties", () => {
    const node = {
      "@type": ["https://schema.org/Product"],
      "https://schema.org/unknownProp": [{ "@value": "x" }],
    };
    const result = processExpandedNode(node);
    expect(result!.properties[0].bucket).toBeNull();
  });
});

describe("GET /api/analyze", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when url param is missing", async () => {
    const req = new Request("http://localhost/api/analyze");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when url is malformed", async () => {
    const req = new Request("http://localhost/api/analyze?url=not-a-url");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 502 when the target site responds with a non-ok status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: false, status: 403, text: async () => "" })
    );
    const req = new Request("http://localhost/api/analyze?url=https://example.com");
    const res = await GET(req);
    expect(res.status).toBe(502);
  });

  it("returns 500 on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("ECONNREFUSED")));
    const req = new Request("http://localhost/api/analyze?url=https://example.com");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("ECONNREFUSED");
  });

  it("returns schemas for a page with valid JSON-LD", async () => {
    const html = `<html><head>
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"Product","name":"Widget"}
      </script>
    </head></html>`;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: true, status: 200, text: async () => html })
    );
    const req = new Request("http://localhost/api/analyze?url=https://example.com");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.schemas).toHaveLength(1);
    expect(body.schemas[0].type).toBe("Product");
    expect(body.rawBlocks).toHaveLength(1);
  });

  it("skips malformed JSON-LD blocks and still succeeds", async () => {
    const html = `<html><head>
      <script type="application/ld+json">{ invalid json }</script>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Widget"}</script>
    </head></html>`;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: true, status: 200, text: async () => html })
    );
    const req = new Request("http://localhost/api/analyze?url=https://example.com");
    const res = await GET(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.schemas).toHaveLength(1);
  });

  it("returns empty schemas when page has no JSON-LD blocks", async () => {
    const html = `<html><body><p>No schema here</p></body></html>`;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: true, status: 200, text: async () => html })
    );
    const req = new Request("http://localhost/api/analyze?url=https://example.com");
    const res = await GET(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.schemas).toHaveLength(0);
  });
});
