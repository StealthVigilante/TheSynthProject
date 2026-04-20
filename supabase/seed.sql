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
  'info', 1, 'What is a Synthesizer?',
  'A synth generates sound electronically — from scratch. No strings, no air. Just waveforms shaped by circuits.',
  '{"text": "The Osci Mono is a subtractive synth: it starts with a rich waveform and sculpts it by filtering frequencies. One note at a time. Infinite tones."}'::jsonb
),
(
  (select id from public.lessons where slug = 'intro' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'info', 2, 'The Controls',
  'Every section shapes a different part of the sound. Together they give you total control over the tone.',
  '{"text": "Oscillator — the raw waveform.\nFilter — sculpts the tone.\nEnvelope — shapes the volume over time.\nKeyboard — plays the notes."}'::jsonb
),
(
  (select id from public.lessons where slug = 'intro' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'free_play', 3, 'Try It',
  'Press keys on your keyboard and make some noise. Keys A–J play C4 to B4.',
  '{"duration_seconds": 20, "prompt": "Play anything. Get a feel for the sound."}'::jsonb
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
  'waveform_display', 1, 'See the Wave',
  'Play a note and watch the waveform. The shape is the sound.',
  '{}'::jsonb
),
(
  (select id from public.lessons where slug = 'waveforms' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'listen', 2, 'Sine Wave',
  'Pure. No harmonics — just one frequency. Clean like a flute.',
  '{"params_to_set": {"oscillator.type": "sine"}, "note_sequence": ["C4", "E4", "G4"]}'::jsonb
),
(
  (select id from public.lessons where slug = 'waveforms' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'listen', 3, 'Sawtooth Wave',
  'Bright and buzzy. All harmonics present. The classic synth tone.',
  '{"params_to_set": {"oscillator.type": "sawtooth"}, "note_sequence": ["C4", "E4", "G4"]}'::jsonb
),
(
  (select id from public.lessons where slug = 'waveforms' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'listen', 4, 'Square Wave',
  'Hollow and reedy. Only odd harmonics — sounds like a clarinet.',
  '{"params_to_set": {"oscillator.type": "square"}, "note_sequence": ["C4", "E4", "G4"]}'::jsonb
),
(
  (select id from public.lessons where slug = 'waveforms' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'free_play', 5, 'Switch Waveforms',
  'Use the waveform selector and play notes. Hear how each shape sounds different.',
  '{"duration_seconds": 25, "prompt": "Try all four waveforms while playing."}'::jsonb
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
  'filter_display', 1, 'The Filter Curve',
  'Turn Cutoff and Resonance — watch the curve shift live. Low cutoff = dark. High resonance = that squelchy peak.',
  '{}'::jsonb
),
(
  (select id from public.lessons where slug = 'filter' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'listen', 2, 'Filter Closed',
  'Low cutoff — most harmonics blocked. The sound goes dark and muffled.',
  '{"params_to_set": {"oscillator.type": "sawtooth", "filter.frequency": 400}, "note_sequence": ["C4", "E4", "G4"]}'::jsonb
),
(
  (select id from public.lessons where slug = 'filter' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'listen', 3, 'Filter Open',
  'High cutoff — all harmonics through. Bright and full.',
  '{"params_to_set": {"oscillator.type": "sawtooth", "filter.frequency": 8000}, "note_sequence": ["C4", "E4", "G4"]}'::jsonb
),
(
  (select id from public.lessons where slug = 'filter' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'tweak', 4, 'Find the Sweet Spot',
  'Dial the Cutoff to around 1200 Hz — warm and balanced.',
  '{"target_param": "filter.frequency", "target_value": 1200, "tolerance": 200}'::jsonb
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
  'adsr_display', 1, 'The ADSR Shape',
  'Adjust the knobs — the graph updates live. Attack = fade in. Decay = drop to sustain. Sustain = hold level. Release = fade out.',
  '{}'::jsonb
),
(
  (select id from public.lessons where slug = 'envelope' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'listen', 2, 'Plucky',
  'Short attack, short decay, low sustain. Percussive — like a plucked string.',
  '{"params_to_set": {"envelope.attack": 0.005, "envelope.decay": 0.15, "envelope.sustain": 0.1, "envelope.release": 0.2}, "note_sequence": ["C4", "E4", "G4", "C5"]}'::jsonb
),
(
  (select id from public.lessons where slug = 'envelope' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'listen', 3, 'Pad',
  'Long attack, high sustain, long release. The sound swells in and lingers.',
  '{"params_to_set": {"envelope.attack": 0.8, "envelope.decay": 0.5, "envelope.sustain": 0.8, "envelope.release": 1.5}, "note_sequence": ["C4", "E4", "G4"]}'::jsonb
),
(
  (select id from public.lessons where slug = 'envelope' and synth_model_id = (select id from public.synth_models where slug = 'osci-mono')),
  'tweak', 4, 'Slow Attack',
  'Set Attack to around 0.5s — the note fades in instead of cutting in sharp.',
  '{"target_param": "envelope.attack", "target_value": 0.5, "tolerance": 0.1}'::jsonb
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
