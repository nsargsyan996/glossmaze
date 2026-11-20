// No ads on the web build.
export async function initAds(): Promise<void> {}
export function onLevelFinished(_levelCompleted: number): boolean {
  return false;
}
export function privacyOptionsRequired(): boolean {
  return false;
}
export async function showPrivacyOptions(): Promise<void> {}
