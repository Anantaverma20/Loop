import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import {
  categorizeTransactions,
  parseTransactionsFromPdfText,
  type RawTransaction,
} from "@/lib/openai";
import { insertTransactions, getGoals } from "@/lib/insforge";
import {
  getAuth,
  withTokenRefresh,
  sessionExpiredResponse,
  applyNewTokens,
} from "@/lib/withAuth";

interface CSVRow {
  date?: string;
  Date?: string;
  description?: string;
  Description?: string;
  amount?: string;
  Amount?: string;
  [key: string]: string | undefined;
}

async function extractTextFromPdfBase64(base64: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParse = (await import("pdf-parse")).default as any;
  const buffer = Buffer.from(base64, "base64");
  const result = await pdfParse(buffer);
  return result.text as string;
}

export async function POST(req: NextRequest) {
  const ctx = getAuth();
  if (!ctx.token || !ctx.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { csv, pdf } = body as { csv?: string; pdf?: string };
  if (!csv && !pdf) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const goals = await getGoals(ctx.userId, ctx.token).catch(() => []);
  const savingsTarget = goals[0]?.savings_target ?? "save money";

  let categorized: Awaited<ReturnType<typeof categorizeTransactions>>;

  if (pdf) {
    let pdfText: string;
    try {
      pdfText = await extractTextFromPdfBase64(pdf);
    } catch {
      return NextResponse.json({ error: "Could not read PDF — try a different file." }, { status: 400 });
    }
    if (!pdfText.trim()) {
      return NextResponse.json({ error: "PDF appears to be a scanned image. Try a CSV export instead." }, { status: 400 });
    }
    categorized = await parseTransactionsFromPdfText(pdfText, savingsTarget);
    if (!categorized.length) {
      return NextResponse.json({ error: "No transactions found in this PDF." }, { status: 422 });
    }
  } else {
    const { data: rows, errors } = Papa.parse<CSVRow>(csv!, { header: true, skipEmptyLines: true });
    if (errors.length > 0 && rows.length === 0) {
      return NextResponse.json({ error: "Could not parse CSV" }, { status: 400 });
    }
    const transactions: RawTransaction[] = rows
      .map((row) => {
        const date = row.date ?? row.Date ?? row.DATE ?? Object.values(row)[0] ?? "";
        const description = row.description ?? row.Description ?? row.DESC ?? row.name ?? row.Name ?? Object.values(row)[1] ?? "";
        const rawAmount = row.amount ?? row.Amount ?? row.AMOUNT ?? row.debit ?? row.Debit ?? Object.values(row)[2] ?? "0";
        const amount = parseFloat(String(rawAmount).replace(/[^0-9.-]/g, "")) || 0;
        return { date: String(date), description: String(description), amount };
      })
      .filter((t) => t.description && t.amount !== 0);
    if (!transactions.length) {
      return NextResponse.json({ error: "No valid transactions found in CSV" }, { status: 400 });
    }
    categorized = await categorizeTransactions(transactions, savingsTarget);
  }

  const rows = categorized.map((t) => ({
    user_id: ctx.userId,
    date: t.date,
    description: t.description,
    amount: t.amount,
    category: t.category,
    flagged: t.flagged,
    flag_reason: t.flag_reason || "",
  }));

  // Try insert — auto-refresh token if expired
  let saveError: string | null = null;
  let newToken: string | undefined;
  let newRefreshToken: string | undefined;

  const result = await withTokenRefresh(ctx, (token) => insertTransactions(rows, token)).catch(
    (e) => ({ expired: false as const, err: e instanceof Error ? e.message : String(e) })
  );

  if ("expired" in result && result.expired === true) {
    return sessionExpiredResponse();
  } else if ("err" in result) {
    saveError = result.err;
    console.error("insertTransactions error:", saveError);
  } else if ("newToken" in result) {
    newToken = result.newToken;
    newRefreshToken = result.newRefreshToken;
  }

  const totalSpent = categorized.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const categories: Record<string, number> = {};
  for (const t of categorized) {
    categories[t.category] = (categories[t.category] ?? 0) + Math.abs(t.amount);
  }

  const res = NextResponse.json({
    totalSpent,
    totalFlagged: categorized.filter((t) => t.flagged).length,
    categories,
    transactions: categorized,
    saved: saveError === null,
    saveError,
  });

  if (newToken) applyNewTokens(res, newToken, newRefreshToken);
  return res;
}

export async function GET() {
  const ctx = getAuth();
  if (!ctx.token || !ctx.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { getTransactions } = await import("@/lib/insforge");
  const rows = await getTransactions(ctx.userId, ctx.token);
  return NextResponse.json(rows);
}
