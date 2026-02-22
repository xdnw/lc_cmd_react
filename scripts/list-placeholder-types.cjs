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
    buildPlaceholderTypeAliasMap,
    simplifyTypeKey,
} = require('./cli-lookup-utils.cjs');

if (!CM) {
    console.error('CM not found in src/utils/Command.ts');
    process.exit(2);
}

const valid = Object.keys(CM.data.placeholders).sort();
const aliasMap = buildPlaceholderTypeAliasMap(valid);

for (const type of valid) {
    const aliases = new Set([type.toLowerCase()]);
    const simple = simplifyTypeKey(type);
    const preferredAliases = [simple, simple.endsWith('type') ? simple.slice(0, -4) : null].filter(Boolean);

    for (const alias of preferredAliases) {
        const matches = aliasMap.get(alias);
        if (matches && matches.size === 1 && matches.has(type)) aliases.add(alias);
    }

    // Include aliases that resolve uniquely to this type.
    for (const [alias, matches] of aliasMap.entries()) {
        if (matches.size === 1 && matches.has(type)) aliases.add(alias);
    }

    const formattedAliases = Array.from(aliases)
        .filter((a) => a && a !== type.toLowerCase())
        .sort()
        .join(', ');

    if (formattedAliases) {
        console.log(`${type} | aliases: ${formattedAliases}`);
    } else {
        console.log(type);
    }
}
