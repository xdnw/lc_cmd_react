import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ShowOddsComponent } from "./index";
import type { WebMyWar, WebTarget } from "@/lib/apitypes";

function createTarget(overrides: Partial<WebTarget> = {}): WebTarget {
    return {
        id: 1,
        nation: "Me",
        alliance_id: 2,
        alliance: "Alliance",
        avg_infra: 1000,
        cities: 10,
        soldier: 10000,
        tank: 500,
        aircraft: 250,
        ship: 50,
        missile: 1,
        nuke: 0,
        spies: 10,
        position: 1,
        active_ms: Date.now(),
        color_id: 0,
        beige_turns: 0,
        off: 4,
        def: 3,
        score: 1000,
        expected: 0,
        actual: 0,
        strength: 20000,
        ...overrides,
    };
}

function createWar(): WebMyWar {
    return {
        id: 42,
        target: createTarget({ id: 3, nation: "Enemy" }),
        beigeReasons: {},
        peace: 0,
        blockade: 0,
        ac: 0,
        gc: 0,
        ground_str: 15000,
        att_res: 70,
        def_res: 55,
        att_map: 8,
        def_map: 5,
        iron_dome: false,
        vds: false,
        att_fortified: false,
        def_fortified: false,
    };
}

describe("ShowOddsComponent", () => {
    it("supports controlled open state for virtualized war rows", async () => {
        const user = userEvent.setup();
        const onToggleOpen = vi.fn();

        render(
            <ShowOddsComponent
                me={createTarget()}
                war={createWar()}
                isOpen={true}
                onToggleOpen={onToggleOpen}
            />,
        );

        expect(screen.getByText(/Odds Ground/i)).toBeTruthy();

        await user.click(screen.getByRole("button", { name: /hide odds/i }));

        expect(onToggleOpen).toHaveBeenCalledTimes(1);
    });
});
