#!/usr/bin/env node
/**
 * audit-expo-ui.js: advisory linter for @expo/ui usage. Pure Node (fs/path), no deps,
 * no network. Output goes to stdout for an agent to read. Exit 1 if findings, else 0.
 *
 * Usage:
 *   node audit-expo-ui.js <file-or-dir> [more paths...]
 *
 * Checks (conservative, designed for near-zero false positives):
 *   [FLEXBOX] A Yoga/flexbox `style={{...}}` on an @expo/ui component other than Host.
 *             Inside a Host, layout is native (Row/Column/HStack + spacing/modifiers);
 *             flexbox applies to the Host only, so flex/justifyContent/etc. on a child
 *             is a no-op or a bug.
 *   [UNIVERSAL] An import from '@expo/ui/swift-ui' or '@expo/ui/jetpack-compose' whose
 *             name also exists in the universal layer: prefer importing it from '@expo/ui'
 *             (one tree, no .ios/.android split) unless you need platform-specific behavior.
 *             Skipped in *.ios.* / *.android.* files, which have already chosen the split.
 *   [HOST-IMPORT] Host imported from a platform sub-package; it must come from '@expo/ui'.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Universal layer component names (SDK 56). Name-based match is intentionally conservative:
// a platform component is only flagged when the SAME name exists universally.
const UNIVERSAL = new Set([
  'Host', 'Column', 'Row', 'Spacer', 'ScrollView', 'Text', 'Icon', 'Button', 'Switch',
  'Checkbox', 'Slider', 'TextInput', 'Picker', 'BottomSheet', 'Collapsible', 'List',
  'ListItem', 'FieldGroup', 'RNHostView',
]);

// Unambiguous Yoga/flexbox keys that are never valid on an @expo/ui child.
const FLEX_KEYS = new Set([
  'flex', 'flexDirection', 'flexGrow', 'flexShrink', 'flexBasis', 'flexWrap',
  'justifyContent', 'alignItems', 'alignContent', 'alignSelf', 'gap', 'rowGap', 'columnGap',
]);

const EXEMPT_TAGS = new Set(['Host', 'RNHostView']); // these legitimately take RN style
const PLATFORM_SOURCES = new Set(['@expo/ui/swift-ui', '@expo/ui/jetpack-compose']);
const EXPO_UI_COMPONENT_SOURCES = new Set([
  '@expo/ui', '@expo/ui/swift-ui', '@expo/ui/jetpack-compose',
]);

const findings = [];
const add = (file, line, rule, message) => findings.push({ file, line, rule, message });
const lineAt = (src, idx) => src.slice(0, idx).split('\n').length;

// ---------------------------------------------------------------------------
// Import parsing: collect @expo/ui component imports (named + default) per file.
// Sources ending in /modifiers are skipped (those are functions, not components).
// ---------------------------------------------------------------------------
function parseImports(src, file) {
  const importRe = /import\s+([^;]*?)\s+from\s+['"]([^'"]+)['"]/g;
  const componentNames = new Set();
  // A .ios.tsx/.android.tsx file has already committed to the platform split, so the
  // UNIVERSAL "prefer universal" nudge is noise there; HOST-IMPORT and FLEXBOX still apply.
  const platformScoped = /\.(ios|android)\.[jt]sx?$/.test(file);
  let m;
  while ((m = importRe.exec(src))) {
    const clause = m[1];
    const source = m[2];
    if (!EXPO_UI_COMPONENT_SOURCES.has(source)) continue;
    const names = [];
    // default import: `import Foo, { ... }` or `import Foo`
    const def = clause.match(/^\s*([A-Za-z_$][\w$]*)\s*(?:,|$)/);
    if (def && !clause.trimStart().startsWith('{')) names.push(def[1]);
    // named imports inside { ... }
    const braces = clause.match(/\{([^}]*)\}/);
    if (braces) {
      for (let part of braces[1].split(',')) {
        part = part.trim();
        if (!part) continue;
        part = part.replace(/^type\s+/, '');
        const id = part.split(/\s+as\s+/)[0].trim();
        if (id) names.push(id);
      }
    }
    for (const name of names) {
      componentNames.add(name);
      if (PLATFORM_SOURCES.has(source)) {
        const line = lineAt(src, m.index);
        if (name === 'Host') {
          add(file, line, 'HOST-IMPORT', `Host imported from '${source}': import Host from '@expo/ui' instead.`);
        } else if (!platformScoped && UNIVERSAL.has(name)) {
          add(file, line, 'UNIVERSAL', `'${name}' from '${source}' has a universal equivalent: prefer import from '@expo/ui' unless you need platform-specific behavior.`);
        }
      }
    }
  }
  return componentNames;
}

// ---------------------------------------------------------------------------
// JSX opening-tag scanner: brace/paren/bracket/string aware so arrow-function
// props (onPress={() => ...}) don't prematurely end a tag at their `>`.
// Returns [{ name, attrText, index }].
// ---------------------------------------------------------------------------
function scanOpenTags(src) {
  const tags = [];
  const tagStart = /<([A-Z][\w.]*)/g; // component tags start with an uppercase letter
  let m;
  while ((m = tagStart.exec(src))) {
    const name = m[1];
    let i = tagStart.lastIndex;
    let depthCurly = 0, depthParen = 0, depthBracket = 0;
    let str = null; // current string delimiter or null
    let attrStart = i;
    let end = -1;
    for (; i < src.length; i++) {
      const c = src[i];
      if (str) {
        if (c === str && src[i - 1] !== '\\') str = null;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') { str = c; continue; }
      if (c === '{') depthCurly++;
      else if (c === '}') depthCurly--;
      else if (c === '(') depthParen++;
      else if (c === ')') depthParen--;
      else if (c === '[') depthBracket++;
      else if (c === ']') depthBracket--;
      else if (c === '>' && depthCurly === 0 && depthParen === 0 && depthBracket === 0) {
        end = i;
        break;
      }
    }
    if (end === -1) continue;
    tags.push({ name, attrText: src.slice(attrStart, end), index: m.index });
    tagStart.lastIndex = end + 1;
  }
  return tags;
}

// Extract the object text from the first `style={{ ... }}` in an attribute string.
function extractStyleObject(attrText) {
  const at = attrText.indexOf('style=');
  if (at === -1) return null;
  let i = attrText.indexOf('{', at);
  if (i === -1 || attrText[i + 1] !== '{') return null; // only inline object literals
  let depth = 0;
  const start = i;
  for (; i < attrText.length; i++) {
    if (attrText[i] === '{') depth++;
    else if (attrText[i] === '}') { depth--; if (depth === 0) return attrText.slice(start + 1, i); }
  }
  return null;
}

function checkFlexbox(src, file, componentNames) {
  for (const tag of scanOpenTags(src)) {
    if (!componentNames.has(tag.name) || EXEMPT_TAGS.has(tag.name)) continue;
    const styleObj = extractStyleObject(tag.attrText);
    if (!styleObj) continue;
    const hit = [...FLEX_KEYS].filter((k) => new RegExp(`(^|[{,\\s])${k}\\s*:`).test(styleObj));
    if (hit.length) {
      add(file, lineAt(src, tag.index), 'FLEXBOX',
        `<${tag.name}> has flexbox style (${hit.join(', ')}). Flexbox applies to Host only: lay out children with Row/Column/HStack + spacing or modifiers.`);
    }
  }
}

// ---------------------------------------------------------------------------
function auditFile(file) {
  let src;
  try { src = fs.readFileSync(file, 'utf8'); } catch { return; }
  if (!/@expo\/ui/.test(src)) return; // fast skip
  const componentNames = parseImports(src, file);
  if (componentNames.size) checkFlexbox(src, file, componentNames);
}

function walk(target) {
  let stat;
  try { stat = fs.statSync(target); } catch { console.error(`Path not found: ${target}`); return; }
  if (stat.isDirectory()) {
    if (/(^|\/)(node_modules|\.git|ios|android|\.expo|dist|build)$/.test(target)) return;
    for (const entry of fs.readdirSync(target)) walk(path.join(target, entry));
  } else if (/\.(tsx|ts|jsx|js)$/.test(target)) {
    auditFile(target);
  }
}

// ---------------------------------------------------------------------------
const targets = process.argv.slice(2);
if (!targets.length) {
  console.error('Usage: node audit-expo-ui.js <file-or-dir> [more paths...]');
  process.exit(2);
}
targets.forEach(walk);

if (!findings.length) {
  console.log('audit-expo-ui: no issues found.');
  process.exit(0);
}

findings.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1));
console.log(`audit-expo-ui: ${findings.length} finding(s)\n`);
for (const f of findings) {
  console.log(`${f.file}:${f.line}  [${f.rule}] ${f.message}`);
}
console.log('\nRules: FLEXBOX = flexbox style on a non-Host @expo/ui component; ' +
  'UNIVERSAL = platform import with a universal equivalent; ' +
  'HOST-IMPORT = Host not imported from @expo/ui.');
process.exit(1);
