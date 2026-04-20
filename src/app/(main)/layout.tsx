import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ClientMain } from "@/components/layout/client-main";

interface ProfilePartial {
  xp: number;
  streak: number;
  display_name: string | null;
  username: string | null;
}

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("xp, streak, display_name, username")
    .eq("id", user.id)
    .single();

  const profile = profileData as ProfilePartial | null;

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          xp={profile?.xp ?? 0}
          streak={profile?.streak ?? 0}
          displayName={profile?.display_name ?? profile?.username ?? "User"}
        />
        <ClientMain>{children}</ClientMain>
      </div>
      <MobileNav />
    </div>
  );
}
