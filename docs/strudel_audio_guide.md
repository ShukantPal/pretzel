# 🥨 Pretzel: AI Co-Producer Strudel & Music Theory Guide

This document serves as the primary reference manual and knowledge base for the Pretzel AI Co-Producer. It defines the constraints of the audio engine, advanced Strudel DSL functions, and music theory patterns for generating elite live-coding electronic music.

---

## 🎹 1. Synthesizer & Drum Engine Architecture

Pretzel’s custom Tone.js audio engine supports three drum voices and two melodic synthesizers. All sound is synthesized in real-time from mathematical equations—no samples or network assets are loaded.

### A. Drum Synthesis Channels
*   **Kick Drum (`s("kick")` or `s("bd")`)**
    *   *Acoustics*: Exponential frequency sweep from $150\text{Hz}$ down to $40\text{Hz}$ over a $250\text{ms}$ envelope.
    *   *Usage*: The driving low-end pulse of the rhythm.
*   **Snare Drum (`s("snare")` or `s("sd")`)**
    *   *Acoustics*: Triangle wave transient pitch sweep combined with a high-pass pink noise tail ($180\text{Hz}$ down to $100\text{Hz}$).
    *   *Usage*: Placed on beats 2 and 4 in standard techno/house, or syncopated off-beats.
*   **Hi-Hat (`s("hat")`, `s("hh")`, or `s("closed")`)**
    *   *Acoustics*: High-pass filtered white noise burst ($7000\text{Hz}$) with a tight decay ($40\text{ms}$).
    *   *Usage*: Used for high-frequency micro-rhythms (e.g. 16th-note patterns or upbeat syncopation).

### B. Melodic Synthesizer Channels
*   **Sub-Bass Synth (`s("triangle")` | Octaves 1 and 2)**
    *   *Acoustics*: Soft, heavy triangle wave with a medium-decay lowpass envelope ($200\text{Hz}$).
    *   *Triggering*: Triggers automatically when a note in Octave 1 or 2 is called (e.g., `e1`, `g2`, `c2`).
    *   *Rule*: Keep notes within octaves 1 and 2 to avoid muddy frequencies or clashing with the lead.
*   **Plucky Lead Synth (`s("sawtooth")` | Octaves 3 and above)**
    *   *Acoustics*: Bright, sharp sawtooth wave with a fast attack and high-resonance lowpass filter envelope.
    *   *Effects Chain*: Routes through a built-in **Stereo Ping-Pong Delay** and **Stereo Reverb** send.
    *   *Triggering*: Triggers automatically for notes in Octave 3 and above (e.g., `e4`, `b4`, `c5`).

---

## 🎛️ 2. Advanced Strudel Mini-Notation Operators

Strudel uses mini-notation strings to define time events. Compiled from the official live documentation (`strudel.cc/learn/mini-notation`), these operators can be combined to create rhythmically complex, syncopated, and highly dynamic sequences:

*   **Step Subdivision (`[ ]`)**
    *   Subdivides a step into faster, equal notes.
    *   `s("kick [snare hat]")` -> Plays kick on step 1, then snare and hat split evenly on step 2.
*   **Speed/Rhythm Multipliers (`*x`)**
    *   Repeats an event `x` times within its step allocation.
    *   `s("hat*8")` -> Triggers 8 hi-hats evenly across the cycle (straight 8th notes).
    *   `s("hat*16")` -> Triggers 16 rapid hi-hats (16th-note roll).
*   **Rhythm Division (`/x`)**
    *   Slows down an event or group, spreading it across `x` cycles.
    *   `note("[e5 b4 d5 c5]/2")` -> Spreads those 4 notes evenly over the course of 2 cycles.
*   **Cycle-by-Cycle Alternation (`< >`)**
    *   Alternates playing one event or group per complete cycle.
    *   `s("<kick snare>")` -> Cycle 1 plays kick, cycle 2 plays snare.
    *   `s("<[kick kick] snare>")` -> Cycle 1 plays two fast kicks, cycle 2 plays snare.
*   **Silences & Rests (`~` or `-`)**
    *   Creates space and breathing room in a sequence. Essential for syncopation.
    *   `s("kick ~ snare ~")` or `s("kick - snare -")` -> Classic sparse house beat.
*   **Euclidean Rhythms (`(hits, steps)`)**
    *   Distributes a specific number of hits as evenly as possible across a total number of steps.
    *   `s("kick(3,8)")` -> Classic tresillo/Afro-Cuban rhythm (`kick ~ ~ kick ~ ~ kick ~`).
    *   `s("kick(5,8)")` -> Energetic driving groove (`kick ~ kick kick ~ kick kick ~`).
*   **Polymetric/Polyrhythmic Layering (`{ }` or `,`)**
    *   `{a, b}` plays multiple sequences at their own individual grid step lengths concurrently.
    *   `,` plays patterns stacked/in parallel (e.g. `s("[kick snare, hh*8]")`).
*   **Replication (`!x`)**
    *   Repeats an event or group `x` times without speeding it up or shortening its duration.
    *   `s("bd!3")` -> Triggers 3 bass drums in succession.
*   **Temporal Weight (`@x`)**
    *   Sets the proportional duration/weight of a step. Default weight is 1.
    *   `note("<c3@2 e3 g3>")` -> The first note takes up half the cycle, and the remaining notes share the rest.
*   **Degradation / Random Dropouts (`?` or `?prob`)**
    *   Applies a probability of silence. `?` defaults to a 50% chance of dropping out.
    *   `s("hat*8?")` -> Play 8 hi-hats, but each has a 50% chance of being silent.
    *   `s("hat*8?0.1")` -> 10% chance of dropping out (subtle organic variation).
*   **Choice Randomization (`|`)**
    *   Randomly selects one of the options separated by `|` during playback.
    *   `s("[kick | snare | hat]")` -> Selects randomly between kick, snare, or hihat on each step.
*   **Velocity/Volume Humanization (`.gain()`)**
    *   Applies individual volumes to steps to add swing, groove, and organic feel.
    *   `s("hat*8").gain("1 0.4 0.8 0.3 1 0.4 0.8 0.3")` -> Classic "ghost-note" syncopation where off-beats are accented.

---

## 🎼 3. Scales and Harmony Cheat Sheet

Always compose melodies in established musical modes to guarantee that the sub-bass and plucky lead are harmonically coherent.

*   **Minor Pentatonic (Moody, Floating, Universal)**
    *   *Scale (in E)*: E, G, A, B, D
    *   *E.g. Lead*: `note("e4 g4 a4 b4 d5 b4 d4 e4")`
    *   *E.g. Bass*: `note("e2 e2 d2 e2 ~ d2 ~ ~")`
*   **Aeolian/Natural Minor (Emotional, Melancholic)**
    *   *Scale (in A)*: A, B, C, D, E, F, G
    *   *E.g. Lead*: `note("a4 c5 e5 d5 c5 b4 a4 ~")`
*   **Phrygian Mode (Dark, Cyberpunk, Aggressive)**
    *   *Scale (in E)*: E, F, G, A, B, C, D (characterized by the flat 2nd: F)
    *   *E.g. Lead*: `note("e4 f4 g4 f4 e4 ~ f4 ~")`
*   **Lydian Mode (Futuristic, Dreamy, Uplifting)**
    *   *Scale (in C)*: C, D, E, F#, G, A, B (characterized by the sharp 4th: F#)
    *   *E.g. Lead*: `note("c4 d4 e4 fs4 g4 ~ a4 b4")`

---

## 🎨 4. Affective & Emotional Sound Mapping Reference

When users describe how they **feel**, translate their emotions into specific music theory and physical code configurations:

### A. Feeling: "Cold, Spacious, Lonely"
*   **Aesthetic**: Bare, minimalist, echoing.
*   **Code Strategy**:
    *   Low BPM ($90$ - $105$ BPM).
    *   Sparse drum loops with lots of rests (`~`).
    *   Spacious, echoing lead notes on octaves 4 or 5 with long decay gaps.
*   **Example**:
    ```javascript
    // STRUDEL_CODE
    stack(
      s("kick ~ ~ ~ kick ~ ~ ~"),
      s("~ ~ ~ ~ snare ~ ~ ~"),
      s("hat*4").gain("0.5 0.2 0.4 0.1"),
      note("e4 ~ b4 ~ ~ d5 ~ ~").s("sawtooth").gain(0.4)
    )
    ```

### B. Feeling: "Cozy, Warm, Safe, Cozy Lo-Fi"
*   **Aesthetic**: Smooth, gently swinging, vintage texture.
*   **Code Strategy**:
    *   Medium BPM ($110$ - $120$ BPM).
    *   Sub-bass playing smooth, sustained triangle waves in octave 2.
    *   Hi-hats using low gain/velocities to keep them soft.
    *   Pentatonic lead playing slow, sweet melodies.
*   **Example**:
    ```javascript
    // STRUDEL_CODE
    stack(
      s("kick ~ ~ kick ~ ~ ~ ~"),
      s("~ ~ snare ~ ~ ~ snare ~"),
      s("hat*8").gain("0.6 0.2 0.5 0.2 0.6 0.2 0.5 0.2"),
      note("e2 ~ ~ e2 b2 ~ g2 ~").s("triangle").gain(0.7),
      note("e4 ~ g4 ~ a4 ~ b4 ~").s("sawtooth").gain(0.4)
    )
    ```

### C. Feeling: "Cyberpunk, Fast-Paced, Driving, High Energy"
*   **Aesthetic**: Industrial, aggressive, synthetic, relentless.
*   **Code Strategy**:
    *   High BPM ($135$ - $145$ BPM).
    *   Four-on-the-floor heavy kicks (`kick*4`).
    *   Relentless 16th-note bassline in E Phrygian (Octave 1 and 2) using rapid-fire steps.
    *   Frequent hi-hat subdivisions (`hat*8` or `hat*16`).
*   **Example**:
    ```javascript
    // STRUDEL_CODE
    stack(
      s("kick ~ kick [~ kick]"),
      s("~ snare ~ snare"),
      s("hat*16").gain("0.8 0.3 0.6 0.3"),
      note("e1 f1 e1 f1 g1 f1 e1 ~").s("triangle").gain(0.8),
      note("e4*4").s("sawtooth").gain(0.5)
    )
    ```

### D. Feeling: "Groovy, Funk, Danceable"
*   **Aesthetic**: Syncopated house and deep-tech elements.
*   **Code Strategy**:
    *   BPM ($125$ - $130$ BPM).
    *   Off-beat hi-hat placement (`~ hat ~ hat`).
    *   Euclidean snare spacing to add a tropical or salsa swing.
    *   Melodic, jumping basslines playing on the upbeat syncopations.
*   **Example**:
    ```javascript
    // STRUDEL_CODE
    stack(
      s("kick*4"),
      s("~ snare(3,8)"),
      s("~ hat ~ hat ~ hat ~ hat").gain(0.8),
      note("e2 ~ e2 g2 ~ a2 b2 ~").s("triangle").gain(0.8)
    )
    ```
