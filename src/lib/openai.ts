import OpenAI from "openai";

// Singleton client — reuse across requests
let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

// ── Receipt Vision ────────────────────────────────────────────────────────────

export interface ReceiptItem {
  name: string;
  price: number;
  quantity?: number;
}

export interface ParsedReceipt {
  items: ReceiptItem[];
  total: number | null;
  store: string | null;
  date: string | null;
}

export async function parseReceiptImage(
  base64Image: string,
  mimeType: string = "image/jpeg"
): Promise<ParsedReceipt> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
              detail: "high",
            },
          },
          {
            type: "text",
            text: `Extract every line item from this receipt.
Return a JSON object matching this exact shape (no markdown, raw JSON only):
{
  "items": [{ "name": string, "price": number, "quantity": number | null }],
  "total": number | null,
  "store": string | null,
  "date": string | null
}
Use null for fields you cannot read. Prices should be numbers (no $ sign).`,
          },
        ],
      },
    ],
    max_tokens: 1000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message.content ?? "{}";
  return JSON.parse(content) as ParsedReceipt;
}

// ── CSV Transaction Categorization ───────────────────────────────────────────

export type TransactionCategory =
  | "Food & Dining"
  | "Groceries"
  | "Transport"
  | "Entertainment"
  | "Shopping"
  | "Health & Fitness"
  | "Subscriptions"
  | "Utilities"
  | "Housing"
  | "Travel"
  | "Other";

export interface RawTransaction {
  date: string;
  description: string;
  amount: number;
}

export interface CategorizedTransaction extends RawTransaction {
  category: TransactionCategory;
  flagged: boolean;
  flag_reason: string;
}

export async function categorizeTransactions(
  transactions: RawTransaction[],
  savingsTarget: string
): Promise<CategorizedTransaction[]> {
  const client = getClient();

  const chunks: RawTransaction[][] = [];
  for (let i = 0; i < transactions.length; i += 30) {
    chunks.push(transactions.slice(i, i + 30));
  }

  const results: CategorizedTransaction[] = [];

  for (const chunk of chunks) {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a financial analyst. The user's savings goal is: "${savingsTarget}".
For each transaction, categorize it and flag it (flagged: true) if it is discretionary spending that works against this savings goal.
Return raw JSON only — an array of objects with fields: date, description, amount, category, flagged, flag_reason.
flag_reason should be a short human-readable explanation or empty string if not flagged.`,
        },
        {
          role: "user",
          content: JSON.stringify(chunk),
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message.content ?? '{"transactions":[]}';
    const parsed = JSON.parse(content);
    const arr = Array.isArray(parsed) ? parsed : (parsed.transactions ?? []);
    results.push(...arr);
  }

  return results;
}

// ── PDF Bank Statement Parsing ────────────────────────────────────────────────

export async function parseTransactionsFromPdfText(
  pdfText: string,
  savingsTarget: string
): Promise<CategorizedTransaction[]> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a financial analyst. Extract all transactions from the bank statement text below.
The user's savings goal is: "${savingsTarget}".
For each transaction, categorize it and flag it (flagged: true) if it works against the savings goal.
Return raw JSON only — a JSON object with a "transactions" array. Each item: { date, description, amount, category, flagged, flag_reason }.
amount should be positive (debit/expense). Skip credits/deposits. flag_reason is a short explanation or empty string.
Valid categories: Food & Dining, Groceries, Transport, Entertainment, Shopping, Health & Fitness, Subscriptions, Utilities, Housing, Travel, Other.`,
      },
      {
        role: "user",
        content: pdfText.slice(0, 12000),
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message.content ?? '{"transactions":[]}';
  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : (parsed.transactions ?? []);
}

// ── Health Goal Check ─────────────────────────────────────────────────────────

export interface FlaggedReceiptItem {
  item_name: string;
  price: number;
  flagged: boolean;
  flag_reason: string;
}

export async function checkItemsAgainstHealthGoals(
  items: { name: string; price: number }[],
  healthGoals: string
): Promise<FlaggedReceiptItem[]> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a health-aware assistant. The user's health goals are: "${healthGoals}".
For each item, decide if it conflicts with those goals (flagged: true).
Return raw JSON only — an array matching: [{ "item_name": string, "price": number, "flagged": boolean, "flag_reason": string }].
flag_reason should be a short explanation or empty string if not flagged.`,
      },
      {
        role: "user",
        content: JSON.stringify(items),
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message.content ?? "{}";
  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : (parsed.items ?? []);
}
