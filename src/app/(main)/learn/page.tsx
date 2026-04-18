import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Database } from "@/lib/supabase/types";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type SynthModel = Database["public"]["Tables"]["synth_models"]["Row"];

export default async function LearnPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  const { data: synths } = await supabase
    .from("synth_models")
    .select("*")
    .order("sort_order");

  const synthsByCategory = new Map<string, SynthModel[]>();
  for (const synth of (synths ?? []) as SynthModel[]) {
    const list = synthsByCategory.get(synth.category_id) ?? [];
    list.push(synth);
    synthsByCategory.set(synth.category_id, list);
  }

  const difficultyColors: Record<string, string> = {
    beginner: "bg-green-500/10 text-green-500",
    intermediate: "bg-yellow-500/10 text-yellow-500",
    advanced: "bg-red-500/10 text-red-500",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Learn</h1>
        <p className="text-muted-foreground">
          Follow the pathway to master synthesis, one lesson at a time.
        </p>
      </div>

      {(categories as Category[] | null)?.map((category) => (
        <div key={category.id} className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{category.name}</h2>
            <Badge className={difficultyColors[category.difficulty]} variant="secondary">
              {category.difficulty}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{category.description}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {synthsByCategory.get(category.id)?.map((synth) => (
              <Link key={synth.id} href={`/learn/${synth.slug}`}>
                <Card className="transition-colors hover:border-primary/50">
                  <CardHeader>
                    <CardTitle className="text-lg">{synth.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {synth.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
