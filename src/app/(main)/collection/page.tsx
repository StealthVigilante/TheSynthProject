import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import Link from "next/link";
import type { Database, SynthModel, UserSynth, Category } from "@/lib/supabase/types";

export default async function CollectionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: synths } = await supabase
    .from("synth_models")
    .select("*")
    .order("sort_order");

  const { data: categoriesData } = await supabase
    .from("categories")
    .select("*");

  const categories = categoriesData as Category[] | null;
  const categoryMap = new Map(
    categories?.map((c) => [c.id, c]) ?? []
  );

  // Get user's unlocked synths
  const { data: userSynthsData } = await supabase
    .from("user_synths")
    .select("*")
    .eq("user_id", user!.id);

  const userSynths = (userSynthsData ?? []) as UserSynth[];
  const unlockedSynthIds = new Set(userSynths.map((us) => us.synth_model_id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Synth Collection</h1>
        <p className="text-muted-foreground">
          Your virtual synth rack. Complete lessons to unlock new instruments.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(synths as SynthModel[] | null)?.map((synth) => {
          const unlocked = unlockedSynthIds.has(synth.id);
          const category = categoryMap.get(synth.category_id);
          const userSynth = userSynths.find((us) => us.synth_model_id === synth.id);
          const paramCount = userSynth?.unlocked_params?.length ?? 0;
          const totalParams = synth.all_params?.length ?? 0;

          return (
            <Link
              key={synth.id}
              href={unlocked ? `/collection/${synth.slug}` : "#"}
              className={unlocked ? "" : "pointer-events-none"}
            >
              <Card
                className={
                  unlocked
                    ? "transition-colors hover:border-primary/50"
                    : "opacity-50"
                }
              >
                <CardHeader className="flex flex-row items-start justify-between">
                  <CardTitle className="text-lg">{synth.name}</CardTitle>
                  {!unlocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {synth.description}
                  </p>
                  <div className="flex items-center gap-2">
                    {category && (
                      <Badge variant="outline" className="text-xs">
                        {category.difficulty}
                      </Badge>
                    )}
                    {unlocked && totalParams > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {paramCount}/{totalParams} params
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
