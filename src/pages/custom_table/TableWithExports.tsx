import CopyToClipboard from "@/components/ui/copytoclipboard";
import CommandDialogForm from "@/components/cmd/CommandDialogForm";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { downloadTableData, toLegacySelection } from "./table_util";
import { ExportTypes } from "@/utils/StringUtil";
import { Button } from "@/components/ui/button";
import { useDialog } from "@/components/layout/DialogContext";
import LazyIcon from "@/components/ui/LazyIcon";
import { JSONValue } from "@/lib/internaltypes";
import { ConfigColumns } from "./DataTable";
import { useCallback, useMemo } from "react";

const SHEET_CUSTOM_IMPORT_JSON_COMMAND = ["sheet_custom", "import_json"] as const;

export function GoogleSheets({ type, selection, columns }: {
    readonly type: string
    readonly selection: { [key: string]: string; },
    readonly columns: Map<string, string | null>
}) {
    const { showDialog } = useDialog();
    const legacySel = useMemo(() => toLegacySelection(type, selection), [type, selection]);
    const columnsArr = useMemo(() => Array.from(columns.keys()), [columns]);
    const commandInitialValues = useMemo(() => {
        const json = JSON.stringify({ [legacySel]: columnsArr });
        return {
            sheet: "",
            json,
        };
    }, [legacySel, columnsArr]);

    const manualDialogBody = useMemo(() => {
        return (
            <>
                <p className="font-semibold mb-1">Manual Google Sheets setup</p>
                <ul className="list-decimal list-inside">
                    <li className="bg-accent/20 mb-1 p-1 border-primary/5 border-2 rounded">
                        Set the google sheet tab name as the selection:<br />
                        <CopyToClipboard text={legacySel} />
                    </li>
                    <li className="bg-accent/20 mb-1 p-1 border-primary/5 border-2 rounded">
                        Set the columns as the first row of cells in the sheet tab:<br />
                        <CopyToClipboard text={columnsArr.join("\t")} />
                    </li>
                    <li className="bg-accent/20 mb-1 p-1 border-primary/5 border-2 rounded">
                        Run the discord command, with the sheet url, to autofill the remaining cells:<br />
                        <CopyToClipboard text="/sheet_custom auto" />
                    </li>
                </ul>
            </>
        );
    }, [legacySel, columnsArr]);

    const openCommandDialog = useCallback(() => {
        showDialog("Import into Google Sheets", (
            <CommandDialogForm
                commandPath={SHEET_CUSTOM_IMPORT_JSON_COMMAND}
                initialValues={commandInitialValues}
                description="Review the generated JSON and enter the destination sheet before running the import command."
                runLabel="Run import_json"
                showResultDialog={true}
                showCommandTitle={false}
            />
        ));
    }, [showDialog, commandInitialValues]);

    const openManualDialog = useCallback(() => {
        showDialog("Creating custom google sheets", manualDialogBody);
    }, [showDialog, manualDialogBody]);

    const buttonContent = useMemo(() => (
        <><LazyIcon name="Sheet" className="h-2 w-2" />&nbsp;To Google Sheets</>
    ), []);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="me-1">{buttonContent}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem className="cursor-pointer" onClick={openCommandDialog}>
                    Command
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={openManualDialog}>
                    Manual
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function ExportTable({ data, columns }: {
    readonly data: JSONValue[][],
    readonly columns: ConfigColumns[],
}) {
    const { showDialog } = useDialog();

    // Memoize click handlers to prevent recreation on each render
    const handleDownloadCSV = useCallback(() => {
        showDialog(...downloadTableData(data, columns, false, ExportTypes.CSV));
    }, [showDialog, data, columns]);

    const handleCopyCSV = useCallback(() => {
        showDialog(...downloadTableData(data, columns, true, ExportTypes.CSV));
    }, [showDialog, data, columns]);

    const handleDownloadTSV = useCallback(() => {
        showDialog(...downloadTableData(data, columns, false, ExportTypes.TSV));
    }, [showDialog, data, columns]);

    const handleCopyTSV = useCallback(() => {
        showDialog(...downloadTableData(data, columns, true, ExportTypes.TSV));
    }, [showDialog, data, columns]);

    // Memoize menu item contents to prevent recreation on each render
    const csvDownloadItem = useMemo(() => (
        <kbd className="bg-accent rounded flex items-center space-x-1">
            <LazyIcon name="Download" className="h-4 w-4" /> <span>,</span>
        </kbd>
    ), []);

    const csvCopyItem = useMemo(() => (
        <kbd className="bg-accent rounded flex items-center space-x-1">
            <LazyIcon name="ClipboardIcon" className="h-4 w-4" /> <span>,</span>
        </kbd>
    ), []);

    const tsvDownloadItem = useMemo(() => (
        <kbd className="bg-accent rounded flex items-center space-x-1">
            <LazyIcon name="Download" className="h-4 w-3" />
            <LazyIcon name="ArrowRightToLine" className="h-4 w-3" />
        </kbd>
    ), []);

    const tsvCopyItem = useMemo(() => (
        <kbd className="bg-accent rounded flex items-center space-x-1">
            <LazyIcon name="ClipboardIcon" className="h-4 w-3" />
            <LazyIcon name="ArrowRightToLine" className="h-4 w-3" />
        </kbd>
    ), []);

    // Button label could also be memoized
    const buttonLabel = useMemo(() => "Export", []);

    return <span className="ms-1"><DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="me-1">{buttonLabel}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
            <DropdownMenuItem className="cursor-pointer" onClick={handleDownloadCSV}>
                {csvDownloadItem}&nbsp;Download CSV
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={handleCopyCSV}>
                {csvCopyItem}&nbsp;Copy CSV
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={handleDownloadTSV}>
                {tsvDownloadItem}&nbsp;Download TSV
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={handleCopyTSV}>
                {tsvCopyItem}&nbsp;Copy TSV
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
    </span>
}