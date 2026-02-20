#!/usr/bin/env node
const path = require('path');
const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  if (typeof request === 'string' && request.startsWith('@/')) {
    const rel = path.join(__dirname, '..', 'src', request.slice(2));
    return origResolve.call(this, rel, parent, isMain, options);
  }
  return origResolve.call(this, request, parent, isMain, options);
};

const jiti = require('jiti')(__filename);
const cmdModule = jiti('../src/utils/Command.ts');
const getCompactCommands = cmdModule.getCompactCommands;
if (!getCompactCommands) {
  console.error('getCompactCommands not found in src/utils/Command.ts');
  process.exit(2);
}

const argv = process.argv.slice(2);
const includePlaceholders = argv.includes('--placeholders') || process.env.INCLUDE_PLACEHOLDERS === '1';
const recursive = argv.includes('--recursive') || argv.includes('-r');
const flags = new Set(['--placeholders', '--recursive', '-r']);
const pathSegments = argv.filter(a => !flags.has(a));

const list = getCompactCommands({ includePlaceholders, path: pathSegments.length ? pathSegments : undefined, recursive });

if (pathSegments.length > 0) {
  console.error(`Listing ${recursive ? 'descendants' : 'subcommands'} of: ${pathSegments.join(' ')}`);
}

// print a compact aligned table: PATH | DESC | ARGS
const pathWidth = Math.min(Math.max(...list.map(l => l.path.length), 20), 80);
for (const item of list) {
  const desc = (item.desc || '').split('\n')[0];
  const args = item.args.length ? `args: ${item.args.join(',')}` : '';
  console.log(item.path.padEnd(pathWidth) + ' | ' + desc + (args ? ' | ' + args : ''));
}
