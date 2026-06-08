"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Schema 流行度分析器
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            輸入任意網址，即時分析頁面 JSON-LD 結構化標記並對照 Web Data Commons 2026-05 資料集
          </p>
        </div>

        <form onSubmit={handleAnalyze} className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
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
              />
              {isOpen && (
                <ul
                  ref={listRef}
                  role="listbox"
                  className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-background py-1 shadow-lg"
                >
                  {suggestions.map((s, i) => (
                    <li
                      key={s}
                      role="option"
                      aria-selected={i === activeIndex}
                      onMouseDown={() => selectSuggestion(s)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={cn(
                        "cursor-pointer truncate px-4 py-2 text-sm",
                        i === activeIndex
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button type="submit" disabled={status === "loading"}>
              {status === "loading" ? (
                <>
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                  分析中…
                </>
              ) : (
                "開始分析"
              )}
            </Button>
          </div>
        </form>

        <div className="mb-6 flex flex-wrap gap-2 justify-center">
          {[
            ["10M+", "bg-emerald-400", "全網主流"],
            ["1M - 10M", "bg-teal-400", "廣泛使用"],
            ["100K - 1M", "bg-blue-400", "中等普及"],
            ["10K - 100K", "bg-yellow-400", "特定產業"],
            ["1K - 10K", "bg-orange-400", "小眾"],
            ["< 1K", "bg-red-400", "非主流"],
          ].map(([bucket, color, desc]) => (
            <div key={bucket} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("size-2.5 rounded-full", color)} />
              <span className="font-medium">{bucket}</span>
              <span className="opacity-60">{desc}</span>
            </div>
          ))}
        </div>

        {status === "loading" && (
          <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            正在爬取並分析…
          </div>
        )}

        {status === "error" && (
          <Alert variant="destructive">
            <AlertTitle>分析失敗</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {status === "success" && data && <AnalysisResult data={data} />}
      </div>
    </main>
  );
}
