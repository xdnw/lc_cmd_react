import { useCallback } from "react";
import { Label } from "../ui/label";
import TimeInput from "./TimeInput";
import StringInput from "./StringInput";
import TextInput from "./TextInput";
import { ListComponentOptions } from "./ListComponent";
import { useSyncedStateFunc } from "@/utils/StateUtil";
import { cn } from "@/lib/utils";
import { CM, getTypeBreakdown } from "@/utils/Command";

type Value = { timeDelay: string; subject: string; message: string; trigger: string };

const DEFAULT_TRIGGER = "CREATION";
const SEP = "|";

const messageTriggerOptions = getTypeBreakdown(CM, "MessageTrigger").getOptionData().options ?? [DEFAULT_TRIGGER];

function parse(raw: string): Value {
    const parts = raw ? raw.split(SEP) : [];
    return {
        timeDelay: parts[0] ?? "",
        subject: parts[1] ?? "",
        message: parts[2] ?? "",
        trigger: parts[3] || DEFAULT_TRIGGER,
    };
}

function serialize(v: Value): string {
    return [v.timeDelay, v.subject, v.message, v.trigger].join(SEP);
}

function isComplete(v: Value): boolean {
    return Boolean(v.timeDelay && v.subject && v.message);
}

export default function CustomConditionMessageInput({ argName, initialValue, setOutputValue, compact }: {
    argName: string;
    initialValue: string;
    compact?: boolean;
    setOutputValue: (name: string, value: string) => void;
}) {
    const [value, setValue] = useSyncedStateFunc<Value>(initialValue, parse);

    const handleTimeDelay = useCallback((_name: string, nextValue: string) => {
        const next = { ...value, timeDelay: nextValue };
        setValue(next);
        setOutputValue(argName, isComplete(next) ? serialize(next) : "");
    }, [argName, setOutputValue, setValue, value]);

    const handleSubject = useCallback((_name: string, nextValue: string) => {
        const next = { ...value, subject: nextValue.slice(0, 50) };
        setValue(next);
        setOutputValue(argName, isComplete(next) ? serialize(next) : "");
    }, [argName, setOutputValue, setValue, value]);

    const handleMessage = useCallback((_name: string, nextValue: string) => {
        const next = { ...value, message: nextValue };
        setValue(next);
        setOutputValue(argName, isComplete(next) ? serialize(next) : "");
    }, [argName, setOutputValue, setValue, value]);

    const handleTrigger = useCallback((_name: string, nextValue: string) => {
        const next = { ...value, trigger: nextValue || DEFAULT_TRIGGER };
        setValue(next);
        setOutputValue(argName, isComplete(next) ? serialize(next) : "");
    }, [argName, setOutputValue, setValue, value]);

    return (
        <div className={cn("space-y-2", compact ? "text-xs" : "")}>
            <div className="space-y-1">
                <Label className={compact ? "text-xs" : ""}>timeDelay</Label>
                <TimeInput argName={argName} initialValue={value.timeDelay} setOutputValue={handleTimeDelay} compact={compact} />
            </div>
            <div className="space-y-1">
                <Label className={compact ? "text-xs" : ""}>subject</Label>
                <StringInput argName={argName} initialValue={value.subject} setOutputValue={handleSubject} compact={compact} placeholder="Subject" maxLength={50} />
            </div>
            <div className="space-y-1">
                <Label className={compact ? "text-xs" : ""}>message</Label>
                <TextInput argName={argName} initialValue={value.message} setOutputValue={handleMessage} compact={compact} />
            </div>
            <div className="space-y-1">
                <Label className={compact ? "text-xs" : ""}>trigger</Label>
                <ListComponentOptions options={messageTriggerOptions} argName={argName} isMulti={false} initialValue={value.trigger} setOutputValue={handleTrigger} />
            </div>
        </div>
    );
}