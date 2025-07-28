import { JSONValue } from "@/lib/internaltypes";
import { ColumnType, ConfigColumns, OrderIdx } from "./DataTable";
import { SortColumn } from "react-data-grid";

export function toSortColumns(sort: OrderIdx | OrderIdx[] | undefined): SortColumn[] {
    const sortArray = sort ? Array.isArray(sort) ? sort : [sort] : [];
    return sortArray.map((s) => ({ columnKey: String(s.idx), direction: s.dir === "asc" ? "ASC" : "DESC" }));
}

export function sortData(
    data: JSONValue[][],
    sortColumns: SortColumn[],
    columns: ConfigColumns[]
): {
    data: JSONValue[][];
    columns: ConfigColumns[];
} | undefined {
    const columnsCopy = [...columns];
    // If no sort columns, return original data
    if (sortColumns.length === 0) {
        return undefined;
    }

    // Create fast lookup map for columns by index
    const columnMap = new Map<number, ConfigColumns>();
    columnsCopy.forEach(col => columnMap.set(col.index, col));

    // Detect column types and create specialized comparators
    const comparators = createComparators(data, sortColumns, columnMap);

    // Analyze current sort state with fast lookups
    const sortState = analyzeSortState(sortColumns, columnsCopy, columnMap);

    // If data is already correctly sorted, return as-is
    if (sortState.perfectMatch) {
        return undefined;
    }

    // Create a copy to avoid mutating the original data
    const sortedData = [...data];

    if (sortState.partialMatch) {
        // Partial match - only sort within matched groups
        sortPartially(sortedData, comparators, sortState.matchedColumns);
    } else {
        const timing = performance.now();
        // Full resort needed
        sortFully(sortedData, comparators, columnMap);
        const timingEnd = performance.now();
    }

    // Update column config with new sort information
    updateColumnSortInfo(columnsCopy, sortColumns, columnMap);

    return { data: sortedData, columns: columnsCopy };
}

// Create optimized comparators for each sort column
function createComparators(
    data: JSONValue[][],
    sortColumns: SortColumn[],
    columnMap: Map<number, ConfigColumns>
) {
    // Detect column types from data
    const columnTypes = detectColumnTypes(data, sortColumns, columnMap);

    // Create specialized comparators for each column
    return sortColumns.map(sortCol => {
        const colIndex = Number(sortCol.columnKey);
        const columnType = columnTypes.get(colIndex) || 'mixed';
        return {
            index: colIndex,
            compare: createTypedComparator(columnType),
            direction: sortCol.direction === 'ASC' ? 1 : -1,
            columnTypes: columnTypes,
        };
    });
}

// Detect types of columns in the dataset
function detectColumnTypes(data: JSONValue[][], sortColumns: SortColumn[], columnMap: Map<number, ConfigColumns>): Map<number, ColumnType> {
    const columnTypes = new Map<number, ColumnType>();
    const sampleSize = Math.min(100, data.length); // Check first 100 rows or all rows

    if (data.length === 0) return columnTypes;

    sortColumns.forEach(sortCol => {
        const colIndex = Number(sortCol.columnKey);
        let type: ColumnType | null = null;
        const column = columnMap.get(colIndex)!;
        if (column.type) {
            type = column.type;
        } else {
            // Detect column type from data samples
            for (let i = 0; i < sampleSize; i++) {
                if (i >= data.length) break;

                const value = data[i][colIndex];
                if (value == null) continue; // Skip null/undefined

                const valueType = typeof value;
                if (type === null) {
                    if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
                        type = valueType as ColumnType;
                    } else {
                        type = 'mixed';
                        break;
                    }
                } else if (type !== valueType) {
                    type = 'mixed'; // Mixed types detected
                    break;
                }
            }
        }
        const typeFinal = type ?? 'mixed';
        if (!column) {
            console.log(`Column ${colIndex} not found`, JSON.stringify(columnMap));
        }
        column.type = typeFinal; // Update column type in config
        columnTypes.set(colIndex, typeFinal);
    });

    return columnTypes;
}

// Fast state analysis with O(1) lookups
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

    // Check how many leading columns match the current sort state
    for (let i = 0; i < sortColumns.length; i++) {
        const sortCol = sortColumns[i];
        const colIndex = Number(sortCol.columnKey);
        const configCol = columnMap.get(colIndex);

        if (!configCol?.sorted ||
            configCol.sorted[0] !== (sortCol.direction === 'ASC' ? 'asc' : 'desc') ||
            configCol.sorted[1] !== i) {
            break;
        }

        matchedColumns++;
    }

    // Check for any extra sort columns in the config (using efficient loop)
    let hasExtraColumns = false;
    for (const col of columns) {
        if (col.sorted && col.sorted[1] >= matchedColumns) {
            hasExtraColumns = true;
            break;
        }
    }

    return {
        perfectMatch: matchedColumns === sortColumns.length && !hasExtraColumns,
        partialMatch: matchedColumns > 0,
        matchedColumns
    };
}

// Optimized partial sorting
function sortPartially(
    data: JSONValue[][],
    comparators: Array<{ index: number, compare: (a: JSONValue, b: JSONValue) => number, direction: number }>,
    matchedColumns: number
): void {
    const matchedComparators = comparators.slice(0, matchedColumns);
    const remainingComparators = comparators.slice(matchedColumns);

    // No need to sort if no remaining sort criteria
    if (remainingComparators.length === 0) return;

    let startIdx = 0;

    while (startIdx < data.length) {
        // Find the end of the current equal-valued group
        let endIdx = startIdx + 1;

        // Find rows with matching values in the already-sorted columns
        while (endIdx < data.length && areRowsEqual(data[startIdx], data[endIdx], matchedComparators)) {
            endIdx++;
        }

        // If group has multiple rows, sort it by the remaining columns
        const groupSize = endIdx - startIdx;
        if (groupSize > 1) {
            if (groupSize <= 10) {
                // Use insertion sort for small groups (more efficient for nearly sorted data)
                insertionSort(data, startIdx, endIdx, remainingComparators);
            } else {
                // Sort this subsection
                const subSection = data.slice(startIdx, endIdx);

                // Use optimized comparison function for multi-column sort
                subSection.sort((rowA, rowB) => compareRows(rowA, rowB, remainingComparators));

                // Put sorted section back into original array
                for (let i = 0; i < subSection.length; i++) {
                    data[startIdx + i] = subSection[i];
                }
            }
        }

        startIdx = endIdx;
    }
}

// Fast row equality check
function areRowsEqual(
    rowA: JSONValue[],
    rowB: JSONValue[],
    comparators: Array<{ index: number, compare: (a: JSONValue, b: JSONValue) => number, direction: number }>
): boolean {
    for (const comp of comparators) {
        if (comp.compare(rowA[comp.index], rowB[comp.index]) !== 0) {
            return false;
        }
    }
    return true;
}

// Compare rows using multiple criteria
function compareRows(
    rowA: JSONValue[],
    rowB: JSONValue[],
    comparators: Array<{ index: number, compare: (a: JSONValue, b: JSONValue) => number, direction: number }>
): number {
    for (const comp of comparators) {
        const comparison = comp.compare(rowA[comp.index], rowB[comp.index]) * comp.direction;
        if (comparison !== 0) {
            return comparison;
        }
    }
    return 0;
}

// Insertion sort for small groups
function insertionSort(
    data: JSONValue[][],
    startIdx: number,
    endIdx: number,
    comparators: Array<{ index: number, compare: (a: JSONValue, b: JSONValue) => number, direction: number }>
): void {
    for (let i = startIdx + 1; i < endIdx; i++) {
        const current = data[i];
        let j = i - 1;

        while (j >= startIdx) {
            const comparison = compareRows(data[j], current, comparators);
            if (comparison > 0) {
                data[j + 1] = data[j];
                j--;
            } else {
                break;
            }
        }

        data[j + 1] = current;
    }
}

// Create a type-specific comparison function
function createTypedComparator(type: ColumnType) {
    switch (type) {
        case 'number':
            return (a: JSONValue, b: JSONValue): number => {
                return (a as number ?? 0) - (b as number ?? 0);
            };

        case 'string':
            return (a: JSONValue, b: JSONValue): number => {
                return (a as string ?? "").localeCompare(b as string ?? "");
            };

        case 'boolean':
            return (a: JSONValue, b: JSONValue): number => {
                if (a == null && b == null) return 0;
                if (a == null) return -1;
                if (b == null) return 1;
                return (a as boolean) === (b as boolean) ? 0 : (a as boolean) ? 1 : -1;
            };

        default: // mixed
            return (a: JSONValue, b: JSONValue): number => {
                if (a == null && b == null) return 0;
                if (a == null) return -1;
                if (b == null) return 1;

                const typeA = typeof a;
                const typeB = typeof b;

                if (typeA === typeB) {
                    if (typeA === 'string') return (a as string).localeCompare(b as string);
                    if (typeA === 'number') return (a as number) - (b as number);
                    if (typeA === 'boolean') {
                        return (a as boolean) === (b as boolean) ? 0 : (a as boolean) ? 1 : -1;
                    }
                }

                // Different types - convert to string (rare case)
                return String(a).localeCompare(String(b));
            };
    }
}

function sortFully(
    data: JSONValue[][],
    comparators: Array<{ index: number, compare: (a: JSONValue, b: JSONValue) => number, direction: number }>,
    columnMap: Map<number, ConfigColumns>,
): void {
    data.sort((rowA, rowB) => compareRows(rowA, rowB, comparators));
}

// Update column config with optimized lookups
function updateColumnSortInfo(
    columns: ConfigColumns[],
    sortColumns: SortColumn[],
    columnMap: Map<number, ConfigColumns>
): void {
    // Clear previous sort information
    columns.forEach(col => col.sorted = undefined);

    // Set new sort information using O(1) lookups
    sortColumns.forEach((sortCol, priority) => {
        const colIndex = Number(sortCol.columnKey);
        const configCol = columnMap.get(colIndex);
        if (configCol) {
            configCol.sorted = [sortCol.direction === 'ASC' ? 'asc' : 'desc', priority];
        }
    });
}