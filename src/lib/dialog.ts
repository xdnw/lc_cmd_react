import type { ReactNode } from "react";

export type ShowDialogOptions = {
    /** Render dialog body in quote/copy-friendly textarea mode. */
    quote?: boolean;
    /** Open the incoming dialog as a new tab instead of replacing active tab. */
    openInNewTab?: boolean;
    /** When opening a new tab, make it active immediately. Defaults to true. */
    focusNewTab?: boolean;
    /** Replace currently active tab content. Defaults to inverse of openInNewTab. */
    replaceActive?: boolean;
};

export type ShowDialogArg = boolean | ShowDialogOptions;

export type ShowDialogFn = (title: string, message: ReactNode, options?: ShowDialogArg) => void;

export function normalizeShowDialogOptions(arg: ShowDialogArg | undefined): ShowDialogOptions {
    if (typeof arg === "boolean") {
        return { quote: arg };
    }
    return arg ?? {};
}
