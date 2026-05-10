import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getAuth } from "@/lib/withAuth";
import { getGoals, getTransactions, getReceiptItems } from "@/lib/insforge";

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export async function GET() {
  const ctx = getAuth();
  if (!ctx.token || !ctx.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [goalsRes, txRes, receiptRes] = await Promise.allSettled([
    getGoals(ctx.userId, ctx.token),
    getTransactions(ctx.userId, ctx.token),
    getReceiptItems(ctx.userId, ctx.token),
  ]);

  const goal = goalsRes.status === "fulfilled" ? goalsRes.value[0] : null;
  const txData = txRes.status === "fulfilled" ? txRes.value : [];
  const receiptData = receiptRes.status === "fulfilled" ? receiptRes.value : [];

  if (!goal && !txData.length && !receiptData.length) {
    return NextResponse.json({ insights: [] });
  }

  const flaggedTx = txData.filter((t) => t.flagged);
  const totalSpent = txData.reduce((s, t) => s + Math.abs(t.amount), 0);
  const flaggedSpent = flaggedTx.reduce((s, t) => s + Math.abs(t.amount), 0);
  const flaggedReceipts = receiptData.filter((r) => r.flagged);

  const catTotals: Record<string, number> = {};
  for (const t of txData) catTotals[t.category] = (catTotals[t.category] ?? 0) + Math.abs(t.amount);
  const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 4);

  // Count repeat merchants
  const merchantCount: Record<string, number> = {};
  for (const t of flaggedTx) {
    const key = t.description.replace(/PURCHASE\s+/i, "").slice(0, 30);
    merchantCount[key] = (merchantCount[key] ?? 0) + 1;
  }
  const topMerchants = Object.entries(merchantCount).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const hasReceiptData = receiptData.length > 0;
  const hasTxData = txData.length > 0;

  const prompt = `You are Loop, a personal accountability AI agent. Generate 3-4 smart insights based ONLY on the data provided below. Never invent data or assume something is fine just because data is missing.

=== USER GOALS ===
Savings goal: "${goal?.savings_target ?? "Not set"}"
Health goals: "${goal?.health_goals?.join(", ") ?? "Not set"}"

=== FINANCIAL TRANSACTIONS (${txData.length} total, $${totalSpent.toFixed(2)} spent) ===
${hasTxData ? `Flagged as discretionary overspending (${flaggedTx.length} transactions, $${flaggedSpent.toFixed(2)} total):
${flaggedTx.slice(0, 8).map((t) => `  - ${t.description}: $${Math.abs(t.amount).toFixed(2)} — ${t.flag_reason || "discretionary"}`).join("\n")}
Repeat merchants: ${topMerchants.map(([m, c]) => `${m} (×${c})`).join(", ") || "none"}
Top categories: ${topCats.map(([c, a]) => `${c} $${a.toFixed(0)}`).join(", ")}` : "No transaction data yet."}

=== RECEIPT SCANS ===
${hasReceiptData
  ? `${receiptData.length} items scanned from receipts.
Items flagged as conflicting with health goals (${flaggedReceipts.length}):
${flaggedReceipts.length > 0
  ? flaggedReceipts.slice(0, 6).map((r) => `  - ${r.item_name}: $${r.price.toFixed(2)} — ${r.flag_reason}`).join("\n")
  : "  None flagged — all scanned items align with health goals."}`
  : "No receipts scanned yet. DO NOT make any claims about health goal compliance — there is simply no data."}

=== INSIGHT RULES (follow strictly) ===
1. ONLY generate insights about data that actually exists above. Never say "0 conflicts" or "great job" for missing data — that means no data, not a good result.
2. If a merchant in the financial flags (e.g. Starbucks, McDonalds) also relates to a health goal (e.g. "cut sugar", "eat less junk"), call out BOTH the financial cost AND the health angle in a single insight.
3. Reference REAL names and dollar amounts from the data. Be specific.
4. Each insight must include ONE concrete action the user can take.
5. Tone: direct coach, honest, not preachy.
6. "type": "warning" = bad pattern to address, "tip" = actionable suggestion, "praise" = something genuinely positive (only use if there is real positive data).
7. Do NOT use "praise" if the only positive signal is absence of data.

Return ONLY valid JSON: {"insights":[{"title":"max 7 words","body":"1-2 sentences with real data and a concrete action","type":"warning|tip|praise"}]}`;

  try {
    const response = await getClient().chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 700,
    });
    const parsed = JSON.parse(response.choices[0]?.message.content ?? "{}");
    return NextResponse.json({ insights: parsed.insights ?? [] });
  } catch (e) {
    console.error("Insights error:", e);
    return NextResponse.json({ insights: [] });
  }
}
