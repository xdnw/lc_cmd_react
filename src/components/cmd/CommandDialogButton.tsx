import { useCallback } from "react";

import CommandDialogForm from "@/components/cmd/CommandDialogForm";
import { useDialog, type ShowDialogArg } from "@/components/layout/DialogContext";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { AnyCommandPath } from "@/utils/Command";

type CommandDialogButtonProps<P extends AnyCommandPath> = Omit<ButtonProps, "children"> & {
  title: string;
  commandPath: P;
  initialValues?: Record<string, string>;
  description?: string;
  runLabel?: string;
  actionsLayout?: "flow" | "sticky";
  dialogOptions?: ShowDialogArg;
  children: ButtonProps["children"];
};

const DEFAULT_DIALOG_OPTIONS: ShowDialogArg = {
  openInNewTab: true,
  focusNewTab: true,
  replaceActive: false,
};

export default function CommandDialogButton<P extends AnyCommandPath>({
  title,
  commandPath,
  initialValues,
  description,
  runLabel,
  actionsLayout = "sticky",
  dialogOptions = DEFAULT_DIALOG_OPTIONS,
  children,
  type = "button",
  onClick,
  ...buttonProps
}: CommandDialogButtonProps<P>) {
  const { showDialog } = useDialog();

  const handleClick = useCallback<NonNullable<ButtonProps["onClick"]>>((event) => {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }

    showDialog(
      title,
      <CommandDialogForm
        commandPath={commandPath}
        initialValues={initialValues ?? {}}
        description={description}
        runLabel={runLabel}
        actionsLayout={actionsLayout}
        showResultDialog
      />,
      dialogOptions,
    );
  }, [actionsLayout, commandPath, description, dialogOptions, initialValues, onClick, runLabel, showDialog, title]);

  return (
    <Button type={type} onClick={handleClick} {...buttonProps}>
      {children}
    </Button>
  );
}
