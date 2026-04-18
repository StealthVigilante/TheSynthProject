-- Seed categories
insert into public.categories (name, slug, description, difficulty, sort_order, icon) values
  ('Beginner Synths', 'beginner', 'Start your synthesis journey with classic subtractive synths', 'beginner', 1, 'Waves'),
  ('Intermediate Synths', 'intermediate', 'Explore FM synthesis and wavetable techniques', 'intermediate', 2, 'Activity'),
  ('Advanced Synths', 'advanced', 'Master modular and granular synthesis', 'advanced', 3, 'Cpu');

-- Seed synth models
insert into public.synth_models (category_id, name, slug, description, engine_type, engine_config, default_params, all_params, sort_order, icon)
values
  (
    (select id from public.categories where slug = 'beginner'),
    'Osci Mono',
    'osci-mono',
    'A warm, fat monosynth inspired by classic analog subtractive synthesizers. Perfect for learning the fundamentals of oscillators, filters, and envelopes.',
    'MonoSynth',
    '{
      "oscillator": { "type": "sawtooth" },
      "filter": { "Q": 2, "type": "lowpass", "rolloff": -24 },
      "envelope": { "attack": 0.01, "decay": 0.3, "sustain": 0.7, "release": 0.5 },
      "filterEnvelope": { "attack": 0.01, "decay": 0.3, "sustain": 0.5, "release": 0.5, "baseFrequency": 200, "octaves": 3 }
    }'::jsonb,
    '{
      "oscillator.type": "sawtooth",
      "filter.frequency": 2000,
      "filter.Q": 2,
      "envelope.attack": 0.01,
      "envelope.decay": 0.3,
      "envelope.sustain": 0.7,
      "envelope.release": 0.5,
      "filterEnvelope.attack": 0.01,
      "filterEnvelope.decay": 0.3,
      "filterEnvelope.sustain": 0.5,
      "filterEnvelope.release": 0.5,
      "volume": -6
    }'::jsonb,
    array[
      'oscillator.type',
      'filter.frequency',
      'filter.Q',
      'envelope.attack',
      'envelope.decay',
      'envelope.sustain',
      'envelope.release',
      'filterEnvelope.attack',
      'filterEnvelope.decay',
      'filterEnvelope.sustain',
      'filterEnvelope.release',
      'filterEnvelope.baseFrequency',
      'filterEnvelope.octaves',
      'volume'
    ],
    1,
    'CircleDot'
  ),
  (
    (select id from public.categories where slug = 'beginner'),
    'Osci Sub',
    'osci-sub',
    'A punchy synth with built-in noise layer, inspired by the Roland SH-101. Great for basses and leads.',
    'MonoSynth',
    '{
      "oscillator": { "type": "square" },
      "filter": { "Q": 3, "type": "lowpass", "rolloff": -24 },
      "envelope": { "attack": 0.005, "decay": 0.2, "sustain": 0.8, "release": 0.3 },
      "filterEnvelope": { "attack": 0.005, "decay": 0.2, "sustain": 0.6, "release": 0.3, "baseFrequency": 300, "octaves": 2.5 }
    }'::jsonb,
    '{
      "oscillator.type": "square",
      "filter.frequency": 3000,
      "filter.Q": 3,
      "envelope.attack": 0.005,
      "envelope.decay": 0.2,
      "envelope.sustain": 0.8,
      "envelope.release": 0.3,
      "volume": -6
    }'::jsonb,
    array[
      'oscillator.type',
      'filter.frequency',
      'filter.Q',
      'envelope.attack',
      'envelope.decay',
      'envelope.sustain',
      'envelope.release',
      'volume'
    ],
    2,
    'Square'
  ),
  (
    (select id from public.categories where slug = 'intermediate'),
    'Osci FM',
    'osci-fm',
    'A DX7-inspired FM synthesizer. Learn how frequency modulation creates complex harmonic timbres.',
    'FMSynth',
    '{
      "harmonicity": 3,
      "modulationIndex": 10,
      "oscillator": { "type": "sine" },
      "modulation": { "type": "sine" },
      "envelope": { "attack": 0.01, "decay": 0.5, "sustain": 0.4, "release": 0.8 },
      "modulationEnvelope": { "attack": 0.01, "decay": 0.3, "sustain": 0.5, "release": 0.5 }
    }'::jsonb,
    '{
      "harmonicity": 3,
      "modulationIndex": 10,
      "oscillator.type": "sine",
      "modulation.type": "sine",
      "envelope.attack": 0.01,
      "envelope.decay": 0.5,
      "envelope.sustain": 0.4,
      "envelope.release": 0.8,
      "volume": -6
    }'::jsonb,
    array[
      'harmonicity',
      'modulationIndex',
      'oscillator.type',
      'modulation.type',
      'envelope.attack',
      'envelope.decay',
      'envelope.sustain',
      'envelope.release',
      'modulationEnvelope.attack',
      'modulationEnvelope.decay',
      'modulationEnvelope.sustain',
      'modulationEnvelope.release',
      'volume'
    ],
    1,
    'Radar'
  ),
  (
    (select id from public.categories where slug = 'intermediate'),
    'Osci Wave',
    'osci-wave',
    'A wavetable-style synthesizer for exploring different oscillator waveforms and timbral morphing.',
    'Synth',
    '{
      "oscillator": { "type": "fatsawtooth", "spread": 20, "count": 3 },
      "envelope": { "attack": 0.1, "decay": 0.3, "sustain": 0.6, "release": 0.8 }
    }'::jsonb,
    '{
      "oscillator.type": "fatsawtooth",
      "oscillator.spread": 20,
      "oscillator.count": 3,
      "envelope.attack": 0.1,
      "envelope.decay": 0.3,
      "envelope.sustain": 0.6,
      "envelope.release": 0.8,
      "volume": -6
    }'::jsonb,
    array[
      'oscillator.type',
      'oscillator.spread',
      'oscillator.count',
      'envelope.attack',
      'envelope.decay',
      'envelope.sustain',
      'envelope.release',
      'volume'
    ],
    2,
    'AudioWaveform'
  ),
  (
    (select id from public.categories where slug = 'advanced'),
    'Osci Mod',
    'osci-mod',
    'A modular-style dual-voice synthesizer with LFO modulation. Explore cross-modulation and complex patches.',
    'DuoSynth',
    '{
      "vibratoAmount": 0.5,
      "vibratoRate": 5,
      "harmonicity": 1.5,
      "voice0": {
        "oscillator": { "type": "sawtooth" },
        "envelope": { "attack": 0.01, "decay": 0.5, "sustain": 0.5, "release": 1 }
      },
      "voice1": {
        "oscillator": { "type": "square" },
        "envelope": { "attack": 0.01, "decay": 0.5, "sustain": 0.5, "release": 1 }
      }
    }'::jsonb,
    '{
      "vibratoAmount": 0.5,
      "vibratoRate": 5,
      "harmonicity": 1.5,
      "volume": -6
    }'::jsonb,
    array[
      'vibratoAmount',
      'vibratoRate',
      'harmonicity',
      'voice0.oscillator.type',
      'voice0.envelope.attack',
      'voice0.envelope.decay',
      'voice0.envelope.sustain',
      'voice0.envelope.release',
      'voice1.oscillator.type',
      'voice1.envelope.attack',
      'voice1.envelope.decay',
      'voice1.envelope.sustain',
      'voice1.envelope.release',
      'volume'
    ],
    1,
    'Network'
  ),
  (
    (select id from public.categories where slug = 'advanced'),
    'Osci Grain',
    'osci-grain',
    'A granular synthesizer that deconstructs audio into tiny grains. Create evolving textures and ambient soundscapes.',
    'GrainPlayer',
    '{
      "grainSize": 0.1,
      "overlap": 0.05,
      "playbackRate": 1,
      "detune": 0,
      "loop": true
    }'::jsonb,
    '{
      "grainSize": 0.1,
      "overlap": 0.05,
      "playbackRate": 1,
      "detune": 0,
      "volume": -6
    }'::jsonb,
    array[
      'grainSize',
      'overlap',
      'playbackRate',
      'detune',
      'volume'
    ],
    2,
    'Sparkles'
  );

-- =====================================================
-- Seed lessons + exercises for Osci Mono
-- =====================================================

-- Lesson 1: What is a Synthesizer?
insert into public.lessons (synth_model_id, title, slug, description, sort_order, xp_reward, unlocks_params)
values (
  (select id from public.synth_models where slug = 'osci-mono'),
  'What is a Synthesizer?',
  'intro',
  'Learn the basics of what a synthesizer is and how it makes sound.',
  1, 15,
  array['oscillator.type', 'volume']
);

insert into public.exercises (lesson_id, exercise_type, sort_order, title, instructions, content) values
(
  (select id from public.lessons where slug = 'intro' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'info', 1, 'Welcome to Synthesis!',
  'A synthesizer is an electronic instrument that generates sound using electrical signals. Unlike a piano or guitar, a synth creates sound from scratch using oscillators — electronic circuits that produce repeating waveforms.',
  '{"text": "The Osci Mono is a monophonic subtractive synthesizer. \"Monophonic\" means it plays one note at a time. \"Subtractive\" means it starts with a harmonically rich waveform and then sculpts the sound by filtering out frequencies. This is the most classic form of synthesis and the foundation of countless iconic sounds."}'::jsonb
),
(
  (select id from public.lessons where slug = 'intro' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'listen', 2, 'Your First Sound',
  'Let''s hear what the Osci Mono sounds like with its default settings. Click "Listen" to hear a sawtooth wave — the raw building block of subtractive synthesis.',
  '{"params_to_set": {"oscillator.type": "sawtooth", "volume": -6}, "note_sequence": ["C4", "E4", "G4", "C5"]}'::jsonb
),
(
  (select id from public.lessons where slug = 'intro' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'free_play', 3, 'Try It Yourself',
  'Now it''s your turn! Use your computer keyboard to play notes. The keys A through J play the white notes from C4 to B4. Try playing a simple melody.',
  '{"duration_seconds": 20, "prompt": "Try playing the notes A, S, D, F on your keyboard to hear C, D, E, F"}'::jsonb
);

-- Lesson 2: Oscillator Waveforms
insert into public.lessons (synth_model_id, title, slug, description, sort_order, xp_reward, unlocks_params)
values (
  (select id from public.synth_models where slug = 'osci-mono'),
  'Oscillator Waveforms',
  'waveforms',
  'Explore the four basic waveforms and how they sound different.',
  2, 20,
  array[]::text[]
);

insert into public.exercises (lesson_id, exercise_type, sort_order, title, instructions, content) values
(
  (select id from public.lessons where slug = 'waveforms' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'info', 1, 'The Four Basic Waveforms',
  'Every oscillator produces a repeating waveform. The shape of this waveform determines the timbre (tonal quality) of the sound. There are four fundamental waveforms in synthesis:',
  '{"text": "• Sine (∿) — Pure tone, no harmonics. Smooth and clean like a flute.\n• Square (⊓) — Hollow, clarinet-like. Contains only odd harmonics.\n• Sawtooth (⩘) — Bright and buzzy. Contains all harmonics. Great for leads and basses.\n• Triangle (△) — Similar to sine but slightly brighter. Contains weak odd harmonics."}'::jsonb
),
(
  (select id from public.lessons where slug = 'waveforms' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'listen', 2, 'Sine Wave',
  'The sine wave is the simplest waveform — a pure tone with no overtones. Listen to how clean it sounds.',
  '{"params_to_set": {"oscillator.type": "sine"}, "note_sequence": ["C4", "E4", "G4"]}'::jsonb
),
(
  (select id from public.lessons where slug = 'waveforms' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'listen', 3, 'Square Wave',
  'The square wave sounds hollow and woodwind-like. Notice how it has more character than the sine wave.',
  '{"params_to_set": {"oscillator.type": "square"}, "note_sequence": ["C4", "E4", "G4"]}'::jsonb
),
(
  (select id from public.lessons where slug = 'waveforms' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'quiz_mc', 4, 'Waveform Quiz',
  'Which waveform contains ALL harmonics (both odd and even) and sounds the brightest?',
  '{"question": "Which waveform contains ALL harmonics and sounds the brightest?", "options": ["Sine", "Square", "Sawtooth", "Triangle"], "correct_index": 2}'::jsonb
),
(
  (select id from public.lessons where slug = 'waveforms' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'free_play', 5, 'Explore Waveforms',
  'Switch between different waveforms using the selector and play some notes. Listen to how each waveform sounds different!',
  '{"duration_seconds": 25, "prompt": "Use the waveform selector to try all four types while playing notes."}'::jsonb
);

-- Lesson 3: The Filter
insert into public.lessons (synth_model_id, title, slug, description, sort_order, xp_reward, unlocks_params)
values (
  (select id from public.synth_models where slug = 'osci-mono'),
  'The Filter',
  'filter',
  'Learn how filters shape your sound by removing frequencies.',
  3, 25,
  array['filter.frequency', 'filter.Q']
);

insert into public.exercises (lesson_id, exercise_type, sort_order, title, instructions, content) values
(
  (select id from public.lessons where slug = 'filter' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'info', 1, 'What is a Filter?',
  'The filter is the heart of subtractive synthesis. It removes (subtracts) certain frequencies from the oscillator''s sound. The most common type is the low-pass filter, which lets low frequencies through and cuts high frequencies.',
  '{"text": "Key filter parameters:\n• Cutoff Frequency — The point where the filter starts cutting. Lower = darker, higher = brighter.\n• Resonance (Q) — Boosts frequencies right at the cutoff point, creating a characteristic \"peak\" or \"squelch\"."}'::jsonb
),
(
  (select id from public.lessons where slug = 'filter' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'listen', 2, 'Low Cutoff',
  'Listen to the sawtooth wave with a very low filter cutoff. Notice how dark and muffled it sounds — most of the harmonics are being filtered out.',
  '{"params_to_set": {"oscillator.type": "sawtooth", "filter.frequency": 400}, "note_sequence": ["C4", "E4", "G4"]}'::jsonb
),
(
  (select id from public.lessons where slug = 'filter' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'listen', 3, 'High Cutoff',
  'Now listen with the cutoff wide open. The sound is bright and full — all harmonics pass through.',
  '{"params_to_set": {"oscillator.type": "sawtooth", "filter.frequency": 8000}, "note_sequence": ["C4", "E4", "G4"]}'::jsonb
),
(
  (select id from public.lessons where slug = 'filter' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'tweak', 4, 'Find the Sweet Spot',
  'Turn the Cutoff knob to find a frequency around 1200 Hz — a warm, balanced tone that keeps the character of the sawtooth but tames the harshness.',
  '{"target_param": "filter.frequency", "target_value": 1200, "tolerance": 200}'::jsonb
),
(
  (select id from public.lessons where slug = 'filter' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'quiz_mc', 5, 'Filter Quiz',
  'What does increasing the Resonance (Q) parameter do?',
  '{"question": "What does increasing the Resonance (Q) parameter do?", "options": ["Makes the sound quieter", "Boosts frequencies around the cutoff point", "Lowers the pitch", "Adds reverb"], "correct_index": 1}'::jsonb
);

-- Lesson 4: Amp Envelope (ADSR)
insert into public.lessons (synth_model_id, title, slug, description, sort_order, xp_reward, unlocks_params)
values (
  (select id from public.synth_models where slug = 'osci-mono'),
  'Amp Envelope (ADSR)',
  'envelope',
  'Control how your sound evolves over time with the amplitude envelope.',
  4, 25,
  array['envelope.attack', 'envelope.decay', 'envelope.sustain', 'envelope.release']
);

insert into public.exercises (lesson_id, exercise_type, sort_order, title, instructions, content) values
(
  (select id from public.lessons where slug = 'envelope' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'info', 1, 'The ADSR Envelope',
  'The amplitude envelope controls how the volume of your sound changes over time when you press and release a key. It has four stages:',
  '{"text": "• Attack — How long it takes for the sound to reach full volume after pressing a key. Short = percussive, long = swelling pad.\n• Decay — How long it takes to drop from peak to the sustain level.\n• Sustain — The volume level held while the key is pressed. This is a level, not a time.\n• Release — How long the sound fades out after releasing the key."}'::jsonb
),
(
  (select id from public.lessons where slug = 'envelope' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'listen', 2, 'Plucky Sound',
  'A short attack, short decay, low sustain, and short release creates a plucky, percussive sound.',
  '{"params_to_set": {"envelope.attack": 0.005, "envelope.decay": 0.15, "envelope.sustain": 0.1, "envelope.release": 0.2}, "note_sequence": ["C4", "E4", "G4", "C5"]}'::jsonb
),
(
  (select id from public.lessons where slug = 'envelope' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'listen', 3, 'Pad Sound',
  'A long attack, medium decay, high sustain, and long release creates a smooth, evolving pad.',
  '{"params_to_set": {"envelope.attack": 0.8, "envelope.decay": 0.5, "envelope.sustain": 0.8, "envelope.release": 1.5}, "note_sequence": ["C4", "E4", "G4"]}'::jsonb
),
(
  (select id from public.lessons where slug = 'envelope' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'tweak', 4, 'Create a Slow Attack',
  'Set the Attack to around 0.5 seconds to create a sound that slowly fades in when you press a key.',
  '{"target_param": "envelope.attack", "target_value": 0.5, "tolerance": 0.1}'::jsonb
),
(
  (select id from public.lessons where slug = 'envelope' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'quiz_mc', 5, 'Envelope Quiz',
  'Which ADSR parameter controls how long the sound takes to fade out after you release the key?',
  '{"question": "Which ADSR parameter controls how long the sound fades out after releasing the key?", "options": ["Attack", "Decay", "Sustain", "Release"], "correct_index": 3}'::jsonb
),
(
  (select id from public.lessons where slug = 'envelope' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'free_play', 6, 'Sculpt Your Sound',
  'Experiment with different ADSR settings. Try making a plucky bass, a smooth pad, and a sharp stab!',
  '{"duration_seconds": 30, "prompt": "Try different envelope shapes: plucky (short attack/decay), pad (long attack/release), stab (short everything)."}'::jsonb
);

-- Lesson 5: Filter Envelope
insert into public.lessons (synth_model_id, title, slug, description, sort_order, xp_reward, unlocks_params)
values (
  (select id from public.synth_models where slug = 'osci-mono'),
  'Filter Envelope',
  'filter-envelope',
  'Make the filter move over time for dynamic, expressive sounds.',
  5, 25,
  array['filterEnvelope.attack', 'filterEnvelope.decay', 'filterEnvelope.sustain', 'filterEnvelope.release']
);

insert into public.exercises (lesson_id, exercise_type, sort_order, title, instructions, content) values
(
  (select id from public.lessons where slug = 'filter-envelope' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'info', 1, 'Moving the Filter',
  'Just like the amp envelope controls volume over time, the filter envelope controls the filter cutoff over time. This is what gives classic analog synths their signature "wah" and "squelch" sounds.',
  '{"text": "When you press a key, the filter envelope sweeps the cutoff frequency from a base value upward (by a number of octaves) and back down, following its own ADSR shape. This creates movement and expression in the sound."}'::jsonb
),
(
  (select id from public.lessons where slug = 'filter-envelope' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'listen', 2, 'Classic Filter Sweep',
  'Listen to a classic acid-style filter sweep — the filter opens quickly then closes slowly, creating that characteristic "wow" sound.',
  '{"params_to_set": {"oscillator.type": "sawtooth", "filter.frequency": 500, "filterEnvelope.attack": 0.01, "filterEnvelope.decay": 0.4, "filterEnvelope.sustain": 0.2, "filterEnvelope.release": 0.3, "filterEnvelope.baseFrequency": 200, "filterEnvelope.octaves": 4}, "note_sequence": ["C3", "C3", "D#3", "C3"]}'::jsonb
),
(
  (select id from public.lessons where slug = 'filter-envelope' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'quiz_mc', 3, 'Filter Envelope Quiz',
  'What does the filter envelope control?',
  '{"question": "What does the filter envelope control?", "options": ["The volume over time", "The pitch over time", "The filter cutoff frequency over time", "The stereo panning over time"], "correct_index": 2}'::jsonb
),
(
  (select id from public.lessons where slug = 'filter-envelope' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'free_play', 4, 'Design Your Sound',
  'Now you have all the tools! Combine oscillator waveforms, filter settings, amp envelope, and filter envelope to design your own unique sound.',
  '{"duration_seconds": 30, "prompt": "Try to create an interesting bass sound, a lead, or a pad using everything you''ve learned."}'::jsonb
);

-- Lesson 6: Filter Envelope Deep Dive
insert into public.lessons (synth_model_id, title, slug, description, sort_order, xp_reward, unlocks_params)
values (
  (select id from public.synth_models where slug = 'osci-mono'),
  'Filter Envelope Deep Dive',
  'filter-env-advanced',
  'Master the base frequency and octaves parameters for total timbral control.',
  6, 30,
  array['filterEnvelope.baseFrequency', 'filterEnvelope.octaves']
);

insert into public.exercises (lesson_id, exercise_type, sort_order, title, instructions, content) values
(
  (select id from public.lessons where slug = 'filter-env-advanced' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'info', 1, 'Base Frequency & Octaves',
  'Two parameters control the range of the filter envelope sweep:',
  '{"text": "• Base Frequency — The starting point of the filter sweep. Lower values mean the filter starts more closed.\n• Octaves — How far up the filter sweeps from the base frequency. More octaves = wider, more dramatic sweep.\n\nFor example: Base Freq = 200 Hz with 3 octaves means the filter sweeps from 200 Hz up to 1600 Hz (200 × 2³)."}'::jsonb
),
(
  (select id from public.lessons where slug = 'filter-env-advanced' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'match_sound', 2, 'Match the Acid Bass',
  'Try to match this classic acid bass sound by adjusting the filter envelope decay and the filter resonance.',
  '{"target_params": {"filterEnvelope.decay": 0.3, "filter.Q": 8}, "tolerance": 0.2, "hint": "High resonance + medium-short filter decay creates that squelchy acid sound."}'::jsonb
),
(
  (select id from public.lessons where slug = 'filter-env-advanced' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'free_play', 3, 'Your First Patch',
  'Congratulations! You now understand all the core parameters of subtractive synthesis. Create a patch you love — this is your first real synth patch!',
  '{"duration_seconds": 45, "prompt": "Combine everything: waveform, filter cutoff, resonance, amp envelope, and filter envelope. Try to create a sound you''d want to use in music."}'::jsonb
);
