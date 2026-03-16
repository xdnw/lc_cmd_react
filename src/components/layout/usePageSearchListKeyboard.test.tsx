import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import usePageSearchListKeyboard, { type PageSearchListKeyboardAction } from "./usePageSearchListKeyboard";

function KeyboardHarness({
    actions = [],
    initialSearch = "",
}: {
    actions?: readonly PageSearchListKeyboardAction<string>[];
    initialSearch?: string;
}) {
    const items = ["alpha", "beta", "gamma"] as const;
    const scopeRef = React.useRef<HTMLDivElement | null>(null);
    const searchRef = React.useRef<HTMLInputElement | null>(null);
    const [searchValue, setSearchValue] = React.useState(initialSearch);
    const [activeIndex, setActiveIndex] = React.useState(0);
    const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(event.target.value);
    }, []);
    const keyboard = usePageSearchListKeyboard({
        scopeRef,
        searchRef,
        searchValue,
        onSearchValueChange: setSearchValue,
        items,
        activeIndex,
        onActiveIndexChange: setActiveIndex,
        getItemId: (item) => `option-${item}`,
        listboxLabel: "Demo results",
        resetActiveIndexKey: searchValue,
        actions,
    });

    return (
        <div ref={scopeRef}>
            <input
                ref={searchRef}
                aria-label="Demo search"
                value={searchValue}
                onChange={handleSearchChange}
                onKeyDown={keyboard.onSearchKeyDown}
                {...keyboard.searchInputProps}
            />
            <button type="button">Other action</button>
            <div {...keyboard.listProps}>
                {items.map((item, index) => (
                    <div key={item} {...keyboard.getItemProps(item, index)}>
                        {item}
                    </div>
                ))}
            </div>
        </div>
    );
}

describe("usePageSearchListKeyboard", () => {
    it("focuses and selects the page search on Ctrl+K", () => {
        render(<KeyboardHarness initialSearch="beta" />);

        const search = screen.getByRole("combobox", { name: "Demo search" }) as HTMLInputElement;
        expect(document.activeElement).not.toBe(search);

        fireEvent.keyDown(window, { key: "k", ctrlKey: true });

        expect(document.activeElement).toBe(search);
        expect(search.selectionStart).toBe(0);
        expect(search.selectionEnd).toBe(search.value.length);
    });

    it("keeps focus on search while arrows update aria-activedescendant and Enter runs the primary action", () => {
        const onActivate = vi.fn();

        render(
            <KeyboardHarness
                actions={[
                    {
                        trigger: "enter",
                        run: onActivate,
                    },
                ]}
            />,
        );

        const search = screen.getByRole("combobox", { name: "Demo search" });
        search.focus();

        fireEvent.keyDown(search, { key: "ArrowDown" });
        fireEvent.keyDown(search, { key: "ArrowDown" });

        expect(document.activeElement).toBe(search);
        expect(search.getAttribute("aria-activedescendant")).toBe("option-gamma");

        fireEvent.keyDown(search, { key: "Enter" });

        expect(onActivate).toHaveBeenCalledTimes(1);
        expect(onActivate).toHaveBeenCalledWith("gamma", 2);
    });

    it("only runs the delete action when the search is empty", () => {
        const onDelete = vi.fn();

        render(
            <KeyboardHarness
                initialSearch="alpha"
                actions={[
                    {
                        trigger: "delete-empty-search",
                        run: onDelete,
                    },
                ]}
            />,
        );

        const search = screen.getByRole("combobox", { name: "Demo search" });
        search.focus();

        fireEvent.keyDown(search, { key: "Delete" });
        expect(onDelete).not.toHaveBeenCalled();

        fireEvent.change(search, { target: { value: "" } });

        const emptySearch = screen.getByRole("combobox", { name: "Demo search" });
        emptySearch.focus();
        fireEvent.keyDown(emptySearch, { key: "Delete" });

        expect(onDelete).toHaveBeenCalledTimes(1);
        expect(onDelete).toHaveBeenCalledWith("alpha", 0);
    });

    it("redirects printable typing from the page scope into the search field", () => {
        render(<KeyboardHarness />);

        const search = screen.getByRole("combobox", { name: "Demo search" }) as HTMLInputElement;
        const otherButton = screen.getByRole("button", { name: "Other action" });

        otherButton.blur();
        fireEvent.keyDown(window, { key: "n" });

        expect(document.activeElement).toBe(search);
        expect(search.value).toBe("n");
    });

    it("does not reattach the window keydown listener when the search value changes", () => {
        const addEventListenerSpy = vi.spyOn(window, "addEventListener");
        const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

        render(<KeyboardHarness />);

        const search = screen.getByRole("combobox", { name: "Demo search" });
        const initialKeydownAdds = addEventListenerSpy.mock.calls.filter(([type]) => type === "keydown").length;
        const initialKeydownRemoves = removeEventListenerSpy.mock.calls.filter(([type]) => type === "keydown").length;

        fireEvent.change(search, { target: { value: "a" } });
        fireEvent.change(search, { target: { value: "ab" } });

        expect(addEventListenerSpy.mock.calls.filter(([type]) => type === "keydown")).toHaveLength(initialKeydownAdds);
        expect(removeEventListenerSpy.mock.calls.filter(([type]) => type === "keydown")).toHaveLength(initialKeydownRemoves);

        addEventListenerSpy.mockRestore();
        removeEventListenerSpy.mockRestore();
    });
});
