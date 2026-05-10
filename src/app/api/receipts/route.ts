import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseReceiptImage, checkItemsAgainstHealthGoals } from "@/lib/openai";

const INSFORGE_URL = process.env.INSFORGE_URL ?? "";
const INSFORGE_ANON_KEY = process.env.INSFORGE_ANON_KEY ?? "";

function getAuth() {
  const jar = cookies();
  return {
    token: jar.get("loop_token")?.value ?? "",
    userId: jar.get("loop_user_id")?.value ?? "",
  };
}

async function getHealthGoals(userId: string, token: string): Promise<string> {
  try {
    const res = await fetch(
      `${INSFORGE_URL}/api/database/records/goals?user_id=eq.${userId}&limit=1`,
      { headers: { Authorization: `Bearer ${token}`, apikey: INSFORGE_ANON_KEY } }
    );
    if (!res.ok) return "";
    const data = await res.json();
    const goals = Array.isArray(data) ? data[0] : data;
    return goals?.health_goals?.join(", ") ?? "";
  } catch { return ""; }
}

async function saveReceiptItems(
  items: { item_name: string; price: number; flagged: boolean; flag_reason: string }[],
  userId: string,
  purchaseDate: string,
  token: string
) {
  if (!items.length) return;
  const rows = items.map((item) => ({
    user_id: userId,
    item_name: item.item_name,
    price: item.price,
    purchase_date: purchaseDate,
    flagged: item.flagged,
    flag_reason: item.flag_reason,
  }));
  try {
    await fetch(`${INSFORGE_URL}/api/database/records/receipt_items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: INSFORGE_ANON_KEY,
      },
      body: JSON.stringify(rows),
    });
  } catch (e) {
    console.error("Failed to save receipt items:", e);
  }
}

export async function POST(req: NextRequest) {
  const { token, userId } = getAuth();
  if (!token || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { base64, mimeType } = await req.json();
  if (!base64) return NextResponse.json({ error: "No image provided" }, { status: 400 });

  try {
    // Step 1: Extract items with GPT-4o Vision
    const parsed = await parseReceiptImage(base64, mimeType ?? "image/jpeg");

    if (!parsed.items || parsed.items.length === 0) {
      return NextResponse.json({ error: "No items found in the receipt image." }, { status: 422 });
    }

    // Step 2: Fetch user health goals
    const healthGoals = await getHealthGoals(userId, token);

    // Step 3: Flag items against health goals
    let flaggedItems: { item_name: string; price: number; flagged: boolean; flag_reason: string }[];

    if (healthGoals) {
      const checked = await checkItemsAgainstHealthGoals(
        parsed.items.map((i) => ({ name: i.name, price: i.price })),
        healthGoals
      );
      flaggedItems = checked.map((c) => ({
        item_name: c.item_name,
        price: Number(c.price) || 0,
        flagged: c.flagged,
        flag_reason: c.flag_reason,
      }));
    } else {
      flaggedItems = parsed.items.map((i) => ({
        item_name: i.name,
        price: Number(i.price) || 0,
        flagged: false,
        flag_reason: "",
      }));
    }

    // Step 4: Save to InsForge (fire and forget — don't let DB errors block the response)
    const today = new Date().toISOString().split("T")[0];
    await saveReceiptItems(flaggedItems, userId, parsed.date ?? today, token);

    return NextResponse.json({
      store: parsed.store ?? null,
      date: parsed.date ?? null,
      total: parsed.total ?? null,
      items: flaggedItems,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Receipt scan failed";
    console.error("Receipts API error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
