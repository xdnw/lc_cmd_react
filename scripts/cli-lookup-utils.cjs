const SIMPLIFY_RE = /[^a-z0-9]/g;

function normalizeToken(value) {
    return String(value || '').trim().toLowerCase();
}

function simplifyTypeKey(typeName) {
    let v = normalizeToken(typeName);
    v = v.replace(/^db/, '');
    v = v.replace(/wrapper$/, '');
    v = v.replace(/[0-9]/g, '');
    return v.replace(SIMPLIFY_RE, '');
}

function buildPlaceholderTypeAliasMap(validTypes) {
    const aliasToCanonical = new Map();

    const addAlias = (alias, canonical) => {
        const key = normalizeToken(alias);
        if (!key) return;
        const set = aliasToCanonical.get(key) || new Set();
        set.add(canonical);
        aliasToCanonical.set(key, set);
    };

    for (const type of validTypes) {
        addAlias(type, type);

        const simple = simplifyTypeKey(type);
        addAlias(simple, type);

        if (simple.endsWith('type')) {
            addAlias(simple.slice(0, -4), type);
        }

        const noDb = normalizeToken(type).replace(/^db/, '');
        const noWrapper = normalizeToken(type).replace(/wrapper$/, '');
        const noType = normalizeToken(type).replace(/type$/, '');
        addAlias(noDb, type);
        addAlias(noWrapper, type);
        addAlias(noType, type);
    }

    return aliasToCanonical;
}

function resolvePlaceholderType(inputType, validTypes) {
    const exact = validTypes.find((t) => t === inputType);
    if (exact) {
        return { type: exact, matchedBy: 'exact' };
    }

    const aliasMap = buildPlaceholderTypeAliasMap(validTypes);
    const key = normalizeToken(inputType);
    const matches = aliasMap.get(key);
    if (!matches || matches.size === 0) {
        return { type: null, matchedBy: 'none', aliasMap };
    }
    if (matches.size > 1) {
        return {
            type: null,
            matchedBy: 'ambiguous',
            matches: Array.from(matches).sort(),
            aliasMap,
        };
    }

    return { type: Array.from(matches)[0], matchedBy: 'alias', aliasMap };
}

function resolvePathCaseInsensitive(inputSegments, candidatePaths) {
    const want = inputSegments.join(' ').trim();
    if (!want) return [];

    const pathByLower = new Map();
    for (const path of candidatePaths) {
        pathByLower.set(path.toLowerCase(), path);
    }

    const exact = pathByLower.get(want.toLowerCase());
    if (exact) {
        return exact.split(' ');
    }

    return null;
}

function resolvePrefixCaseInsensitive(inputSegments, candidatePaths) {
    const want = inputSegments.join(' ').trim();
    if (!want) return [];

    const prefixByLower = new Map();
    for (const path of candidatePaths) {
        const parts = path.split(' ');
        for (let i = 1; i <= parts.length; i += 1) {
            const prefix = parts.slice(0, i).join(' ');
            prefixByLower.set(prefix.toLowerCase(), prefix);
        }
    }

    const resolved = prefixByLower.get(want.toLowerCase());
    if (!resolved) {
        return null;
    }
    return resolved.split(' ');
}

module.exports = {
    buildPlaceholderTypeAliasMap,
    normalizeToken,
    resolvePathCaseInsensitive,
    resolvePlaceholderType,
    resolvePrefixCaseInsensitive,
    simplifyTypeKey,
};
