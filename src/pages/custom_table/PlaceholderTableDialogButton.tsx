import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useDialog, type ShowDialogArg } from "@/components/layout/DialogContext";
import Loading from "@/components/ui/loading";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { WebTable } from "@/lib/apitypes";
import { TABLE } from "@/lib/endpoints";
import { bulkQueryOptions } from "@/lib/queries";
import { PreparedDataTable } from "@/pages/custom_table/PreparedDataTable";
import type { OrderIdx } from "@/pages/custom_table/DataTable";
import { createTableInfo, toColumnMap, type TableUrlColumnInput, type PlaceholderType } from "@/pages/custom_table/table_util";

const DEFAULT_DIALOG_OPTIONS: ShowDialogArg = {
  openInNewTab: true,
  focusNewTab: true,
  replaceActive: false,
};

function PlaceholderTableDialogContent({
  type,
  selection,
  columns,
  sort,
  showIndexColumn,
}: {
  type: PlaceholderType;
  selection: string;
  columns: readonly TableUrlColumnInput[];
  sort?: OrderIdx | OrderIdx[];
  showIndexColumn: boolean;
}) {
  const queryArgs = useMemo(() => ({
    type,
    selection_str: selection,
    columns: columns.map((column) => typeof column === "string" ? column : column[0]),
  }), [columns, selection, type]);

  const tableQuery = useQuery({
    ...bulkQueryOptions(TABLE.endpoint, queryArgs),
    enabled: selection.trim().length > 0,
  });

  const tableInfo = useMemo(() => {
    const table = tableQuery.data?.data as WebTable | null | undefined;
    if (!table) {
      return null;
    }

    return createTableInfo(table, sort, toColumnMap(columns));
  }, [columns, sort, tableQuery.data?.data]);

  if (tableQuery.isLoading) {
    return (
      <div className="py-8">
        <Loading variant="ripple" />
      </div>
    );
  }

  if (tableQuery.error || !tableInfo) {
    return <div className="text-sm text-destructive">Failed to load table data.</div>;
  }

  if (tableInfo.data.length === 0) {
    return <div className="text-sm text-muted-foreground">No rows matched this selection.</div>;
  }

  return (
    <PreparedDataTable
      columnsInfo={tableInfo.columnsInfo}
      data={tableInfo.data}
      sort={sort}
      showExports={false}
      showIndexColumn={showIndexColumn}
    />
  );
}

type PlaceholderTableDialogButtonProps = Omit<ButtonProps, "children"> & {
  title: string;
  typeName: PlaceholderType;
  selection: string;
  columns: readonly TableUrlColumnInput[];
  sort?: OrderIdx | OrderIdx[];
  dialogOptions?: ShowDialogArg;
  showIndexColumn?: boolean;
  children: ButtonProps["children"];
};

export default function PlaceholderTableDialogButton({
  title,
  typeName,
  selection,
  columns,
  sort,
  dialogOptions = DEFAULT_DIALOG_OPTIONS,
  showIndexColumn = false,
  children,
  type = "button",
  onClick,
  ...buttonProps
}: PlaceholderTableDialogButtonProps) {
  const { showDialog } = useDialog();
  const handleClick = useCallback<NonNullable<ButtonProps["onClick"]>>((event) => {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }

    showDialog(
      title,
      <PlaceholderTableDialogContent
        type={typeName}
        selection={selection}
        columns={columns}
        sort={sort}
        showIndexColumn={showIndexColumn}
      />,
      dialogOptions,
    );
  }, [columns, dialogOptions, onClick, selection, showDialog, showIndexColumn, sort, title, typeName]);

  return (
    <Button
      type={type}
      onClick={handleClick}
      {...buttonProps}
    >
      {children}
    </Button>
  );
}
