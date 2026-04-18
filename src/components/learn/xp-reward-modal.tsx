"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Unlock, Star, Flame } from "lucide-react";

interface XpRewardModalProps {
  xpEarned: number;
  totalXp: number;
  newLevel: number;
  newStreak: number;
  unlockedParams: string[];
  firstCompletion: boolean;
  onClose: () => void;
}

export function XpRewardModal({
  xpEarned,
  totalXp,
  newLevel,
  newStreak,
  unlockedParams,
  firstCompletion,
  onClose,
}: XpRewardModalProps) {
  const [animatedXp, setAnimatedXp] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = xpEarned / steps;
    let current = 0;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      current = Math.min(xpEarned, Math.round(increment * step));
      setAnimatedXp(current);
      if (step >= steps) clearInterval(interval);
    }, duration / steps);

    return () => clearInterval(interval);
  }, [xpEarned]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm animate-in fade-in zoom-in-95 rounded-2xl border bg-card p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Star icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
            <Star className="h-8 w-8 text-yellow-500" fill="currentColor" />
          </div>

          <h2 className="text-2xl font-bold">
            {firstCompletion ? "Lesson Complete!" : "Lesson Replayed!"}
          </h2>

          {/* XP earned */}
          <div className="flex items-center gap-2 text-3xl font-bold tabular-nums">
            <Zap className="h-7 w-7 text-yellow-500" />
            +{animatedXp} XP
          </div>

          <p className="text-sm text-muted-foreground">
            Total: {totalXp} XP &middot; Level {newLevel}
          </p>

          {/* Streak */}
          {newStreak > 0 && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-orange-500">
              <Flame className="h-4 w-4" />
              {newStreak} day streak{newStreak === 1 ? "" : "!"}
            </div>
          )}

          {/* Unlocked params */}
          {unlockedParams.length > 0 && (
            <div className="w-full rounded-lg bg-primary/5 p-4">
              <div className="mb-2 flex items-center justify-center gap-2 text-sm font-medium text-primary">
                <Unlock className="h-4 w-4" />
                New Parameters Unlocked!
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {unlockedParams.map((param) => (
                  <span
                    key={param}
                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {param}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button onClick={onClose} className="w-full" size="lg">
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
