import Constants from 'expo-constants';

/**
 * Interstitial ad unit IDs, from EAS environment variables (see .env.example).
 * They're only used in production builds; development and preview builds always show Google's test ads,
 * so you can never tap your own live ads (which can get an AdMob account suspended).
 */
export const IS_PRODUCTION_BUILD = Constants.expoConfig?.extra?.appVariant === 'production';

export const INTERSTITIAL_UNIT_ID = {
  ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS ?? '',
  android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID ?? '',
};
