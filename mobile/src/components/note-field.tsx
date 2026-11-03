// Notizfeld, das sicher speichert: beim Verlassen des Feldes, beim Aushängen und auf Abruf (z. B. „Fertig“).
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import type { TextInputProps } from 'react-native';

import { Field } from '@/components/fields';

/** Von außen speichern, bevor der Bildschirm weiterspringt (das Ergebnis lässt sich abwarten). */
export type NoteFieldHandle = { flush: () => Promise<unknown> | undefined };

/**
 * `onEndEditing` kommt nicht, wenn das Feld verschwindet (Detailbereich zu, Bildschirm verlassen) oder ein Knopf
 * ohne Fokuswechsel getippt wird – dann ging die Notiz verloren. Hier ist das Feld kontrolliert und speichert jede
 * Änderung genau einmal: bei onBlur, beim Aushängen und über `ref.flush()`.
 */
export function NoteField({
  value,
  onSave,
  ref,
  ...field
}: Omit<TextInputProps, 'value' | 'defaultValue' | 'onChangeText' | 'onBlur' | 'onEndEditing'> & {
  label: string;
  value: string | null;
  onSave: (text: string) => Promise<unknown> | void;
  ref?: Ref<NoteFieldHandle>;
}) {
  const [text, setText] = useState(value ?? '');
  const saved = useRef(value ?? '');
  const latest = useRef({ text, onSave });
  useEffect(() => {
    latest.current = { text, onSave };
  });

  const flush = useCallback(() => {
    const { text: current, onSave: save } = latest.current;
    if (current === saved.current) return undefined;
    saved.current = current;
    return save(current) ?? undefined;
  }, []);

  useImperativeHandle(ref, () => ({ flush }), [flush]);
  // Beim Aushängen (Detailbereich zu, Bildschirm verlassen) die letzte Eingabe sichern.
  useEffect(() => () => void flush(), [flush]);

  return <Field {...field} value={text} onChangeText={setText} onBlur={() => void flush()} />;
}
