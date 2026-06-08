import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Home page", () => {
  it("renders the heading", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /Schema 流行度分析器/ })).toBeInTheDocument();
  });

  it("renders a URL input and submit button", () => {
    render(<Home />);
    expect(screen.getByPlaceholderText("https://example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "開始分析" })).toBeInTheDocument();
  });

  it("shows loading state while the request is in flight", async () => {
    let resolve: (v: unknown) => void;
    const pending = new Promise((r) => { resolve = r; });
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(pending));

    render(<Home />);
    const input = screen.getByPlaceholderText("https://example.com");
    await userEvent.type(input, "https://example.com");
    await userEvent.click(screen.getByRole("button", { name: "開始分析" }));

    expect(screen.getByRole("button", { name: "分析中…" })).toBeInTheDocument();
    resolve!({ ok: true, json: async () => ({ success: true, url: "https://example.com", schemas: [], rawBlocks: [] }) });
  });

  it("shows error message on API failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        json: async () => ({ success: false, error: "網址格式不正確" }),
      })
    );

    render(<Home />);
    await userEvent.type(screen.getByPlaceholderText("https://example.com"), "https://example.com");
    await userEvent.click(screen.getByRole("button", { name: "開始分析" }));

    await waitFor(() => {
      expect(screen.getByText("網址格式不正確")).toBeInTheDocument();
    });
  });

  it("shows error message on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("ECONNREFUSED")));

    render(<Home />);
    await userEvent.type(screen.getByPlaceholderText("https://example.com"), "https://example.com");
    await userEvent.click(screen.getByRole("button", { name: "開始分析" }));

    await waitFor(() => {
      expect(screen.getByText("ECONNREFUSED")).toBeInTheDocument();
    });
  });

  it("renders AnalysisResult on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        json: async () => ({
          success: true,
          url: "https://example.com",
          schemas: [
            {
              type: "Product",
              typeUrl: "http://schema.org/Product",
              typeBucket: "10M+",
              properties: [],
            },
          ],
          rawBlocks: [],
        }),
      })
    );

    render(<Home />);
    await userEvent.type(screen.getByPlaceholderText("https://example.com"), "https://example.com");
    await userEvent.click(screen.getByRole("button", { name: "開始分析" }));

    await waitFor(() => {
      expect(screen.getByText("Product")).toBeInTheDocument();
    });
  });
});
