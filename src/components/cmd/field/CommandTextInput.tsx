import * as React from "react";

import { Input, type InputProps } from "@/components/ui/input";
import { COMMAND_SINGLE_LINE_ENTRY_ATTR } from "../commandKeyboard";

export type CommandTextInputProps = InputProps & {
    commandSingleLine?: boolean;
};

const CommandTextInput = React.forwardRef<HTMLInputElement, CommandTextInputProps>(
    ({ commandSingleLine = true, ...props }, ref) => {
        const commandBehaviorProps = {
            [COMMAND_SINGLE_LINE_ENTRY_ATTR]: commandSingleLine ? "true" : "false",
        } as const;

        return <Input ref={ref} {...commandBehaviorProps} {...props} />;
    },
);

CommandTextInput.displayName = "CommandTextInput";

export default CommandTextInput;