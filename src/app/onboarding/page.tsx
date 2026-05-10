"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Target, Apple, CreditCard, Check, ChevronRight } from "lucide-react";

interface GoalProfile {
  savingsTarget: string;
  healthGoals: string;
  subscriptions: string;
}

const steps = [
  {
    number: 1,
    icon: Target,
    title: "Savings Goal",
    description: "How much do you want to save per month?",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    number: 2,
    icon: Apple,
    title: "Health Goals",
    description: "What are your health goals?",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  {
    number: 3,
    icon: CreditCard,
    title: "Subscriptions",
    description: "What subscriptions or memberships are you paying for?",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<GoalProfile>({
    savingsTarget: "",
    healthGoals: "",
    subscriptions: "",
  });

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = async () => {
    if (isLast) {
      setSaving(true);
      setError("");
      try {
        const res = await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to save goals");
        router.push("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setSaving(false);
      }
    } else {
      setStep((s) => s + 1);
    }
  };

  const fieldMap: Record<number, keyof GoalProfile> = {
    0: "savingsTarget",
    1: "healthGoals",
    2: "subscriptions",
  };

  const currentValue = profile[fieldMap[step]];
  const canProceed = currentValue.trim().length > 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Logo size="lg" />
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                  i < step
                    ? "bg-[#7c6af5] text-white"
                    : i === step
                    ? "bg-[#7c6af5]/20 border-2 border-[#7c6af5] text-[#7c6af5]"
                    : "bg-[#1a1a28] text-[#6b6b8a]"
                }`}
              >
                {i < step ? <Check className="w-3.5 h-3.5" /> : s.number}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-px w-8 transition-all duration-300 ${
                    i < step ? "bg-[#7c6af5]" : "bg-[#1e1e2e]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step card */}
        <Card className={`border ${current.border}`}>
          <CardContent className="p-6 space-y-5">
            <div className={`w-11 h-11 rounded-xl ${current.bg} flex items-center justify-center`}>
              <current.icon className={`w-5 h-5 ${current.color}`} />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-[#f0f0f5] mb-1">
                {current.title}
              </h2>
              <p className="text-sm text-[#6b6b8a]">{current.description}</p>
            </div>

            {step === 0 && (
              <Input
                label="Monthly savings target"
                placeholder="e.g. Save $500/month"
                value={profile.savingsTarget}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, savingsTarget: e.target.value }))
                }
                hint="Be specific — Loop will flag spending that works against this."
              />
            )}

            {step === 1 && (
              <Textarea
                label="Health goals"
                placeholder="e.g. Eat less sugar, go vegan, cut alcohol"
                value={profile.healthGoals}
                rows={3}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, healthGoals: e.target.value }))
                }
                hint="Loop will flag receipt items that conflict with these goals."
              />
            )}

            {step === 2 && (
              <Textarea
                label="Active subscriptions / memberships"
                placeholder={"e.g.\nGym membership - $50/month\nNetflix - $15/month\nSpotify - $10/month"}
                value={profile.subscriptions}
                rows={4}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, subscriptions: e.target.value }))
                }
                hint="Loop tracks these to help you decide what to keep or cancel."
              />
            )}

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <Button
              className="w-full"
              onClick={handleNext}
              disabled={!canProceed}
              loading={saving}
            >
              {isLast ? (
                "Finish setup"
              ) : (
                <span className="flex items-center gap-2">
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="w-full text-center text-sm text-[#6b6b8a] hover:text-[#f0f0f5] transition-colors py-1"
              >
                Back
              </button>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[#6b6b8a] mt-6">
          You can edit these goals anytime in Settings.
        </p>
      </div>
    </div>
  );
}
