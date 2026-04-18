import type { Json } from "@/lib/supabase/types";
import type { ExerciseType } from "@/lib/supabase/types";

export interface EvalResult {
  correct: boolean;
  score: number; // 0-100
  feedback: string;
}

/**
 * Evaluate an exercise answer client-side for immediate feedback.
 * Server-side validation happens on lesson completion.
 */
export function evaluateExercise(
  exerciseType: ExerciseType,
  content: Json,
  answer: Json
): EvalResult {
  const c = content as Record<string, Json>;

  switch (exerciseType) {
    case "info":
    case "listen":
    case "free_play":
      // These are always "correct" - completion-based
      return { correct: true, score: 100, feedback: "Great job!" };

    case "quiz_mc": {
      const correctIndex = c.correct_index as number;
      const selectedIndex = answer as number;
      const correct = selectedIndex === correctIndex;
      return {
        correct,
        score: correct ? 100 : 0,
        feedback: correct ? "Correct!" : "Not quite. Try again!",
      };
    }

    case "quiz_param": {
      const correctValue = c.correct_value as number;
      const tolerance = (c.tolerance as number) ?? 0.1;
      const userValue = answer as number;
      const diff = Math.abs(userValue - correctValue);
      const correct = diff <= tolerance;
      const score = correct ? 100 : Math.max(0, 100 - (diff / tolerance) * 50);
      return {
        correct,
        score: Math.round(score),
        feedback: correct
          ? "Correct!"
          : `Close! The answer is ${correctValue}.`,
      };
    }

    case "tweak": {
      const targetValue = c.target_value as number;
      const tolerance = (c.tolerance as number) ?? 0.1;
      const userValue = answer as number;
      const diff = Math.abs(userValue - targetValue);
      const correct = diff <= tolerance;
      const score = correct ? 100 : Math.max(0, 100 - (diff / tolerance) * 50);
      return {
        correct,
        score: Math.round(score),
        feedback: correct
          ? "You nailed it!"
          : diff <= tolerance * 2
            ? "Almost there! Keep tweaking."
            : "Keep adjusting the parameter.",
      };
    }

    case "match_sound": {
      // Match sound uses multiple params - check each
      const targetParams = c.target_params as Record<string, number>;
      const tolerance = (c.tolerance as number) ?? 0.15;
      const userParams = answer as Record<string, number>;

      if (!targetParams || !userParams) {
        return { correct: false, score: 0, feedback: "Set the parameters to match the sound." };
      }

      let totalScore = 0;
      let count = 0;
      for (const [key, target] of Object.entries(targetParams)) {
        const userVal = userParams[key];
        if (userVal === undefined) continue;
        const range = Math.abs(target) || 1;
        const diff = Math.abs(userVal - target) / range;
        totalScore += Math.max(0, 1 - diff / tolerance);
        count++;
      }

      const avgScore = count > 0 ? (totalScore / count) * 100 : 0;
      const correct = avgScore >= 80;
      return {
        correct,
        score: Math.round(avgScore),
        feedback: correct
          ? "Great match!"
          : avgScore >= 50
            ? "Getting closer! Keep tweaking."
            : "Try to match the sound more closely.",
      };
    }

    default:
      return { correct: true, score: 100, feedback: "Complete!" };
  }
}
