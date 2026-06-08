"use client";

import React, { useState } from "react";

export type DomainBucket =
  | "10M+"
  | "1M - 10M"
  | "100K - 1M"
  | "10K - 100K"
  | "1K - 10K"
  | "< 1K"
  | null;

interface PropertyResult {
  name: string;
  url: string;
  bucket: DomainBucket;
  rawValue: unknown;
}

export interface SchemaResult {
  type: string;
  typeUrl: string;
  typeBucket: DomainBucket;
  properties: PropertyResult[];
}

export interface AnalysisData {
  url: string;
  schemas: SchemaResult[];
  rawBlocks: string[];
}

const BUCKET_COLORS: Record<string, string> = {
  "10M+": "bg-emerald-100 text-emerald-800 border-emerald-300",
  "1M - 10M": "bg-teal-100 text-teal-800 border-teal-300",
  "100K - 1M": "bg-blue-100 text-blue-800 border-blue-300",
  "10K - 100K": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "1K - 10K": "bg-orange-100 text-orange-800 border-orange-300",
  "< 1K": "bg-red-100 text-red-800 border-red-300",
  unknown: "bg-gray-100 text-gray-500 border-gray-300",
};

const BUCKET_DOT: Record<string, string> = {
  "10M+": "bg-emerald-400",
  "1M - 10M": "bg-teal-400",
  "100K - 1M": "bg-blue-400",
  "10K - 100K": "bg-yellow-400",
  "1K - 10K": "bg-orange-400",
  "< 1K": "bg-red-400",
};

function BucketBadge({ bucket }: { bucket: DomainBucket }) {
  const label = bucket ?? "未知";
  const cls = BUCKET_COLORS[bucket ?? "unknown"];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

function ValueDisplay({ rawValue }: { rawValue: unknown }) {
  const [open, setOpen] = useState(false);
  if (rawValue === null || rawValue === undefined) return null;
  const json = JSON.stringify(rawValue, null, 2);
  const isMultiline = json.includes("\n");

  if (!isMultiline) {
    return <span className="text-xs text-gray-600 font-mono">{json}</span>;
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
      >
        <svg
          className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {open ? "收合" : "展開"}
      </button>
      {open && (
        <pre className="mt-1 text-xs text-gray-600 bg-gray-50 rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">
          {json}
        </pre>
      )}
    </div>
  );
}

function SchemaCard({ schema }: { schema: SchemaResult }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <svg
            className={`h-3.5 w-3.5 text-gray-400 transition-transform shrink-0 ${open ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold text-gray-900">{schema.type}</span>
          <BucketBadge bucket={schema.typeBucket} />
        </div>
        <span className="text-xs text-gray-400 shrink-0">{schema.properties.length} 個屬性</span>
      </button>

      {/* Property table */}
      {open && schema.properties.length > 0 && (
        <div className="border-t border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-36">屬性</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">值</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 w-28">流行度</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {schema.properties.map((p) => (
                <tr key={p.name} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-indigo-700 align-top w-36 whitespace-nowrap">
                    {p.name}
                  </td>
                  <td className="px-4 py-2 text-gray-600 text-xs align-top">
                    <ValueDisplay rawValue={p.rawValue} />
                  </td>
                  <td className="px-4 py-2 text-right align-top">
                    <BucketBadge bucket={p.bucket} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-1.5 text-xs text-gray-400 font-mono border-t border-gray-50">{schema.typeUrl}</p>
        </div>
      )}

      {open && schema.properties.length === 0 && (
        <p className="px-4 py-3 text-sm text-gray-400 border-t border-gray-100">無屬性</p>
      )}
    </div>
  );
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex items-center gap-1">
      {children}
      <span className="cursor-help text-gray-400 hover:text-gray-600">
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-56 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs text-gray-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          {text}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      </span>
    </span>
  );
}

const LABEL_META: Record<string, { short: string; tip: string }> = {
  itemtype: {
    short: "Itemtype",
    tip: "Schema.org 定義的資料類型，對應 JSON-LD 的 @type，例如 Product、Article、BreadcrumbList。",
  },
  predicate: {
    short: "Predicate",
    tip: "Schema.org 定義的屬性名稱，對應 JSON-LD 的鍵名，例如 name、price、author。",
  },
};

function SummaryBar({ schemas }: { schemas: SchemaResult[] }) {
  const bucketOrder = ["10M+", "1M - 10M", "100K - 1M", "10K - 100K", "1K - 10K", "< 1K"];
  const allProperties = schemas.flatMap((s) => s.properties);
  const typeCount = schemas.length;
  const propCount = allProperties.length;

  const typeBuckets = Object.fromEntries(
    bucketOrder.map((b) => [b, schemas.filter((s) => s.typeBucket === b).length])
  );
  const propBuckets = Object.fromEntries(
    bucketOrder.map((b) => [b, allProperties.filter((p) => p.bucket === b).length])
  );

  const rows: [string, string, Record<string, number>, number][] = [
    ["Schema 類型", "itemtype", typeBuckets, typeCount],
    ["屬性", "predicate", propBuckets, propCount],
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">
        分析摘要 — {typeCount} 種 Schema 類型 / {propCount} 個屬性
      </h2>
      <div className="space-y-3">
        {rows.map(([label, key, counts, total]) => (
          <div key={key}>
            <p className="mb-1 flex items-center gap-1 text-xs text-gray-500">
              <Tooltip text={LABEL_META[key].tip}>
                {label} ({LABEL_META[key].short})
              </Tooltip>
            </p>
            <div className="flex h-4 w-full overflow-hidden rounded-full">
              {bucketOrder.map((b) => {
                const pct = total > 0 ? (counts[b] / total) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={b}
                    title={`${b}: ${counts[b]} (${pct.toFixed(1)}%)`}
                    className={`${BUCKET_DOT[b]} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                );
              })}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {bucketOrder
                .filter((b) => counts[b] > 0)
                .map((b) => (
                  <span key={b} className="flex items-center gap-1 text-xs text-gray-500">
                    <span className={`inline-block h-2 w-2 rounded-full ${BUCKET_DOT[b]}`} />
                    {b}: {counts[b]}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



function RawBlocks({ blocks }: { blocks: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700">原始 JSON-LD</span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {blocks.map((block, i) => (
            <pre
              key={i}
              className="p-4 text-xs text-gray-700 font-mono overflow-x-auto whitespace-pre leading-relaxed bg-gray-50"
            >
              {block}
            </pre>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnalysisResult({ data }: { data: AnalysisData }) {
  if (data.schemas.length === 0) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
        <p className="text-yellow-800 font-medium">此頁面未發現任何 JSON-LD Schema 標記</p>
        <p className="mt-1 text-sm text-yellow-600">
          確認網址是否正確，或該頁面可能使用 Microdata / RDFa 格式（目前不支援）
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SummaryBar schemas={data.schemas} />
      {data.rawBlocks?.length > 0 && <RawBlocks blocks={data.rawBlocks} />}
      <div className="space-y-3">
        {data.schemas.map((s, i) => (
          <SchemaCard key={`${s.typeUrl}-${i}`} schema={s} />
        ))}
      </div>
    </div>
  );
}
