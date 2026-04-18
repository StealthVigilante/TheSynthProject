"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  Music2,
  Users,
  Trophy,
  User,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme, THEMES } from "@/providers/theme-provider";

const navItems = [
  { href: "/dashboard",   label: "Dashboard",  icon: LayoutDashboard },
  { href: "/learn",       label: "Learn",       icon: GraduationCap },
  { href: "/collection",  label: "Collection",  icon: Music2 },
  { href: "/community",   label: "Community",   icon: Users },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile",     label: "Profile",     icon: User },
  { href: "/hardware",    label: "Hardware",    icon: Cpu },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">
            Osci<span className="text-primary">scoops</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Theme switcher */}
      <div className="border-t p-4">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Theme
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              title={t.label}
              className={cn(
                "flex items-center gap-2 rounded px-2 py-1.5 text-xs font-medium transition-colors",
                theme === t.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-primary"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
              )}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-sm border border-border"
                style={{ background: t.swatch }}
              />
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
