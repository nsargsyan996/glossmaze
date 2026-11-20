import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { INTERSTITIAL_UNIT_ID } from './config';
import { AdPacing, afterLevel, START_PACING } from './policy';

type AdsLib = typeof import('react-native-google-mobile-ads');
type Interstitial = ReturnType<AdsLib['InterstitialAd']['createForAdRequest']>;

let lib: AdsLib | null = null;
let interstitial: Interstitial | null = null;
let ready = false;
let pacing: AdPacing = START_PACING;
let started = false;
let privacyRequired = false;

/** AdMob is native code: it isn't in Expo Go, and there is no web version. */
function loadLib(): AdsLib | null {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-google-mobile-ads') as AdsLib;
  } catch {
    return null;
  }
}

function unitId(l: AdsLib): string {
  const real = Platform.OS === 'ios' ? INTERSTITIAL_UNIT_ID.ios : INTERSTITIAL_UNIT_ID.android;
  return __DEV__ || !real ? l.TestIds.INTERSTITIAL : real;
}

function preload(l: AdsLib) {
  const ad = l.InterstitialAd.createForAdRequest(unitId(l));
  ad.addAdEventListener(l.AdEventType.LOADED, () => {
    ready = true;
  });
  ad.addAdEventListener(l.AdEventType.CLOSED, () => {
    ready = false;
    ad.load(); // get the next one ready in the background
  });
  ad.addAdEventListener(l.AdEventType.ERROR, () => {
    ready = false;
    setTimeout(() => ad.load(), 60_000); // no fill / offline: try again later, quietly
  });
  ad.load();
  interstitial = ad;
}

/**
 * Call once at startup. Shows Google's consent form where the law requires it (EU/UK),
 * then Apple's tracking prompt on iOS, then starts loading the first ad.
 * Any failure just means no ads; the game never depends on them.
 */
export async function initAds(): Promise<void> {
  if (started) return;
  started = true;
  const l = loadLib();
  if (!l) return;
  try {
    const consent = await l.AdsConsent.gatherConsent();
    privacyRequired = consent.privacyOptionsRequirementStatus === l.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
    if (Platform.OS === 'ios') {
      const att = await import('expo-tracking-transparency');
      await att.requestTrackingPermissionsAsync();
    }
    if (!consent.canRequestAds) return;
    await l.default().initialize();
    lib = l;
    preload(l);
  } catch {
    // Ads are optional.
  }
}

/** Call when the player taps "Next level". Shows an interstitial only if one is due and loaded. */
export function onLevelFinished(levelCompleted: number): boolean {
  const r = afterLevel(pacing, levelCompleted, Date.now(), ready && !!interstitial);
  pacing = r.pacing;
  if (r.show && interstitial && lib) {
    ready = false;
    interstitial.show().catch(() => {});
    return true;
  }
  return false;
}

/** True where the player must be able to change their ad consent (EU/UK). */
export function privacyOptionsRequired(): boolean {
  return privacyRequired;
}

/** For the privacy settings link stores ask for (shown only where the consent form applies). */
export async function showPrivacyOptions(): Promise<void> {
  try {
    await lib?.AdsConsent.showPrivacyOptionsForm();
  } catch {
    // Not available in this region or build.
  }
}
