# Nightmare's Descent — Full Prototype GDD + Technical Blueprint

## 1) Executive Summary
Nightmare's Descent is a first-person, audio-led survival horror prototype inspired by FNaF4's claustrophobic cadence: listen, infer, commit, survive. The player is confined to a child's room and reacts to directional cues at left door, right door, closet, and bed while escalating AI pressure and hallucination systems compress decision windows from 12:00 A.M. to 6:00 A.M.

Design pillars:
1. **Sound over sight**: directional breathing/rustle/footstep cues are primary truth.
2. **Micro-decisions under uncertainty**: each check/action has risk and opportunity cost.
3. **Dream realism drift**: environment degradation maps to night progression and fear state.
4. **Minimal UI**: only time, interaction prompts, and contextual states.

## 2) Core Loop
1. Hear cue.
2. Move focus to corresponding point-of-interest.
3. Evaluate: listen, flash, hold door, or retreat.
4. Resolve encounter and re-balance map checks.
5. Repeat until 6:00 A.M. or jumpscare defeat.

## 3) Systems Breakdown

### 3.1 Player Mechanics
- Free look emulation through camera focus swaps (left/right/closet/bed).
- Actions:
  - **Flashlight** (`F`): reveals/repels entities, drains hidden charge.
  - **Hold Door** (`Space` at door views): blocks if timed during approach.
  - **Stillness** (`Shift`): lowers detection but raises hallucination chance.
  - **Listen** (passive + explicit wait discipline): key for breathing checks.

### 3.2 Time Model
- Night duration configurable by `NIGHT_LENGTH_MS`.
- 6 in-game hours, escalating aggression multipliers per hour.
- Default prototype tuned for short play sessions while preserving full curve.

### 3.3 AI Framework
All entities share state semantics:
`Idle -> Approach -> Threaten -> Attack -> Cooldown -> Idle`

Sampling interval: 300 ms logic ticks.
Inputs:
- current focus
- door hold state
- flashlight usage rate
- stillness state
- neglect timers by location

Entities:
- **Shatterbear**: left/right hallway pressure; breathing tells.
- **Marionette Fox**: closet progression tied to flashlight spam.
- **Blink-Rabbit**: hallucination/peripheral punishment and flicker exploitation.
- **The Whisperer**: bed neglect pressure + paranoia overlays.
- **The Figure** (Night 6 equivalent mode): multi-source burst behavior.

### 3.4 Audio Strategy
- Layered ambience + event cues + fear pulse bus.
- Binaural-like panning approximation via WebAudio stereo panner in prototype.
- Dynamic low-pass under high fear to emulate auditory tunnel vision.

### 3.5 UX and Interface
- Clock only, no health bar.
- Event log for prototype readability/testing (can disable for shipping).
- Pause overlay keeps ambience active to preserve insecurity.

## 4) Visual Direction
- Single-room dread with unstable wallpaper gradients and pulse vignette.
- Progressive distortion tied to fear + hour progression.
- Flashlight cone represented by transient screen bloom + site illumination.

## 5) Progression by Night (Design Target)
| Night | Mechanical Additions | Active Pressure |
|---|---|---|
| 1 | Door + flashlight basics | Shatterbear |
| 2 | Closet management | + Marionette Fox |
| 3 | Bed-neglect pressure | + Whisperer |
| 4 | Stillness mechanic | + Blink-Rabbit |
| 5 | Fake cues + heavy overlap | All four |
| 6 | Dream collapse encounter | + The Figure |

## 6) Technical Architecture (Prototype)

```text
/
├─ index.html
├─ styles.css
├─ game.js
├─ assets/
└─ docs/
   └─ NIGHTMARES_DESCENT_GDD.md
```

Runtime modules in `game.js`:
- `state`: global game state and tuning vars.
- `entities`: AI descriptors and aggression params.
- `audio`: procedural cue and ambience bus.
- `tick()`: deterministic scheduler for time and behavior checks.
- `render()`: UI, overlay, and fear/intensity mapping.

## 7) Asset Integration Plan (Spriter's Resource)
Target pipeline:
1. Export sprite sheets into `assets/sprites/` grouped by entity.
2. Slice with fixed metadata JSON (`frame`, `duration`, `origin`).
3. Map animations in `assetMap`:
   - idle
   - approach
   - threaten
   - jumpscare
4. Attach to focus contexts (left/right/closet/bed) and state transitions.

## 8) Accessibility and Options
- Subtitle channel for cue classes (Breathing left, Closet rustle, etc.).
- Reduced jumpscare flash toggle.
- Volume buses: master/ambience/cues.

## 9) Optimization Guidance
- Avoid per-frame allocations in logic tick.
- Prewarm oscillators/noise buffers at game start.
- Conditional rendering only on state changes.

## 10) Milestone Plan
- M1: Single-night loop + 2 entities + audio cues.
- M2: Full 4 entities + fear/hallucination systems.
- M3: Custom Night sliders + replay timeline.
- M4: Art/audio replacement with production assets.
