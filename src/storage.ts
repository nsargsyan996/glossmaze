import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Progress {
  /** Highest level unlocked (the next one to play). */
  level: number;
  /** Best star rating per completed level. */
  stars: Record<number, number>;
  coins: number;
}

const KEY = 'glossmaze.progress.v1';
export const DEFAULT_PROGRESS: Progress = { level: 1, stars: {}, coins: 0 };

export async function loadProgress(): Promise<Progress> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PROGRESS, ...JSON.parse(raw) } : DEFAULT_PROGRESS;
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export async function saveProgress(p: Progress): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Saving progress is best-effort; the game keeps working without it.
  }
}
