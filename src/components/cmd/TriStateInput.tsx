import { useSyncedState } from "@/utils/StateUtil";
import { Button } from "../ui/button.tsx";
import { useCallback } from "react";

export default function TriStateInput(
    { argName, initialValue, setOutputValue, compact }:
        {
            argName: string,
            initialValue: string,
            compact?: boolean,
            setOutputValue: (name: string, value: string) => void
        }
) {
    const [value, setValue] = useSyncedState(initialValue || '0');

    const handleButtonClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        const newValue = event.currentTarget.getAttribute('data-key');
        if (newValue) {
            setValue(newValue);
            setOutputValue(argName, newValue);
        }
    }, [setValue, setOutputValue, argName]);

    return (
        <div className="flex items-center gap-1">
            <Button size={compact ? 'sm' : 'md'}
                className={`m-0 ${value === '-1' ? 'bg-red-500 text-secondary' : 'bg-gray-500'}`}
                data-key="-1"
                onClick={handleButtonClick}
            >X</Button>
            <Button size={compact ? 'sm' : 'md'}
                className={`m-0 ${value === '0' ? 'bg-blue-500 text-secondary' : 'bg-gray-500'}`}
                data-key="0"
                onClick={handleButtonClick}
            >/</Button>
            <Button size={compact ? 'sm' : 'md'}
                className={`m-0 ${value === '1' ? 'bg-green-500 text-secondary' : 'bg-gray-500'}`}
                data-key="1"
                onClick={handleButtonClick}
            >✔</Button>
        </div>
    );
}