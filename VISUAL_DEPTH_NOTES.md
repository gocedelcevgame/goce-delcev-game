# WPA Games 2.5D visual depth foundation — 2.5.6 (integrated into 2.5.7)

Status: source candidate, not uploaded / not sold.

## What is actually delivered
- Cinematic layered parallax (sky, mountains, atmospheric and architectural depth).
- No true polygonal 3D, no skeletal 3D character models, no AI-generated 3D animations.
- Uses existing browser engine and files; no new third-party runtime, analytics or tracking.
- All 37 levels, input controls, audio and scoring preserved by design.
- On Goce: reduces motion if OS `prefers-reduced-motion` is enabled.
- Mobile and low-end device performance needs owner testing, especially older Android hardware.

## Acceptance checklist (must be observed on actual devices)
1. Level 1 and level 4 readable in MK and EN; scroll is visible.
2. Move left/right, jump/double-jump, pick up star/scroll, finish and go next.
3. On mobile, jump and language controls do not overlap.
4. Background depth moves behind gameplay but does not collide or block taps.
5. PWA fresh install and offline reopen, music toggle and persistence.
6. Compare FPS and heat on midrange/entry-level Android with previous release.
7. Reduced motion; no photosensitivity issues; children can play without distracting effects.

## Full native 3D is a separate project
To build free-camera 3D, rigged models, skeletal animation and 3D collisions requires a different engine or an integrated 3D runtime and new art/QA budgets. Recommended experiment: one short 3D vertical slice in an approved engine; do not silently rewrite both full 37-level games.

## Sales Human Gate
Music rights (Suno), historical material/visual rights, licensing, MK/EN editorial QA, child privacy, terms, tax/payments and distribution agreements remain unverified. Do not sell or distribute as approved before clearances.
