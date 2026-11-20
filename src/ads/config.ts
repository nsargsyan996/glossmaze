/**
 * AdMob setup. Before release, replace these with the IDs from your AdMob account:
 * AdMob → Apps → (your app) → Ad units → create an "Interstitial" unit for each platform.
 * The App IDs (with "~") also go in app.json under the react-native-google-mobile-ads plugin.
 *
 * While these are empty, or in development builds, Google's test ads are used,
 * so you can never accidentally click your own live ads (which can get an account banned).
 */
export const INTERSTITIAL_UNIT_ID = {
  ios: '', // e.g. 'ca-app-pub-1234567890123456/1234567890'
  android: '', // e.g. 'ca-app-pub-1234567890123456/0987654321'
};
