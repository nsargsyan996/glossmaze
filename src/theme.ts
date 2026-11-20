export interface Theme {
  name: string;
  /** Background gradient, top to bottom. */
  bgTop: string;
  bgBottom: string;
  /** Raised blocks: lit top face and shaded front face. */
  wallTop: string;
  wallSide: string;
  /** Recessed floor channel and the dot that marks an unpainted tile. */
  floor: string;
  floorDot: string;
  /** Paint and its highlight; the ball is made of the same paint. */
  paint: string;
  paintHi: string;
  /** Text and icon color. */
  ink: string;
}

/** Light "toy" palettes: a pastel tray with one strongly contrasting paint. */
export const THEMES: Theme[] = [
  {
    name: 'Peach',
    bgTop: '#FFE7D9', bgBottom: '#FFB79E',
    wallTop: '#FFF7F1', wallSide: '#EFA488',
    floor: '#D9836C', floorDot: '#C5705A',
    paint: '#4B3FE0', paintHi: '#8F87FF',
    ink: '#4A2117',
  },
  {
    name: 'Pool',
    bgTop: '#DDF6FF', bgBottom: '#93D7F0',
    wallTop: '#F5FCFF', wallSide: '#7FC2DA',
    floor: '#4D98B5', floorDot: '#3F86A2',
    paint: '#FF4F74', paintHi: '#FF9CB1',
    ink: '#0D3445',
  },
  {
    name: 'Pistachio',
    bgTop: '#EEF8DC', bgBottom: '#BDE196',
    wallTop: '#FBFFF4', wallSide: '#9FCB73',
    floor: '#6C9C45', floorDot: '#5D8B39',
    paint: '#FF7417', paintHi: '#FFB57A',
    ink: '#21340D',
  },
  {
    name: 'Lilac',
    bgTop: '#F3E8FF', bgBottom: '#C9ACFF',
    wallTop: '#FCF8FF', wallSide: '#AE8DEB',
    floor: '#8363C6', floorDot: '#7355B4',
    paint: '#0FBF98', paintHi: '#73EBCD',
    ink: '#2B1652',
  },
  {
    name: 'Lemon',
    bgTop: '#FFF8D6', bgBottom: '#FFDF7C',
    wallTop: '#FFFDF3', wallSide: '#E8C152',
    floor: '#C89D2E', floorDot: '#B58B22',
    paint: '#E5306A', paintHi: '#FF86AB',
    ink: '#3E2E04',
  },
];

export function themeForLevel(level: number): Theme {
  return THEMES[Math.floor((level - 1) / 5) % THEMES.length];
}

export const FONTS = {
  display: 'BagelFatOne_400Regular',
  ui: 'Fredoka_600SemiBold',
  uiBold: 'Fredoka_700Bold',
};

/** Mix a hex color toward black (amount 0..1). */
export function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v * (1 - amount)).toString(16).padStart(2, '0');
  return `#${f((n >> 16) & 255)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

/** Blend two hex colors (t = 0 gives a, 1 gives b). */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t).toString(16).padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}
