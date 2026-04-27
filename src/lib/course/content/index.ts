import type { Unit } from "../types";
import { unit1 } from "./unit-1";

export const UNITS: Unit[] = [unit1];

export function findUnit(slug: string): Unit | undefined {
  return UNITS.find((u) => u.slug === slug);
}

export function findSubLesson(unitSlug: string, subSlug: string) {
  const unit = findUnit(unitSlug);
  return unit?.subLessons.find((s) => s.slug === subSlug);
}

export function findLesson(unitSlug: string, subSlug: string, lessonSlug: string) {
  const sub = findSubLesson(unitSlug, subSlug);
  return sub?.lessons.find((l) => l.slug === lessonSlug);
}
