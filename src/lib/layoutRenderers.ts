import { commafy } from "@/utils/StringUtil";

const LAYOUT_RENDERER_DEFINITIONS = {
    numberWithDeltaFromBaseline: {
        id: "layout:number_with_delta_from_baseline",
        display: renderNumberWithDeltaFromBaseline,
    },
} as const;

// Boilerplate below

export const LAYOUT_PACK_SEPARATOR = "|~|";

export function packLayoutValues(...parts: Array<string | number>): string {
    return parts.map((part) => String(part)).join(LAYOUT_PACK_SEPARATOR);
}

function parsePackedLayoutValue(value: unknown): string[] | undefined {
    if (typeof value !== "string") return undefined;
    const parts = value.split(LAYOUT_PACK_SEPARATOR);
    return parts.length >= 2 ? parts : undefined;
}

export function renderNumberWithDeltaFromBaseline(value: unknown): string {
    const packed = parsePackedLayoutValue(value);
    if (!packed) return String(value ?? "");

    const [currentRaw, baselineRaw] = packed;
    const current = Number(currentRaw);
    const baseline = Number(baselineRaw);

    if (!Number.isFinite(current) || !Number.isFinite(baseline)) {
        return `${currentRaw} (${baselineRaw})`;
    }

    const delta = current - baseline;
    const deltaText = `${delta > 0 ? "+" : ""}${commafy(delta)}`;
    return `${commafy(current)} (${deltaText})`;
}

type LayoutRendererName = keyof typeof LAYOUT_RENDERER_DEFINITIONS;
export type LayoutRendererId = (typeof LAYOUT_RENDERER_DEFINITIONS)[LayoutRendererName]["id"];

export const LAYOUT_RENDERERS = Object.freeze(
    Object.fromEntries(
        Object.entries(LAYOUT_RENDERER_DEFINITIONS).map(([name, definition]) => [name, definition.id]),
    ),
) as { readonly [K in LayoutRendererName]: (typeof LAYOUT_RENDERER_DEFINITIONS)[K]["id"] };

export const LAYOUT_RENDERER_DISPLAYS = Object.freeze(
    Object.fromEntries(
        Object.values(LAYOUT_RENDERER_DEFINITIONS).map((definition) => [definition.id, definition.display]),
    ),
) as { readonly [K in LayoutRendererId]: (value: unknown) => string };
