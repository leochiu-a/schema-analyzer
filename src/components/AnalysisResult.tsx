"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

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

const BUCKET_BADGE_CLS: Record<string, string> = {
  "10M+": "border-emerald-300 bg-emerald-50 text-emerald-800",
  "1M - 10M": "border-teal-300 bg-teal-50 text-teal-800",
  "100K - 1M": "border-blue-300 bg-blue-50 text-blue-800",
  "10K - 100K": "border-yellow-300 bg-yellow-50 text-yellow-800",
  "1K - 10K": "border-orange-300 bg-orange-50 text-orange-800",
  "< 1K": "border-red-300 bg-red-50 text-red-800",
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
  return (
    <Badge variant="outline" className={cn(BUCKET_BADGE_CLS[bucket ?? ""])}>
      {bucket ?? "未知"}
    </Badge>
  );
}

function ValueDisplay({ rawValue }: { rawValue: unknown }) {
  const [open, setOpen] = useState(false);
  if (rawValue === null || rawValue === undefined) return null;
  const json = JSON.stringify(rawValue, null, 2);
  const isMultiline = json.includes("\n");

  if (!isMultiline) {
    return <span className="text-xs text-foreground/70 font-mono">{json}</span>;
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
      >
        <ChevronRight
          className={cn("size-3 transition-transform", open && "rotate-90")}
        />
        {open ? "收合" : "展開"}
      </button>
      {open && (
        <pre className="mt-1 text-xs text-foreground/70 bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">
          {json}
        </pre>
      )}
    </div>
  );
}

function SchemaCard({ schema }: { schema: SchemaResult }) {
  const [open, setOpen] = useState(true);

  return (
    <Card className="py-0 gap-0 overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
          <div className="flex items-center gap-2.5 min-w-0">
            <ChevronRight
              className={cn(
                "size-3.5 text-muted-foreground shrink-0 transition-transform",
                open && "rotate-90"
              )}
            />
            <span className="font-semibold text-card-foreground">{schema.type}</span>
            <BucketBadge bucket={schema.typeBucket} />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {schema.properties.length} 個屬性
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {schema.properties.length > 0 ? (
            <>
              <Separator />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-36 text-xs">屬性</TableHead>
                    <TableHead className="text-xs">值</TableHead>
                    <TableHead className="text-right text-xs w-28">流行度</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schema.properties.map((p) => (
                    <TableRow key={p.name}>
                      <TableCell className="font-mono text-xs text-indigo-700 align-top w-36 whitespace-nowrap">
                        {p.name}
                      </TableCell>
                      <TableCell className="text-xs align-top">
                        <ValueDisplay rawValue={p.rawValue} />
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <BucketBadge bucket={p.bucket} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Separator />
              <p className="px-4 py-1.5 text-xs text-muted-foreground font-mono">
                {schema.typeUrl}
              </p>
            </>
          ) : (
            <>
              <Separator />
              <p className="px-4 py-3 text-sm text-muted-foreground">無屬性</p>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          分析摘要 — {typeCount} 種 Schema 類型 / {propCount} 個屬性
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {rows.map(([label, key, counts, total]) => (
            <div key={key}>
              <p className="mb-1.5">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-default" />
                    }
                  >
                    {label} ({LABEL_META[key].short})
                    <Info className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-52">
                    {LABEL_META[key].tip}
                  </TooltipContent>
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
                      className={cn(BUCKET_DOT[b], "transition-all")}
                      style={{ width: `${pct}%` }}
                    />
                  );
                })}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {bucketOrder
                  .filter((b) => counts[b] > 0)
                  .map((b) => (
                    <span key={b} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className={cn("inline-block size-2 rounded-full", BUCKET_DOT[b])} />
                      {b}: {counts[b]}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RawBlocks({ blocks }: { blocks: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="py-0 gap-0 overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
          <span className="text-sm font-semibold text-card-foreground">原始 JSON-LD</span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="divide-y divide-border">
            {blocks.map((block, i) => (
              <pre
                key={i}
                className="p-4 text-xs text-foreground/70 font-mono overflow-x-auto whitespace-pre leading-relaxed bg-muted/30"
              >
                {block}
              </pre>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function AnalysisResult({ data }: { data: AnalysisData }) {
  if (data.schemas.length === 0) {
    return (
      <Alert>
        <AlertTitle>此頁面未發現任何 JSON-LD Schema 標記</AlertTitle>
        <AlertDescription>
          確認網址是否正確，或該頁面可能使用 Microdata / RDFa 格式（目前不支援）
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SummaryBar schemas={data.schemas} />
      {data.rawBlocks?.length > 0 && <RawBlocks blocks={data.rawBlocks} />}
      <div className="flex flex-col gap-3">
        {data.schemas.map((s, i) => (
          <SchemaCard key={`${s.typeUrl}-${i}`} schema={s} />
        ))}
      </div>
    </div>
  );
}
