import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { HIDDEN_FROM_A11Y } from '@/components/a11y-hidden';

/**
 * Ruhige Liniensymbole (24er-Raster, Strich 1,8, runde Enden) – ein Satz für die ganze App.
 * taste-skill: Symbole 14–20 px, grau, ohne farbigen Kreis; nur wo sie beim Finden helfen.
 */
export type IconName =
  | 'chevron'
  | 'check'
  | 'person'
  | 'bell'
  | 'database'
  | 'lock'
  | 'help'
  | 'chat'
  | 'appearance'
  | 'shield'
  | 'heart'
  | 'book'
  | 'globe'
  | 'tag'
  | 'dumbbell'
  | 'play'
  | 'plus'
  | 'minus'
  | 'clock'
  | 'list'
  | 'sparkle'
  | 'stretch'
  | 'bolt'
  | 'calendar'
  | 'pencil'
  | 'search'
  | 'close'
  | 'target'
  | 'camera'
  | 'ruler'
  | 'steps'
  | 'calculator'
  | 'scale'
  | 'pill'
  | 'drop'
  | 'flame'
  | 'chart';

export function Icon({ name, color, size = 20, strokeWidth = 1.8 }: { name: IconName; color: string; size?: number; strokeWidth?: number }) {
  const p = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const paths: Record<IconName, React.ReactNode> = {
    chevron: <Path d="m9 6 6 6-6 6" {...p} />,
    check: <Path d="M5 12.5 10 17.5 19 7" {...p} />,
    person: (
      <>
        <Circle cx={12} cy={8} r={3.6} {...p} />
        <Path d="M4.5 20c.8-3.6 3.8-5.6 7.5-5.6s6.7 2 7.5 5.6" {...p} />
      </>
    ),
    bell: <Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2.2 2.2 0 0 0 4 0" {...p} />,
    database: (
      <>
        <Path d="M4.5 6.5c0-1.7 3.4-3 7.5-3s7.5 1.3 7.5 3-3.4 3-7.5 3-7.5-1.3-7.5-3z" {...p} />
        <Path d="M4.5 6.5v11c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-11M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" {...p} />
      </>
    ),
    lock: (
      <>
        <Rect x={5} y={10.5} width={14} height={10} rx={2.5} {...p} />
        <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...p} />
      </>
    ),
    help: (
      <>
        <Circle cx={12} cy={12} r={8.5} {...p} />
        <Path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.5M12 16.8v.2" {...p} />
      </>
    ),
    chat: <Path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z" {...p} />,
    appearance: (
      <>
        <Circle cx={12} cy={12} r={8.5} {...p} />
        <Path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill={color} stroke="none" />
      </>
    ),
    shield: <Path d="M12 3.5 19 6v5.5c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V6z" {...p} />,
    heart: <Path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10z" {...p} />,
    book: <Path d="M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2zM5 20a2 2 0 0 0 2 1h12" {...p} />,
    globe: (
      <>
        <Circle cx={12} cy={12} r={8.5} {...p} />
        <Path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.3 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.3-3.4-8.5S9.7 5.9 12 3.5z" {...p} />
      </>
    ),
    tag: (
      <>
        <Path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1l8 8a1.4 1.4 0 0 1 0 2l-7.1 7.1a1.4 1.4 0 0 1-2 0z" {...p} />
        <Circle cx={8.5} cy={8.5} r={1.4} {...p} />
      </>
    ),
    dumbbell: <Path d="M8 12h8M5.5 7.5v9M8 6v12M16 6v12M18.5 7.5v9M3 10v4M21 10v4" {...p} />,
    play: <Path d="M8 5.5v13l10.5-6.5z" {...p} />,
    plus: <Path d="M12 5v14M5 12h14" {...p} />,
    minus: <Path d="M5 12h14" {...p} />,
    clock: (
      <>
        <Circle cx={12} cy={12} r={8.5} {...p} />
        <Path d="M12 7.5V12l3 2" {...p} />
      </>
    ),
    list: <Path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" {...p} />,
    sparkle: <Path d="M12 3.5 13.8 10.2 20.5 12 13.8 13.8 12 20.5 10.2 13.8 3.5 12 10.2 10.2z" {...p} />,
    stretch: (
      <>
        <Circle cx={12} cy={4.8} r={1.8} {...p} />
        <Path d="M4 9.5 12 8l8 1.5M12 8v6l-4 6.5M12 14l4 6.5" {...p} />
      </>
    ),
    bolt: <Path d="M13 3 5 13.5h6.5L10.5 21 19 10h-6.5z" {...p} />,
    calendar: (
      <>
        <Rect x={3.5} y={5} width={17} height={15.5} rx={3} {...p} />
        <Path d="M3.5 10h17M8 3v4M16 3v4" {...p} />
      </>
    ),
    pencil: <Path d="M4.5 19.5 5.5 15 15.5 5a2 2 0 0 1 3 3l-10 10zM13.5 7l3 3" {...p} />,
    search: (
      <>
        <Circle cx={10.5} cy={10.5} r={6} {...p} />
        <Path d="m15 15 5 5" {...p} />
      </>
    ),
    close: <Path d="M6 6l12 12M18 6 6 18" {...p} />,
    target: (
      <>
        <Circle cx={12} cy={12} r={8.5} {...p} />
        <Circle cx={12} cy={12} r={4.5} {...p} />
        <Circle cx={12} cy={12} r={0.8} {...p} />
      </>
    ),
    camera: (
      <>
        <Path d="M4 8a1.5 1.5 0 0 1 1.5-1.5h2.3L9.5 4h5l1.7 2.5h2.3A1.5 1.5 0 0 1 20 8v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z" {...p} />
        <Circle cx={12} cy={12.5} r={3.5} {...p} />
      </>
    ),
    ruler: <Path d="m4 16 12-12 4 4-12 12zM8 12l2 2M11 9l2 2M14 6l2 2" {...p} />,
    steps: (
      <Path
        d="M8 3.5c1.8 0 2.8 2 2.8 4.5S9.7 12 8.2 12 5.5 10 5.5 7.6 6.3 3.5 8 3.5zM6 14.5h4.2l-.5 3a2 2 0 0 1-3.7 0zM16 7.5c1.8 0 2.8 2 2.8 4.5s-1.1 4-2.6 4-2.7-2-2.7-4.4.8-4.1 2.5-4.1zM14 18.5h4.2l-.5 1.5a2 2 0 0 1-3.6 0z"
        {...p}
      />
    ),
    calculator: (
      <>
        <Rect x={5} y={3.5} width={14} height={17} rx={2.5} {...p} />
        <Path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" {...p} />
      </>
    ),
    scale: (
      <>
        <Rect x={3.5} y={3.5} width={17} height={17} rx={5} {...p} />
        <Path d="M8.5 10a5 5 0 0 1 7 0M12 10l1.4-1.6" {...p} />
      </>
    ),
    pill: (
      <>
        <Rect x={3} y={8.5} width={18} height={7} rx={3.5} transform="rotate(-40 12 12)" {...p} />
        <Path d="m9.6 9.2 4.8 5.6" {...p} />
      </>
    ),
    drop: <Path d="M12 3.5c3 3.9 6 7.2 6 10.6a6 6 0 0 1-12 0c0-3.4 3-6.7 6-10.6Z" {...p} />,
    flame: (
      <Path
        d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.6-5.4 3.6-8.8 2.6 1.6 3.4 4.1 3.2 6 1-.6 1.7-1.7 1.9-3 1.8 1.6 2.3 3.6 2.3 5.8 0 3.6-2.6 6.2-4.5 6.2Z"
        {...p}
      />
    ),
    chart: <Path d="M4 4v16h16M7.5 15l3.5-4 3 2.5L19.5 7" {...p} />,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...HIDDEN_FROM_A11Y}>
      {paths[name]}
    </Svg>
  );
}
