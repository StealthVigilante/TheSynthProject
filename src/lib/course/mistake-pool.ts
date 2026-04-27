import type { Exercise, Lesson, SubLesson, Unit } from "./types";
import { ACTIVE_EXERCISE_TYPES } from "./types";
import { loadProgress, type MistakeStat } from "./progress";

interface MixedTestOptions {
  totalQuestions?: number;
  currentRatio?: number;
  pastCap?: number;
  unitWideMistakes?: boolean;
}

const DEFAULTS: Required<MixedTestOptions> = {
  totalQuestions: 8,
  currentRatio: 0.6,
  pastCap: 6,
  unitWideMistakes: false,
};

function flattenActiveExercises(sub: SubLesson): Exercise[] {
  const exs: Exercise[] = [];
  for (const lesson of sub.lessons) {
    for (const ex of lesson.exercises) {
      if ((ACTIVE_EXERCISE_TYPES as readonly string[]).includes(ex.type)) {
        exs.push(ex);
      }
    }
  }
  return exs;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateMixedTest(
  currentSub: SubLesson,
  unit: Unit,
  options: MixedTestOptions = {},
): Lesson {
  const opts = { ...DEFAULTS, ...options };
  const total = opts.totalQuestions;
  const targetCurrent = Math.floor(opts.currentRatio * total);
  const targetPast = total - targetCurrent;

  const currentPool = shuffle(flattenActiveExercises(currentSub));

  const progress = loadProgress();
  const allMistakeEntries: MistakeStat[] = Object.values(progress.mistakes);
  const pastEntries = opts.unitWideMistakes
    ? allMistakeEntries
    : allMistakeEntries.filter((m) => m.subLessonSlug !== currentSub.slug);

  const pastPool = pastEntries
    .sort((a, b) => b.lastWrongAt - a.lastWrongAt)
    .slice(0, opts.pastCap)
    .map((m) => m.exerciseSnapshot);

  const pickedPast = shuffle(pastPool).slice(0, Math.min(targetPast, pastPool.length));
  const remainingFromCurrent = total - pickedPast.length;
  const pickedCurrent = currentPool.slice(0, remainingFromCurrent);

  const exercises = shuffle([...pickedPast, ...pickedCurrent]);

  return {
    slug: "test",
    title: "Mixed Test",
    exercises,
  };
}

export function isCapstoneSlug(subSlug: string): boolean {
  return subSlug === "1-7";
}

export function mixedTestOptionsFor(subSlug: string): MixedTestOptions {
  if (isCapstoneSlug(subSlug)) {
    return { totalQuestions: 10, currentRatio: 0.5, pastCap: 6, unitWideMistakes: true };
  }
  return {};
}
