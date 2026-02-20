import { JSONValue } from "@/lib/internaltypes";
import { ColumnType, ConfigColumns, OrderIdx } from "./DataTable";
import { SortColumn } from "react-data-grid";

export function toSortColumns(sort: OrderIdx | OrderIdx[] | undefined): SortColumn[] {
    const sortArray = sort ? Array.isArray(sort) ? sort : [sort] : [];
    return sortArray.map((s) => ({ columnKey: String(s.idx), direction: s.dir === "asc" ? "ASC" : "DESC" }));
}

export interface SortOptions {
    // Where to place null/undefined
    nulls?: 'first' | 'last' | 'auto';  // auto: ASC -> last, DESC -> first
    // Where to place NaN for numeric columns
    nans?: 'first' | 'last' | 'auto';   // auto: ASC -> last, DESC -> first
    // Optional locale-aware string sorting
    locale?: string | string[];
    collatorOptions?: Intl.CollatorOptions; // e.g., { sensitivity: 'base', numeric: false }
}

const KEYED_SORT_THRESHOLD = 50000; // Tune this threshold as needed

export interface SortOptions {
    // Where to place null/undefined (strings/booleans/mixed only)
    nulls?: 'first' | 'last' | 'auto';  // auto: ASC -> last, DESC -> first
    // Where to place NaN for numeric columns (ignored for placement vs finite; finite always first)
    nans?: 'first' | 'last' | 'auto';   // auto: ASC -> last, DESC -> first
    // Optional locale-aware string sorting
    locale?: string | string[];
    collatorOptions?: Intl.CollatorOptions; // e.g., { sensitivity: 'base', numeric: false }
}

export function sortData(
    data: JSONValue[][],
    sortColumns: SortColumn[],
    columns: ConfigColumns[],
    options?: SortOptions
): {
    data: JSONValue[][];
    columns: ConfigColumns[];
} | undefined {
    const now = performance.now();
    try {
        const columnsCopy = [...columns];

        if (!Array.isArray(sortColumns) || sortColumns.length === 0) {
            return undefined;
        }

        // Fast column lookup
        const columnMap = new Map<number, ConfigColumns>();
        columnsCopy.forEach(col => columnMap.set(col.index, col));

        // Detect types for the columns we actually sort by
        const columnTypes = detectColumnTypesImproved(data, sortColumns, columnMap);

        // Analyze current sort state; bail early if already perfect match
        const sortState = analyzeSortState(sortColumns, columnsCopy, columnMap);
        if (sortState.perfectMatch) {
            return undefined;
        }

        const resolved = resolveSortOptions(options);

        let sortedData: JSONValue[][];

        if (sortState.partialMatch) {
            // Partial sort path
            const comps = createComparatorsImproved(sortColumns, columnTypes, columnMap, options);
            sortedData = [...data];
            sortPartially(sortedData, comps, sortState.matchedColumns);
        } else {
            // Full sort path: optionally use keyed path for large datasets if types are keyable
            const canKey = sortColumns.every(sc => {
                const t = columnTypes.get(Number(sc.columnKey)) || 'mixed';
                return t === 'number' || t === 'string' || t === 'boolean';
            });

            if (canKey && data.length >= KEYED_SORT_THRESHOLD) {
                sortedData = sortUsingPrecomputedKeys(data, sortColumns, columnTypes, resolved);
            } else {
                const comps = createComparatorsImproved(sortColumns, columnTypes, columnMap, options);
                sortedData = [...data];
                // Full sort using built-in Timsort (stable in modern engines)
                sortedData.sort((a, b) => compareRowsImproved(a, b, comps));
            }
        }

        // Update column sort info metadata
        updateColumnSortInfo(columnsCopy, sortColumns, columnMap);

        return { data: sortedData, columns: columnsCopy };
    } finally {
        const dur = performance.now() - now;
        console.log(`Sorting took ${dur.toFixed(2)} ms for ${data.length} rows and ${sortColumns.length} sort columns.`);
    }
}

/* ---------- Type detection ---------- */

function detectColumnTypesImproved(
    data: JSONValue[][],
    sortColumns: SortColumn[],
    columnMap: Map<number, ConfigColumns>
): Map<number, ColumnType> {
    const sampleSize = Math.min(100, data.length);
    const types = new Map<number, ColumnType>();

    if (data.length === 0) {
        // No data: rely on any configured type or mark mixed
        for (const sc of sortColumns) {
            const idx = Number(sc.columnKey);
            const col = columnMap.get(idx);
            const t = (col?.type as ColumnType) || 'mixed';
            types.set(idx, t);
            if (col) col.type = t;
        }
        return types;
    }

    for (const sc of sortColumns) {
        const idx = Number(sc.columnKey);
        const col = columnMap.get(idx);
        let decided: ColumnType | null = col?.type || null;

        if (!decided) {
            let sawNumber = false;
            let sawString = false;
            let sawBoolean = false;
            let sawOther = false;

            for (let i = 0; i < sampleSize; i++) {
                const row = data[i];
                if (!row) break;
                const v = row[idx];

                if (v == null) continue; // null/undefined do not force type
                const t = typeof v;
                if (t === 'number') sawNumber = true;
                else if (t === 'string') sawString = true;
                else if (t === 'boolean') sawBoolean = true;
                else sawOther = true;

                // Early exit if mixed is inevitable
                const distinct = (sawNumber ? 1 : 0) + (sawString ? 1 : 0) + (sawBoolean ? 1 : 0) + (sawOther ? 1 : 0);
                if (distinct > 1 || sawOther) {
                    decided = 'mixed';
                    break;
                }
            }

            if (!decided) {
                if (sawNumber) decided = 'number';
                else if (sawString) decided = 'string';
                else if (sawBoolean) decided = 'boolean';
                else decided = 'mixed';
            }
        }

        const finalType = decided as ColumnType;
        types.set(idx, finalType);
        if (col) col.type = finalType;
    }

    return types;
}

/* ---------- Comparators ---------- */

type Comparator = {
    index: number;
    compare: (a: JSONValue, b: JSONValue) => number;
};

function createComparatorsImproved(
    sortColumns: SortColumn[],
    columnTypes: Map<number, ColumnType>,
    columnMap: Map<number, ConfigColumns>,
    options?: SortOptions
): Comparator[] {
    const resolved = resolveSortOptions(options);

    return sortColumns.map(sc => {
        const index = Number(sc.columnKey);
        const type = columnTypes.get(index) || columnMap.get(index)?.type || 'mixed';
        const dir = sc.direction === 'ASC' ? 1 : -1;

        switch (type) {
            case 'number':
                return { index, compare: makeNumberComparator(dir, resolved) };
            case 'string':
                return { index, compare: makeStringComparator(dir, resolved) };
            case 'boolean':
                return { index, compare: makeBooleanComparator(dir, resolved) };
            default:
                return { index, compare: makeMixedComparator(dir, resolved) };
        }
    });
}

type ResolvedOptions = {
    nulls: 'first' | 'last' | 'auto';
    nans: 'first' | 'last' | 'auto';
    collator?: Intl.Collator;
};

function resolveSortOptions(options?: SortOptions): ResolvedOptions {
    const nulls = options?.nulls ?? 'auto';
    const nans = options?.nans ?? 'auto';
    const collator = (options?.locale || options?.collatorOptions)
        ? new Intl.Collator(options.locale, options.collatorOptions)
        : undefined;

    return { nulls, nans, collator };
}

/* ---------- Number comparator with finite-first rule ---------- */
/* For numeric columns, finite values always come before any non-finite
   (NaN, ±Infinity) and before null/undefined and non-number values,
   for BOTH ASC and DESC. */

const enum NumCode { Finite = 0, NegInf = 1, PosInf = 2, NaN = 3, Nullish = 4 }

function classifyNumber(v: JSONValue): NumCode {
    if (v == null) return NumCode.Nullish;
    if (typeof v !== 'number') return NumCode.Nullish; // non-number in number column -> treat as nullish
    if (Number.isNaN(v)) return NumCode.NaN;
    if (v === Infinity) return NumCode.PosInf;
    if (v === -Infinity) return NumCode.NegInf;
    // Only finite numbers reach here
    return NumCode.Finite;
}

// Deterministic sub-order inside the non-finite tail
const NON_FINITE_SUBRANK: number[] = (() => {
    const r = new Array(5).fill(0);
    r[NumCode.NegInf] = 0;
    r[NumCode.PosInf] = 1;
    r[NumCode.NaN] = 2;
    r[NumCode.Nullish] = 3;
    return r;
})();

function makeNumberComparator(dir: 1 | -1, _opts: ResolvedOptions) {
    // Finite numbers always come first; dir only affects the finite block.
    return (a: JSONValue, b: JSONValue): number => {
        const ca = classifyNumber(a);
        const cb = classifyNumber(b);

        const aFinite = ca === NumCode.Finite;
        const bFinite = cb === NumCode.Finite;

        if (aFinite !== bFinite) {
            // Finite always before non-finite, regardless of direction
            return aFinite ? -1 : 1;
        }

        if (aFinite) {
            const va = a as number;
            const vb = b as number;
            if (va < vb) return dir === 1 ? -1 : 1;
            if (va > vb) return dir === 1 ? 1 : -1;
            return 0;
        }

        // Both non-finite: use deterministic order within the tail
        if (ca !== cb) return NON_FINITE_SUBRANK[ca] - NON_FINITE_SUBRANK[cb];
        return 0;
    };
}

/* ---------- String comparator with null handling ---------- */

function makeStringComparator(dir: 1 | -1, opts: ResolvedOptions) {
    const nullsFirst = opts.nulls === 'first' || (opts.nulls === 'auto' && dir === -1);
    const collator = opts.collator;

    return (a: JSONValue, b: JSONValue): number => {
        const aNull = a == null;
        const bNull = b == null;
        if (aNull || bNull) {
            if (aNull && bNull) return 0;
            return aNull ? (nullsFirst ? -1 : 1) : (nullsFirst ? 1 : -1);
        }

        const sa = typeof a === 'string' ? a : String(a as unknown);
        const sb = typeof b === 'string' ? b : String(b as unknown);

        const cmp = collator ? collator.compare(sa, sb) : sa.localeCompare(sb);
        if (cmp !== 0) return dir === 1 ? cmp : -cmp;
        return 0;
    };
}

/* ---------- Boolean comparator with null handling ---------- */

function makeBooleanComparator(dir: 1 | -1, opts: ResolvedOptions) {
    const nullsFirst = opts.nulls === 'first' || (opts.nulls === 'auto' && dir === -1);

    return (a: JSONValue, b: JSONValue): number => {
        const aNull = a == null;
        const bNull = b == null;
        if (aNull || bNull) {
            if (aNull && bNull) return 0;
            return aNull ? (nullsFirst ? -1 : 1) : (nullsFirst ? 1 : -1);
        }

        const ba = Boolean(a);
        const bb = Boolean(b);
        if (ba === bb) return 0;

        // false < true in ASC
        if (dir === 1) return ba ? 1 : -1;
        return ba ? -1 : 1;
    };
}

/* ---------- Mixed comparator (robust, consistent ordering) ---------- */

function makeMixedComparator(dir: 1 | -1, opts: ResolvedOptions) {
    const numCmp = makeNumberComparator(dir, opts);
    const strCmp = makeStringComparator(dir, opts);
    const boolCmp = makeBooleanComparator(dir, opts);

    // Type precedence when types differ (excluding null/undefined handled inside)
    // ASC: number < string < boolean < object/other
    // DESC: reversed
    const ascTypeOrder = new Map<string, number>([
        ['number', 0],
        ['string', 1],
        ['boolean', 2],
        ['object', 3]
    ]);
    const descTypeOrder = new Map<string, number>([
        ['object', 0],
        ['boolean', 1],
        ['string', 2],
        ['number', 3]
    ]);
    const typeRankMap = dir === 1 ? ascTypeOrder : descTypeOrder;

    return (a: JSONValue, b: JSONValue): number => {
        const aNull = a == null;
        const bNull = b == null;
        if (aNull || bNull) {
            if (aNull && bNull) return 0;
            const nullsFirst = opts.nulls === 'first' || (opts.nulls === 'auto' && dir === -1);
            return aNull ? (nullsFirst ? -1 : 1) : (nullsFirst ? 1 : -1);
        }

        const ta = typeof a;
        const tb = typeof b;

        if (ta === 'number' && tb === 'number') {
            return numCmp(a, b);
        } else if (ta === 'string' && tb === 'string') {
            return strCmp(a, b);
        } else if (ta === 'boolean' && tb === 'boolean') {
            return boolCmp(a, b);
        }

        // Mixed types: ensure deterministic, consistent ordering
        const ra = typeRankMap.get(ta) ?? 3;
        const rb = typeRankMap.get(tb) ?? 3;
        if (ra !== rb) return ra - rb;

        // Same precedence bucket; fallback to string representation
        const sa = String(a as unknown);
        const sb = String(b as unknown);
        if (sa === sb) return 0;
        const cmp = opts.collator ? opts.collator.compare(sa, sb) : sa.localeCompare(sb);
        return dir === 1 ? cmp : -cmp;
    };
}

/* ---------- Sorting helpers ---------- */

function compareRowsImproved(
    rowA: JSONValue[],
    rowB: JSONValue[],
    comparators: Comparator[]
): number {
    for (let i = 0; i < comparators.length; i++) {
        const c = comparators[i];
        const cmp = c.compare(rowA[c.index], rowB[c.index]);
        if (cmp !== 0) return cmp;
    }
    return 0; // Stable tie
}

function areRowsEqual(
    rowA: JSONValue[],
    rowB: JSONValue[],
    comparators: Comparator[]
): boolean {
    for (let i = 0; i < comparators.length; i++) {
        const c = comparators[i];
        if (c.compare(rowA[c.index], rowB[c.index]) !== 0) {
            return false;
        }
    }
    return true;
}

function insertionSort(
    data: JSONValue[][],
    startIdx: number,
    endIdx: number,
    comparators: Comparator[]
): void {
    for (let i = startIdx + 1; i < endIdx; i++) {
        const current = data[i];
        let j = i - 1;
        while (j >= startIdx && compareRowsImproved(data[j], current, comparators) > 0) {
            data[j + 1] = data[j];
            j--;
        }
        data[j + 1] = current;
    }
}

function sortPartially(
    data: JSONValue[][],
    comparators: Comparator[],
    matchedColumns: number
): void {
    const matched = comparators.slice(0, matchedColumns);
    const remaining = comparators.slice(matchedColumns);
    if (remaining.length === 0) return;

    let start = 0;
    while (start < data.length) {
        let end = start + 1;
        while (end < data.length && areRowsEqual(data[start], data[end], matched)) {
            end++;
        }

        // Sort only the group [start, end)
        const size = end - start;
        if (size > 1) {
            if (size <= 10) {
                insertionSort(data, start, end, remaining);
            } else {
                const slice = data.slice(start, end);
                slice.sort((a, b) => compareRowsImproved(a, b, remaining));
                for (let i = 0; i < slice.length; i++) data[start + i] = slice[i];
            }
        }
        start = end;
    }
}

/* ---------- Sort state + column metadata ---------- */

function analyzeSortState(
    sortColumns: SortColumn[],
    columns: ConfigColumns[],
    columnMap: Map<number, ConfigColumns>
): {
    perfectMatch: boolean;
    partialMatch: boolean;
    matchedColumns: number;
} {
    let matchedColumns = 0;

    for (let i = 0; i < sortColumns.length; i++) {
        const sc = sortColumns[i];
        const idx = Number(sc.columnKey);
        const configCol = columnMap.get(idx);
        const expectedDir = sc.direction === 'ASC' ? 'asc' : 'desc';

        if (!configCol?.sorted ||
            configCol.sorted[0] !== expectedDir ||
            configCol.sorted[1] !== i) {
            break;
        }
        matchedColumns++;
    }

    let hasExtra = false;
    for (const col of columns) {
        if (col.sorted && col.sorted[1] >= matchedColumns) {
            hasExtra = true;
            break;
        }
    }

    return {
        perfectMatch: matchedColumns === sortColumns.length && !hasExtra,
        partialMatch: matchedColumns > 0,
        matchedColumns
    };
}

function updateColumnSortInfo(
    columns: ConfigColumns[],
    sortColumns: SortColumn[],
    columnMap: Map<number, ConfigColumns>
): void {
    for (const col of columns) col.sorted = undefined;
    sortColumns.forEach((sc, priority) => {
        const idx = Number(sc.columnKey);
        const cfg = columnMap.get(idx);
        if (cfg) cfg.sorted = [sc.direction === 'ASC' ? 'asc' : 'desc', priority];
    });
}

/* ---------- Keyed path for large datasets ---------- */

function sortUsingPrecomputedKeys(
    data: JSONValue[][],
    sortColumns: SortColumn[],
    columnTypes: Map<number, ColumnType>,
    opts: ResolvedOptions
): JSONValue[][] {
    const n = data.length;
    const m = sortColumns.length;
    if (n <= 1 || m === 0) return data.slice();

    // Precompute keys per sort column
    type KeySet =
        | { kind: 'number'; dir: 1 | -1; codes: Uint8Array; vals: Float64Array }
        | { kind: 'string'; dir: 1 | -1; strs: string[]; nulls: Uint8Array; nullsFirst: boolean }
        | { kind: 'boolean'; dir: 1 | -1; bools: Uint8Array; nulls: Uint8Array; nullsFirst: boolean };

    const keysets: KeySet[] = [];
    const collator = opts.collator;

    for (let k = 0; k < m; k++) {
        const sc = sortColumns[k];
        const idx = Number(sc.columnKey);
        const dir: 1 | -1 = sc.direction === 'ASC' ? 1 : -1;
        const t = (columnTypes.get(idx) || 'mixed') as ColumnType;

        if (t === 'number') {
            const codes = new Uint8Array(n);
            const vals = new Float64Array(n);
            for (let i = 0; i < n; i++) {
                const v = data[i][idx];
                const c = classifyNumber(v);
                codes[i] = c;
                vals[i] = c === NumCode.Finite ? (v as number) : 0;
            }
            keysets.push({ kind: 'number', dir, codes, vals });
        } else if (t === 'string') {
            const strs = new Array<string>(n);
            const nulls = new Uint8Array(n);
            const nullsFirst = opts.nulls === 'first' || (opts.nulls === 'auto' && dir === -1);
            for (let i = 0; i < n; i++) {
                const v = data[i][idx];
                if (v == null) {
                    nulls[i] = 1;
                    strs[i] = '';
                } else {
                    nulls[i] = 0;
                    strs[i] = typeof v === 'string' ? v : String(v as unknown);
                }
            }
            keysets.push({ kind: 'string', dir, strs, nulls, nullsFirst });
        } else if (t === 'boolean') {
            const bools = new Uint8Array(n);
            const nulls = new Uint8Array(n);
            const nullsFirst = opts.nulls === 'first' || (opts.nulls === 'auto' && dir === -1);
            for (let i = 0; i < n; i++) {
                const v = data[i][idx];
                if (v == null) {
                    nulls[i] = 1;
                    bools[i] = 0;
                } else {
                    nulls[i] = 0;
                    bools[i] = v === true ? 1 : 0;
                }
            }
            keysets.push({ kind: 'boolean', dir, bools, nulls, nullsFirst });
        } else {
            // Fallback: not effective to key 'mixed' columns
            const comps = createComparatorsImproved(sortColumns, columnTypes, new Map(), undefined);
            return data.slice().sort((a, b) => compareRowsImproved(a, b, comps));
        }
    }

    const idxs = new Array<number>(n);
    for (let i = 0; i < n; i++) idxs[i] = i;

    const cmpIdx = (ia: number, ib: number): number => {
        for (let k = 0; k < keysets.length; k++) {
            const ks = keysets[k];
            if (ks.kind === 'number') {
                const ca = ks.codes[ia] as NumCode;
                const cb = ks.codes[ib] as NumCode;
                const aFinite = ca === NumCode.Finite;
                const bFinite = cb === NumCode.Finite;

                if (aFinite !== bFinite) return aFinite ? -1 : 1;

                if (aFinite) {
                    const av = ks.vals[ia], bv = ks.vals[ib];
                    if (av < bv) return ks.dir === 1 ? -1 : 1;
                    if (av > bv) return ks.dir === 1 ? 1 : -1;
                    // else equal -> continue
                } else {
                    if (ca !== cb) return NON_FINITE_SUBRANK[ca] - NON_FINITE_SUBRANK[cb];
                }
            } else if (ks.kind === 'string') {
                const aNull = ks.nulls[ia] === 1;
                const bNull = ks.nulls[ib] === 1;
                if (aNull || bNull) {
                    if (aNull && bNull) continue;
                    return aNull ? (ks.nullsFirst ? -1 : 1) : (ks.nullsFirst ? 1 : -1);
                }
                const sa = ks.strs[ia];
                const sb = ks.strs[ib];
                const base = collator ? collator.compare(sa, sb) : sa.localeCompare(sb);
                if (base !== 0) return ks.dir === 1 ? base : -base;
            } else {
                const aNull = ks.nulls[ia] === 1;
                const bNull = ks.nulls[ib] === 1;
                if (aNull || bNull) {
                    if (aNull && bNull) continue;
                    return aNull ? (ks.nullsFirst ? -1 : 1) : (ks.nullsFirst ? 1 : -1);
                }
                const av = ks.bools[ia], bv = ks.bools[ib];
                if (av !== bv) {
                    // false < true in ASC
                    if (ks.dir === 1) return av - bv;
                    else return bv - av;
                }
            }
        }
        // Keep overall stability
        return ia - ib;
    };

    idxs.sort(cmpIdx);
    const out = new Array<JSONValue[]>(n);
    for (let i = 0; i < n; i++) out[i] = data[idxs[i]];
    return out;
}