import { useCallback, useRef } from "react";

export type SegmentedControlKeyBindings<TValue extends string> = {
    selectPrevious?: boolean;
    selectNext?: boolean;
    selectFirst?: boolean;
    selectLast?: boolean;
    selectValue?: TValue;
};

export function useSegmentedControlKeyboard<TValue extends string>({
    values,
    value,
    onSelect,
    resolveKey,
}: {
    values: readonly TValue[];
    value: TValue;
    onSelect: (nextValue: TValue, focus?: boolean) => void;
    resolveKey: (key: string) => SegmentedControlKeyBindings<TValue> | null;
}) {
    const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const activeIndex = Math.max(0, values.indexOf(value));

    const focusIndex = useCallback((index: number) => {
        buttonRefs.current[index]?.focus();
    }, []);

    const selectIndex = useCallback((nextIndex: number, focus = false) => {
        const normalizedIndex = ((nextIndex % values.length) + values.length) % values.length;
        const nextValue = values[normalizedIndex] ?? values[0];
        if (nextValue == null) {
            return;
        }

        onSelect(nextValue, focus);
        if (focus) {
            focusIndex(normalizedIndex);
        }
    }, [onSelect, values]);

    const registerButtonRef = useCallback((index: number, node: HTMLButtonElement | null) => {
        buttonRefs.current[index] = node;
    }, []);

    const handleOptionKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
        const binding = resolveKey(event.key);
        if (!binding) {
            return;
        }

        event.preventDefault();
        if (binding.selectValue != null) {
            onSelect(binding.selectValue, true);
            const nextIndex = values.indexOf(binding.selectValue);
            if (nextIndex >= 0) {
                focusIndex(nextIndex);
            }
            return;
        }

        if (binding.selectFirst) {
            focusIndex(0);
            selectIndex(0, true);
            return;
        }

        if (binding.selectLast) {
            const lastIndex = values.length - 1;
            focusIndex(lastIndex);
            selectIndex(lastIndex, true);
            return;
        }

        if (binding.selectPrevious) {
            selectIndex(activeIndex - 1, true);
            return;
        }

        if (binding.selectNext) {
            selectIndex(activeIndex + 1, true);
        }
    }, [activeIndex, focusIndex, onSelect, resolveKey, selectIndex, values.length]);

    return {
        activeIndex,
        registerButtonRef,
        handleOptionKeyDown,
    };
}