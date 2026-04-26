import type { Unit } from "../../types";
import { subLesson_1_1 } from "./1-1-what-is-sound";
import { subLesson_1_2 } from "./1-2-pitch-and-notes";
import { subLesson_1_3 } from "./1-3-oscillator";
import { subLesson_1_4 } from "./1-4-amp-envelope";
import { subLesson_1_5 } from "./1-5-filter";
import { subLesson_1_6 } from "./1-6-polish";
import { subLesson_1_7 } from "./1-7-mastery";

export const unit1: Unit = {
  slug: "unit-1",
  title: "Sound Foundations",
  blurb: "Sound, pitch, oscillator, filter, amp — everything you need to play Synth 1 Pro.",
  subLessons: [
    subLesson_1_1, subLesson_1_2, subLesson_1_3, subLesson_1_4,
    subLesson_1_5, subLesson_1_6, subLesson_1_7,
  ],
};
