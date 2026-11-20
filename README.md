# Gloss Maze

A maze-painting puzzle game (in the style of "Amaze") built with Expo + React Native.

Swipe to roll the ball. It keeps rolling until it hits a wall, painting every tile it passes.
Paint every floor tile to finish the level.

## Run it

```bash
npm install
npx expo start        # press i (iOS simulator), a (Android), or w (web)
```

Expo Go works for playing and developing (ads are skipped there). Ads need a development build; see below.
On web you can also play with the arrow keys / WASD, `z` to undo and `r` to restart.

```bash
npm test              # logic + screen tests (about 15 s)
npm run test:logic    # rules, level generator, solver, swipe steering (node:test)
npm run test:screens  # GameScreen + saved progress with real pan gestures (Jest + Testing Library)
npm run test:e2e      # plays the real web build in a browser (Playwright)
npm run typecheck
npm run preview-levels -- 1 10 50   # print levels as ASCII
npm run analyze                     # compare par with the true fewest moves
```

First time running the end-to-end tests: `npx playwright install chromium`.

### What the tests cover

| Suite | Where | Checks |
|---|---|---|
| Logic | `src/game/*.test.ts` | Rolling and painting rules, levels 1–400 solvable and deterministic, par ≤ carved route, no open rooms, drag steering (turns without lifting, wobble ignored, flicks, queue order and cap) |
| Screens | `__tests__/` | Swipes count moves, blocked swipes don't, undo/restart, one-drag solve → win screen + 3 stars, queued swipes, Home/Next buttons, progress saved and restored |
| End-to-end | `e2e/` | Real web build: home screen, keyboard solve, one continuous mouse drag (slow and fast turns), undo/restart, progress survives reload, next level |

## Ads (AdMob)

Full-screen (interstitial) ads between levels, kept gentle. The rules are in `src/ads/policy.ts`:

- only when the player taps **Next level**, never during a level or when going Home
- none until level 5 is finished
- at most one every 3 levels per session, and at least 3 minutes apart
- if an ad hasn't loaded, the game carries on immediately and never waits

On startup the app shows Google's consent form where the law requires it (EU/UK), then Apple's
tracking prompt on iOS. Players in those regions get a "Privacy settings" link on the home screen.

**Ads only run in a development or store build**, not in Expo Go or on the web (both silently skip them):

```bash
npx expo run:ios        # needs Xcode
npx expo run:android    # needs Android Studio
```

Until real IDs are set, Google's **test ads** are shown (marked "Test Ad"). Development builds always use test ads.

### Before release

1. Create an AdMob account and add the app for iOS and Android.
2. Put each platform's **App ID** (`ca-app-pub-…~…`) in `app.json` → `plugins` → `react-native-google-mobile-ads` (replacing Google's test App IDs there now).
3. Create an **Interstitial** ad unit per platform and put the unit IDs (`ca-app-pub-…/…`) in `src/ads/config.ts`.
4. Change the placeholder `com.glossmaze.game` bundle identifier / package in `app.json` to your own.
5. In AdMob, set up the GDPR consent message (Privacy & messaging) and add an `app-ads.txt` to your website.

## Website (`docs/`)

A landing page and privacy policy in the game's style, ready for GitHub Pages:

- `docs/index.html`: landing page with a playable board (same rules and level generator output as the game)
- `docs/privacy.html`: privacy policy (covers on-device progress, Google AdMob, the EU consent form and Apple's tracking prompt)
- `docs/site.css`, `docs/board.js`, self-hosted fonts in `docs/fonts/` (no third-party requests)

To publish: GitHub → repo **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/docs`**.
The site will be at `https://<user>.github.io/<repo>/`; use `…/privacy.html` as the privacy policy URL in App Store Connect and Google Play.

Before publishing, replace `{{DEVELOPER}}` and `{{EMAIL}}` in both pages, and update the store buttons once the app has store links.

## How it's built

| Path | What it does |
|---|---|
| `src/game/engine.ts` | Pure game rules: slide-until-wall, painting, win check, star rating |
| `src/game/generator.ts` | Infinite, deterministic levels. Carves the maze by simulating the ball, so every level is guaranteed solvable, and steers away from open rooms so levels stay corridor-like |
| `src/game/solver.ts` | Breadth-first solver for the true fewest moves; sets par on smaller levels |
| `src/game/input.ts` | Swipe steering: turning mid-drag, flick detection, move queue |
| `src/game/rng.ts` | Seeded RNG, so level N is identical on every device |
| `src/components/Board.tsx` | Board, raised 3D-style walls, animated paint, rolling ball (Reanimated) |
| `src/screens/GameScreen.tsx` | Swipe input (Gesture Handler v3 `usePanGesture`), HUD, undo/restart, win screen, haptics |
| `src/screens/HomeScreen.tsx` | Title, self-playing demo board, play button, recent levels |
| `src/theme.ts` | Five light toy palettes (rotate every 5 levels) and font names |
| `src/components/ui.tsx` | Gradient backdrop, extruded display text, raised "candy" buttons |
| `src/components/Confetti.tsx` | Win burst |
| `src/ads/` | AdMob: pacing rules (`policy.ts`), IDs (`config.ts`), consent + interstitials (`index.ts`); no-op on web |
| `src/storage.ts` | Saves progress, stars and coins (AsyncStorage) |

## Roadmap

- [ ] Sound effects and music (`expo-audio`)
- [ ] Ball skins + theme shop using coins
- [ ] Daily reward, coin levels
- [ ] Time-attack and limited-moves modes
- [ ] Rewarded ads (e.g. a hint), if wanted later
- [ ] Hint button (solver can already find the route from any position)
- [ ] Reduced-motion support
- [ ] App icon, splash screen, store assets
