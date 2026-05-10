"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./ui/Logo";
import { cn } from "./ui/cn";
import {
  LayoutDashboard,
  CreditCard,
  Camera,
  Bell,
  Dumbbell,
  MessageSquare,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/finance", label: "Finance", icon: CreditCard },
  { href: "/dashboard/receipts", label: "Receipts", icon: Camera },
  { href: "/dashboard/bills", label: "Bills", icon: Bell },
  { href: "/dashboard/gym", label: "Gym", icon: Dumbbell },
  { href: "/dashboard/chat", label: "Ask Loop", icon: MessageSquare },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-[#0d0d14] border-r border-[#1e1e2e] p-4 fixed left-0 top-0 z-40">
      <div className="mb-8 px-2 pt-2">
        <Logo size="md" />
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? "bg-[#7c6af5]/15 text-[#7c6af5]"
                  : "text-[#6b6b8a] hover:bg-[#1a1a28] hover:text-[#f0f0f5]"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-[#1e1e2e]">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#6b6b8a] hover:bg-[#1a1a28] hover:text-[#f0f0f5] transition-all"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d14] border-t border-[#1e1e2e] flex items-center justify-around px-2 py-2">
      {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-xs font-medium transition-all",
              active ? "text-[#7c6af5]" : "text-[#6b6b8a]"
            )}
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
