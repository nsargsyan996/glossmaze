import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { FONTS, Theme } from '../theme';

export function Backdrop({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <LinearGradient colors={[theme.bgTop, theme.bgBottom]} style={[{ flex: 1 }, style]}>
      {children}
    </LinearGradient>
  );
}

/** Display type with a solid extruded shadow, matching the raised blocks. */
export function ChunkyText({
  children, size, color, shadow, style,
}: { children: React.ReactNode; size: number; color: string; shadow: string; style?: TextStyle }) {
  const lift = Math.max(2, Math.round(size * 0.07));
  return (
    <Text
      style={[
        {
          fontFamily: FONTS.display,
          fontSize: size,
          lineHeight: size * 1.12,
          color,
          textShadowColor: shadow,
          textShadowOffset: { width: 0, height: lift },
          textShadowRadius: 0.1,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * A raised button with a visible base; the face presses down into the base.
 * Either an icon button (round) or a labelled pill.
 */
export function CandyButton({
  icon, label, sublabel, onPress, face, base, ink, disabled, size = 'md', accessibilityLabel,
}: {
  icon?: IconName;
  label?: string;
  sublabel?: string;
  onPress: () => void;
  face: string;
  base: string;
  ink: string;
  disabled?: boolean;
  size?: 'md' | 'lg';
  accessibilityLabel?: string;
}) {
  const [down, setDown] = useState(false);
  const lip = size === 'lg' ? 8 : 5;
  const isIcon = !label;
  const dims: ViewStyle = isIcon
    ? { width: 52, height: 52, borderRadius: 18 }
    : { paddingHorizontal: size === 'lg' ? 44 : 26, height: size === 'lg' ? 76 : 54, borderRadius: size === 'lg' ? 28 : 20 };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={{ opacity: disabled ? 0.4 : 1, paddingBottom: lip }}
    >
      <View style={[dims, { position: 'absolute', left: 0, right: 0, top: lip, backgroundColor: base }]} />
      <View
        style={[
          dims,
          styles.face,
          { backgroundColor: face, transform: [{ translateY: down ? lip - 1 : 0 }] },
        ]}
      >
        {icon && <Ionicons name={icon} size={size === 'lg' ? 30 : 26} color={ink} />}
        {label && (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: size === 'lg' ? 30 : 20, color: ink, lineHeight: size === 'lg' ? 36 : 26 }}>
              {label}
            </Text>
            {sublabel && <Text style={{ fontFamily: FONTS.ui, fontSize: 14, color: ink, opacity: 0.7 }}>{sublabel}</Text>}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
});
