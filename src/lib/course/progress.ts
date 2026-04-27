"use client";

import type { Exercise, SubLesson, Unit } from "./types";

const STORAGE_KEY = "osciscoops:progress";

export interface MistakeStat {
  wrongCount: number;
  correctSinceWrong: number;
  subLessonSlug: string;
  exerciseSnapshot: Exercise;
  lastWrongAt: number;
}

export interface Progress {
  completedLessons: string[];
  mistakes: Record<string, MistakeStat>;
  lastUpdatedAt: number;
}

const EMPTY: Progress = {
  completedLessons: [],
  mistakes: {},
  lastUpdatedAt: 0,
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadProgress(): Progress {
  if (!isBrowser()) return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      completedLessons: parsed.completedLessons ?? [],
      mistakes: parsed.mistakes ?? {},
      lastUpdatedAt: parsed.lastUpdatedAt ?? 0,
    };
  } catch {
    return EMPTY;
  }
}

export function saveProgress(p: Progress): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...p,
      lastUpdatedAt: Date.now(),
    }));
  } catch {
    // localStorage may be disabled / quota exceeded; silently ignore
  }
}

export function markLessonComplete(lessonId: string): void {
  const p = loadProgress();
  if (!p.completedLessons.includes(lessonId)) {
    p.completedLessons = [...p.completedLessons, lessonId];
    saveProgress(p);
  }
}

export function isLessonComplete(lessonId: string): boolean {
  return loadProgress().completedLessons.includes(lessonId);
}

export function recordExerciseAttempt(
  ex: Exercise,
  subLessonSlug: string,
  correct: boolean,
): void {
  const p = loadProgress();
  const existing = p.mistakes[ex.id];

  if (correct) {
    if (!existing) return; // not in mistake pool, no-op
    const next: MistakeStat = {
      ...existing,
      correctSinceWrong: existing.correctSinceWrong + 1,
    };
    if (next.correctSinceWrong >= 2) {
      // drop from mistake pool
      const { [ex.id]: _drop, ...rest } = p.mistakes;
      void _drop;
      p.mistakes = rest;
    } else {
      p.mistakes = { ...p.mistakes, [ex.id]: next };
    }
  } else {
    p.mistakes = {
      ...p.mistakes,
      [ex.id]: {
        wrongCount: (existing?.wrongCount ?? 0) + 1,
        correctSinceWrong: 0,
        subLessonSlug,
        exerciseSnapshot: ex,
        lastWrongAt: Date.now(),
      },
    };
  }

  saveProgress(p);
}

export function isLessonAvailable(lessonId: string, sub: SubLesson): boolean {
  const idx = sub.lessons.findIndex((l) => l.slug === lessonId.split(".").pop());
  if (idx <= 0) return idx === 0; // first lesson always available
  const prev = `${sub.slug}.${sub.lessons[idx - 1].slug}`;
  return isLessonComplete(prev);
}

export function isSubLessonAvailable(unit: Unit, subSlug: string): boolean {
  const idx = unit.subLessons.findIndex((s) => s.slug === subSlug);
  if (idx <= 0) return idx === 0;
  const prev = unit.subLessons[idx - 1];
  return isLessonComplete(`${prev.slug}.test`);
}

export function resetProgress(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
