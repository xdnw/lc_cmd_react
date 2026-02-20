import { useSyncedStateFunc } from "@/utils/StateUtil";
import { TypeBreakdown } from "@/utils/Command";
import ArgInput from "./ArgInput";
import { useCallback, useState } from "react";
import { Button } from "../ui/button.tsx";
import { useDialog } from "../layout/DialogContext";

function toMapString(value: { [key: string]: string }[]) {
    return value.map((v) => Object.keys(v)[0] + "=" + Object.values(v)[0]).join('\n');
}

export default function MapInput(
    { argName, children, initialValue, setOutputValue }:
        {
            argName: string,
            children: TypeBreakdown[],
            initialValue: string,
            setOutputValue: (name: string, value: string) => void
        }
) {
    const { showDialog } = useDialog();
    const [value, setValue] = useSyncedStateFunc<{ [key: string]: string }[]>(initialValue, (initial) => {
        // split by newline, have empty string be empty map
        const result: { [key: string]: string }[] = [];
        if (initial) {
            const split = initial.split('\n');
            for (const s of split) {
                const equalsIdx = s.indexOf('=');
                if (equalsIdx > 0) {
                    const key = s.slice(0, equalsIdx);
                    const mappedValue = s.slice(equalsIdx + 1);
                    result.push({ [key]: mappedValue });
                }
            }
        }
        return result;
    });

    const [addKey, setAddKey] = useState("");
    const [addValue, setAddValue] = useState("");

    const removeMapValue = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const keyToRemove = e.currentTarget.dataset.key; // Extract the key from the button's data attribute
        if (!keyToRemove) return;

        const newValue = value.filter((v) => Object.keys(v)[0] !== keyToRemove);
        setValue(newValue);
        setOutputValue(argName, toMapString(newValue));
    }, [argName, setOutputValue, setValue, value]);

    const addKeyFunc = useCallback((key: string, value: string) => {
        setAddKey(value);
    }, [setAddKey]);

    const addValueFunc = useCallback((key: string, value: string) => {
        setAddValue(value);
    }, [setAddValue]);

    const addPairFunc = useCallback(() => {
            const keyCopy = addKey;
            const valueCopy = addValue;
            if (keyCopy === "") {
                showDialog("Key cannot be empty", <></>);
                return;
            }
            if (valueCopy === "") {
                showDialog("Value cannot be empty", <></>);
                return;
            }
            const newValue = [...value, { [keyCopy]: valueCopy }];
            setValue(newValue);
            setOutputValue(argName, toMapString(newValue));
            setAddKey("");
            setAddValue("");
    }, [argName, setOutputValue, setValue, addKey, addValue, showDialog, value]);

    return (
        <>
            <div className="relative mb-1 border-b-2 border-gray-500">
                <p>Map:</p>
                {value.map((v) => {
                    const key = Object.keys(v)[0];
                    const val = v[key];
                    return (
                        <div key={key} className="bg-input border-foreground p-0.5 ps-1 mt-1 text-sm flex justify-between items-center">
                            <span className="mr-4">{key}: {val}</span>
                            <button
                                data-key={key}
                                onClick={removeMapValue}
                                className="bg-red-500 p-1 rounded shadow-md text-xs">
                                X
                            </button>
                        </div>
                    );
                })}
            </div>
            <div className="flex space-x-2">
                <div className="w-1/2">
                    <p>Key: </p>
                    <ArgInput argName="key" breakdown={children[0]} min={undefined} max={undefined} initialValue={addKey} setOutputValue={addKeyFunc} />
                </div>
                <div className="w-1/2">
                    <p>Value: </p>
                    <ArgInput argName="value" breakdown={children[1]} min={undefined} max={undefined}
                        initialValue={addValue} setOutputValue={addValueFunc} />
                </div>
                <div className="flex flex-col justify-end grow">
                    <Button size="sm" onClick={addPairFunc}>Add</Button>
                </div>
            </div>
        </>
    );
}