import { useCallback, useEffect, useState } from "react";

import { useSyncedState } from "@/utils/StateUtil";

import type { ValidationState } from "./argValidation";

export const DEFAULT_FIELD_VALIDATION: ValidationState = Object.freeze({
  isValid: true,
  error: "",
  note: "",
});

export type CommandFieldState = {
  displayValue: string;
  committedValue: string;
  validation: ValidationState;
};

export type CommandFieldStateUpdater = CommandFieldState | ((prev: CommandFieldState) => CommandFieldState);

export function createCommandFieldState(
  value = "",
  validation: ValidationState = DEFAULT_FIELD_VALIDATION,
): CommandFieldState {
  return {
    displayValue: value,
    committedValue: value,
    validation,
  };
}

export function applyCommandFieldStateUpdater(
  previousState: CommandFieldState,
  updater: CommandFieldStateUpdater,
): CommandFieldState {
  return typeof updater === "function"
    ? updater(previousState)
    : updater;
}

export function commandFieldStatesEqual(left: CommandFieldState, right: CommandFieldState): boolean {
  return left.displayValue === right.displayValue
    && left.committedValue === right.committedValue
    && left.validation.isValid === right.validation.isValid
    && left.validation.error === right.validation.error
    && left.validation.note === right.validation.note;
}

export function useCommandFieldBinding(
  initialValue: string,
  externalState?: CommandFieldState,
  setExternalState?: (updater: CommandFieldStateUpdater) => void,
) {
  const [localValue, setLocalValue] = useSyncedState(initialValue || "");
  const [localValidation, setLocalValidation] = useState<ValidationState>(DEFAULT_FIELD_VALIDATION);

  useEffect(() => {
    if (!externalState) {
      setLocalValidation(DEFAULT_FIELD_VALIDATION);
    }
  }, [externalState, initialValue]);

  const setDisplayValue = useCallback((nextValue: string) => {
    if (setExternalState) {
      setExternalState((previousState) => (
        previousState.displayValue === nextValue
          ? previousState
          : { ...previousState, displayValue: nextValue }
      ));
      return;
    }

    setLocalValue(nextValue);
  }, [setExternalState, setLocalValue]);

  const setValidation = useCallback((nextValidation: ValidationState) => {
    if (setExternalState) {
      setExternalState((previousState) => {
        if (
          previousState.validation.isValid === nextValidation.isValid
          && previousState.validation.error === nextValidation.error
          && previousState.validation.note === nextValidation.note
        ) {
          return previousState;
        }

        return { ...previousState, validation: nextValidation };
      });
      return;
    }

    setLocalValidation(nextValidation);
  }, [setExternalState]);

  const resetValidation = useCallback(() => {
    setValidation(DEFAULT_FIELD_VALIDATION);
  }, [setValidation]);

  return {
    value: externalState?.displayValue ?? localValue,
    validation: externalState?.validation ?? localValidation,
    setDisplayValue,
    setValidation,
    resetValidation,
  };
}
