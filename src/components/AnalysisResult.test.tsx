import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AnalysisResult, { type AnalysisData, type SchemaResult } from "./AnalysisResult";

const makeSchema = (overrides?: Partial<SchemaResult>): SchemaResult => ({
  type: "Product",
  typeUrl: "http://schema.org/Product",
  typeBucket: "10M+",
  properties: [
    { name: "name", url: "http://schema.org/name", bucket: "10M+", rawValue: [{ "@value": "Widget" }] },
  ],
  ...overrides,
});

const makeData = (overrides?: Partial<AnalysisData>): AnalysisData => ({
  url: "https://example.com",
  schemas: [makeSchema()],
  rawBlocks: ['{"@type":"Product"}'],
  ...overrides,
});

describe("AnalysisResult — empty state", () => {
  it("shows a message when there are no schemas", () => {
    render(<AnalysisResult data={makeData({ schemas: [] })} />);
    expect(screen.getByText(/未發現任何 JSON-LD Schema/)).toBeInTheDocument();
  });
});

describe("AnalysisResult — with data", () => {
  it("renders the schema type name", () => {
    render(<AnalysisResult data={makeData()} />);
    expect(screen.getByText("Product")).toBeInTheDocument();
  });

  it("shows property count in the schema card header", () => {
    render(<AnalysisResult data={makeData()} />);
    expect(screen.getByText("1 個屬性")).toBeInTheDocument();
  });

  it("renders property names in the table", () => {
    render(<AnalysisResult data={makeData()} />);
    expect(screen.getByText("name")).toBeInTheDocument();
  });

  it("renders the summary bar with schema count", () => {
    render(<AnalysisResult data={makeData()} />);
    expect(screen.getByText(/1 種 Schema 類型/)).toBeInTheDocument();
  });

  it("renders the summary bar with property count", () => {
    render(<AnalysisResult data={makeData()} />);
    // The summary heading contains both counts; use the h2 role to disambiguate
    expect(screen.getByRole("heading", { name: /1 個屬性/ })).toBeInTheDocument();
  });
});

describe("SchemaCard toggle", () => {
  it("starts open and collapses when the header is clicked", async () => {
    render(<AnalysisResult data={makeData()} />);
    const toggle = screen.getByRole("button", { name: /Product/ });
    expect(screen.getByText("name")).toBeInTheDocument();
    await userEvent.click(toggle);
    expect(screen.queryByText("name")).not.toBeInTheDocument();
  });

  it("shows '無屬性' when schema has no properties", () => {
    render(<AnalysisResult data={makeData({ schemas: [makeSchema({ properties: [] })] })} />);
    expect(screen.getByText("無屬性")).toBeInTheDocument();
  });
});

describe("RawBlocks toggle", () => {
  it("hides raw blocks by default", () => {
    render(<AnalysisResult data={makeData()} />);
    expect(screen.queryByText('{"@type":"Product"}')).not.toBeInTheDocument();
  });

  it("shows raw blocks after clicking the toggle", async () => {
    render(<AnalysisResult data={makeData()} />);
    const toggle = screen.getByRole("button", { name: /原始 JSON-LD/ });
    await userEvent.click(toggle);
    expect(screen.getByText('{"@type":"Product"}')).toBeInTheDocument();
  });
});

describe("BucketBadge", () => {
  it("renders '未知' for null bucket schemas", () => {
    render(<AnalysisResult data={makeData({ schemas: [makeSchema({ typeBucket: null })] })} />);
    expect(screen.getAllByText("未知").length).toBeGreaterThan(0);
  });
});
