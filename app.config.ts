import type { ConfigContext, ExpoConfig } from 'expo/config';

type AppVariant = 'development' | 'preview' | 'production';

// Set per build profile in eas.json. Local `npx expo start` / `run:*` builds are "development".
const APP_VARIANT = (process.env.APP_VARIANT ?? 'development') as AppVariant;

// Separate IDs let dev, preview and store builds sit side by side on one phone.
const BUNDLE_ID: Record<AppVariant, string> = {
  development: 'com.glossmaze.game.dev',
  preview: 'com.glossmaze.game.preview',
  production: 'com.glossmaze.game',
};

const APP_NAME: Record<AppVariant, string> = {
  development: 'Gloss Maze (Dev)',
  preview: 'Gloss Maze (Preview)',
  production: 'Gloss Maze',
};

// Google's public sample app IDs: they only serve test ads. Production builds read the real IDs from EAS
// environment variables (see .env.example), so no build can show live ads by accident.
const ADMOB_TEST_APP_ID = {
  android: 'ca-app-pub-3940256099942544~3347511713',
  ios: 'ca-app-pub-3940256099942544~1458002511',
};

const TRACKING_TEXT = 'This lets us show ads that are more relevant to you. The game is free because of these ads.';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME[APP_VARIANT],
  owner: 'nsargsyan',
  slug: 'gloss-maze',
  scheme: 'glossmaze',
  // Must match `apple.version` in store.config.js.
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: BUNDLE_ID[APP_VARIANT],
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    // Apple's required-reason APIs used by React Native and Expo modules (saved settings, file dates,
    // uptime, free space). App Store Connect rejects uploads that use them without a declared reason.
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp', NSPrivacyAccessedAPITypeReasons: ['C617.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime', NSPrivacyAccessedAPITypeReasons: ['35F9.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace', NSPrivacyAccessedAPITypeReasons: ['E174.1'] },
      ],
    },
  },
  android: {
    package: BUNDLE_ID[APP_VARIANT],
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'expo-build-properties',
      {
        android: {
          // R8 strips classes that libraries load by reflection (WorkManager, pulled in by the ads SDK),
          // which crashes release builds on launch. Same fix as Hoppy Blocks.
          enableMinifyInReleaseBuilds: false,
        },
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: process.env.ADMOB_ANDROID_APP_ID || ADMOB_TEST_APP_ID.android,
        iosAppId: process.env.ADMOB_IOS_APP_ID || ADMOB_TEST_APP_ID.ios,
        delayAppMeasurementInit: true,
        userTrackingUsageDescription: TRACKING_TEXT,
        // Google's SKAdNetwork ID, so iOS can attribute ad installs (AdMob asks for it in Info.plist).
        skAdNetworkItems: ['cstr6suwn9.skadnetwork'],
      },
    ],
    ['expo-tracking-transparency', { userTrackingPermission: TRACKING_TEXT }],
  ],
  extra: {
    appVariant: APP_VARIANT,
    // `npx eas init` adds `eas: { projectId }` here the first time.
  },
});
