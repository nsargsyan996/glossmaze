// Gesture Handler: mocked native module + test helpers.
require('react-native-gesture-handler/jestSetup');
// Reanimated 4: run animations on the JS thread in tests.
require('react-native-reanimated').setUpTests();
// Storage: in-memory AsyncStorage.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
// Gesture Handler tries to bind to Reanimated's UI thread, which doesn't exist under Jest.
jest.mock('react-native-gesture-handler/lib/module/handlers/gestures/installUIRuntimeBindings', () => ({
  installUIRuntimeBindings: () => {},
}));
// Fail loudly on Reanimated warnings, so problems seen on devices show up in tests too.
const origWarn = console.warn;
console.warn = (...args) => {
  if (String(args[0]).includes('[Reanimated]')) throw new Error(String(args[0]));
  origWarn(...args);
};
// Safe areas: fixed insets instead of waiting for the native measurement.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
