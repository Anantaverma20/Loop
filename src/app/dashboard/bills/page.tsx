"use client";

import { useState, useEffect } from "react";
import { Bell, Plus, Trash2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/components/ui/cn";
import { differenceInDays, parseISO, format } from "date-fns";

interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
}

function urgency(dueDate: string) {
  const days = differenceInDays(parseISO(dueDate), new Date());
  if (days < 0) return { label: "Overdue", class: "badge-red", days };
  if (days <= 3) return { label: `${days}d`, class: "badge-red", days };
  if (days <= 7) return { label: `${days}d`, class: "badge-yellow", days };
  return { label: `${days}d`, class: "badge-green", days };
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", due_date: "" });

  useEffect(() => {
    fetch("/api/bills")
      .then((r) => r.json())
      .then((data) => setBills(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const addBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        amount: parseFloat(form.amount),
        due_date: form.due_date,
      }),
    });
    const newBill = await res.json();
    setBills((prev) => [...prev, newBill].sort((a, b) => a.due_date.localeCompare(b.due_date)));
    setForm({ name: "", amount: "", due_date: "" });
    setAdding(false);
    setSaving(false);
  };

  const deleteBill = async (id: string) => {
    await fetch(`/api/bills/${id}`, { method: "DELETE" });
    setBills((prev) => prev.filter((b) => b.id !== id));
  };

  const sorted = [...bills].sort((a, b) => a.due_date.localeCompare(b.due_date));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#f0f0f5]">Bill Reminders</h1>
          <p className="text-sm text-[#6b6b8a] mt-1">
            Track upcoming bills with urgency indicators.
          </p>
        </div>
        <Button onClick={() => setAdding(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add bill
        </Button>
      </div>

      {/* Add form */}
      {adding && (
        <Card className="border-[#7c6af5]/30">
          <CardHeader>
            <h2 className="font-semibold text-[#f0f0f5]">New bill</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={addBill} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Bill name"
                  placeholder="e.g. Gym membership"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
                <Input
                  label="Amount ($)"
                  type="number"
                  placeholder="50"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                />
              </div>
              <Input
                label="Due date"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                required
              />
              <div className="flex gap-2">
                <Button type="submit" loading={saving}>Save bill</Button>
                <Button variant="ghost" type="button" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Bills list */}
      {loading ? (
        <div className="text-sm text-[#6b6b8a] text-center py-8">Loading…</div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="w-8 h-8 text-[#6b6b8a] mx-auto mb-3" />
            <p className="text-[#6b6b8a] text-sm">No bills yet. Add your first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((bill) => {
            const u = urgency(bill.due_date);
            return (
              <Card key={bill.id} className={cn(
                "transition-all",
                u.days < 0 ? "border-red-500/30" :
                u.days <= 3 ? "border-red-500/20" :
                u.days <= 7 ? "border-yellow-500/20" : ""
              )}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    u.days < 0 ? "bg-red-500/10" :
                    u.days <= 3 ? "bg-red-500/10" :
                    u.days <= 7 ? "bg-yellow-500/10" : "bg-green-500/10"
                  )}>
                    <Bell className={cn(
                      "w-4 h-4",
                      u.days < 0 ? "text-red-400" :
                      u.days <= 3 ? "text-red-400" :
                      u.days <= 7 ? "text-yellow-400" : "text-green-400"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#f0f0f5] truncate">{bill.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Calendar className="w-3 h-3 text-[#6b6b8a]" />
                      <span className="text-xs text-[#6b6b8a]">
                        {format(parseISO(bill.due_date), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="font-semibold text-[#f0f0f5]">
                      ${bill.amount.toFixed(2)}
                    </p>
                    <span className={u.class}>{u.label}</span>
                    <button
                      onClick={() => deleteBill(bill.id)}
                      className="text-[#6b6b8a] hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
