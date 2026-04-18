# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

No test suite exists yet.

## Architecture

**Osciscoops** is a Duolingo-style synthesizer learning app. Users progress through lessons on virtual synths, earning XP and unlocking synth parameters as they go.

### Route Groups

```
src/app/
├── (auth)/          # Public: /login, /signup
├── (main)/          # Protected: dashboard, learn, collection, profile, leaderboard, community
├── auth/callback/   # Supabase OAuth redirect handler
├── hardware/        # Public standalone section (no sidebar layout)
└── api/             # Server actions: /api/profile, /api/progress/complete-lesson
```

The `(main)` group layout fetches the user server-side and redirects to `/login` if unauthenticated. All pages inside it can assume a valid user.

### Data Flow for Lesson Pages

Pages are Server Components that fetch from Supabase and pass data down to a `*-client.tsx` Client Component sibling in the same directory. The client component owns interactive state (exercise player, synth engine). This pattern keeps auth checks and DB queries on the server.

### Synth Engine

`src/lib/synth-engine/` wraps Tone.js:
- `engine.ts` — `SynthEngine` class: init, dispose, noteOn/Off, setParam, getWaveform/FFT data
- `factory.ts` — Creates Tone.js instruments (MonoSynth, Synth, FMSynth, AMSynth, DuoSynth) from DB `engine_config`
- `param-map.ts` — Per-engine parameter definitions with dot-notation paths (e.g. `oscillator.type`, `filter.frequency`)

The `useSynthEngine` hook (`src/hooks/use-synth-engine.ts`) wraps `SynthEngine` for React. Tone.js is lazy-loaded; `AudioProvider` (`src/providers/audio-provider.tsx`) calls `Tone.start()` on the first user gesture. Components must call `startAudio()` from `useAudioContext()` before playing notes.

### Parameter Unlock System

Each synth's `all_params` (from DB) lists every knob/control. `unlocked_params` (per user, in `user_synths`) tracks which are accessible. Locked params display the lesson name that unlocks them. The `complete_lesson` Supabase RPC handles XP, streak, and param unlock atomically on lesson completion.

### Supabase Patterns

Types are hand-written in `src/lib/supabase/types.ts` — do not run `supabase gen types`. The `@supabase/ssr` generic resolves to `never` for query results, so all query results must be cast explicitly:

```ts
const synth = synthData as unknown as SynthModel | null;
```

Use `createClient()` from `src/lib/supabase/server.ts` in Server Components/Route Handlers. Use `src/lib/supabase/client.ts` in Client Components.

### UI / Styling

- **shadcn/ui v4** uses `@base-ui/react` under the hood. There is no `asChild` prop on `Button`. Use `buttonVariants()` helper with a `<Link>` instead.
- **Tailwind v4** — config is in `src/app/globals.css` via `@theme`, not `tailwind.config.js`.
- **9 visual themes** are CSS-variable-based, toggled via `ThemeProvider` and stored in localStorage. Synth components read `--synth-*` CSS variables for their look.
- Dark mode is currently hardcoded via the `dark` class on `<html>` (controlled by `ThemeProvider`).

### Key Next.js 16 Gotchas

- `params` in page/layout components are `Promise<{...}>` — always `await` them before destructuring.
- `searchParams` is similarly a Promise.
- Read `node_modules/next/dist/docs/` for any API you're unsure about before writing code.
