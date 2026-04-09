import {
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import PlaceholderExpressionInput from "@/components/cmd/PlaceholderExpressionInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { JSONValue } from "@/lib/internaltypes";
import { cn } from "@/lib/utils";

import type { ConfigColumns, TableRowSelection } from "./DataTable";
import { ExportTable } from "./TableWithExports";
import { formatColName, getExpressionBreakdown, getPlaceholderStringFunctionType, normalizePlaceholderColumnExpression, type PlaceholderType } from "./table_util";

export type TableSourceSelectionCopy = {
  value: string;
  label?: string;
};

export type TableColumnCustomizationItem = {
  id: string;
  source: "placeholder" | "client" | "column";
  title: string;
  rawTitle?: string | null;
  value?: string;
  valueEditable?: boolean;
  titleEditable?: boolean;
  removable?: boolean;
};

export type TableColumnCustomizationComposer = {
  placeholderType: PlaceholderType;
  typedInputType?: string;
};

export type TableColumnCustomization = {
  items: readonly TableColumnCustomizationItem[];
  composer?: TableColumnCustomizationComposer;
  onApply: (items: TableColumnCustomizationItem[]) => void;
};

function createDraftColumnId(): string {
  return `draft:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

function areCustomizationItemsEqual(
  left: readonly TableColumnCustomizationItem[],
  right: readonly TableColumnCustomizationItem[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => {
    const other = right[index];
    return item.id === other.id
      && item.source === other.source
      && item.title === other.title
      && (item.rawTitle ?? null) === (other.rawTitle ?? null)
      && (item.value ?? "") === (other.value ?? "")
      && (item.valueEditable ?? false) === (other.valueEditable ?? false)
      && (item.titleEditable ?? false) === (other.titleEditable ?? false)
      && (item.removable ?? true) === (other.removable ?? true);
  });
}

function moveDraftItems(
  items: readonly TableColumnCustomizationItem[],
  sourceId: string,
  targetId: string,
): TableColumnCustomizationItem[] {
  const nextItems = [...items];
  const sourceIndex = nextItems.findIndex((item) => item.id === sourceId);
  const targetIndex = nextItems.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return nextItems;
  }

  const [movedItem] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(targetIndex, 0, movedItem);
  return nextItems;
}

function getDisplayedTitle(item: TableColumnCustomizationItem): string {
  const title = item.rawTitle ?? item.title;
  return title.trim() || item.title;
}

function getDisplayedValue(item: TableColumnCustomizationItem): string {
  return item.value?.trim() || item.title;
}

function TableColumnCustomizationRow({
  item,
  index,
  itemCount,
  draggedItemId,
  onDragStart,
  onDragEnd,
  onDropItem,
  onRemove,
  onStartEdit,
  onTitleChange,
}: {
  item: TableColumnCustomizationItem;
  index: number;
  itemCount: number;
  draggedItemId: string | null;
  onDragStart: (itemId: string) => void;
  onDragEnd: () => void;
  onDropItem: (sourceId: string, targetId: string) => void;
  onRemove: (itemId: string) => void;
  onStartEdit: (itemId: string) => void;
  onTitleChange: (itemId: string, nextTitle: string) => void;
}) {
  const handleDragStart = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = "move";
    onDragStart(item.id);
  }, [item.id, onDragStart]);

  const handleDragEnd = useCallback(() => {
    onDragEnd();
  }, [onDragEnd]);

  const handleDragOver = useCallback((event: DragEvent<HTMLLIElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((event: DragEvent<HTMLLIElement>) => {
    event.preventDefault();
    if (draggedItemId) {
      onDropItem(draggedItemId, item.id);
    }
    onDragEnd();
  }, [draggedItemId, item.id, onDropItem, onDragEnd]);

  const handleRemove = useCallback(() => {
    onRemove(item.id);
  }, [item.id, onRemove]);

  const handleStartEdit = useCallback(() => {
    onStartEdit(item.id);
  }, [item.id, onStartEdit]);

  const handleTitleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    onTitleChange(item.id, event.target.value);
  }, [item.id, onTitleChange]);

  const canRemove = item.removable !== false;
  const canEditValue = item.valueEditable === true;
  const canEditTitle = item.titleEditable !== false;
  const showGrabHandle = itemCount > 1;
  const displayedTitle = getDisplayedTitle(item);
  const displayedValue = getDisplayedValue(item);

  return (
    <li
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "flex items-center gap-1 rounded-md border border-border/70 bg-background px-1.5 py-1",
        draggedItemId === item.id ? "opacity-60" : undefined,
      )}
    >
      <div
        draggable={showGrabHandle}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border/60 text-[11px] text-muted-foreground",
          showGrabHandle ? "cursor-grab active:cursor-grabbing" : "opacity-40",
        )}
        aria-label={`Move column ${index + 1}`}
      >
        ::
      </div>
      {canEditValue ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 min-w-0 flex-[1.5] justify-start overflow-hidden px-2 font-mono text-[11px]"
          onClick={handleStartEdit}
        >
          <span className="truncate">{displayedValue}</span>
        </Button>
      ) : (
        <div className="min-w-0 flex-[1.5] truncate rounded border border-border/60 bg-muted/20 px-2 py-1 font-mono text-[11px] leading-5 text-foreground">
          {displayedValue}
        </div>
      )}
      {canEditTitle ? (
        <Input
          value={displayedTitle}
          onChange={handleTitleInputChange}
          className="h-7 min-w-0 flex-1 text-xs"
          placeholder={item.title}
        />
      ) : (
        <div className="min-w-0 flex-1 truncate px-1 text-xs text-foreground">{displayedTitle}</div>
      )}
      {canRemove ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleRemove}
        >
          Remove
        </Button>
      ) : null}
    </li>
  );
}

function EditingIndicator({
  editingValue,
  onClear,
}: {
  editingValue: string | null;
  onClear: () => void;
}) {
  if (!editingValue) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 font-medium text-foreground">Editing</span>
      <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">{editingValue}</span>
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}

function TableColumnCustomizationDialog({
  customization,
  open,
  onOpenChange,
}: {
  customization: TableColumnCustomization;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [draftItems, setDraftItems] = useState<TableColumnCustomizationItem[]>(() => [...customization.items]);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState("");
  const [composerTitle, setComposerTitle] = useState("");
  const [composerError, setComposerError] = useState<string | null>(null);
  const [typedInputKey, setTypedInputKey] = useState(0);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }

    if (wasOpenRef.current) {
      return;
    }

    wasOpenRef.current = true;
    setDraftItems([...customization.items]);
    setDraggedItemId(null);
    setEditingItemId(null);
    setComposerValue("");
    setComposerTitle("");
    setComposerError(null);
    setTypedInputKey((current) => current + 1);
  }, [customization.items, open]);

  const composerConfig = customization.composer;
  const composerType = useMemo(() => {
    if (!composerConfig) {
      return null;
    }

    return composerConfig.typedInputType ?? getPlaceholderStringFunctionType(composerConfig.placeholderType);
  }, [composerConfig]);
  const composerBreakdown = useMemo(() => {
    if (!composerType) {
      return null;
    }

    return getExpressionBreakdown(composerType);
  }, [composerType]);
  const editingItem = useMemo(
    () => editingItemId ? draftItems.find((item) => item.id === editingItemId) ?? null : null,
    [draftItems, editingItemId],
  );

  const handleDragStart = useCallback((itemId: string) => {
    setDraggedItemId(itemId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItemId(null);
  }, []);

  const handleDropItem = useCallback((sourceId: string, targetId: string) => {
    setDraftItems((current) => moveDraftItems(current, sourceId, targetId));
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setDraftItems((current) => current.filter((item) => item.id !== itemId));
    setComposerError(null);
    if (editingItemId === itemId) {
      setEditingItemId(null);
      setComposerValue("");
      setComposerTitle("");
      setTypedInputKey((current) => current + 1);
    }
  }, [editingItemId]);

  const handleStartEdit = useCallback((itemId: string) => {
    const item = draftItems.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    setEditingItemId(item.id);
    setComposerValue(item.value ?? "");
    setComposerTitle(item.rawTitle ?? item.title);
    setComposerError(null);
    setTypedInputKey((current) => current + 1);
  }, [draftItems]);

  const handleTitleChange = useCallback((itemId: string, nextTitle: string) => {
    setDraftItems((current) => current.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      return {
        ...item,
        rawTitle: nextTitle,
      };
    }));
  }, []);

  const handleComposerValueChange = useCallback((_name: string, value: string) => {
    setComposerValue(value);
    setComposerError(null);
  }, []);

  const handleComposerTitleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setComposerTitle(event.target.value);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingItemId(null);
    setComposerValue("");
    setComposerTitle("");
    setComposerError(null);
    setTypedInputKey((current) => current + 1);
  }, []);

  const handleCommitComposer = useCallback(() => {
    if (!composerConfig) {
      return;
    }

    const normalizedValue = normalizePlaceholderColumnExpression(composerValue);
    if (!normalizedValue) {
      setComposerError("Enter a placeholder first.");
      return;
    }

    const duplicate = draftItems.some((item) => {
      if (item.id === editingItemId) {
        return false;
      }
      return item.source === "placeholder" && (item.value ?? "") === normalizedValue;
    });
    if (duplicate) {
      setComposerError("That placeholder is already in the list.");
      return;
    }

    if (editingItemId) {
      setDraftItems((current) => current.map((item) => {
        if (item.id !== editingItemId) {
          return item;
        }

        return {
          ...item,
          title: formatColName(normalizedValue),
          value: normalizedValue,
          rawTitle: composerTitle,
        };
      }));
    } else {
      setDraftItems((current) => [
        ...current,
        {
          id: createDraftColumnId(),
          source: "placeholder",
          title: formatColName(normalizedValue),
          rawTitle: composerTitle,
          value: normalizedValue,
          valueEditable: true,
          titleEditable: true,
          removable: true,
        },
      ]);
    }

    setEditingItemId(null);
    setComposerValue("");
    setComposerTitle("");
    setComposerError(null);
    setTypedInputKey((current) => current + 1);
  }, [composerConfig, composerTitle, composerValue, draftItems, editingItemId]);

  const handleApply = useCallback(() => {
    customization.onApply(draftItems);
    onOpenChange(false);
  }, [customization, draftItems, onOpenChange]);

  const handleCloseDialog = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const canApply = useMemo(() => {
    return !areCustomizationItemsEqual(draftItems, customization.items);
  }, [customization.items, draftItems]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-275 gap-2 p-2.5 sm:max-h-[82vh]">
        <DialogHeader className="space-y-0.5 pr-12">
          <DialogTitle className="text-left text-sm">Customize columns</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 space-y-2 overflow-y-auto">
          <ul className="space-y-1">
            {draftItems.map((item, index) => (
              <TableColumnCustomizationRow
                key={item.id}
                item={item}
                index={index}
                itemCount={draftItems.length}
                draggedItemId={draggedItemId}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDropItem={handleDropItem}
                onRemove={handleRemoveItem}
                onStartEdit={handleStartEdit}
                onTitleChange={handleTitleChange}
              />
            ))}
          </ul>

          {composerConfig && composerBreakdown ? (
            <section className="space-y-1.5 border-t border-border/70 pt-2">
              <EditingIndicator editingValue={editingItem?.value ?? null} onClear={handleCancelEdit} />
              <div className="grid gap-1 sm:grid-cols-[minmax(0,1.7fr)_minmax(0,0.9fr)_auto] sm:items-start">
                <PlaceholderExpressionInput
                  key={typedInputKey}
                  argName="column"
                  initialValue={composerValue}
                  breakdown={composerBreakdown}
                  pickerInline
                  pickerButtonLabel="Browse"
                  pickerDescription={false}
                  statusSlotMode="auto"
                  setOutputValue={handleComposerValueChange}
                />
                <Input
                  value={composerTitle}
                  onChange={handleComposerTitleChange}
                  className="h-7 text-xs"
                  placeholder="Heading"
                />
                <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={handleCommitComposer}>
                  {editingItemId ? "Save" : "Add"}
                </Button>
              </div>
              {composerError ? <div className="text-[11px] text-destructive">{composerError}</div> : null}
            </section>
          ) : null}
        </div>

        <DialogFooter className="gap-1 sm:space-x-0">
          <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={handleCloseDialog}>
            Cancel
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={handleApply} disabled={!canApply}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TableToolbar({
  data,
  columns,
  showCopy = true,
  sourceSelection,
  rowSelection,
  columnCustomization,
  leadingActions,
}: {
  data: JSONValue[][];
  columns: ConfigColumns[];
  showCopy?: boolean;
  sourceSelection?: TableSourceSelectionCopy;
  rowSelection?: TableRowSelection;
  columnCustomization?: TableColumnCustomization;
  leadingActions?: ReactNode;
}) {
  const [customizationOpen, setCustomizationOpen] = useState(false);

  const hasToolbarActions = useMemo(() => {
    return Boolean(leadingActions)
      || showCopy
      || sourceSelection
      || rowSelection?.copySelection
      || columnCustomization;
  }, [columnCustomization, leadingActions, rowSelection?.copySelection, showCopy, sourceSelection]);

  const openCustomization = useCallback(() => {
    setCustomizationOpen(true);
  }, []);

  if (!hasToolbarActions) {
    return null;
  }

  return (
    <>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        {leadingActions}
        {showCopy ? (
          <ExportTable
            data={data}
            columns={columns}
            sourceSelection={sourceSelection}
            rowSelection={rowSelection}
          />
        ) : null}
        {columnCustomization ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="me-1"
            onClick={openCustomization}
          >
            Customize
          </Button>
        ) : null}
      </div>
      {columnCustomization ? (
        <TableColumnCustomizationDialog
          customization={columnCustomization}
          open={customizationOpen}
          onOpenChange={setCustomizationOpen}
        />
      ) : null}
    </>
  );
}
