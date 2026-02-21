import { TypeBreakdown } from "../../utils/Command";
import {ListComponentBreakdown, ListComponentOptions} from "./ListComponent";
import NumberInput from "./NumberInput";
import TimeInput from "./TimeInput";
import BooleanInput from "./BooleanInput";
import StringInput from "./StringInput";
import TextComponent from "./TextInput";
import TaxRateInput from "./TaxRateInput";
import MmrInput from "./MmrInput";
import MmrDoubleInput from "./MmrDoubleInput";
import CityRanges from "./CityRanges";
import ColorInput from "./ColorInput";
import MapInput from "./MapInput";
import TriStateInput from "./TriStateInput";
import QueryComponent from "./QueryComponent";
import {REGEX_PATTERN} from "../../lib/regex-patterns";
import {useMemo, memo} from "react";
import TypedInput from "./TypedInput";
import {COMMANDS} from "../../lib/commands";
import type { CommandInputDisplayMode } from "./field/fieldTypes";
import { isCompactMode } from "./field/fieldTypes";

interface ArgProps {
    argName: string,
    breakdown: TypeBreakdown,
    min?: number,
    max?: number,
    initialValue: string,
    displayMode?: CommandInputDisplayMode,
    setOutputValue: (key: string, value: string) => void
}

export const ArgSet = memo(function ArgSet(
    { argName, breakdown, initialValue, setOutputValue, displayMode }: ArgProps) {
    const childOptions = useMemo(() => breakdown.child![0].getOptionData(), [breakdown]);
    if (childOptions.options) {
        return <ListComponentOptions argName={argName} options={childOptions.options} isMulti={true} initialValue={initialValue} setOutputValue={setOutputValue}/>
    }
    if (childOptions.query) {
        return <QueryComponent element={breakdown.child![0].element} multi={true} argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} />
    }
    return "TODO SET " + JSON.stringify(breakdown);
});

const ArgInput = memo(function ArgInput({ argName, breakdown, min, max, initialValue, setOutputValue, displayMode }: ArgProps) {
    const compact = isCompactMode(displayMode);
    const options = useMemo(() => breakdown.getOptionData(), [breakdown]);
    if (options.options) {
        return <ListComponentOptions argName={argName} options={options.options} isMulti={options.multi} initialValue={initialValue} setOutputValue={setOutputValue}/>
    }

    const placeholder = breakdown.getPlaceholder();
    if (placeholder != null) {
        if (breakdown.element.toLowerCase() === 'typedfunction') {
            return <TypedInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} placeholder={breakdown.child![0].element as keyof typeof COMMANDS.placeholders} type={breakdown.child![1].element} compact={compact} />
        }
        return <>
            <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} placeholder={breakdown.element} />
        </>
    }
    if (breakdown.annotations && breakdown.annotations.includes("TextArea")) {
        return <TextComponent argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />
    }
    if ((breakdown.element === 'List' || breakdown.element === 'Set') && breakdown.child && breakdown.child[0].element === 'Integer') {
        return <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} filter={REGEX_PATTERN.NUMBER_LIST} filterHelp="a comma separated list of numbers" compact={compact} placeholder={breakdown.element} />
    }
    if (breakdown.element === 'Class' && breakdown.annotations && breakdown.annotations.includes("PlaceholderType")) {
        return <ListComponentBreakdown breakdown={breakdown} argName={argName} isMulti={false} initialValue={initialValue} setOutputValue={setOutputValue}/>
    }
    switch (breakdown.element.toLowerCase()) {
        case 'map': {
            return <MapInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} children={breakdown.child!} displayMode={displayMode} />
        }
        case 'set': {
            return <ArgSet argName={argName} breakdown={breakdown} initialValue={initialValue} setOutputValue={setOutputValue} displayMode={displayMode} />
        }
        case "color": {
            return <ColorInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />
        }
        case "double": {
            return <NumberInput argName={argName} min={min != null ? min : undefined} max={max != null ? max : undefined} initialValue={initialValue} setOutputValue={setOutputValue} isFloat={true} className={compact ? "h-8 text-xs" : undefined} placeholder={breakdown.element} />
        }
        case 'long':
            if (breakdown.annotations != null && (breakdown.annotations.includes("Timediff") || breakdown.annotations.includes("Timestamp"))) {
                return <TimeInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />;
            }
            return <NumberInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} isFloat={false} className={compact ? "h-8 text-xs" : undefined} placeholder={breakdown.element} />;
        case 'integer':
            return <NumberInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} isFloat={false} className={compact ? "h-8 text-xs" : undefined} placeholder={breakdown.element} />;
        case 'int':
            return <NumberInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} isFloat={false} className={compact ? "h-8 text-xs" : undefined} placeholder={breakdown.element} />;
        case "boolean": {
            if (breakdown.element === "Boolean") {
                return <TriStateInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />
            }
            return <BooleanInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} />
        }
        case "transfersheet":
        case "spreadsheet": {

            return <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} filter={REGEX_PATTERN.SPREADSHEET} filterHelp="a link to a google sheet" compact={compact} placeholder={breakdown.element} />
        }
        case "googledoc": {
            return <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} filter={REGEX_PATTERN.GOOGLE_DOC} filterHelp="a link to a google document" compact={compact} placeholder={breakdown.element} />
        }
        case "dbwar": {
            return <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} filter={REGEX_PATTERN.WAR} filterHelp="a war timeline url" compact={compact} placeholder={breakdown.element} />
        }
        case "dbcity": {
            return <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} filter={REGEX_PATTERN.CITY} filterHelp="a city url" compact={compact} placeholder={breakdown.element} />
        }
        case "message": {
            return <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} filter={REGEX_PATTERN.CHANNEL} filterHelp="a discord message url" compact={compact} placeholder={breakdown.element} />
        }
        case "cityranges": {
            return <CityRanges argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />
        }
        case "uuid": {
            return <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} filter={REGEX_PATTERN.UUID} filterHelp="a uuid in the form XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" compact={compact} placeholder={breakdown.element} />
        }
        case "mmrint": {
            return <MmrInput allowWildcard={false} argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />
        }
        case "mmrmatcher": {
            return <MmrInput allowWildcard={true} argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />
        }
        case "mmrdouble": {
            return <MmrDoubleInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />
        }
        case "string": {
            return <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} placeholder={breakdown.element} />
        }
        case "taxrate": {
            return <TaxRateInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} compact={compact} />
        }
        default: {
            if (options.query) {
                return <QueryComponent element={breakdown.element} multi={options.multi} argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} />
            }
            return <UnknownType breakdown={breakdown} argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} />
        }
    }
});

export default ArgInput;

export function UnknownType({ breakdown, argName, initialValue, setOutputValue }: { breakdown: TypeBreakdown, argName: string, initialValue: string, setOutputValue: (key: string, value: string) => void }) {
    return (
        <>
            {breakdown.element} UNKNOWN TYPE {JSON.stringify(breakdown)} `{breakdown.element.toLowerCase()}`
        <StringInput argName={argName} initialValue={initialValue} setOutputValue={setOutputValue} />
        </>
    );
}