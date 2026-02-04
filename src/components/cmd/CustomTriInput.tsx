import React, { useCallback } from "react";
import TriStateInput from "@/components/cmd/TriStateInput";
import type { BaseCommand } from "@/utils/Command";

export function CustomTriInput({
    annotation,
    set,
}: {
    annotation: string;
    set: React.Dispatch<React.SetStateAction<Record<string, (cmd: BaseCommand) => boolean>>>;
}) {
    const handleChange = useCallback(
        (_name: string, value: string) => {
            set((prev) => {
                const next = { ...prev };

                if (value === "1" || value === "-1") {
                    const valueBool = value === "1";

                    next[annotation] = (cmd: BaseCommand) => {
                        // typed boolean property first
                        if (annotation === "viewable") {
                            return (cmd.command.viewable === true) === valueBool;
                        }

                        const ann = cmd.command.annotations?.[annotation];
                        if (typeof ann === "boolean") return ann === valueBool;
                        return (!!ann) === valueBool;
                    };
                } else {
                    delete next[annotation];
                }

                return next;
            });
        },
        [annotation, set]
    );

    return (
        <TriStateInput
            argName={annotation}
            initialValue="0"
            setOutputValue={handleChange}
        />
    );
}
