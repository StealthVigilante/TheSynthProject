"use client";

import { useRouter } from "next/navigation";
import { Flame, Zap, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TopBarProps {
  xp: number;
  streak: number;
  displayName: string | null;
}

export function TopBar({ xp, streak, displayName }: TopBarProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-4 md:hidden">
        <span className="text-lg font-bold tracking-tight">
          Osci<span className="text-primary">scoops</span>
        </span>
      </div>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="font-semibold">{streak}</span>
        </Badge>
        <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span className="font-semibold">{xp} XP</span>
        </Badge>
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {displayName}
        </span>
        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
