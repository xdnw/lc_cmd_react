import type { CSSProperties } from "react";

type Tone = {
    borderColor: string;
    railStyle: CSSProperties;
    pillStyle: CSSProperties;
};

function hashText(text: string): number {
    let hash = 0;
    for (let index = 0; index < text.length; index++) {
        hash = ((hash * 33) + text.charCodeAt(index)) >>> 0;
    }
    return hash;
}

function buildTone(seed: string, saturation: number, lightness: number): Tone {
    const hue = hashText(seed) % 360;
    const borderColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.16)`;

    return {
        borderColor,
        railStyle: {
            backgroundColor: `hsla(${hue}, ${Math.min(90, saturation + 8)}%, ${lightness}%, 0.44)`,
        },
        pillStyle: {
            backgroundColor: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.06)`,
            borderColor,
            color: "inherit",
        },
    };
}

export function getCategoryTone(category: string): Tone {
    return buildTone(`category:${category.trim().toLowerCase() || "default"}`, 64, 48);
}

export function getSubgroupTone(subgroup: string): Tone {
    return buildTone(`subgroup:${subgroup.trim().toLowerCase() || "default"}`, 56, 46);
}

export function getSettingTypeToneStyle(argType: string): CSSProperties {
    return buildTone(`type:${argType.trim().toLowerCase() || "unknown"}`, 60, 50).pillStyle;
}

export function getSettingRowStateClasses({
    invalid,
    unavailable,
    unset,
    unsupported,
}: {
    invalid: boolean;
    unavailable: boolean;
    unset: boolean;
    unsupported: boolean;
}): {
    background: string;
    value: string;
} {
    if (invalid) {
        return {
            background: "bg-destructive/[0.025]",
            value: "text-destructive/90",
        };
    }

    if (unsupported) {
        return {
            background: "bg-rose-500/[0.02]",
            value: "text-foreground",
        };
    }

    if (unavailable) {
        return {
            background: "bg-muted/40",
            value: "text-muted-foreground",
        };
    }

    if (unset) {
        return {
            background: "bg-amber-500/[0.02]",
            value: "text-amber-800 dark:text-amber-200",
        };
    }

    return {
        background: "bg-background/92",
        value: "text-foreground",
    };
}
