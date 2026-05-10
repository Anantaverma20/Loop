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

  const prompt = `You are Loop, a personal accountability AI. Give the user 3-4 smart, specific insights based on their actual data.

GOALS:
- Savings goal: "${goal?.savings_target ?? "Not set"}"
- Health goals: "${goal?.health_goals?.join(", ") ?? "Not set"}"

SPENDING DATA (${txData.length} transactions, $${totalSpent.toFixed(2)} total):
- Flagged discretionary spending: ${flaggedTx.length} transactions = $${flaggedSpent.toFixed(2)}
- Top flagged transactions: ${flaggedTx.slice(0, 6).map((t) => `${t.description} ($${Math.abs(t.amount).toFixed(2)})`).join(" | ")}
- Repeat offenders: ${topMerchants.map(([m, c]) => `${m} × ${c}`).join(", ")}
- Top spending categories: ${topCats.map(([c, a]) => `${c} $${a.toFixed(0)}`).join(", ")}

HEALTH DATA (${receiptData.length} receipt items scanned):
- Items conflicting with health goals: ${flaggedReceipts.length}
- Flagged items: ${flaggedReceipts.slice(0, 6).map((r) => r.item_name).join(", ")}

INSIGHT RULES:
- Reference REAL merchant names and dollar amounts from the data above
- Each insight must suggest ONE specific action
- Tone: direct coach, not judgmental
- If a merchant appears multiple times, call it out specifically
- "type" must be: "warning" (overspending pattern), "tip" (actionable advice), or "praise" (something going well)

Return ONLY valid JSON: {"insights":[{"title":"string (max 7 words)","body":"1-2 sentences mentioning real data","type":"warning|tip|praise"}]}`;

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
