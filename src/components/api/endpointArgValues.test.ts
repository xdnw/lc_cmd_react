import { describe, expect, it } from "vitest";

import { normalizeEndpointArgValues } from "./endpointArgValues";
import { RAID, UNPROTECTED } from "@/lib/endpoints";

describe("normalizeEndpointArgValues", () => {
    it("filters undefined values and normalizes typed endpoint defaults", () => {
        expect(normalizeEndpointArgValues(RAID, {
            nation: "Borg",
            time_inactive: "48h",
            weak_ground: "yes",
            beige_turns: undefined,
        })).toEqual({
            nation: "Borg",
            time_inactive: "timediff:172800000",
            weak_ground: "True",
        });
    });

    it("leaves unknown keys alone while preserving optional-boolean form semantics", () => {
        expect(normalizeEndpointArgValues(UNPROTECTED, {
            nations: "*",
            ignoreODP: "y",
            includeAllies: "n",
            custom: "keep-me",
        })).toEqual({
            nations: "*",
            ignoreODP: "True",
            custom: "keep-me",
        });
    });
});