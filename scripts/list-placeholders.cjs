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
const { resolvePlaceholderType } = require('./cli-lookup-utils.cjs');
if (!CM) {
    console.error('CM not found in src/utils/Command.ts');
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
const flags = new Set(['--keyword', '-k']);
const positionals = argv.filter((a, idx) => !flags.has(a) && !keywordArg.consumed.has(idx));

if (positionals.length === 0) {
    console.error('Usage: node ./scripts/list-placeholders.cjs <type> [--keyword <regex>]');
    process.exit(2);
}

const rawType = positionals[0];
const positionalKeyword = !keywordArg.value && positionals.length > 1 ? positionals.slice(1).join(' ') : null;
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
let list = phMap.getCommands().map(ph => ({
    path: ph.getPathString(),
    desc: ph.getDescShort(),
    args: ph.getArguments().map(a => a.name)
}));

const keywordValue = keywordArg.value || positionalKeyword;

if (keywordValue) {
    let keywordRe;
    try {
        keywordRe = new RegExp(keywordValue, 'i');
    } catch (err) {
        console.error(`Invalid regex for keyword: ${keywordValue}`);
        console.error(String(err));
        process.exit(2);
    }
    list = list.filter(item => keywordRe.test(item.path) || keywordRe.test(item.desc || ''));
    console.error(`Filtering by keyword regex: /${keywordValue}/i`);
}

list.sort((a, b) => a.path.localeCompare(b.path));
if (list.length === 0) {
    process.exit(0);
}

const pathWidth = Math.min(Math.max(...list.map(l => l.path.length), 20), 80);
for (const item of list) {
    const desc = (item.desc || '').split('\n')[0];
    const args = item.args.length ? `args: ${item.args.join(',')}` : '';
    console.log(item.path.padEnd(pathWidth) + ' | ' + desc + (args ? ' | ' + args : ''));
}
