import { notFound } from "next/navigation";
import { findUnit, findSubLesson, findLesson } from "@/lib/course";
import { LessonClient } from "./lesson-client";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ unitSlug: string; subLessonSlug: string; lessonSlug: string }>;
}) {
  const { unitSlug, subLessonSlug, lessonSlug } = await params;
  const unit = findUnit(unitSlug);
  const sub = findSubLesson(unitSlug, subLessonSlug);
  if (!unit || !sub) notFound();
  if (lessonSlug !== "test") {
    const lesson = findLesson(unitSlug, subLessonSlug, lessonSlug);
    if (!lesson) notFound();
  }
  return <LessonClient unit={unit} subSlug={sub.slug} lessonSlug={lessonSlug} />;
}
