import Svg, { Path, Rect } from 'react-native-svg';

/** Kleine Liniensymbole für Kacheln (gleicher Strich wie die Tab-Symbole). */
export type GlyphName = 'flame' | 'drop' | 'scale' | 'calendar' | 'dumbbell';

export function Glyph({ name, color, size = 16 }: { name: GlyphName; color: string; size?: number }) {
  const p = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {name === 'flame' ? <Path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.6-5.4 3.6-8.8 2.6 1.6 3.4 4.1 3.2 6 1-.6 1.7-1.7 1.9-3 1.8 1.6 2.3 3.6 2.3 5.8 0 3.6-2.6 6.2-4.5 6.2Z" {...p} /> : null}
      {name === 'drop' ? <Path d="M12 3.5c3 3.9 6 7.2 6 10.6a6 6 0 0 1-12 0c0-3.4 3-6.7 6-10.6Z" {...p} /> : null}
      {name === 'scale' ? (
        <>
          <Rect x={3.5} y={3.5} width={17} height={17} rx={5} {...p} />
          <Path d="M8.5 10a5 5 0 0 1 7 0M12 10l1.4-1.6" {...p} />
        </>
      ) : null}
      {name === 'calendar' ? (
        <>
          <Rect x={3.5} y={5} width={17} height={15.5} rx={4} {...p} />
          <Path d="M3.5 10h17M8 3v4M16 3v4" {...p} />
        </>
      ) : null}
      {name === 'dumbbell' ? <Path d="M8 12h8M5.5 7.5v9M8 6v12M16 6v12M18.5 7.5v9M3 10v4M21 10v4" {...p} /> : null}
    </Svg>
  );
}
