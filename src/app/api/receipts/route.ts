import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseReceiptImage, checkItemsAgainstHealthGoals } from "@/lib/openai";
import { insertReceiptItems, getGoals } from "@/lib/insforge";

function getAuth() {
  const jar = cookies();
  return {
    token: jar.get("loop_token")?.value ?? "",
    userId: jar.get("loop_user_id")?.value ?? "",
  };
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
    const goals = await getGoals(userId, token).catch(() => []);
    const healthGoals = goals[0]?.health_goals?.join(", ") ?? "";

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

    // Step 4: Save to DB — await and surface errors
    const today = new Date().toISOString().split("T")[0];
    let saveError: string | null = null;
    try {
      await insertReceiptItems(
        flaggedItems.map((item) => ({
          user_id: userId,
          item_name: item.item_name,
          price: item.price,
          purchase_date: parsed.date ?? today,
          flagged: item.flagged,
          flag_reason: item.flag_reason,
        })),
        token
      );
    } catch (e) {
      saveError = e instanceof Error ? e.message : "DB save failed";
      console.error("insertReceiptItems error:", saveError);
    }

    return NextResponse.json({
      store: parsed.store ?? null,
      date: parsed.date ?? null,
      total: parsed.total ?? null,
      items: flaggedItems,
      saved: saveError === null,
      saveError,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Receipt scan failed";
    console.error("Receipts API error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
