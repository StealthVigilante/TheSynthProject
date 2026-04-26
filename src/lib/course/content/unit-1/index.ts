import type { Unit } from "../../types";
import { subLesson_1_1 } from "./1-1-what-is-sound";
import { subLesson_1_2 } from "./1-2-pitch-and-notes";

export const unit1: Unit = {
  slug: "unit-1",
  title: "Sound Foundations",
  blurb: "Sound, pitch, oscillator, filter, amp — everything you need to play Synth 1 Pro.",
  subLessons: [subLesson_1_1, subLesson_1_2],
};
