"use client";

import { useState, useRef } from "react";
import { Camera, Upload, AlertTriangle, CheckCircle2, SkipForward, ImagePlus, Database } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

interface ScannedItem {
  item_name: string;
  price: number;
  flagged: boolean;
  flag_reason: string;
}

interface ScanResult {
  store: string | null;
  date: string | null;
  items: ScannedItem[];
  total: number | null;
  saved?: boolean;
  saveError?: string;
}

export default function ReceiptsPage() {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, HEIC).");
      return;
    }
    setLoading(true);
    setError("");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = () => { setError("Could not read the file."); setLoading(false); };
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        const res = await fetch("/api/receipts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, mimeType: file.type }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to scan receipt");
        if (!data.items || data.items.length === 0) throw new Error("No items found — try a clearer photo.");
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };
  };

  const flagged = result?.items.filter((i) => i.flagged) ?? [];
  const clean   = result?.items.filter((i) => !i.flagged) ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-[#f0f0f5]">Receipt Scanner</h1>
        <p className="text-sm text-[#6b6b8a] mt-1">
          Upload a receipt photo — GPT-4o extracts every item and flags anything that conflicts with your health goals.
        </p>
      </div>

      {!result && (
        <div className="space-y-3">
          {/* Drop zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200",
              dragging ? "border-[#7c6af5] bg-[#7c6af5]/5" : "border-[#1e1e2e] bg-[#111118]",
              loading && "pointer-events-none opacity-60"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) processImage(file);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processImage(f); }}
            />

            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              {loading
                ? <svg className="animate-spin h-7 w-7 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <Camera className="w-7 h-7 text-blue-400" />
              }
            </div>

            <p className="font-semibold text-[#f0f0f5] mb-1">
              {loading ? "Scanning with GPT-4o Vision…" : "Drag & drop a receipt image"}
            </p>
            <p className="text-sm text-[#6b6b8a]">JPG, PNG, HEIC supported</p>

            {error && (
              <p className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                {error}
              </p>
            )}
          </div>

          {/* Prominent upload buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              disabled={loading}
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute("capture");
                  fileInputRef.current.click();
                }
              }}
            >
              <ImagePlus className="w-4 h-4 mr-2" />
              Upload photo
            </Button>
            <Button
              size="lg"
              className="w-full"
              disabled={loading}
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.setAttribute("capture", "environment");
                  fileInputRef.current.click();
                }
              }}
            >
              <Camera className="w-4 h-4 mr-2" />
              Take photo
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Save status */}
          {result.saved === false && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Could not save to history: {result.saveError ?? "DB error"}. Results shown but will not appear on your dashboard.</span>
            </div>
          )}
          {result.saved === true && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400">
              <Database className="w-4 h-4 shrink-0" />
              <span>Saved to your history — visible on the dashboard.</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              {result.store && <p className="font-semibold text-[#f0f0f5]">{result.store}</p>}
              {result.date  && <p className="text-sm text-[#6b6b8a]">{result.date}</p>}
              {result.total != null && (
                <p className="text-sm text-[#6b6b8a]">Total: <span className="text-[#f0f0f5] font-medium">${result.total.toFixed(2)}</span></p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => { setResult(null); setError(""); }}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              New scan
            </Button>
          </div>

          {/* Flagged — "Skip It Next Time" */}
          {flagged.length > 0 && (
            <Card className="border-amber-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <SkipForward className="w-4 h-4 text-amber-400" />
                  <h2 className="font-semibold text-[#f0f0f5]">Skip It Next Time</h2>
                  <span className="badge-yellow">{flagged.length} item{flagged.length > 1 ? "s" : ""}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {flagged.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 bg-amber-500/5 border border-amber-500/15 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#f0f0f5] text-sm">{item.item_name}</p>
                      {item.flag_reason && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                          <p className="text-xs text-amber-400">{item.flag_reason}</p>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-amber-400 shrink-0">${item.price.toFixed(2)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Clean items */}
          {clean.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <h2 className="font-semibold text-[#f0f0f5]">Good choices</h2>
                  <span className="badge-green">{clean.length} item{clean.length > 1 ? "s" : ""}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 pt-0">
                {clean.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1.5 border-b border-[#1e1e2e] last:border-0">
                    <span className="text-[#c0c0d8]">{item.item_name}</span>
                    <span className="text-[#6b6b8a]">${item.price.toFixed(2)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
