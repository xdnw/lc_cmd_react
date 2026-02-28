import type { VirtualConflictMeta, WebOptions } from "@/lib/apitypes.d.ts";

export type TemporaryConflictRow = {
    key: string;
    meta: VirtualConflictMeta;
    commandConflictRef: string;
    dateModified: number;
    name: string;
    category: string;
    status: string;
    wiki: string;
    casusBelli: string;
    start: number;
    end: number;
};

export type TemporaryConflictParseResult = {
    rows: TemporaryConflictRow[];
    droppedRows: number;
};

const TEMP_CONFLICT_REF_PATTERN = /^n\/(\d+)\/([a-fA-F0-9-]{8,})$/;

function toValidNationId(value: unknown): number | null {
    const id = Number(value);
    if (!Number.isFinite(id) || id <= 0) return null;
    return Math.trunc(id);
}

function toValidUuid(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed;
}

function parseConflictRef(value: unknown): VirtualConflictMeta | null {
    if (typeof value !== "string") return null;
    const match = TEMP_CONFLICT_REF_PATTERN.exec(value.trim());
    if (!match) return null;
    const nationId = toValidNationId(match[1]);
    const uuid = toValidUuid(match[2]);
    if (!nationId || !uuid) return null;
    return { nationId, uuid, dateModified: 0 };
}

function parseMetaCandidate(value: unknown): VirtualConflictMeta | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;

    const obj = value as {
        nationId?: unknown;
        nation_id?: unknown;
        uuid?: unknown;
        dateModified?: unknown;
        date_modified?: unknown;
        modified?: unknown;
        key?: unknown;
        conflict?: unknown;
        ref?: unknown;
    };

    const nationId = toValidNationId(obj.nationId ?? obj.nation_id);
    const uuid = toValidUuid(obj.uuid);
    const dateModified = normalizeNumber(obj.dateModified ?? obj.date_modified ?? obj.modified);
    if (nationId && uuid) {
        return { nationId, uuid, dateModified };
    }

    const refMeta = parseConflictRef(obj.conflict ?? obj.ref ?? obj.key);
    if (!refMeta) return null;
    return { ...refMeta, dateModified };
}

function normalizeString(value: unknown, fallback = "-"): string {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    return trimmed || fallback;
}

function normalizeNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function toTemporaryConflictRef(meta: VirtualConflictMeta): string {
    return `n/${meta.nationId}/${meta.uuid}`;
}

function buildTemporaryRow(meta: VirtualConflictMeta, display?: Record<string, unknown>): TemporaryConflictRow {
    const commandConflictRef = toTemporaryConflictRef(meta);
    const fallbackName = `${meta.nationId}/${meta.uuid}`;

    return {
        key: commandConflictRef,
        meta,
        commandConflictRef,
        dateModified: normalizeNumber(meta.dateModified),
        name: normalizeString(display?.name, fallbackName),
        category: normalizeString(display?.category),
        status: normalizeString(display?.status),
        wiki: normalizeString(display?.wiki),
        casusBelli: normalizeString(display?.casusBelli),
        start: normalizeNumber(display?.start),
        end: normalizeNumber(display?.end),
    };
}

function mapVirtualConflictMetaArray(data: unknown[]): TemporaryConflictParseResult {
    const rows: TemporaryConflictRow[] = [];
    let droppedRows = 0;

    for (const entry of data) {
        const meta = parseMetaCandidate(entry);
        if (!meta) {
            droppedRows += 1;
            continue;
        }

        const display = entry && typeof entry === "object" && !Array.isArray(entry)
            ? {
                name: (entry as Record<string, unknown>).name,
                category: (entry as Record<string, unknown>).category,
                status: (entry as Record<string, unknown>).status,
                wiki: (entry as Record<string, unknown>).wiki,
                casusBelli: (entry as Record<string, unknown>).cb,
                start: (entry as Record<string, unknown>).date,
                end: (entry as Record<string, unknown>).end,
            }
            : undefined;

        rows.push(buildTemporaryRow(meta, display));
    }

    return { rows, droppedRows };
}

function mapWebOptions(data: WebOptions): TemporaryConflictParseResult {
    const ids = data.key_numeric ?? [];
    const refs = data.key_string ?? [];
    const names = data.text ?? [];
    const categories = data.subtext ?? [];
    const statuses = data.icon ?? [];
    const colors = data.color ?? [];
    const dateModifiedValues = (
        data as WebOptions & {
            dateModified?: unknown[];
            date_modified?: unknown[];
            modified?: unknown[];
        }
    );

    const length = Math.max(ids.length, refs.length, names.length, categories.length, statuses.length, colors.length);
    const rows: TemporaryConflictRow[] = [];
    let droppedRows = 0;

    for (let index = 0; index < length; index += 1) {
        const nationId = toValidNationId(ids[index]);
        const refMeta = parseConflictRef(refs[index]);
        const uuid = refMeta?.uuid ?? toValidUuid(refs[index]);
        const dateModified = normalizeNumber(
            dateModifiedValues.dateModified?.[index]
            ?? dateModifiedValues.date_modified?.[index]
            ?? dateModifiedValues.modified?.[index],
        );

        const meta = nationId && uuid
            ? { nationId, uuid, dateModified }
            : (refMeta ? { ...refMeta, dateModified } : null);

        if (!meta) {
            droppedRows += 1;
            continue;
        }

        rows.push(buildTemporaryRow(meta, {
            name: names[index],
            category: categories[index],
            status: statuses[index] ?? colors[index],
        }));
    }

    return { rows, droppedRows };
}

export function mapTemporaryConflictRows(data: unknown): TemporaryConflictParseResult {
    if (Array.isArray(data)) {
        return mapVirtualConflictMetaArray(data);
    }

    if (data && typeof data === "object" && !Array.isArray(data)) {
        const maybeWebOptions = data as WebOptions;
        if (
            Array.isArray(maybeWebOptions.key_numeric)
            || Array.isArray(maybeWebOptions.key_string)
            || Array.isArray(maybeWebOptions.text)
            || Array.isArray(maybeWebOptions.subtext)
        ) {
            return mapWebOptions(maybeWebOptions);
        }

        const singleMeta = parseMetaCandidate(data);
        if (singleMeta) {
            return { rows: [buildTemporaryRow(singleMeta, data as Record<string, unknown>)], droppedRows: 0 };
        }
    }

    return { rows: [], droppedRows: 0 };
}
