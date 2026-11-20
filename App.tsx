import { BagelFatOne_400Regular } from '@expo-google-fonts/bagel-fat-one';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initAds, onLevelFinished } from './src/ads';
import { GameScreen } from './src/screens/GameScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { DEFAULT_PROGRESS, loadProgress, Progress, saveProgress } from './src/storage';
import { themeForLevel } from './src/theme';

type Screen = { name: 'home' } | { name: 'game'; level: number };

export default function App() {
  const [fontsLoaded] = useFonts({ BagelFatOne_400Regular, Fredoka_600SemiBold, Fredoka_700Bold });
  const [progress, setProgress] = useState<Progress>(DEFAULT_PROGRESS);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  useEffect(() => {
    loadProgress().then(setProgress);
    initAds();
  }, []);

  const onComplete = useCallback((level: number, stars: number) => {
    setProgress((p) => {
      const next: Progress = {
        level: Math.max(p.level, level + 1),
        stars: { ...p.stars, [level]: Math.max(p.stars[level] ?? 0, stars) },
        coins: p.coins + stars * 5,
      };
      saveProgress(next);
      return next;
    });
  }, []);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: themeForLevel(progress.level).bgTop }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {screen.name === 'home' ? (
          <HomeScreen progress={progress} onPlay={(level) => setScreen({ name: 'game', level })} />
        ) : (
          <GameScreen
            key={screen.level}
            levelNumber={screen.level}
            onComplete={onComplete}
            onNext={() => {
              // A full-screen ad may cover the switch to the next level (see src/ads/policy.ts).
              onLevelFinished(screen.level);
              setScreen({ name: 'game', level: screen.level + 1 });
            }}
            onHome={() => setScreen({ name: 'home' })}
          />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
