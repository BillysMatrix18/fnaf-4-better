# Nightmare's Descent Prototype

This repository now contains a **working, playable browser prototype** of a FNaF4-inspired survival horror game concept called **Nightmare's Descent**.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## What is included

- `index.html`: Game scene/UI shell.
- `styles.css`: Visual style, fear effects, state-driven overlays.
- `game.js`: Core gameplay loop, entity AI, time progression, interactions, and procedural audio cues.
- `docs/NIGHTMARES_DESCENT_GDD.md`: Ultra-detailed design doc and production blueprint.

## Notes on assets

The code is structured so sprite/image assets from:
`https://www.spriters-resource.com/pc_computer/fivenightsatfreddys4/`
can be dropped into `assets/` and wired in via the `assetMap` section in `game.js`.

To keep this repository self-contained and runnable immediately, the default prototype uses CSS/glitch overlays and generated visuals/audio placeholders.
