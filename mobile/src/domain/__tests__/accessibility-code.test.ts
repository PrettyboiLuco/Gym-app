// A11.2: Jedes tippbare Element braucht eine Rolle für VoiceOver (Knopf, Kontrollkästchen …). Liest alle Bildschirme
// und Komponenten als TypeScript-Syntaxbaum – so fällt ein neuer Knopf ohne Rolle sofort im Test auf.

import { describe, expect, test } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import ts from 'typescript';

const ROOT = join(__dirname, '../..');
const TOUCHABLES = new Set(['Pressable', 'TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback']);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : files(p);
    return p.endsWith('.tsx') ? [p] : [];
  });
}

function missingRoles(path: string): string[] {
  const src = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(src);
      if (TOUCHABLES.has(tag)) {
        const attrs = node.attributes.properties;
        const spread = attrs.some((a) => ts.isJsxSpreadAttribute(a));
        const names = attrs.filter(ts.isJsxAttribute).map((a) => a.name.getText(src));
        // Weitergereichte Props (z. B. TabTrigger asChild) bringen Rolle und Name selbst mit.
        if (!spread && !names.includes('accessibilityRole') && !names.includes('role')) {
          out.push(`${path.slice(ROOT.length + 1)}:${src.getLineAndCharacterOfPosition(node.getStart()).line + 1} <${tag}> ohne accessibilityRole`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
  return out;
}

describe('Barrierefreiheit im Code', () => {
  test('alle tippbaren Elemente haben eine Rolle', () => {
    const problems = [...files(join(ROOT, 'app')), ...files(join(ROOT, 'components'))].flatMap(missingRoles);
    expect(problems).toEqual([]);
  });
});
