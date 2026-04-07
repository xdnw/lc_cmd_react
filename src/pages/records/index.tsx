import { useMemo } from "react";

import EndpointWrapper from "@/components/api/bulkwrapper";
import { TransactionNoteBadges } from "@/components/ui/TransactionNoteBadges";
import type { WebTable } from "@/lib/apitypes";
import { RECORDS } from "@/lib/endpoints";
import type { JSONValue } from "@/lib/internaltypes";
import { PreparedDataTable } from "@/pages/custom_table/PreparedDataTable";
import type { ConfigColumns } from "@/pages/custom_table/DataTable";
import type { TransactionNoteInput } from "@/lib/transactionNotes";

function toHeaderLabel(value: JSONValue): string {
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    return "";
}

function getColumnWidth(header: string): number | undefined {
    if (header === "note") {
        return 360;
    }
    if (header === "date") {
        return 168;
    }
    if (header === "id" || header === "banker" || header.endsWith("_id") || header.endsWith("_type")) {
        return 116;
    }
    return 108;
}

function buildColumns(headers: string[]): ConfigColumns[] {
    return headers.map((header, index) => {
        const normalized = header.toLowerCase();
        const noteColumn = normalized === "note";
        const numericColumn = normalized === "id"
            || normalized === "banker"
            || normalized.endsWith("_id")
            || normalized.endsWith("_type")
            || /^[a-z_]+$/.test(normalized);

        return {
            title: header,
            index,
            sortable: !noteColumn,
            exportable: !noteColumn,
            editable: false,
            draggable: false,
            width: getColumnWidth(normalized),
            cellClassName: noteColumn ? undefined : numericColumn ? "font-mono" : undefined,
            render: noteColumn
                ? {
                        display: (value) => <TransactionNoteBadges note={value as TransactionNoteInput} maxVisibleBadges={4} />,
                    }
                : undefined,
        };
    });
}

function RecordsTable({ table }: { table: WebTable }) {
    const rows = useMemo(
        () => (Array.isArray(table.cells) ? table.cells.filter((row): row is JSONValue[] => Array.isArray(row)) : []),
        [table.cells],
    );
    const headers = useMemo(
        () => (rows[0] ?? []).map((value, index) => {
            const label = toHeaderLabel(value);
            return label.length > 0 ? label : `Column ${index + 1}`;
        }),
        [rows],
    );
    const dataRows = useMemo(() => rows.slice(1), [rows]);
    const columns = useMemo(() => buildColumns(headers), [headers]);

    if (headers.length === 0 || dataRows.length === 0) {
        return <div>No data</div>;
    }

    return (
        <PreparedDataTable
            columnsInfo={columns}
            data={dataRows}
            showIndexColumn
        />
    );
}

export default function Records() {
    return (
        <EndpointWrapper endpoint={RECORDS} args={{}}>
            {({ data }) => <RecordsTable table={data as WebTable} />}
        </EndpointWrapper>
    );
}