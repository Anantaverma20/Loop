"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Target, Apple, CreditCard, Save } from "lucide-react";

interface Goals {
  savings_target: string;
  health_goals: string[];
  subscriptions: string;
}

export default function SettingsPage() {
  const [goals, setGoals] = useState<Goals | null>(null);
  const [form, setForm] = useState({
    savingsTarget: "",
    healthGoals: "",
    subscriptions: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((g) => {
        if (g) {
          setGoals(g);
          setForm({
            savingsTarget: g.savings_target ?? "",
            healthGoals: g.health_goals?.join(", ") ?? "",
            subscriptions: g.subscriptions ?? "",
          });
        }
      });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold text-[#f0f0f5]">Settings</h1>
        <p className="text-sm text-[#6b6b8a] mt-1">Update your goals and profile.</p>
      </div>

      <form onSubmit={save} className="space-y-4">
        <Card className="border-violet-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-violet-400" />
              <h2 className="font-semibold text-[#f0f0f5]">Savings Goal</h2>
            </div>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="e.g. Save $500/month"
              value={form.savingsTarget}
              onChange={(e) => setForm((f) => ({ ...f, savingsTarget: e.target.value }))}
            />
          </CardContent>
        </Card>

        <Card className="border-green-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Apple className="w-4 h-4 text-green-400" />
              <h2 className="font-semibold text-[#f0f0f5]">Health Goals</h2>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="e.g. Eat less sugar, go vegan"
              value={form.healthGoals}
              rows={2}
              onChange={(e) => setForm((f) => ({ ...f, healthGoals: e.target.value }))}
            />
          </CardContent>
        </Card>

        <Card className="border-amber-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <h2 className="font-semibold text-[#f0f0f5]">Subscriptions</h2>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={"e.g.\nGym membership - $50/month\nNetflix - $15/month"}
              value={form.subscriptions}
              rows={4}
              onChange={(e) => setForm((f) => ({ ...f, subscriptions: e.target.value }))}
            />
          </CardContent>
        </Card>

        <Button type="submit" loading={saving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {saved ? "Saved!" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
