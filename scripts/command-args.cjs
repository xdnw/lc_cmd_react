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
const getCommandArguments = cmdModule.getCommandArguments;
const getCompactCommands = cmdModule.getCompactCommands;
const { resolvePathCaseInsensitive } = require('./cli-lookup-utils.cjs');
if (!getCommandArguments) {
  console.error('getCommandArguments not found in src/utils/Command.ts');
  process.exit(2);
}

const argv = process.argv.slice(2);
if (argv.length === 0) {
  console.error('Usage: node ./scripts/command-args.cjs [--placeholders] <path segments...>');
  process.exit(2);
}

const includePlaceholders = argv.includes('--placeholders') || process.env.INCLUDE_PLACEHOLDERS === '1';
const flags = new Set(['--placeholders']);
const rawPathSegments = argv.filter(a => !flags.has(a));

const candidates = getCompactCommands({ includePlaceholders, recursive: true }).map((item) => item.path);
const pathSegments = resolvePathCaseInsensitive(rawPathSegments, candidates);
if (!pathSegments) {
  console.error('No command found for:', rawPathSegments.join(' '));
  process.exit(1);
}

const args = getCommandArguments(pathSegments, { includePlaceholders });
if (!args) {
  console.error('No command found for:', pathSegments.join(' '));
  process.exit(1);
}

console.log(`Arguments for: ${pathSegments.join(' ')}`);
for (const a of args) {
  const opt = a.optional ? '(optional)' : '(required)';
  const def = a.def ? ` default=${a.def}` : '';
  const choices = a.choices && a.choices.length ? ` choices=[${a.choices.join(',')}]` : '';
  console.log(` - ${a.name} ${opt} : ${a.type}${def}${choices} ${a.desc ? ' — ' + a.desc : ''}`);
}
