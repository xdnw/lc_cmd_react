import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/layouts", () => ({
    DEFAULT_TABS: {},
}));

import type { ConfigColumns } from "./DataTable";

import {
    applyColumnOrder,
    moveColumnOrderItem,
    normalizePlaceholderColumnExpression,
    remapSortByColumnIds,
    reorderColumnMap,
    toClientColumnId,
    toLegacySelection,
    toPlaceholderColumnId,
} from "./table_util";

describe("toLegacySelection", () => {
    it("keeps selections without modifiers unchanged", () => {
        expect(toLegacySelection("DBNation", { "": "*" })).toBe("DBNation:*");
    });

    it("formats modifiers inline after the type", () => {
        expect(toLegacySelection("DBNation", { "": "*", allow_deleted: "True" })).toBe("DBNation(allow_deleted:True):*");
    });

    it("joins multiple modifiers with commas", () => {
        expect(toLegacySelection("DBNation", {
            "": "*",
            allow_deleted: "True",
            load_snapshot_vm: "False",
        })).toBe("DBNation(allow_deleted:True,load_snapshot_vm:False):*");
    });
});

describe("column order helpers", () => {
    it("normalizes bare placeholder commands while leaving formatted expressions intact", () => {
        expect(normalizePlaceholderColumnExpression("getname")).toBe("{getname}");
        expect(normalizePlaceholderColumnExpression(" {getscore} ")).toBe("{getscore}");
    });

    it("reorders mixed placeholder and client columns by stable ids", () => {
        const nameId = toPlaceholderColumnId("{name}");
        const scoreId = toPlaceholderColumnId("{score}");
        const actionsId = toClientColumnId("actions");
        const columnsInfo: ConfigColumns[] = [
            { title: "Name", index: 0, key: "{name}", columnId: nameId, source: "placeholder" },
            { title: "Actions", index: 2, key: "actions", columnId: actionsId, source: "client" },
            { title: "Score", index: 1, key: "{score}", columnId: scoreId, source: "placeholder" },
        ];

        const ordered = applyColumnOrder(columnsInfo, [actionsId, scoreId, nameId]);

        expect(ordered.map((column) => column.title)).toEqual(["Actions", "Score", "Name"]);
    });

    it("reorders only placeholder columns in the query map and leaves non-placeholder ids alone", () => {
        const reordered = reorderColumnMap(new Map([
            ["{name}", null],
            ["{score}", null],
            ["{cities}", "Cities"],
        ]), [
            toClientColumnId("actions"),
            toPlaceholderColumnId("{cities}"),
            toPlaceholderColumnId("{name}"),
        ]);

        expect(Array.from(reordered.entries())).toEqual([
            ["{cities}", "Cities"],
            ["{name}", null],
            ["{score}", null],
        ]);
    });

    it("moves a stable column id between positions without dropping other ids", () => {
        const nameId = toPlaceholderColumnId("{name}");
        const scoreId = toPlaceholderColumnId("{score}");
        const actionsId = toClientColumnId("actions");

        expect(moveColumnOrderItem([nameId, actionsId, scoreId], scoreId, nameId)).toEqual([
            scoreId,
            nameId,
            actionsId,
        ]);
    });

    it("remaps sort indices by stable ids after reorder and removal", () => {
        const before = [
            toPlaceholderColumnId("{name}"),
            toPlaceholderColumnId("{score}"),
            toPlaceholderColumnId("{cities}"),
        ];
        const after = [
            toPlaceholderColumnId("{cities}"),
            toPlaceholderColumnId("{name}"),
        ];

        expect(remapSortByColumnIds({ idx: 1, dir: "desc" }, before, after)).toBeUndefined();
        expect(remapSortByColumnIds([{ idx: 0, dir: "asc" }, { idx: 2, dir: "desc" }], before, after)).toEqual([
            { idx: 1, dir: "asc" },
            { idx: 0, dir: "desc" },
        ]);
    });
});