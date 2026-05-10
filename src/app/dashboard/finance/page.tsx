"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, TrendingDown, Tag, AlertTriangle, CheckCircle2, FileText, Database } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  flagged: boolean;
  flag_reason: string;
}

interface Summary {
  totalSpent: number;
  totalFlagged: number;
  categories: Record<string, number>;
  transactions: Transaction[];
  saved?: boolean;
  saveError?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "text-orange-400",
  "Groceries": "text-green-400",
  "Transport": "text-blue-400",
  "Entertainment": "text-purple-400",
  "Shopping": "text-pink-400",
  "Health & Fitness": "text-emerald-400",
  "Subscriptions": "text-violet-400",
  "Utilities": "text-yellow-400",
  "Housing": "text-red-400",
  "Travel": "text-cyan-400",
  "Other": "text-gray-400",
};

export default function FinancePage() {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"flagged" | "all" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    const isPDF = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isCSV = file.type === "text/csv" || file.name.endsWith(".csv");

    if (!isPDF && !isCSV) {
      setError("Please upload a PDF or CSV bank statement.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let body: string;

      if (isCSV) {
        const text = await file.text();
        body = JSON.stringify({ csv: text });
      } else {
        // PDF: send as base64
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((s, b) => s + String.fromCharCode(b), "")
        );
        body = JSON.stringify({ pdf: base64 });
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = "/auth?reason=expired";
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to process file");
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const sortedCategories = summary
    ? Object.entries(summary.categories).sort((a, b) => b[1] - a[1])
    : [];

  const flaggedTx = summary?.transactions.filter((t) => t.flagged) ?? [];
  const shownTx = activeTab === "flagged" ? flaggedTx
    : activeTab === "all" ? (summary?.transactions ?? [])
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-[#f0f0f5]">Finance Tracker</h1>
        <p className="text-sm text-[#6b6b8a] mt-1">
          Upload your bank statement (PDF or CSV) to analyze spending vs. your savings goal.
        </p>
      </div>

      {!summary && (
        <div className="space-y-3">
          <div
            className={cn(
              "border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200",
              dragging ? "border-[#7c6af5] bg-[#7c6af5]/5" : "border-[#1e1e2e] bg-[#111118]",
              loading && "pointer-events-none opacity-60"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,application/pdf,text/csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
            />
            <div className="w-14 h-14 rounded-2xl bg-[#7c6af5]/10 flex items-center justify-center mx-auto mb-4">
              {loading
                ? <svg className="animate-spin h-7 w-7 text-[#7c6af5]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <FileText className="w-7 h-7 text-[#7c6af5]" />
              }
            </div>
            <p className="font-semibold text-[#f0f0f5] mb-1">
              {loading ? "Analyzing transactions with GPT-4o…" : "Drag & drop your bank statement"}
            </p>
            <p className="text-sm text-[#6b6b8a]">PDF or CSV — all major banks supported</p>
            {error && (
              <p className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                {error}
              </p>
            )}
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={loading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload bank statement (PDF or CSV)
          </Button>
        </div>
      )}

      {summary && (
        <>
          {/* Save status */}
          {summary.saved === false && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Could not save to history: {summary.saveError ?? "DB error"}. Results shown below but will not appear on your dashboard.</span>
            </div>
          )}
          {summary.saved === true && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400">
              <Database className="w-4 h-4 shrink-0" />
              <span>Saved to your history — visible on the dashboard.</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center">
              <p className="text-xs text-[#6b6b8a] mb-1">Total spent</p>
              <p className="text-xl font-semibold text-[#f0f0f5]">${summary.totalSpent.toFixed(2)}</p>
            </Card>
            <Card className="p-4 text-center border-red-500/20">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <p className="text-xs text-[#6b6b8a]">Flagged</p>
              </div>
              <p className="text-xl font-semibold text-red-400">{flaggedTx.length}</p>
            </Card>
            <Card className="p-4 text-center border-green-500/20">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                <p className="text-xs text-[#6b6b8a]">Clean</p>
              </div>
              <p className="text-xl font-semibold text-green-400">
                {summary.transactions.length - flaggedTx.length}
              </p>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#7c6af5]" />
                <h2 className="font-semibold text-[#f0f0f5]">Top Categories</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {sortedCategories.slice(0, 6).map(([cat, total]) => {
                const pct = Math.round((total / summary.totalSpent) * 100);
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={cn("font-medium", CATEGORY_COLORS[cat] ?? "text-[#f0f0f5]")}>{cat}</span>
                      <span className="text-[#6b6b8a]">${total.toFixed(2)} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-[#1a1a28] rounded-full overflow-hidden">
                      <div className="h-full bg-[#7c6af5] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div>
            <div className="flex gap-2 mb-4">
              {(["flagged", "all"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(activeTab === tab ? null : tab)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                    activeTab === tab ? "bg-[#7c6af5]/15 text-[#7c6af5]" : "bg-[#1a1a28] text-[#6b6b8a] hover:text-[#f0f0f5]"
                  )}
                >
                  {tab === "flagged" ? `Flagged (${flaggedTx.length})` : `All (${summary.transactions.length})`}
                </button>
              ))}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setSummary(null); setActiveTab(null); }}>
                Upload new
              </Button>
            </div>

            {shownTx.length > 0 && (
              <Card>
                <div className="divide-y divide-[#1e1e2e]">
                  {shownTx.map((tx, i) => (
                    <div key={i} className="flex items-start gap-3 p-4">
                      <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", tx.flagged ? "bg-red-400" : "bg-green-400")} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-sm font-medium text-[#f0f0f5] truncate">{tx.description}</p>
                          <p className={cn("text-sm font-semibold shrink-0", tx.flagged ? "text-red-400" : "text-[#f0f0f5]")}>
                            ${Math.abs(tx.amount).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-[#6b6b8a]">{tx.date}</span>
                          <span className={cn("text-xs", CATEGORY_COLORS[tx.category] ?? "text-[#6b6b8a]")}>{tx.category}</span>
                        </div>
                        {tx.flag_reason && (
                          <div className="flex items-center gap-1 mt-1">
                            <TrendingDown className="w-3 h-3 text-red-400" />
                            <p className="text-xs text-red-400">{tx.flag_reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
