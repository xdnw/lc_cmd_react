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
