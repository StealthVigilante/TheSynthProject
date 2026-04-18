import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/types";

const LIMIT = 50;

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-400" />;
  if (rank === 2) return <Crown className="h-5 w-5 text-slate-400" />;
  if (rank === 3) return <Crown className="h-5 w-5 text-amber-600" />;
  return <span className="w-5 text-center text-sm font-medium text-muted-foreground">{rank}</span>;
}

function getInitials(profile: Profile): string {
  const name = profile.display_name ?? profile.username ?? "?";
  return name.slice(0, 2).toUpperCase();
}

function LeaderboardRow({
  profile,
  rank,
  isCurrentUser,
  metric,
}: {
  profile: Profile;
  rank: number;
  isCurrentUser: boolean;
  metric: "xp" | "streak";
}) {
  const value = metric === "xp" ? profile.xp : profile.streak;
  const label = metric === "xp" ? "XP" : "day streak";

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg px-4 py-3 transition-colors",
        isCurrentUser
          ? "bg-primary/10 ring-1 ring-primary/30"
          : "hover:bg-muted/50"
      )}
    >
      <div className="flex w-6 items-center justify-center">
        <RankBadge rank={rank} />
      </div>

      <Avatar size="default">
        {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
        <AvatarFallback>{getInitials(profile)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium leading-none">
          {profile.display_name ?? profile.username ?? "Anonymous"}
          {isCurrentUser && (
            <span className="ml-2 text-xs text-primary font-normal">you</span>
          )}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          @{profile.username ?? "—"} · Level {profile.level}
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
        {metric === "xp" ? (
          <Zap className="h-3.5 w-3.5 text-yellow-500" />
        ) : (
          <Flame className="h-3.5 w-3.5 text-orange-500" />
        )}
        {value.toLocaleString()}
        <span className="text-xs font-normal text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: byXpData }, { data: byStreakData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .order("xp", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("profiles")
      .select("*")
      .order("streak", { ascending: false })
      .limit(LIMIT),
  ]);

  const byXp = (byXpData ?? []) as Profile[];
  const byStreak = (byStreakData ?? []) as Profile[];

  // Find current user's rank if they fall outside the top LIMIT
  const currentUserXpRank = byXp.findIndex((p) => p.id === user?.id);
  const currentUserStreakRank = byStreak.findIndex((p) => p.id === user?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          See who&apos;s leading the pack.
        </p>
      </div>

      <Tabs defaultValue="xp">
        <TabsList>
          <TabsTrigger value="xp">
            <Zap className="mr-1.5 h-3.5 w-3.5 text-yellow-500" />
            Total XP
          </TabsTrigger>
          <TabsTrigger value="streak">
            <Flame className="mr-1.5 h-3.5 w-3.5 text-orange-500" />
            Streak
          </TabsTrigger>
        </TabsList>

        <TabsContent value="xp" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Top {byXp.length} by XP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              {byXp.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No players yet. Be the first!
                </p>
              ) : (
                byXp.map((profile, i) => (
                  <LeaderboardRow
                    key={profile.id}
                    profile={profile}
                    rank={i + 1}
                    isCurrentUser={profile.id === user?.id}
                    metric="xp"
                  />
                ))
              )}
              {currentUserXpRank === -1 && user && (
                <p className="pt-2 text-center text-xs text-muted-foreground">
                  You&apos;re not in the top {LIMIT} yet — keep earning XP!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streak" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Top {byStreak.length} by streak
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              {byStreak.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No players yet. Be the first!
                </p>
              ) : (
                byStreak.map((profile, i) => (
                  <LeaderboardRow
                    key={profile.id}
                    profile={profile}
                    rank={i + 1}
                    isCurrentUser={profile.id === user?.id}
                    metric="streak"
                  />
                ))
              )}
              {currentUserStreakRank === -1 && user && (
                <p className="pt-2 text-center text-xs text-muted-foreground">
                  You&apos;re not in the top {LIMIT} yet — keep that streak alive!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
