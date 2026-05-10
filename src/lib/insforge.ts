/**
 * InsForge client — correct API paths based on InsForge docs.
 * Auth:     /api/auth/...
 * Database: /api/database/records/{table}
 * Docs:     https://docs.insforge.dev
 */

const INSFORGE_URL = process.env.INSFORGE_URL ?? "";
const INSFORGE_ANON_KEY = process.env.INSFORGE_ANON_KEY ?? "";

// ── DB helper ──────────────────────────────────────────────────────────────

async function dbRequest<T>(
  table: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    query?: string;
    body?: unknown;
    token: string;
  }
): Promise<T> {
  const { method = "GET", query = "", body, token } = options;
  const url = `${INSFORGE_URL}/api/database/records/${table}${query ? `?${query}` : ""}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": INSFORGE_ANON_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`InsForge DB error (${res.status}): ${text}`);

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

// ── Auth ───────────────────────────────────────────────────────────────────

/** Returns the URL to redirect the browser to for Google OAuth */
export function getGoogleOAuthUrl(redirectUrl: string): string {
  const params = new URLSearchParams({ redirect_url: redirectUrl });
  return `${INSFORGE_URL}/api/auth/oauth/google?${params}`;
}

/** Exchange the code/token from the OAuth callback */
export async function exchangeOAuthSession(accessToken: string): Promise<{
  user: { id: string; email: string };
  access_token: string;
}> {
  // InsForge returns session info — validate/fetch current user with the token
  const res = await fetch(`${INSFORGE_URL}/api/auth/sessions/current`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "apikey": INSFORGE_ANON_KEY,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Session error (${res.status}): ${text}`);
  return JSON.parse(text);
}

// ── Goals ──────────────────────────────────────────────────────────────────

export interface GoalRow {
  id?: string;
  user_id: string;
  savings_target: string;
  health_goals: string[];
  subscriptions: string;
  created_at?: string;
}

export async function upsertGoals(
  userId: string,
  data: Omit<GoalRow, "id" | "user_id" | "created_at">,
  token: string
) {
  return dbRequest<GoalRow[]>("goals", {
    method: "POST",
    body: { user_id: userId, ...data },
    token,
  });
}

export async function getGoals(userId: string, token: string) {
  return dbRequest<GoalRow[]>("goals", {
    query: `user_id=eq.${userId}&limit=1`,
    token,
  });
}

// ── Transactions ───────────────────────────────────────────────────────────

export interface TransactionRow {
  id?: string;
  user_id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  flagged: boolean;
  flag_reason?: string;
}

export async function insertTransactions(
  rows: Omit<TransactionRow, "id">[],
  token: string
) {
  return dbRequest<TransactionRow[]>("transactions", {
    method: "POST",
    body: rows,
    token,
  });
}

export async function getTransactions(userId: string, token: string) {
  const rows = await dbRequest<TransactionRow[]>("transactions", {
    query: `user_id=eq.${userId}&limit=500`,
    token,
  });
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

// ── Receipt items ──────────────────────────────────────────────────────────

export interface ReceiptItemRow {
  id?: string;
  user_id: string;
  item_name: string;
  price: number;
  purchase_date: string;
  flagged: boolean;
  flag_reason: string;
}

export async function insertReceiptItems(
  rows: Omit<ReceiptItemRow, "id">[],
  token: string
) {
  return dbRequest<ReceiptItemRow[]>("receipt_items", {
    method: "POST",
    body: rows,
    token,
  });
}

export async function getReceiptItems(userId: string, token: string) {
  const rows = await dbRequest<ReceiptItemRow[]>("receipt_items", {
    query: `user_id=eq.${userId}&limit=200`,
    token,
  });
  return rows.sort((a, b) => b.purchase_date.localeCompare(a.purchase_date));
}

// ── Bills ──────────────────────────────────────────────────────────────────

export interface BillRow {
  id?: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string;
}

export async function insertBill(row: Omit<BillRow, "id">, token: string) {
  return dbRequest<BillRow[]>("bills", {
    method: "POST",
    body: row,
    token,
  });
}

export async function getBills(userId: string, token: string) {
  const rows = await dbRequest<BillRow[]>("bills", {
    query: `user_id=eq.${userId}&limit=100`,
    token,
  });
  return rows.sort((a, b) => a.due_date.localeCompare(b.due_date));
}

export async function deleteBillById(id: string, userId: string, token: string) {
  return dbRequest<void>("bills", {
    method: "DELETE",
    query: `id=eq.${id}&user_id=eq.${userId}`,
    token,
  });
}

// ── Gym check-ins ──────────────────────────────────────────────────────────

export interface GymCheckinRow {
  id?: string;
  user_id: string;
  checkin_date: string;
}

export async function insertGymCheckin(userId: string, token: string) {
  const today = new Date().toISOString().split("T")[0];
  return dbRequest<GymCheckinRow[]>("gym_checkins", {
    method: "POST",
    body: { user_id: userId, checkin_date: today },
    token,
  });
}

export async function getGymCheckins(userId: string, token: string) {
  const rows = await dbRequest<GymCheckinRow[]>("gym_checkins", {
    query: `user_id=eq.${userId}&limit=365`,
    token,
  });
  return rows.sort((a, b) => b.checkin_date.localeCompare(a.checkin_date));
}
