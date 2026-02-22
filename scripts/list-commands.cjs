#!/usr/bin/env node
const path = require('path');
const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (typeof request === 'string' && request.startsWith('@/')) {
    const rel = path.join(__dirname, '..', 'src', request.slice(2));
    return origResolve.call(this, rel, parent, isMain, options);
  }
  return origResolve.call(this, request, parent, isMain, options);
};

const jiti = require('jiti')(__filename);
const cmdModule = jiti('../src/utils/Command.ts');
const getCompactCommands = cmdModule.getCompactCommands;
const { resolvePrefixCaseInsensitive } = require('./cli-lookup-utils.cjs');
if (!getCompactCommands) {
  console.error('getCompactCommands not found in src/utils/Command.ts');
  process.exit(2);
}

function parseKeywordArg(argv) {
  const idx = argv.findIndex(a => a === '--keyword' || a === '-k');
  if (idx !== -1) {
    if (idx + 1 >= argv.length) {
      console.error('Missing value for --keyword');
      process.exit(2);
    }
    return { value: argv[idx + 1], consumed: new Set([idx, idx + 1]) };
  }

  const inlineIdx = argv.findIndex(a => a.startsWith('keyword=') || a.startsWith('k='));
  if (inlineIdx !== -1) {
    const raw = argv[inlineIdx];
    const value = raw.includes('=') ? raw.slice(raw.indexOf('=') + 1) : '';
    if (!value) {
      console.error('Missing value for keyword=<regex>');
      process.exit(2);
    }
    return { value, consumed: new Set([inlineIdx]) };
  }

  if (process.env.KEYWORD_REGEX) {
    return { value: process.env.KEYWORD_REGEX, consumed: new Set() };
  }

  return { value: null, consumed: new Set() };
}

const argv = process.argv.slice(2);
const keywordArg = parseKeywordArg(argv);
const includePlaceholders = argv.includes('--placeholders') || process.env.INCLUDE_PLACEHOLDERS === '1';
const recursive = argv.includes('--recursive') || argv.includes('-r');
const flags = new Set(['--placeholders', '--recursive', '-r', '--keyword', '-k']);
const rawPathSegments = argv.filter((a, idx) => !flags.has(a) && !keywordArg.consumed.has(idx));

let pathSegments = rawPathSegments;
if (rawPathSegments.length > 0) {
  const candidates = getCompactCommands({ includePlaceholders, recursive: true }).map((item) => item.path);
  const resolved = resolvePrefixCaseInsensitive(rawPathSegments, candidates);
  if (!resolved) {
    console.error(`No command path prefix found for: ${rawPathSegments.join(' ')}`);
    process.exit(1);
  }
  pathSegments = resolved;
}

let list = getCompactCommands({ includePlaceholders, path: pathSegments.length ? pathSegments : undefined, recursive });

if (keywordArg.value) {
  let keywordRe;
  try {
    keywordRe = new RegExp(keywordArg.value, 'i');
  } catch (err) {
    console.error(`Invalid regex for --keyword: ${keywordArg.value}`);
    console.error(String(err));
    process.exit(2);
  }
  list = list.filter(item => keywordRe.test(item.path) || keywordRe.test(item.desc || ''));
}

if (pathSegments.length > 0) {
  console.error(`Listing ${recursive ? 'descendants' : 'subcommands'} of: ${pathSegments.join(' ')}`);
}

if (keywordArg.value) {
  console.error(`Filtering by keyword regex: /${keywordArg.value}/i`);
}

// print a compact aligned table: PATH | DESC | ARGS
if (list.length === 0) {
  process.exit(0);
}

const pathWidth = Math.min(Math.max(...list.map(l => l.path.length), 20), 80);
for (const item of list) {
  const desc = (item.desc || '').split('\n')[0];
  const args = item.args.length ? `args: ${item.args.join(',')}` : '';
  console.log(item.path.padEnd(pathWidth) + ' | ' + desc + (args ? ' | ' + args : ''));
}
