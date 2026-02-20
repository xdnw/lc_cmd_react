import { useCallback, useState } from "react";
import { Input } from "../ui/input";
import { calculate } from "@/utils/MathUtil";
import { useSyncedState } from "@/utils/StateUtil";

export default function NumberInput(
    {argName, min, max, initialValue, setOutputValue, isFloat, className}:
    {
        argName: string,
        min?: number,
        max?: number,
        initialValue: string,
        setOutputValue: (name: string, value: string) => void,
        isFloat: boolean,
        className?: string
    }
) {
    const [value, setValue] = useSyncedState(initialValue || '');
    const [isValid, setIsValid] = useState(true);
    const [validText, setValidText] = useState('');
    const [noteText, setNoteText] = useState('');

    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const myStr = e.target.value;
        if (myStr) {
            const containsAnyExpr = /[\\(\\)+\-*/%^]/.test(myStr);
            try {
                let myNum: number;
                if (isFloat) {
                    myNum = containsAnyExpr ? calculate(myStr) : parseFloat(myStr);
                } else {
                    myNum = containsAnyExpr ? Math.floor(calculate(myStr)) : parseInt(myStr);
                }
                if (Number.isNaN(myNum)) {
                    throw new Error("Invalid number");
                }
                if (!Number.isFinite(myNum)) {
                    throw new Error("Number is not finite");
                }
                if (min != null && myNum < min) {
                    throw new Error("Minimum value is " + min + " but got " + myNum);
                }
                if (max != null && myNum > max) {
                    throw new Error("Maximum value is " + max + " but got " + myNum);
                }
                setIsValid(true);
                setOutputValue(argName, myNum + "");
                setValidText("");
                setNoteText(containsAnyExpr ? myNum + "" : "");
            } catch (err) {
                setIsValid(false);
                const message = typeof err === "object" && err !== null && "message" in err ? err.message + "" : "Invalid number";
                setValidText(message);
                setNoteText("");
            }
        } else {
            setIsValid(true);
            setOutputValue(argName, "");
            setValidText("");
            setNoteText("");
        }
        setValue(myStr);
    }, [argName, setOutputValue, setValue, min, max, isFloat]);
    return (
        <>
            <Input type="text"
                   value={value}
                   onChange={onChange} placeholder="Type here..."
                     className={`${!isValid ? 'border-2 border-red-500 dark:border-red-800' : ''} ${className} relative px-1 w-full`}
            />
            <span className={`${noteText ? noteText + " px-1" : ""}`}>{noteText}</span>
            {validText && <p className="text-xs font-bold text-red-900 bg-red-500 dark:text-red-300 dark:bg-red-800 rounded-t-sm absolute bottom-full right-0 p-1 ">{validText}</p>}
        </>
    )
}