import Link from "next/link";
import {
  CreditCard,
  Camera,
  Bell,
  Dumbbell,
  MessageSquare,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

const modules = [
  {
    href: "/dashboard/finance",
    icon: CreditCard,
    label: "Finance Tracker",
    description: "Upload your bank CSV and track spending vs. savings goals",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    stat: "No data yet",
    statColor: "text-[#6b6b8a]",
  },
  {
    href: "/dashboard/receipts",
    icon: Camera,
    label: "Receipt Scanner",
    description: "Scan receipts and flag items that hurt your health goals",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    stat: "No scans yet",
    statColor: "text-[#6b6b8a]",
  },
  {
    href: "/dashboard/bills",
    icon: Bell,
    label: "Bill Reminders",
    description: "Track upcoming bills with color-coded urgency indicators",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    stat: "No bills added",
    statColor: "text-[#6b6b8a]",
  },
  {
    href: "/dashboard/gym",
    icon: Dumbbell,
    label: "Gym Tracker",
    description: "Check in daily and keep your gym membership accountable",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    stat: "No check-ins yet",
    statColor: "text-[#6b6b8a]",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#6b6b8a] mb-1">Good morning</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#f0f0f5]">
            Your Loop Dashboard
          </h1>
        </div>
        <Link
          href="/dashboard/settings"
          className="text-xs text-[#6b6b8a] hover:text-[#7c6af5] transition-colors"
        >
          Edit goals
        </Link>
      </div>

      {/* Goal snapshot */}
      <Card className="border-[#7c6af5]/20 bg-[#7c6af5]/5">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#7c6af5]/20 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-[#7c6af5]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#6b6b8a]">Savings goal</p>
            <p className="text-base font-semibold text-[#f0f0f5] truncate">
              Complete onboarding to set your goals
            </p>
          </div>
          <Link
            href="/onboarding"
            className="shrink-0 text-xs font-medium text-[#7c6af5] hover:text-[#a89af8] flex items-center gap-1 transition-colors"
          >
            Set up
            <ChevronRight className="w-3 h-3" />
          </Link>
        </CardContent>
      </Card>

      {/* Summary stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs text-[#6b6b8a]">Flagged</span>
          </div>
          <p className="text-xl font-semibold text-[#f0f0f5]">0</p>
          <p className="text-xs text-[#6b6b8a] mt-0.5">transactions</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-[#6b6b8a]">Bills due</span>
          </div>
          <p className="text-xl font-semibold text-[#f0f0f5]">0</p>
          <p className="text-xs text-[#6b6b8a] mt-0.5">upcoming</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-xs text-[#6b6b8a]">Gym streak</span>
          </div>
          <p className="text-xl font-semibold text-[#f0f0f5]">0</p>
          <p className="text-xs text-[#6b6b8a] mt-0.5">days</p>
        </Card>
      </div>

      {/* Module cards grid */}
      <div>
        <h2 className="text-sm font-medium text-[#6b6b8a] uppercase tracking-wider mb-4">
          Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modules.map(
            ({ href, icon: Icon, label, description, color, bg, border, stat, statColor }) => (
              <Link key={href} href={href} className="group">
                <Card className={`h-full border ${border} hover:border-opacity-60 transition-all duration-200 group-hover:translate-y-[-1px]`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#6b6b8a] group-hover:text-[#f0f0f5] transition-colors mt-1" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h3 className="font-semibold text-[#f0f0f5] mb-1">{label}</h3>
                    <p className="text-sm text-[#6b6b8a] mb-3 leading-relaxed">
                      {description}
                    </p>
                    <p className={`text-xs font-medium ${statColor}`}>{stat}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          )}
        </div>
      </div>

      {/* Loop Chat CTA */}
      <Link href="/dashboard/chat">
        <Card className="border-[#7c6af5]/30 hover:border-[#7c6af5]/50 transition-all duration-200 cursor-pointer group">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#7c6af5]/15 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-[#7c6af5]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#f0f0f5] mb-0.5">Ask Loop anything</p>
              <p className="text-sm text-[#6b6b8a]">
                &ldquo;Am I on track with my savings goal this month?&rdquo;
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#6b6b8a] group-hover:text-[#7c6af5] transition-colors shrink-0" />
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
