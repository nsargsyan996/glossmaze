/**
 * When to show a full-screen ad. Tuned to stay out of the player's way:
 * - only between levels (when they tap "Next level"), never mid-level
 * - none until the player has finished level FIRST_AD_AFTER_LEVEL
 * - at most one every EVERY_N_LEVELS levels played this session
 * - and never more often than once every MIN_GAP_MS
 * - if the ad isn't loaded yet, skip it rather than make the player wait
 */
export const AD_RULES = {
  FIRST_AD_AFTER_LEVEL: 5,
  EVERY_N_LEVELS: 3,
  MIN_GAP_MS: 3 * 60 * 1000,
};

export interface AdPacing {
  /** Levels completed since the last ad (or since the app opened). */
  levelsSinceAd: number;
  /** Time the last ad was shown (ms since epoch), or null if none yet this session. */
  lastAdAt: number | null;
}

export const START_PACING: AdPacing = { levelsSinceAd: 0, lastAdAt: null };

/** Call when the player leaves a finished level via "Next level". */
export function afterLevel(
  pacing: AdPacing,
  levelCompleted: number,
  now: number,
  adReady: boolean,
  rules = AD_RULES,
): { show: boolean; pacing: AdPacing } {
  const levelsSinceAd = pacing.levelsSinceAd + 1;
  const show =
    adReady &&
    levelCompleted >= rules.FIRST_AD_AFTER_LEVEL &&
    levelsSinceAd >= rules.EVERY_N_LEVELS &&
    (pacing.lastAdAt === null || now - pacing.lastAdAt >= rules.MIN_GAP_MS);
  return show
    ? { show, pacing: { levelsSinceAd: 0, lastAdAt: now } }
    : { show, pacing: { ...pacing, levelsSinceAd } };
}
