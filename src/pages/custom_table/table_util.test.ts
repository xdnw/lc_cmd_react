import { describe, expect, it } from "vitest";

import { toLegacySelection } from "./table_util";

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