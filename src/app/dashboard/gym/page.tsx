"use client";

import { useState, useEffect } from "react";
import { Dumbbell, CheckCircle2, AlertTriangle, Flame, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { differenceInDays, parseISO, format } from "date-fns";

interface CheckinData {
  checkins: string[];
  streak: number;
  lastVisit: string | null;
  daysSinceLast: number | null;
  gymCost: string | null;
}

export default function GymPage() {
  const [data, setData] = useState<CheckinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);

  const load = async () => {
    const res = await fetch("/api/gym");
    const json = await res.json();
    setData(json);
    const today = new Date().toISOString().split("T")[0];
    setCheckedInToday(json.checkins?.includes(today));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const checkIn = async () => {
    setCheckingIn(true);
    await fetch("/api/gym", { method: "POST" });
    await load();
    setCheckingIn(false);
  };

  const alert10Days = data && data.daysSinceLast !== null && data.daysSinceLast >= 10;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-[#f0f0f5]">Gym Tracker</h1>
        <p className="text-sm text-[#6b6b8a] mt-1">
          Check in after every session to keep your membership accountable.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-[#6b6b8a] text-center py-12">Loading…</div>
      ) : (
        <>
          {/* Alert banner */}
          {alert10Days && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-400 mb-0.5">
                    You haven&apos;t been to the gym in {data!.daysSinceLast} days.
                  </p>
                  <p className="text-sm text-[#6b6b8a]">
                    {data!.gymCost
                      ? `You're paying ${data!.gymCost}/month. Consider pausing your membership.`
                      : "Consider pausing your membership if you're not using it."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-[#6b6b8a]">Streak</span>
              </div>
              <p className="text-2xl font-semibold text-[#f0f0f5]">{data?.streak ?? 0}</p>
              <p className="text-xs text-[#6b6b8a]">days</p>
            </Card>
            <Card className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Calendar className="w-4 h-4 text-[#7c6af5]" />
                <span className="text-xs text-[#6b6b8a]">Total</span>
              </div>
              <p className="text-2xl font-semibold text-[#f0f0f5]">
                {data?.checkins.length ?? 0}
              </p>
              <p className="text-xs text-[#6b6b8a]">check-ins</p>
            </Card>
            <Card className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Dumbbell className="w-4 h-4 text-green-400" />
                <span className="text-xs text-[#6b6b8a]">Last visit</span>
              </div>
              <p className="text-sm font-semibold text-[#f0f0f5]">
                {data?.lastVisit
                  ? format(parseISO(data.lastVisit), "MMM d")
                  : "Never"}
              </p>
              {data?.daysSinceLast !== null && (
                <p className="text-xs text-[#6b6b8a]">{data?.daysSinceLast}d ago</p>
              )}
            </Card>
          </div>

          {/* Check-in button */}
          <Card className={checkedInToday ? "border-green-500/30" : "border-[#7c6af5]/30"}>
            <CardContent className="p-8 flex flex-col items-center gap-4">
              {checkedInToday ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-green-400 text-lg">Checked in today!</p>
                    <p className="text-sm text-[#6b6b8a] mt-1">Nice work. Come back tomorrow.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-[#7c6af5]/10 flex items-center justify-center">
                    <Dumbbell className="w-8 h-8 text-[#7c6af5]" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-[#f0f0f5] text-lg">Did you go today?</p>
                    <p className="text-sm text-[#6b6b8a] mt-1">Tap to log your gym visit.</p>
                  </div>
                  <Button size="lg" onClick={checkIn} loading={checkingIn}>
                    I went to the gym today
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Recent history */}
          {data && data.checkins.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-[#6b6b8a] uppercase tracking-wider mb-3">
                Recent visits
              </h2>
              <div className="flex flex-wrap gap-2">
                {[...data.checkins]
                  .sort((a, b) => b.localeCompare(a))
                  .slice(0, 20)
                  .map((date) => (
                    <span
                      key={date}
                      className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-full"
                    >
                      {format(parseISO(date), "MMM d")}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
