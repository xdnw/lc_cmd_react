import { afterEach, describe, expect, it } from "vitest";

import {
    buildWarsConflictUrl,
    buildWarsConflictsUrl,
    DEFAULT_WARS_FRONTEND_URL,
    normalizeWarsFrontendUrl,
} from "./warsFrontend";

const originalWarsFrontendUrl = process.env.WARS_FRONTEND_URL;

afterEach(() => {
    if (originalWarsFrontendUrl === undefined) {
        delete process.env.WARS_FRONTEND_URL;
        return;
    }

    process.env.WARS_FRONTEND_URL = originalWarsFrontendUrl;
});

describe("warsFrontend", () => {
    it("normalizes configured base URLs", () => {
        expect(normalizeWarsFrontendUrl(" https://wars.locutus.link/ ")).toBe("https://wars.locutus.link");
        expect(buildWarsConflictsUrl("https://wars.locutus.link/")).toBe("https://wars.locutus.link/conflicts");
    });

    it("builds conflict URLs for permanent and virtual conflicts", () => {
        expect(buildWarsConflictUrl(1234, "https://wars.locutus.link/")).toBe("https://wars.locutus.link/conflict?id=1234");
        expect(buildWarsConflictUrl("n/42/test-uuid", "https://wars.locutus.link")).toBe(
            "https://wars.locutus.link/conflict?id=n%2F42%2Ftest-uuid",
        );
    });

    it("falls back to the default wars frontend when env config is missing", () => {
        delete process.env.WARS_FRONTEND_URL;

        expect(normalizeWarsFrontendUrl()).toBe(DEFAULT_WARS_FRONTEND_URL);
        expect(buildWarsConflictUrl(55)).toBe(`${DEFAULT_WARS_FRONTEND_URL}/conflict?id=55`);
    });

    it("uses the configured wars frontend env value by default", () => {
        process.env.WARS_FRONTEND_URL = "https://wars.example.test/";

        expect(buildWarsConflictsUrl()).toBe("https://wars.example.test/conflicts");
        expect(buildWarsConflictUrl("vc-7")).toBe("https://wars.example.test/conflict?id=vc-7");
    });
});