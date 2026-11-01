import { useKeepAwake } from 'expo-keep-awake';
import { Platform } from 'react-native';

function Awake() {
  useKeepAwake();
  return null;
}

/** Hält den Bildschirm wach, solange `when` gilt (Training, Intervall, Ablauf). Im Web ohne Wirkung. */
export function KeepAwake({ when }: { when: boolean }) {
  return when && Platform.OS !== 'web' ? <Awake /> : null;
}
