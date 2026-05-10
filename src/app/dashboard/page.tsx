import Link from "next/link";
import { cookies } from "next/headers";
import {
  CreditCard, Camera, Bell, Dumbbell, MessageSquare,
  TrendingDown, AlertTriangle, CheckCircle2, ChevronRight, Target, Tag,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import {
  getGoals, getTransactions, getBills, getGymCheckins, getReceiptItems,
  type TransactionRow, type BillRow,
} from "@/lib/insforge";
import { InsightsPanel } from "@/components/InsightsPanel";

// ── date helpers ──────────────────────────────────────────────────────────────

function normalizeDate(s: string): string {
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Try native parse (handles "May 4, 2026", "04/05/2026", etc.)
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  // MM/DD/YY or M/D/YY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const yr = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yr}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  return s;
}

function currentMonthTx(txs: TransactionRow[]) {
  const now = new Date();
  return txs.filter((t) => {
    const normalized = normalizeDate(t.date ?? "");
    const d = new Date(normalized);
    return !isNaN(d.getTime()) && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
}

function gymStreak(checkins: { checkin_date: string }[]): number {
  if (!checkins.length) return 0;
  const dates = new Set(checkins.map((c) => c.checkin_date));
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    if (dates.has(ds)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function billsDueSoon(bills: BillRow[], days = 7): BillRow[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() + days);
  return bills.filter((b) => { const d = new Date(b.due_date); return d >= today && d <= cutoff; });
}

const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "text-orange-400", "Groceries": "text-green-400",
  "Transport": "text-blue-400", "Entertainment": "text-purple-400",
  "Shopping": "text-pink-400", "Health & Fitness": "text-emerald-400",
  "Subscriptions": "text-violet-400", "Utilities": "text-yellow-400",
  "Housing": "text-red-400", "Travel": "text-cyan-400", "Other": "text-gray-400",
};

// ── page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const jar = cookies();
  const token = jar.get("loop_token")?.value ?? "";
  const userId = jar.get("loop_user_id")?.value ?? "";
  const isAuthed = !!(token && userId);

  const [goalsRes, txRes, billsRes, gymRes, receiptRes] = await Promise.allSettled([
    isAuthed ? getGoals(userId, token)        : Promise.resolve([]),
    isAuthed ? getTransactions(userId, token) : Promise.resolve([]),
    isAuthed ? getBills(userId, token)        : Promise.resolve([]),
    isAuthed ? getGymCheckins(userId, token)  : Promise.resolve([]),
    isAuthed ? getReceiptItems(userId, token) : Promise.resolve([]),
  ]);

  const goal      = goalsRes.status   === "fulfilled" ? goalsRes.value?.[0]  ?? null : null;
  const allTx     = txRes.status      === "fulfilled" ? txRes.value           : [];
  const allBills  = billsRes.status   === "fulfilled" ? billsRes.value        : [];
  const allGym    = gymRes.status     === "fulfilled" ? gymRes.value          : [];
  const allRx     = receiptRes.status === "fulfilled" ? receiptRes.value      : [];

  const monthTx    = currentMonthTx(allTx);
  const totalSpent = monthTx.reduce((s, t) => s + Math.abs(t.amount), 0);
  const flaggedTx  = allTx.filter((t) => t.flagged);
  const dueSoon    = billsDueSoon(allBills);
  const streak     = gymStreak(allGym);
  const flaggedRx  = allRx.filter((r) => r.flagged);

  const catTotals: Record<string, number> = {};
  for (const t of monthTx) catTotals[t.category] = (catTotals[t.category] ?? 0) + Math.abs(t.amount);
  const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const recentFlagged = flaggedTx.slice(0, 4);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#6b6b8a]">{greeting}</p>
          <h1 className="text-2xl font-semibold text-[#f0f0f5] mt-0.5">Your Loop Dashboard</h1>
        </div>
        <Link href="/dashboard/settings" className="text-xs text-[#6b6b8a] hover:text-[#7c6af5] transition-colors">
          Edit goals
        </Link>
      </div>

      {/* Goal banner */}
      <Card className="border-[#7c6af5]/20 bg-[#7c6af5]/5">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#7c6af5]/20 flex items-center justify-center shrink-0">
            <Target className="w-4 h-4 text-[#7c6af5]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#6b6b8a]">Savings goal</p>
            <p className="text-sm font-semibold text-[#f0f0f5] truncate">
              {goal?.savings_target ?? "Not set — complete onboarding"}
            </p>
          </div>
          {!goal && (
            <Link href="/onboarding" className="shrink-0 text-xs font-medium text-[#7c6af5] flex items-center gap-1">
              Set up <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xs text-[#6b6b8a] mb-1">Spent this month</p>
          <p className="text-lg font-semibold text-[#f0f0f5]">
            {monthTx.length > 0 ? `$${totalSpent.toFixed(0)}` : allTx.length > 0 ? `$${allTx.reduce((s,t)=>s+Math.abs(t.amount),0).toFixed(0)} total` : "—"}
          </p>
        </Card>
        <Card className="p-3 text-center border-red-500/20">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingDown className="w-3 h-3 text-red-400" />
            <p className="text-xs text-[#6b6b8a]">Flagged</p>
          </div>
          <p className="text-lg font-semibold text-red-400">{flaggedTx.length}</p>
        </Card>
        <Card className="p-3 text-center border-amber-500/20">
          <div className="flex items-center justify-center gap-1 mb-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <p className="text-xs text-[#6b6b8a]">Bills due</p>
          </div>
          <p className="text-lg font-semibold text-amber-400">{dueSoon.length}</p>
        </Card>
        <Card className="p-3 text-center border-green-500/20">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            <p className="text-xs text-[#6b6b8a]">Gym streak</p>
          </div>
          <p className="text-lg font-semibold text-green-400">{streak}d</p>
        </Card>
      </div>

      {/* AI Insights — client component, fetches its own data */}
      <InsightsPanel />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top categories */}
        {topCats.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#7c6af5]" />
                <h2 className="font-semibold text-[#f0f0f5] text-sm">Top spending this month</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              {topCats.map(([cat, total]) => {
                const pct = totalSpent > 0 ? Math.round((total / totalSpent) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={cn("font-medium", CATEGORY_COLORS[cat] ?? "text-[#f0f0f5]")}>{cat}</span>
                      <span className="text-[#6b6b8a]">${total.toFixed(0)} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-[#1a1a28] rounded-full overflow-hidden">
                      <div className="h-full bg-[#7c6af5] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Recent flagged */}
        {recentFlagged.length > 0 && (
          <Card className="border-red-500/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <h2 className="font-semibold text-[#f0f0f5] text-sm">Recent flagged spending</h2>
                </div>
                <Link href="/dashboard/finance" className="text-xs text-[#6b6b8a] hover:text-[#7c6af5]">See all</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {recentFlagged.map((tx, i) => (
                <div key={i} className="flex justify-between items-start py-1.5 border-b border-[#1e1e2e] last:border-0">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-xs font-medium text-[#f0f0f5] truncate">{tx.description}</p>
                    {tx.flag_reason && <p className="text-xs text-red-400 truncate">{tx.flag_reason}</p>}
                  </div>
                  <p className="text-xs font-semibold text-red-400 shrink-0">${Math.abs(tx.amount).toFixed(2)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Bills due soon */}
        {dueSoon.length > 0 && (
          <Card className="border-amber-500/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <h2 className="font-semibold text-[#f0f0f5] text-sm">Bills due this week</h2>
                </div>
                <Link href="/dashboard/bills" className="text-xs text-[#6b6b8a] hover:text-[#7c6af5]">Manage</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {dueSoon.slice(0, 4).map((bill, i) => (
                <div key={i} className="flex justify-between text-xs py-1.5 border-b border-[#1e1e2e] last:border-0">
                  <span className="text-[#c0c0d8]">{bill.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[#6b6b8a]">{bill.due_date}</span>
                    <span className="text-amber-400 font-medium">${bill.amount.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Receipt health flags */}
        {flaggedRx.length > 0 && (
          <Card className="border-orange-500/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-orange-400" />
                  <h2 className="font-semibold text-[#f0f0f5] text-sm">Health flags from receipts</h2>
                </div>
                <Link href="/dashboard/receipts" className="text-xs text-[#6b6b8a] hover:text-[#7c6af5]">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {flaggedRx.slice(0, 4).map((item, i) => (
                <div key={i} className="flex justify-between text-xs py-1.5 border-b border-[#1e1e2e] last:border-0">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-[#f0f0f5] font-medium truncate">{item.item_name}</p>
                    {item.flag_reason && <p className="text-orange-400 truncate">{item.flag_reason}</p>}
                  </div>
                  <span className="text-orange-400 font-medium shrink-0">${item.price.toFixed(2)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Module quick-links */}
      <div>
        <h2 className="text-xs font-medium text-[#6b6b8a] uppercase tracking-wider mb-3">Modules</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/dashboard/finance",  icon: CreditCard, label: "Finance",  color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", stat: allTx.length > 0 ? `${allTx.length} transactions` : "No data" },
            { href: "/dashboard/receipts", icon: Camera,     label: "Receipts", color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20",   stat: allRx.length > 0  ? `${allRx.length} items scanned` : "No scans" },
            { href: "/dashboard/bills",    icon: Bell,       label: "Bills",    color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20",  stat: allBills.length > 0 ? `${allBills.length} tracked` : "None added" },
            { href: "/dashboard/gym",      icon: Dumbbell,   label: "Gym",      color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20",  stat: allGym.length > 0 ? `${allGym.length} check-ins` : "No check-ins" },
          ].map(({ href, icon: Icon, label, color, bg, border, stat }) => (
            <Link key={href} href={href} className="group">
              <Card className={`border ${border} hover:border-opacity-60 transition-all duration-200 group-hover:-translate-y-0.5`}>
                <CardContent className="p-4">
                  <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="font-semibold text-[#f0f0f5] text-sm mb-0.5">{label}</p>
                  <p className="text-xs text-[#6b6b8a]">{stat}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Loop Chat CTA */}
      <Link href="/dashboard/chat">
        <Card className="border-[#7c6af5]/30 hover:border-[#7c6af5]/50 transition-all cursor-pointer group">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#7c6af5]/15 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-[#7c6af5]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#f0f0f5] text-sm">Ask Loop anything</p>
              <p className="text-xs text-[#6b6b8a]">
                {flaggedTx.length > 0
                  ? `You have ${flaggedTx.length} flagged transactions — ask Loop for advice`
                  : '"Am I on track with my savings goal this month?"'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#6b6b8a] group-hover:text-[#7c6af5] transition-colors shrink-0" />
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
