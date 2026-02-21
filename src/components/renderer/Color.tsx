import { useEffect, useMemo, useState } from "react";

export default function Color({ colorId, beigeTurns }: { colorId: number | string, beigeTurns?: number }) {
    const isNumericColor = useMemo(() => Number.isInteger(colorId), [colorId]);
    const [resolvedColor, setResolvedColor] = useState<string>(() => (isNumericColor ? "" : String(colorId)));

    useEffect(() => {
        let active = true;

        if (!isNumericColor) {
            setResolvedColor(String(colorId));
            return () => {
                active = false;
            };
        }

        import("../../lib/commands")
            .then(({ COMMANDS }) => {
                if (!active) return;
                const color = COMMANDS.options.NationColor.options[colorId as number] ?? String(colorId);
                setResolvedColor(color);
            })
            .catch(() => {
                if (!active) return;
                setResolvedColor(String(colorId));
            });

        return () => {
            active = false;
        };
    }, [colorId, isNumericColor]);

    const displayColor = resolvedColor.replace("BEIGE", "TAN");

    return (
        <div
            className="w-5 h-5 border border-2 border-black flex items-center justify-center"
            style={{ backgroundColor: displayColor || "transparent" }}
            title={resolvedColor || String(colorId)}
        >
            {beigeTurns !== undefined && beigeTurns > 0 && (
                <span className="text-xs text-black">{beigeTurns}</span>
            )}
        </div>
    );
}