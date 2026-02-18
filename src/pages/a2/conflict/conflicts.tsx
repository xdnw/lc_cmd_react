import { StaticTable } from "@/pages/custom_table/StaticTable";
import type { ClientColumnOverlay, RenderContext } from "@/pages/custom_table/DataTable";
import { CM } from "@/utils/Command";
import { usePermission } from "@/utils/PermUtil";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import CommandActionButton from "@/components/cmd/CommandActionButton";

function ConflictSyncButton({ conflictId, onSynced }: { conflictId: number; onSynced: (conflictId: number) => void; }) {
  const onSuccess = useCallback(() => {
    onSynced(conflictId);
  }, [conflictId, onSynced]);

  return (
    <CommandActionButton
      command={["conflict", "sync", "website"]}
      args={{ conflicts: String(conflictId) }}
      label="Sync"
      classes="!ms-0"
      showResultDialog={true}
      onSuccess={onSuccess}
    />
  );
}

const builder = CM.placeholders('Conflict')
  .aliased()
  .add({ cmd: 'getid', alias: 'ID' })
  .add({ cmd: 'getname', alias: "Name" })
  .add({ cmd: 'getcategory', alias: 'Category' })
  .add({ cmd: 'getstartturn', alias: 'Start' })
  .add({ cmd: 'getendturn', alias: 'End' })
  .add({ cmd: 'getactivewars', alias: 'Active Wars' })
  .add({ cmd: 'getdamageconverted', args: { 'isPrimary': 'true' }, alias: 'c1_damage' })
  .add({ cmd: 'getdamageconverted', args: { 'isPrimary': 'false' }, alias: 'c2_damage' })

export default function Conflicts() {
  const { permission: edit } = usePermission(['conflict', 'edit', 'rename']);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set<number>());
  const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set<number>());

  const parseConflictId = useCallback((value: unknown): number | null => {
    const raw = Number(value);
    return Number.isFinite(raw) ? raw : null;
  }, []);

  const toggleSelected = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleDirty = useCallback((id: number) => {
    setDirtyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const queueSelectedForSync = useCallback(() => {
    setDirtyIds((prev) => {
      const next = new Set(prev);
      selectedIds.forEach((id) => next.add(id));
      return next;
    });
  }, [selectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set<number>());
  }, []);

  const clearDirty = useCallback(() => {
    setDirtyIds(new Set<number>());
  }, []);

  const onSingleSyncSuccess = useCallback((conflictId: number) => {
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.delete(conflictId);
      return next;
    });
  }, []);

  const onQueuedSyncSuccess = useCallback(() => {
    setDirtyIds(new Set<number>());
    setSelectedIds(new Set<number>());
  }, []);

  const onCheckboxChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const id = Number(event.currentTarget.dataset.id);
    if (Number.isFinite(id)) {
      toggleSelected(id);
    }
  }, [toggleSelected]);

  const onDirtyButtonClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const id = Number(event.currentTarget.dataset.id);
    if (Number.isFinite(id)) {
      toggleDirty(id);
    }
  }, [toggleDirty]);

  const onSelectButtonClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const id = Number(event.currentTarget.dataset.id);
    if (Number.isFinite(id)) {
      toggleSelected(id);
    }
  }, [toggleSelected]);

  const clientColumns = useMemo<ClientColumnOverlay[]>(() => {
    const selectColumn: ClientColumnOverlay = {
      id: "select",
      title: "Select",
      position: "start",
      width: 72,
      sortable: false,
      exportable: false,
      editable: false,
      draggable: false,
      value: (row) => parseConflictId(row[0]),
      render: {
        display: (value) => {
          const id = Number(value);
          if (!Number.isFinite(id)) return "-";
          return (
            <input
              type="checkbox"
              checked={selectedIds.has(id)}
              data-id={id}
              onChange={onCheckboxChange}
              aria-label={`Select conflict ${id}`}
            />
          );
        },
      },
    };

    const actionColumn: ClientColumnOverlay = {
      id: "actions",
      title: "Actions",
      position: "end",
      width: 190,
      sortable: false,
      exportable: false,
      editable: false,
      draggable: false,
      value: (row) => parseConflictId(row[0]),
      render: {
        display: (value, context?: RenderContext) => {
          const id = Number(value);
          if (!Number.isFinite(id)) return "-";
          return (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" data-id={id} onClick={onDirtyButtonClick}>
                {dirtyIds.has(id) ? "Clean" : "Dirty"}
              </Button>
              {edit && (
                <ConflictSyncButton conflictId={id} onSynced={onSingleSyncSuccess} />
              )}
              {edit && (
                <Button
                  variant="outline"
                  size="sm"
                  data-id={id}
                  onClick={onSelectButtonClick}
                  title={`Toggle selected for conflict ${context?.row?.[1] ?? id}`}
                >
                  Select
                </Button>
              )}
            </div>
          );
        },
      },
    };

    return [selectColumn, actionColumn];
  }, [dirtyIds, edit, onCheckboxChange, onDirtyButtonClick, onSelectButtonClick, onSingleSyncSuccess, parseConflictId, selectedIds]);

  const queuedConflictIds = useMemo(() => {
    return Array.from(dirtyIds).sort((a, b) => a - b).join(",");
  }, [dirtyIds]);

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">Conflicts</h1>
        <Badge variant="outline">Selected: {selectedIds.size}</Badge>
        <Badge variant="outline">Dirty: {dirtyIds.size}</Badge>
        <Button variant="outline" size="sm" onClick={queueSelectedForSync} disabled={selectedIds.size === 0}>
          Queue selected
        </Button>
        {edit && dirtyIds.size > 0 && (
          <CommandActionButton
            command={["conflict", "sync", "website"]}
            args={{ conflicts: queuedConflictIds }}
            label={`Sync queued (${dirtyIds.size})`}
            classes="!ms-0"
            showResultDialog={true}
            onSuccess={onQueuedSyncSuccess}
          />
        )}
        <Button variant="outline" size="sm" onClick={clearSelection} disabled={selectedIds.size === 0}>
          Clear selected
        </Button>
        <Button variant="outline" size="sm" onClick={clearDirty} disabled={dirtyIds.size === 0}>
          Clear dirty
        </Button>
      </div>

      <StaticTable
        type="Conflict"
        selection={{ "": "*" }}
        columns={builder.aliasedArray()}
        clientColumns={clientColumns}
      />
    </>
  );
}