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
const CM = cmdModule.CM;
const {
    resolvePathCaseInsensitive,
    resolvePlaceholderType
} = require('./cli-lookup-utils.cjs');
if (!CM) {
    console.error('CM not found in src/utils/Command.ts');
    process.exit(2);
}

const argv = process.argv.slice(2);
if (argv.length < 2) {
    console.error('Usage: node ./scripts/placeholder-args.cjs <type> <path segments...>');
    process.exit(2);
}

const [rawType, ...rawPathSegments] = argv;
const valid = Object.keys(CM.data.placeholders).sort();
const resolvedType = resolvePlaceholderType(rawType, valid);
if (!resolvedType.type) {
    console.error(`Unknown placeholder type: ${rawType}`);
    if (resolvedType.matchedBy === 'ambiguous') {
        console.error(`Ambiguous type alias. Could refer to: ${resolvedType.matches.join(', ')}`);
    }
    console.error(`Valid types: ${valid.join(', ')}`);
    process.exit(1);
}

const type = resolvedType.type;

const phMap = CM.placeholders(type);
const phPaths = phMap.getPlaceholderPaths().map(p => p.join(' '));
const pathSegments = resolvePathCaseInsensitive(rawPathSegments, phPaths);
if (!pathSegments) {
    console.error(`No placeholder command found for: ${type} ${rawPathSegments.join(' ')}`);
    process.exit(1);
}

const pathStr = pathSegments.join(' ');

const ph = phMap.get(pathSegments);
const args = ph.getArguments().map(a => ({
    name: a.name,
    optional: a.arg.optional,
    desc: a.arg.desc,
    type: a.arg.type,
    def: a.arg.def,
    choices: a.arg.choices
}));

console.log(`Arguments for placeholder: ${type} ${pathStr}`);
for (const a of args) {
    const opt = a.optional ? '(optional)' : '(required)';
    const def = a.def ? ` default=${a.def}` : '';
    const choices = a.choices && a.choices.length ? ` choices=[${a.choices.join(',')}]` : '';
    console.log(` - ${a.name} ${opt} : ${a.type}${def}${choices} ${a.desc ? ' - ' + a.desc : ''}`);
}
