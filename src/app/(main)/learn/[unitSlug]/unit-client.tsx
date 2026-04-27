"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import type { Unit } from "@/lib/course";
import { isSubLessonAvailable, isLessonComplete } from "@/lib/course/progress";

export function UnitPageClient({ unit }: { unit: Unit }) {
  const [, force] = useState(0);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: force re-render after mount so localStorage-backed progress checks run on client
  useEffect(() => { force((n) => n + 1); }, []);

  return (
    <div className="flex flex-col gap-3">
      {unit.subLessons.map((sub, i) => {
        const available = isSubLessonAvailable(unit, sub.slug);
        const completed = isLessonComplete(`${sub.slug}.test`);
        const inner = (
          <div className={`rounded-2xl border p-4 ${
            !available ? "border-border opacity-60"
            : completed ? "border-primary/50 bg-primary/5"
            : "border-primary bg-card"
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold tabular-nums opacity-70">{i + 1}</span>
              <div className="flex-1">
                <h3 className="text-base font-semibold">{sub.title}</h3>
                <p className="text-xs text-muted-foreground">{sub.blurb}</p>
              </div>
              {!available && <Lock className="w-4 h-4 text-muted-foreground" />}
            </div>
            {!available && (
              <p className="text-xs text-muted-foreground mt-2">Complete previous sub-lesson</p>
            )}
          </div>
        );
        return available ? (
          <Link key={sub.slug} href={`/learn/${unit.slug}/${sub.slug}`}>{inner}</Link>
        ) : (
          <div key={sub.slug}>{inner}</div>
        );
      })}
    </div>
  );
}
