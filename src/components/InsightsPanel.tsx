"use client";

import { useEffect, useState } from "react";
import { Lightbulb, AlertTriangle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";

interface Insight {
  title: string;
  body: string;
  type: "warning" | "tip" | "praise";
}

const CONFIG = {
  warning: { Icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/5", border: "border-amber-500/20" },
  tip:     { Icon: Lightbulb,     color: "text-violet-400", bg: "bg-violet-500/5", border: "border-violet-500/20" },
  praise:  { Icon: CheckCircle2,  color: "text-green-400",  bg: "bg-green-500/5",  border: "border-green-500/20" },
};

export function InsightsPanel() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => (r.status === 401 ? Promise.reject("auth") : r.json()))
      .then((d) => setInsights(d.insights ?? []))
      .catch((e) => { if (e !== "auth") setError(true); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-[#7c6af5] shrink-0" />
          <p className="text-sm text-[#6b6b8a]">Loop is analyzing your data…</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !insights.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-[#7c6af5]" />
        <h2 className="text-xs font-medium text-[#6b6b8a] uppercase tracking-wider">Loop Insights</h2>
      </div>
      {insights.map((insight, i) => {
        const { Icon, color, bg, border } = CONFIG[insight.type] ?? CONFIG.tip;
        return (
          <Card key={i} className={cn("border", border)}>
            <CardContent className={cn("p-4 flex items-start gap-3", bg)}>
              <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", color)} />
              <div>
                <p className="text-sm font-semibold text-[#f0f0f5] mb-0.5">{insight.title}</p>
                <p className="text-xs text-[#a0a0c0] leading-relaxed">{insight.body}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
