"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  Music2,
  Users,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/learn", label: "Learn", icon: GraduationCap },
  { href: "/collection", label: "Synths", icon: Music2 },
  { href: "/community", label: "Community", icon: Users },
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
];

function isLessonRoute(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  return parts[0] === "learn" && parts.length >= 3;
}

export function MobileNav() {
  const pathname = usePathname();
  if (isLessonRoute(pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t bg-background">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
