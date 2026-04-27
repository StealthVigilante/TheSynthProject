"use client";
import { useEffect, useState } from "react";
import { SnakePathway, type PathwayNode } from "@/components/course/snake-pathway";
import type { Unit, SubLesson } from "@/lib/course";
import { isLessonComplete } from "@/lib/course/progress";

export function PathwayClient({ unit, sub }: { unit: Unit; sub: SubLesson }) {
  const [nodes, setNodes] = useState<PathwayNode[]>([]);

  useEffect(() => {
    const completedSet = new Set<string>();
    for (const l of sub.lessons) {
      if (isLessonComplete(`${sub.slug}.${l.slug}`)) completedSet.add(l.slug);
    }
    const testCompleted = isLessonComplete(`${sub.slug}.test`);

    const items: PathwayNode[] = [];
    for (let i = 0; i < sub.lessons.length; i++) {
      const l = sub.lessons[i];
      const prev = i === 0 ? null : sub.lessons[i - 1];
      const status: PathwayNode["status"] = completedSet.has(l.slug)
        ? "completed"
        : prev === null || completedSet.has(prev.slug)
          ? "available"
          : "locked";
      items.push({
        lessonSlug: l.slug,
        lessonId: `${sub.slug}.${l.slug}`,
        title: l.title,
        status,
      });
    }
    const allLessonsDone = sub.lessons.every((l) => completedSet.has(l.slug));
    items.push({
      lessonSlug: "test",
      lessonId: `${sub.slug}.test`,
      title: "Mixed Test",
      isTest: true,
      status: testCompleted ? "completed" : allLessonsDone ? "available" : "locked",
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: localStorage-backed progress checks must run after mount, then drive the snake's node statuses
    setNodes(items);
  }, [unit, sub]);

  return <SnakePathway unitSlug={unit.slug} subSlug={sub.slug} nodes={nodes} />;
}
