import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { findUnit, findSubLesson } from "@/lib/course";
import { PathwayClient } from "./pathway-client";

export default async function SubLessonPage({
  params,
}: {
  params: Promise<{ unitSlug: string; subLessonSlug: string }>;
}) {
  const { unitSlug, subLessonSlug } = await params;
  const unit = findUnit(unitSlug);
  const sub = findSubLesson(unitSlug, subLessonSlug);
  if (!unit || !sub) notFound();
  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      <Link
        href={`/learn/${unitSlug}`}
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> {unit.title}
      </Link>
      <header className="text-center">
        <h1 className="text-xl font-bold">{sub.title}</h1>
        <p className="text-sm text-muted-foreground">{sub.blurb}</p>
      </header>
      <PathwayClient unit={unit} sub={sub} />
    </div>
  );
}
