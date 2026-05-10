import { NextRequest, NextResponse } from "next/server";
import { parseReceiptImage, checkItemsAgainstHealthGoals } from "@/lib/openai";
import { insertReceiptItems, getGoals } from "@/lib/insforge";
import {
  getAuth,
  withTokenRefresh,
  sessionExpiredResponse,
  applyNewTokens,
} from "@/lib/withAuth";

export async function POST(req: NextRequest) {
  const ctx = getAuth();
  if (!ctx.token || !ctx.userId) {
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
    const goals = await getGoals(ctx.userId, ctx.token).catch(() => []);
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

    // Step 4: Save to DB — auto-refresh token if expired
    const today = new Date().toISOString().split("T")[0];
    const dbRows = flaggedItems.map((item) => ({
      user_id: ctx.userId,
      item_name: item.item_name,
      price: item.price,
      purchase_date: parsed.date ?? today,
      flagged: item.flagged,
      flag_reason: item.flag_reason,
    }));

    let saveError: string | null = null;
    let newToken: string | undefined;
    let newRefreshToken: string | undefined;

    const result = await withTokenRefresh(ctx, (token) => insertReceiptItems(dbRows, token)).catch(
      (e) => ({ expired: false as const, err: e instanceof Error ? e.message : String(e) })
    );

    if ("expired" in result && result.expired === true) {
      return sessionExpiredResponse();
    } else if ("err" in result) {
      saveError = result.err;
      console.error("insertReceiptItems error:", saveError);
    } else if ("newToken" in result) {
      newToken = result.newToken;
      newRefreshToken = result.newRefreshToken;
    }

    const res = NextResponse.json({
      store: parsed.store ?? null,
      date: parsed.date ?? null,
      total: parsed.total ?? null,
      items: flaggedItems,
      saved: saveError === null,
      saveError,
    });

    if (newToken) applyNewTokens(res, newToken, newRefreshToken);
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Receipt scan failed";
    console.error("Receipts API error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
