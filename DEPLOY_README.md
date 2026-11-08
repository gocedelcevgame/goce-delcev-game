# WPA game deployment preparation — GOCE v2.5.3

Status: TEST RELEASE CANDIDATE, NOT DEPLOYED and NOT APP STORE APPROVED.

## GitHub Pages
Repository: gocedelcevgame/goce-delcev-game
Save the current main branch as a rollback tag/ZIP. Upload/extract this entire folder at repository root, replacing the older files without deleting unrelated work. **Do not deploy directly before reviewing diffs.** Enable Pages on main/(root). Wait for build and inspect runtime, touch and soundtrack.

## Cloudflare Pages
Use a *separate Cloudflare Pages project* for this exact game. Prefer Git-integrated deployment from this repository main with static HTML framework. Build command: `exit 0`. Build output: repository root `.`. Review pre-existing Cloudflare project settings before replacing anything. `_headers` works only for Pages static assets; it is not used by GitHub Pages. No Cloudflare credentials are included.

## Cross-platform
Desktop/laptop: Chrome/Edge/Firefox/Safari over HTTPS. Android Chrome and iPhone Safari: responsive browser and optional PWA install. Google Play requires a separately compiled/reviewed Android application; App Store requires a separately compiled/reviewed iOS application, individual developer enrollment and platform billing policies. These packages contain neither signed APK/AAB nor IPA.

## User data and payments
Only local gameplay progress. No advertising, analytics or active checkout. Do not request payment in this build. Music creation/pro-subscription evidence still pending verification.
