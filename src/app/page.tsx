"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import AnalysisResult, { type AnalysisData } from "@/components/AnalysisResult";

type Status = "idle" | "loading" | "success" | "error";

const HISTORY_KEY = "schema-analyzer-history";
const MAX_HISTORY = 20;

function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveToHistory(url: string) {
  const history = loadHistory().filter((u) => u !== url);
  history.unshift(url);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const updateSuggestions = useCallback((value: string) => {
    const history = loadHistory();
    if (!value) {
      setSuggestions(history.slice(0, 8));
    } else {
      setSuggestions(history.filter((u) => u.includes(value)).slice(0, 8));
    }
    setActiveIndex(-1);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setUrl(value);
    updateSuggestions(value);
    setShowSuggestions(true);
  }

  function handleFocus() {
    updateSuggestions(url);
    setShowSuggestions(true);
  }

  function handleBlur(e: React.FocusEvent) {
    if (!listRef.current?.contains(e.relatedTarget as Node)) {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  }

  function selectSuggestion(value: string) {
    setUrl(value);
    setShowSuggestions(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  }

  // scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setShowSuggestions(false);
    setStatus("loading");
    setData(null);
    setError("");

    try {
      const res = await fetch(
        `/api/analyze?url=${encodeURIComponent(trimmed)}`
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "分析失敗");
      saveToHistory(trimmed);
      setData(json as AnalysisData);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知錯誤");
      setStatus("error");
    }
  }

  const isOpen = showSuggestions && suggestions.length > 0;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Schema 流行度分析器
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            輸入任意網址，即時分析頁面 JSON-LD 結構化標記並對照 Web Data Commons 2026-05 資料集
          </p>
        </div>

        {/* Input form */}
        <form onSubmit={handleAnalyze} className="mb-6">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="url"
                value={url}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder="https://example.com"
                required
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              {isOpen && (
                <ul
                  ref={listRef}
                  role="listbox"
                  className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                >
                  {suggestions.map((s, i) => (
                    <li
                      key={s}
                      role="option"
                      aria-selected={i === activeIndex}
                      onMouseDown={() => selectSuggestion(s)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`cursor-pointer truncate px-4 py-2 text-sm ${
                        i === activeIndex
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === "loading" ? "分析中…" : "開始分析"}
            </button>
          </div>
        </form>

        {/* Legend */}
        <div className="mb-6 flex flex-wrap gap-2 justify-center">
          {[
            ["10M+", "bg-emerald-400", "全網主流"],
            ["1M - 10M", "bg-teal-400", "廣泛使用"],
            ["100K - 1M", "bg-blue-400", "中等普及"],
            ["10K - 100K", "bg-yellow-400", "特定產業"],
            ["1K - 10K", "bg-orange-400", "小眾"],
            ["< 1K", "bg-red-400", "非主流"],
          ].map(([bucket, color, desc]) => (
            <div key={bucket} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
              <span className="font-medium">{bucket}</span>
              <span className="text-gray-400">{desc}</span>
            </div>
          ))}
        </div>

        {/* States */}
        {status === "loading" && (
          <div className="flex items-center justify-center gap-3 py-16 text-gray-500">
            <svg
              className="h-5 w-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            正在爬取並分析…
          </div>
        )}

        {status === "error" && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">分析失敗</p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
        )}

        {status === "success" && data && <AnalysisResult data={data} />}
      </div>
    </main>
  );
}
