"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Unit, Lesson } from "@/lib/course";
import { findSubLesson } from "@/lib/course";
import { LessonPlayer } from "@/components/course/lesson-player";
import { generateMixedTest, mixedTestOptionsFor } from "@/lib/course/mistake-pool";

interface Props {
  unit: Unit;
  subSlug: string;
  lessonSlug: string;
}

export function LessonClient({ unit, subSlug, lessonSlug }: Props) {
  const router = useRouter();
  const sub = findSubLesson(unit.slug, subSlug);

  const lesson: Lesson | undefined = useMemo(() => {
    if (!sub) return undefined;
    if (lessonSlug === "test") {
      return generateMixedTest(sub, unit, mixedTestOptionsFor(sub.slug));
    }
    return sub.lessons.find((l) => l.slug === lessonSlug);
  }, [sub, unit, lessonSlug]);

  if (!sub || !lesson) return null;

  const lessonId = `${subSlug}.${lessonSlug}`;
  const onExit = () => router.push(`/learn/${unit.slug}/${subSlug}`);
  const onComplete = () => router.push(`/learn/${unit.slug}/${subSlug}`);

  return (
    <LessonPlayer
      lesson={lesson}
      lessonId={lessonId}
      subLessonSlug={subSlug}
      onExit={onExit}
      onComplete={onComplete}
    />
  );
}
