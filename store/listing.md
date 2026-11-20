# Store listing

Text to paste into App Store Connect and the Play Console. Character limits are in brackets. Each field is a code block
so it copies exactly. `store.config.js` reads the App Store fields from this file for `eas metadata:push`.

- Developer: Narek Sargsyan
- Contact email (shown publicly by both stores): glossmaze.support@gmail.com
- Privacy policy URL: https://nsargsyan996.github.io/glossmaze/privacy.html
- Support / marketing URL: https://nsargsyan996.github.io/glossmaze/
- Category: **Games › Puzzle** on both stores. Secondary category on iOS: **Games › Casual**.
- Price: free. Contains ads: yes. In-app purchases: none.
- Audience: general (13+). Not child-directed; see "Store forms" below.

> **app-ads.txt:** AdMob looks for `app-ads.txt` at the root of the developer website listed in the stores.
> `nsargsyan996.github.io/glossmaze/` is not a root, so before release either use a custom domain for the site
> (like hoppyblocks.com) or list hoppyblocks.com as the developer website, which already serves your app-ads.txt.

---

## English (en-US)

### App Store name [30]

```text
Gloss Maze
```

### Google Play title [30]

```text
Gloss Maze: Paint Puzzle
```

### App Store subtitle [30]

```text
Swipe, roll & paint every tile
```

### App Store promotional text [170]

```text
A calm maze puzzle: swipe the ball, it rolls until it hits a wall, and every tile it crosses gets painted. Endless levels, no timers.
```

### App Store keywords [100]

```text
maze,puzzle,paint,roll,ball,swipe,relaxing,brain,logic,color,fill,tiles,casual,offline,calm
```

### Google Play short description [80]

```text
Swipe the ball through calm, colorful mazes and paint every tile.
```

### Full description [4000]

```text
Swipe the ball. It rolls until it hits a wall, painting every tile it crosses. Paint the whole maze to clear the level.

Simple to learn, surprisingly clever to master: the ball can't stop wherever you like, so every level is about choosing which walls to stop against.

WHY YOU'LL LIKE IT
• Endless levels that slowly grow bigger and twistier
• No timer and no game over: take as long as you like
• Undo and restart any time
• Earn three stars by finishing in the fewest moves
• Steer in one smooth swipe: turn without lifting your finger
• Five bright, toy-like themes
• Plays offline, no account needed

Ads are shown only between levels, never during one, and not in your first five levels.
```

### What's new (first release)

```text
Welcome to Gloss Maze! Swipe, roll and paint your way through endless mazes.
```

---

# Store forms

These follow from how the app is built today (`src/ads/`, `app.config.ts`). Re-check them if you add analytics,
accounts, purchases or another ad network.

## Google Play

**Target audience and content.** Choose **13–15, 16–17 and 18+** only. Picking any younger group puts the app under the
Families policy, which needs child-directed ads (the Hoppy Blocks setup). "Could your app unintentionally appeal to
children?" The art is bright and toy-like, so Google may ask; answer honestly and be ready to explain it's a general
puzzle game with no child-targeted content.

**Advertising ID.** Uses advertising ID: **yes**, purpose **Advertising or marketing** (AdMob reads it on Android).

**Ads.** Contains ads: yes.

**Data safety.** Based on Google's disclosure for the Google Mobile Ads SDK
(developers.google.com/admob/android/privacy/play-data-disclosure). Check that page before submitting, since Google
updates it.

| Data type                                          | Collected | Shared | Purpose                                  |
| -------------------------------------------------- | --------- | ------ | ---------------------------------------- |
| Location › Approximate location (from IP)          | yes       | yes    | Advertising, Analytics, Fraud prevention |
| App activity › App interactions                    | yes       | yes    | Advertising, Analytics, Fraud prevention |
| App info and performance › Crash logs, Diagnostics | yes       | yes    | Analytics, Fraud prevention              |
| Device or other IDs                                | yes       | yes    | Advertising, Analytics, Fraud prevention |

- Is all data encrypted in transit? Yes.
- Can users request deletion? No account exists; data isn't tied to an identity we hold.
- Data processed ephemerally / optional? Collection is required for ads; personalisation is optional via consent.

**Content rating (IARC).** Category: Game. No violence, fear, sex, language, drugs or gambling. No user interaction,
no location sharing, no digital purchases. Expected: PEGI 3 / ESRB Everyone.

## App Store

**Age rating questionnaire.** "None" everywhere; "No" to unrestricted web access, user-generated content, messaging and
gambling; **Advertising: yes**. Expected: 4+. Don't choose the Kids Category.

**App Privacy ("nutrition label").** Based on Google's disclosure for the Google Mobile Ads SDK
(developers.google.com/admob/ios/privacy/data-disclosure). Because the app asks for tracking permission (App Tracking
Transparency) and AdMob uses the IDFA when allowed, declare tracking:

| Data type                                                         | Linked to user | Used for tracking | Purpose                            |
| ----------------------------------------------------------------- | -------------- | ----------------- | ---------------------------------- |
| Location › Coarse location                                        | no             | yes               | Third-party advertising, Analytics |
| Identifiers › Device ID                                           | no             | yes               | Third-party advertising, Analytics |
| Usage data › Product interaction, Advertising data                | no             | yes               | Third-party advertising, Analytics |
| Diagnostics › Crash data, Performance data, Other diagnostic data | no             | no                | Analytics                          |

Double-check each row against Google's page when you fill the form; Apple rejects apps whose label doesn't match the
SDK's privacy manifest.

**Export compliance.** Already answered in `app.config.ts` (`ITSAppUsesNonExemptEncryption: false`).

**iPad.** `supportsTablet` is on, so App Store Connect needs iPad screenshots too (13-inch).

**App Review notes.** Suggested text:

> Gloss Maze has no login. Ads come from Google AdMob and are only shown between levels (after level 5, at most one
> every 3 levels and 3 minutes). The consent form (EU/UK) and Apple's tracking prompt appear on first launch.
