import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import Papa from "papaparse";
import {
  categorizeTransactions,
  parseTransactionsFromPdfText,
  type RawTransaction,
} from "@/lib/openai";
import { insertTransactions, getGoals } from "@/lib/insforge";

function getAuth() {
  const jar = cookies();
  return {
    token: jar.get("loop_token")?.value ?? "",
    userId: jar.get("loop_user_id")?.value ?? "",
  };
}

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
  // Use the internal lib path — avoids pdf-parse loading its test PDF at module init
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js") as any;
  const pdfParse = pdfParseModule.default ?? pdfParseModule;
  const buffer = Buffer.from(base64, "base64");
  const result = await pdfParse(buffer);
  return result.text;
}

export async function POST(req: NextRequest) {
  const { token, userId } = getAuth();
  if (!token || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { csv, pdf } = body as { csv?: string; pdf?: string };

  if (!csv && !pdf) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const goals = await getGoals(userId, token).catch(() => []);
  const savingsTarget = goals[0]?.savings_target ?? "save money";

  let categorized: Awaited<ReturnType<typeof categorizeTransactions>>;

  if (pdf) {
    // PDF path: extract text → GPT-4o parses + categorizes in one shot
    let pdfText: string;
    try {
      pdfText = await extractTextFromPdfBase64(pdf);
    } catch {
      return NextResponse.json({ error: "Could not read PDF — try a different file." }, { status: 400 });
    }

    if (!pdfText.trim()) {
      return NextResponse.json({ error: "PDF appears to be a scanned image (no extractable text). Try a CSV export instead." }, { status: 400 });
    }

    categorized = await parseTransactionsFromPdfText(pdfText, savingsTarget);

    if (!categorized.length) {
      return NextResponse.json({ error: "No transactions found in this PDF." }, { status: 422 });
    }
  } else {
    // CSV path: papaparse → normalize → GPT-4o categorize
    const { data: rows, errors } = Papa.parse<CSVRow>(csv!, {
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length > 0 && rows.length === 0) {
      return NextResponse.json({ error: "Could not parse CSV" }, { status: 400 });
    }

    const transactions: RawTransaction[] = rows
      .map((row) => {
        const date =
          row.date ?? row.Date ?? row.DATE ?? Object.values(row)[0] ?? "";
        const description =
          row.description ?? row.Description ?? row.DESC ??
          row.name ?? row.Name ?? Object.values(row)[1] ?? "";
        const rawAmount =
          row.amount ?? row.Amount ?? row.AMOUNT ??
          row.debit ?? row.Debit ?? Object.values(row)[2] ?? "0";
        const amount = parseFloat(String(rawAmount).replace(/[^0-9.-]/g, "")) || 0;
        return { date: String(date), description: String(description), amount };
      })
      .filter((t) => t.description && t.amount !== 0);

    if (transactions.length === 0) {
      return NextResponse.json({ error: "No valid transactions found in CSV" }, { status: 400 });
    }

    categorized = await categorizeTransactions(transactions, savingsTarget);
  }

  // Persist (fire and forget — don't let DB errors block the response)
  insertTransactions(
    categorized.map((t) => ({ ...t, user_id: userId })),
    token
  ).catch((e) => console.error("insertTransactions failed:", e));

  const totalSpent = categorized.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const categories: Record<string, number> = {};
  for (const t of categorized) {
    categories[t.category] = (categories[t.category] ?? 0) + Math.abs(t.amount);
  }

  return NextResponse.json({
    totalSpent,
    totalFlagged: categorized.filter((t) => t.flagged).length,
    categories,
    transactions: categorized,
  });
}

export async function GET() {
  const { token, userId } = getAuth();
  if (!token || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { getTransactions } = await import("@/lib/insforge");
  const rows = await getTransactions(userId, token);
  return NextResponse.json(rows);
}
