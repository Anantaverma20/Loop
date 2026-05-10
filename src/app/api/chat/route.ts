import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import OpenAI from "openai";
import {
  getGoals,
  getTransactions,
  getReceiptItems,
  getBills,
  getGymCheckins,
} from "@/lib/insforge";
import { differenceInDays, parseISO } from "date-fns";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getAuth() {
  const jar = cookies();
  return {
    token: jar.get("loop_token")?.value ?? "",
    userId: jar.get("loop_user_id")?.value ?? "",
  };
}

export async function POST(req: NextRequest) {
  const { token, userId } = getAuth();
  if (!token || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages } = await req.json();

  // Gather all user context in parallel
  const [goals, transactions, receipts, bills, checkins] = await Promise.all([
    getGoals(userId, token).catch(() => []),
    getTransactions(userId, token).catch(() => []),
    getReceiptItems(userId, token).catch(() => []),
    getBills(userId, token).catch(() => []),
    getGymCheckins(userId, token).catch(() => []),
  ]);

  const goal = goals[0];
  const flaggedTx = transactions.filter((t) => t.flagged);
  const totalSpent = transactions.reduce((s, t) => s + Math.abs(t.amount), 0);
  const flaggedItems = receipts.filter((r) => r.flagged);

  const lastCheckin = checkins[0]?.checkin_date ?? null;
  const daysSinceGym = lastCheckin
    ? differenceInDays(new Date(), parseISO(lastCheckin))
    : null;

  const upcomingBills = bills
    .filter((b) => differenceInDays(parseISO(b.due_date), new Date()) >= 0)
    .slice(0, 5);

  const context = `
You are Loop, a personal accountability AI agent. Answer based ONLY on the user's real data below.
Do not invent numbers or facts. Be concise, direct, and honest.

## User Goals
- Savings target: ${goal?.savings_target ?? "not set"}
- Health goals: ${goal?.health_goals?.join(", ") ?? "not set"}
- Active subscriptions: ${goal?.subscriptions ?? "none"}

## Finance Summary
- Total spent: $${totalSpent.toFixed(2)} across ${transactions.length} transactions
- Flagged transactions: ${flaggedTx.length} (overspending vs. savings goal)
- Top flagged: ${flaggedTx.slice(0, 3).map((t) => `${t.description} $${Math.abs(t.amount).toFixed(2)}`).join(", ") || "none"}

## Receipt Items
- Flagged health items: ${flaggedItems.slice(0, 5).map((r) => `${r.item_name} ($${r.price}) — ${r.flag_reason}`).join("; ") || "none"}

## Bills
- Upcoming: ${upcomingBills.map((b) => `${b.name} $${b.amount} due ${b.due_date}`).join(", ") || "none"}

## Gym
- Days since last gym visit: ${daysSinceGym ?? "no data"}
- Total check-ins: ${checkins.length}
`.trim();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: context },
      ...messages,
    ],
    max_tokens: 500,
    temperature: 0.4,
  });

  const reply = completion.choices[0]?.message.content ?? "I couldn't generate a response.";
  return NextResponse.json({ reply });
}
