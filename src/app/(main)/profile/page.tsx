import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, GraduationCap, Music2, Zap } from "lucide-react";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import type { Profile } from "@/lib/supabase/types";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const profile = profileData as Profile | null;

  const [{ count: synthsUnlocked }, { count: lessonsDone }] = await Promise.all([
    supabase
      .from("user_synths")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user!.id),
    supabase
      .from("user_lesson_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .eq("status", "completed"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Member since{" "}
          {profile?.created_at
            ? new Date(profile.created_at).toLocaleDateString()
            : "—"}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total XP</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.xp ?? 0}</div>
            <p className="text-xs text-muted-foreground">Level {profile?.level ?? 1}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.streak ?? 0} days</div>
            <p className="text-xs text-muted-foreground">
              Best: {profile?.longest_streak ?? 0} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Synths Unlocked</CardTitle>
            <Music2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{synthsUnlocked ?? 0}</div>
            <p className="text-xs text-muted-foreground">of 6 total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lessons Done</CardTitle>
            <GraduationCap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lessonsDone ?? 0}</div>
            <p className="text-xs text-muted-foreground">Keep going!</p>
          </CardContent>
        </Card>
      </div>

      {/* Edit form */}
      <ProfileEditForm
        currentDisplayName={profile?.display_name ?? null}
        currentUsername={profile?.username ?? null}
      />
    </div>
  );
}
