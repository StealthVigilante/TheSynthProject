import Link from "next/link";
import { UNITS } from "@/lib/course";

export default function LearnPage() {
  return (
    <div className="space-y-6 max-w-md mx-auto px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Learn</h1>
        <p className="text-sm text-muted-foreground">Master synthesis from the ground up.</p>
      </header>
      <div className="flex flex-col gap-3">
        {UNITS.map((unit) => (
          <Link
            key={unit.slug}
            href={`/learn/${unit.slug}`}
            className="rounded-2xl border border-border bg-card p-5 hover:border-primary/60 transition"
          >
            <h2 className="text-lg font-semibold">{unit.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{unit.blurb}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              {unit.subLessons.length} sub-lessons
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
