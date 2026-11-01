// Schichten der App (docs/Code_Struktur.md) – als Test, damit sie nicht schleichend verwischen.
//
//   domain     reine Logik: keine Datenbank, kein React, keine Expo-Module, keine Texte (i18n)
//   format     Anzeige-Texte aus Domain-Werten (i18n erlaubt), kein React; aus data nur Typen
//   data       Datenbank und Speicher (Expo-Module erlaubt), kein React, keine Oberfläche
//   providers  React-Kontext und -Hooks rund um die Daten (Datenbank, Profil, laufendes Training)
//   components, hooks   wiederverwendbare Oberfläche
//   app        Bildschirme (expo-router)

import { describe, expect, test } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import ts from 'typescript';

const SRC = join(__dirname, '../..');

type Rule = { layer: string; forbid: RegExp; typeOnlyAllowed?: RegExp };
const RULES: Rule[] = [
  { layer: 'domain', forbid: /^(react|react-native|expo[-/].*|expo)$|^@\/(data|format|i18n|components|hooks|app|providers|constants)(\/|$)/ },
  { layer: 'format', forbid: /^(react|react-native|expo[-/].*|expo)$|^@\/(components|hooks|app|providers|data)(\/|$)/, typeOnlyAllowed: /^@\/data\// },
  { layer: 'data', forbid: /^react$|^@\/(components|hooks|app|providers)(\/|$)/ },
  { layer: 'providers', forbid: /^@\/(components|app)(\/|$)/ },
  { layer: 'components', forbid: /^@\/app(\/|$)/ },
  { layer: 'hooks', forbid: /^@\/app(\/|$)/ },
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' || name === 'testing' ? [] : files(p);
    return /\.tsx?$/.test(p) ? [p] : [];
  });
}

function imports(path: string): { spec: string; typeOnly: boolean; line: number }[] {
  const src = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const out: { spec: string; typeOnly: boolean; line: number }[] = [];
  const visit = (node: ts.Node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const typeOnly = ts.isImportDeclaration(node)
        ? !!node.importClause?.isTypeOnly ||
          (!!node.importClause?.namedBindings &&
            ts.isNamedImports(node.importClause.namedBindings) &&
            node.importClause.namedBindings.elements.every((e) => e.isTypeOnly) &&
            !node.importClause.name)
        : node.isTypeOnly;
      out.push({ spec: node.moduleSpecifier.text, typeOnly, line: src.getLineAndCharacterOfPosition(node.getStart()).line + 1 });
    }
    if (ts.isCallExpression(node) && node.expression.getText(src) === 'require' && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
      out.push({ spec: node.arguments[0].text, typeOnly: false, line: src.getLineAndCharacterOfPosition(node.getStart()).line + 1 });
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
  return out;
}

describe('Architektur', () => {
  for (const rule of RULES) {
    test(`${rule.layer}: nur erlaubte Importe`, () => {
      const problems: string[] = [];
      for (const f of files(join(SRC, rule.layer))) {
        for (const i of imports(f)) {
          if (!rule.forbid.test(i.spec)) continue;
          if (i.typeOnly && rule.typeOnlyAllowed?.test(i.spec)) continue;
          problems.push(`${relative(SRC, f)}:${i.line} importiert ${i.spec}`);
        }
      }
      expect(problems).toEqual([]);
    });
  }
  test('Gegenprobe: die Regeln erkennen verbotene Importe', () => {
    const rule = (layer: string) => RULES.find((r) => r.layer === layer)!.forbid;
    expect(rule('domain').test('@/data/db')).toBe(true);
    expect(rule('domain').test('expo-sqlite')).toBe(true);
    expect(rule('domain').test('./nutrition')).toBe(false);
    expect(rule('data').test('@/components/card')).toBe(true);
    expect(rule('data').test('expo-sqlite')).toBe(false);
  });
});
