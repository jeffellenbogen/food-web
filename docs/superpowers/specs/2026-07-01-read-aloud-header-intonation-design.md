# Natural Header Intonation for Field Guide Read-Aloud

**Date:** 2026-07-01
**Status:** Designed & approved; pending implementation
**Builds on:** v3.5.2 (ships as v3.5.3)

The Field Guide read-aloud speaks each section header ("Where it lives.", "What it
eats.", "What eats it.") before its body text. Today those headers sound wrong in two
opposite ways depending on the voice:

- **Voices that honor pitch** (macOS voices like Samantha/Daniel): headers use
  `pitch: 1.4`, a jump large enough to sound cartoonish/chipmunk-like instead of like
  a narrator's emphasis. This is the complaint that motivated this change.
- **Voices that ignore pitch** (Chrome's Google network voices — including the
  default, Google US English): the pitch property is silently dropped, so headers get
  no lift at all and blend flat into the body text.

Both problems trace to relying on a *parameter* (pitch) for intonation. The fix moves
the intonation into the *text*, which every engine honors.

---

## 1. Spoken script: headers become questions

`buildSpeakParts()` (index.html, ~line 1718) changes only the heading strings.
On-screen labels are untouched.

| On screen (unchanged) | Spoken today | Spoken after |
|---|---|---|
| WHERE IT LIVES | "Where it lives." | "Where does it live?" |
| WHAT IT EATS | "What it eats." | "What does it eat?" |
| HOW IT GETS ENERGY | "How it gets energy." | "How does it get energy?" |
| WHAT EATS IT | "What eats it." | "What eats it?" |

Why questions:

- A question mark produces a natural rising contour on **every** voice, including the
  Google voices that ignore pitch — the one mechanism that works across the whole
  curated voice list.
- Engines insert a fuller sentence-final pause after a question than after a fragment
  with a period, giving a clearer breath between header and body.
- Pedagogically it reads as a friendly quiz prompt: the header asks, the body answers.
- The producer branch keeps its special label: `isProducer` species get "How does it
  get energy?", others get "What does it eat?".

The species name remains spoken as today (`name + '.'`).

## 2. Prosody: gentle lift instead of a chipmunk

In `toggleSpeak()` (~line 1749):

- Heading `pitch`: **1.4 → 1.1** — audible emphasis on pitch-honoring voices without
  the cartoon jump. (No-op on Google voices, by design; the question phrasing carries
  them.)
- Heading rate dip stays as-is: `Math.max(0.6, rate - 0.1)`.
- Body utterances unchanged: `pitch 1.0`, user-selected rate.

## 3. Pacing: deliberately deferred (contingency documented)

An explicit ~300 ms silent gap before each header was considered and **deferred**:

- Each piece is already its own utterance, so engines insert a natural boundary pause,
  and the "?" adds a fuller stop after headers.
- A manufactured gap requires an `onend`/`setTimeout` chain with a cancellation token,
  **plus** handler updates everywhere `synth.speaking` is used as "reading is in
  progress" — the Esc handler (~line 1121), the spacebar pause (~line 1154), and
  `stopSpeech()` — because during a manufactured gap `synth.speaking` is `false` and
  those handlers would misbehave (Esc would close the card but let the chain keep
  talking; space couldn't pause).

**Contingency, if post-ship listening still feels run-together:** chain utterances via
`onend` + `setTimeout(≈300 ms)` gated on a generation counter incremented by
`toggleSpeak()`/`stopSpeech()`; treat `_fgSpeakingId !== null` as "reading in
progress" in the Esc and space handlers; on space during a gap, set a pending-pause
flag consumed when the gap timer fires. That work is out of scope for this release.

## 4. Version & verification

- **Version:** v3.5.2 → **v3.5.3** (patch — small a11y/audio refinement). Update all
  five occurrences: index.html lines ~376, ~396, ~434 (`version-tag` divs), ~1942
  (`BUILD v3.5.2` label), ~1950 (`version: "3.5.2"`).
- **Programmatic check:** in the browser preview, wrap `speechSynthesis.speak` to log
  each utterance's `text` / `pitch` / `rate`; assert headers arrive as questions with
  pitch 1.1 and body text is unchanged. (Agent cannot hear audio.)
- **Listening sign-off:** the final intonation judgment is the user's, ideally on both
  a Google voice (pitch ignored) and a macOS voice (pitch honored).

## Revision — v3.5.4 (2026-07-01)

**§1 is superseded.** Field testing found every voice mispronounced sentence-final
"live" in "Where does it live?" as /laɪv/ (live-as-in-alive). Spoken headers reverted
to the on-screen labels verbatim — "Where it lives." / "What it eats." / "How it gets
energy." / "What eats it." — which pronounce reliably ("it lives" reads as the verb,
confirmed across v3.4.5–v3.5.2 in the field). §2 (pitch 1.1) is retained and remains
the fix for the original cartoonish-header complaint.

## Out of scope

- Any change to on-screen Field Guide labels.
- Species-name intro phrasing (e.g. "Let's learn about the Chimpanzee!").
- The pause/chaining machinery (contingency above).
- Voice list, speed picker, Esc/space behavior.
