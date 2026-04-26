import type { SubLesson } from "../../types";

export const subLesson_1_2: SubLesson = {
  slug: "1-2",
  title: "Pitch & Notes",
  blurb: "Keyboards, octaves, sharps. Find your way around the keys.",
  lessons: [
    {
      slug: "1-2-1",
      title: "Notes on a Keyboard",
      exercises: [
        {
          id: "1-2.1-2-1.q1",
          type: "concept-slide",
          prompt: "The keyboard repeats",
          visual: "octave-keyboard",
          caption: "Seven white keys (C D E F G A B), then it starts over an octave higher.",
        },
        {
          id: "1-2.1-2-1.q2",
          type: "tap-to-hear",
          prompt: "Listen to a C major scale",
          patch: { waveform: "sine", filterFreq: 8000, volume: 0.7 },
          notes: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
        },
        {
          id: "1-2.1-2-1.q3",
          type: "multi-choice",
          prompt: "Which key is C?",
          question: "C is the white key…",
          options: [
            "Just left of any group of two black keys",
            "Just right of any group of two black keys",
            "The leftmost key on the keyboard",
            "Always green",
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      slug: "1-2-2",
      title: "Octaves",
      exercises: [
        {
          id: "1-2.1-2-2.q1",
          type: "concept-slide",
          prompt: "Same name, different height",
          visual: "octave-keyboard",
          caption: "C3, C4, C5… all the C's. Each is twice the frequency of the one below.",
        },
        {
          id: "1-2.1-2-2.q2",
          type: "ab-compare",
          prompt: "Which is C4?",
          a: { patch: { waveform: "sine", volume: 0.7 }, notes: ["C3"], label: "A" },
          b: { patch: { waveform: "sine", volume: 0.7 }, notes: ["C4"], label: "B" },
          correct: "b",
          explainer: "C4 is 'middle C', one octave higher than C3.",
        },
        {
          id: "1-2.1-2-2.q3",
          type: "play-melody",
          prompt: "Play C3 then C4",
          patch: { waveform: "sine", volume: 0.7 },
          sequence: ["C3", "C4"],
        },
        {
          id: "1-2.1-2-2.q4",
          type: "multi-choice",
          prompt: "How many semitones in an octave?",
          question: "One octave equals…",
          options: ["7", "8", "12", "16"],
          correctIndex: 2,
        },
      ],
    },
    {
      slug: "1-2-3",
      title: "Sharps & Flats",
      exercises: [
        {
          id: "1-2.1-2-3.q1",
          type: "concept-slide",
          prompt: "Black keys = sharps and flats",
          visual: "octave-keyboard",
          caption: "The black keys sit between certain whites. C# is just right of C.",
        },
        {
          id: "1-2.1-2-3.q2",
          type: "multi-choice",
          prompt: "Which note is between C and D?",
          question: "The black key between C and D is…",
          options: ["B#", "C#", "D♭", "Both C# and D♭"],
          correctIndex: 3,
          explainer: "C# and D♭ are the same key — just two different names.",
        },
        {
          id: "1-2.1-2-3.q3",
          type: "ab-compare",
          prompt: "Which is C#?",
          a: { patch: { waveform: "sine", volume: 0.7 }, notes: ["C4"], label: "A" },
          b: { patch: { waveform: "sine", volume: 0.7 }, notes: ["C#4"], label: "B" },
          correct: "b",
        },
      ],
    },
    {
      slug: "1-2-4",
      title: "Play a Tune",
      exercises: [
        {
          id: "1-2.1-2-4.q1",
          type: "play-melody",
          prompt: "Walk up: C D E F G",
          patch: { waveform: "sine", filterFreq: 8000, volume: 0.7 },
          sequence: ["C4", "D4", "E4", "F4", "G4"],
          hint: "Tap each key in order.",
        },
        {
          id: "1-2.1-2-4.q2",
          type: "play-melody",
          prompt: "Walk down: G F E D C",
          patch: { waveform: "sine", filterFreq: 8000, volume: 0.7 },
          sequence: ["G4", "F4", "E4", "D4", "C4"],
        },
        {
          id: "1-2.1-2-4.q3",
          type: "free-play",
          prompt: "Find your own pattern",
          patch: { waveform: "sine", filterFreq: 8000, volume: 0.7 },
          durationS: 30,
          caption: "30 seconds. No grading.",
        },
      ],
    },
  ],
};
