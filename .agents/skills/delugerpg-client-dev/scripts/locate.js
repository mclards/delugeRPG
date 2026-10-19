#!/usr/bin/env node
// locate.js - Fast Symbol, Section, DOM ID, and IPC Line-Range Locator for DelugeRPG
// Saves LLM context tokens by finding exact [startLine-endLine] bounds before view_file calls.

const fs = require('fs');
const path = require('path');

const CLIENT_DIR = path.resolve(__dirname, '../../../../desktop-client');
const CORE_FILES = ['main.js', 'app.html', 'app.js', 'game-preload.js', 'team_engine.js', 'ml_combat_engine.py'];

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log('Usage:');
  console.log('  node locate.js --map [file]          # Print compact structural section map');
  console.log('  node locate.js --check-dom           # Audit DOM IDs and package.json files');
  console.log('  node locate.js <query> [file]        # Find exact line numbers & function bounds');
  process.exit(0);
}

if (args[0] === '--check-dom') {
  const html = fs.readFileSync(path.join(CLIENT_DIR, 'app.html'), 'utf8');
  const js = fs.readFileSync(path.join(CLIENT_DIR, 'app.js'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(CLIENT_DIR, 'package.json'), 'utf8'));
  const pkgFiles = new Set((pkg.build && pkg.build.files) || []);

  // 1. Check all local require('./...') across all JS files in package.json
  for (const f of pkgFiles) {
    if (!f.endsWith('.js')) continue;
    const full = path.join(CLIENT_DIR, f);
    if (!fs.existsSync(full)) {
      console.error(`[FAIL] File listed in package.json build.files does not exist: ${f}`);
      continue;
    }
    const content = fs.readFileSync(full, 'utf8');
    const reqs = [...content.matchAll(/require\(['"]\.\/([^'"]+)['"]\)/g)].map(m => m[1]);
    for (const r of reqs) {
      if (r !== 'package.json' && !pkgFiles.has(r)) {
        console.error(`[FAIL] ${f} requires './${r}', which is MISSING from package.json build.files!`);
      } else {
        console.log(`[PASS] ${f} -> require('./${r}') bundled in package.json`);
      }
    }
  }

  // 2. Check all getElementById calls in app.js against app.html
  const lines = js.split('\n');
  lines.forEach((l, idx) => {
    const m = l.match(/const\s+([a-zA-Z0-9_]+)\s*=\s*document\.getElementById\(['"]([^'"]+)['"]\)/);
    if (m) {
      const varName = m[1];
      const idName = m[2];
      if (!html.includes(`id="${idName}"`) && !html.includes(`id='${idName}'`)) {
        console.log(`[MISSING DOM ID] ${varName} -> #${idName} (defined at L${idx + 1})`);
        lines.forEach((l2, idx2) => {
          if (idx2 !== idx && l2.includes(varName + '.')) {
            console.log(`   Used at L${idx2 + 1}: ${l2.trim()}`);
          }
        });
      }
    }
  });
  process.exit(0);
}

function findBlockEnd(lines, startIdx, isPython) {
  if (isPython) {
    const baseIndent = (lines[startIdx].match(/^\s*/) || [''])[0].length;
    for (let i = startIdx + 1; i < Math.min(lines.length, startIdx + 300); i++) {
      const trimmed = lines[i].trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const indent = (lines[i].match(/^\s*/) || [''])[0].length;
      if (indent <= baseIndent && /^(def |class |if __name__)/.test(trimmed)) {
        return i;
      }
    }
    return Math.min(lines.length, startIdx + 60);
  }
  let depth = 0;
  let opened = false;
  for (let i = startIdx; i < Math.min(lines.length, startIdx + 500); i++) {
    const line = lines[i];
    for (let c = 0; c < line.length; c++) {
      if (line[c] === '{') { depth++; opened = true; }
      else if (line[c] === '}') {
        depth--;
        if (opened && depth <= 0) return i + 1;
      }
    }
  }
  return Math.min(lines.length, startIdx + 50);
}

if (args[0] === '--map') {
  const filterFile = args[1];
  const files = filterFile ? [filterFile] : CORE_FILES;
  for (const f of files) {
    const full = path.join(CLIENT_DIR, f);
    if (!fs.existsSync(full)) continue;
    const lines = fs.readFileSync(full, 'utf8').split('\n');
    console.log(`\n=== ${f} (${lines.length} lines) ===`);
    const isPy = f.endsWith('.py');
    const isHtml = f.endsWith('.html');
    lines.forEach((l, idx) => {
      const t = l.trim();
      if (isHtml) {
        if (/^<(style|body|script)|<!-- ===|id="(toolbar|navDropdown|mainContainer|[a-zA-Z]+Modal)"/.test(t)) {
          console.log(`  L${idx + 1}: ${t.slice(0, 85)}`);
        }
      } else if (isPy) {
        if (/^(def |class |# ===)/.test(t)) {
          const end = findBlockEnd(lines, idx, true);
          console.log(`  L${idx + 1}-L${end}: ${t.slice(0, 80)}`);
        }
      } else {
        if (/^(\/\/ ===|async function |function |[a-zA-Z0-9_]+\.addEventListener\(|ipcMain\.on\(|ipcRenderer\.on\()/.test(t)) {
          const end = t.startsWith('//') ? idx + 1 : findBlockEnd(lines, idx, false);
          console.log(`  L${idx + 1}${end > idx + 1 ? '-L' + end : ''}: ${t.slice(0, 80)}`);
        }
      }
    });
  }
  process.exit(0);
}

const query = args[0].toLowerCase();
const filterFile = args[1];
const files = filterFile ? [filterFile] : CORE_FILES;

for (const f of files) {
  const full = path.join(CLIENT_DIR, f);
  if (!fs.existsSync(full)) continue;
  const lines = fs.readFileSync(full, 'utf8').split('\n');
  const isPy = f.endsWith('.py');
  const hits = [];
  lines.forEach((l, idx) => {
    if (l.toLowerCase().includes(query)) {
      const t = l.trim();
      const isBlockStart = /^(async function |function |def |class |ipcMain\.on|ipcRenderer\.on|[a-zA-Z0-9_]+\.addEventListener)/.test(t);
      const end = isBlockStart ? findBlockEnd(lines, idx, isPy) : idx + 1;
      hits.push(`  L${idx + 1}${end > idx + 1 ? '-L' + end : ''}: ${t.slice(0, 90)}`);
    }
  });
  if (hits.length > 0) {
    console.log(`=== ${f} (${hits.length} matches) ===`);
    hits.slice(0, 35).forEach(h => console.log(h));
    if (hits.length > 35) console.log(`  ... (+${hits.length - 35} more matches)`);
  }
}
