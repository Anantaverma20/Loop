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
          content: `You are a financial analyst helping someone save money. The user's savings goal is: "${savingsTarget}".

For each transaction:
1. Assign ONE category from: Food & Dining, Groceries, Transport, Entertainment, Shopping, Health & Fitness, Subscriptions, Utilities, Housing, Travel, Other
2. Decide whether to flag it.

FLAG (flagged: true) only clearly discretionary/non-essential spending: restaurants, takeaway/food delivery, bars, cafes, entertainment venues, non-essential shopping/clothing, gaming, alcohol, luxury items, multiple streaming services.

DO NOT FLAG: grocery stores (supermarkets), utilities (electricity/gas/water/internet), rent/mortgage payments, insurance, healthcare/pharmacy, petrol/fuel, public transport, ATM withdrawals, salary/income credits.

flag_reason: one short sentence explaining why it works against the savings goal. Empty string "" if not flagged.
Return a JSON object with key "transactions" — array of: { date, description, amount, category, flagged, flag_reason }`,
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
        content: `You are a financial analyst helping someone save money. The user's savings goal is: "${savingsTarget}".

Extract all expense transactions from the bank statement text. Skip credits, deposits, and refunds.

For each transaction:
1. Assign ONE category: Food & Dining, Groceries, Transport, Entertainment, Shopping, Health & Fitness, Subscriptions, Utilities, Housing, Travel, Other
2. Set amount as a positive number (the spend amount).
3. FLAG (flagged: true) only clearly discretionary/non-essential spending: restaurants, takeaway/food delivery, bars, cafes, entertainment, non-essential shopping, gaming, alcohol, luxury items.
   DO NOT FLAG: grocery stores, utilities, rent/mortgage, insurance, healthcare, petrol/fuel, public transport.
4. flag_reason: one short sentence if flagged, empty string "" otherwise.

Return a JSON object with key "transactions" — array of: { date, description, amount, category, flagged, flag_reason }`,
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
