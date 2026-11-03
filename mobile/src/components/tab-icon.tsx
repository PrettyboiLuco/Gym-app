import Svg, { Circle, Path } from 'react-native-svg';

import { HIDDEN } from '@/components/a11y';

/**
 * Tab-Symbole für die Web-Vorschau, im Stil der iPhone-Symbole (SF Symbols), die auf dem Handy erscheinen:
 * Linie 2 px, runde Enden; ausgewählt gefüllt bzw. kräftiger.
 */
export type TabIconName = 'index' | 'training' | 'nutrition' | 'progress' | 'more';

export function TabIcon({
  name,
  color,
  contrastColor,
  selected,
  size = 24,
}: {
  name: TabIconName;
  color: string;
  /** Farbe für Details auf gefüllten Flächen (z. B. die Punkte im gefüllten Kreis). */
  contrastColor: string;
  selected: boolean;
  size?: number;
}) {
  const stroke = { stroke: color, strokeWidth: selected ? 2.3 : 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...HIDDEN}>
      {name === 'index' ? <Path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" {...stroke} fill={selected ? color : 'none'} /> : null}
      {name === 'training' ? (
        <>
          <Path d="M8 12h8" {...stroke} />
          <Path d="M5.5 7.5v9M8 6v12M16 6v12M18.5 7.5v9" {...stroke} />
          <Path d="M3 10v4M21 10v4" {...stroke} />
        </>
      ) : null}
      {name === 'nutrition' ? (
        <>
          <Path d="M7 3v18M4.5 3v5a2.5 2.5 0 0 0 5 0V3" {...stroke} />
          <Path d="M17 21V3c-2.2 1.2-3.5 3.6-3.5 7v3H17" {...stroke} fill={selected ? color : 'none'} />
        </>
      ) : null}
      {name === 'progress' ? (
        <>
          <Path d="M4 4v16h16" {...stroke} />
          <Path d="m7.5 15 3.5-4 3 2.5L19.5 7" {...stroke} />
          <Path d="M16 7h3.5v3.5" {...stroke} />
        </>
      ) : null}
      {name === 'more' ? (
        <>
          <Circle cx={12} cy={12} r={9} {...stroke} fill={selected ? color : 'none'} />
          {[8, 12, 16].map((x) => (
            <Circle key={x} cx={x} cy={12} r={1.3} fill={selected ? contrastColor : color} />
          ))}
        </>
      ) : null}
    </Svg>
  );
}
