import { describe, expect, it } from "vitest";

import { DIALOG_LOCAL_ESCAPE_ATTR, getDialogEscapeDeferralAction } from "./dialog";

describe("dialog escape deferral", () => {
  it("defers to more local owners before allowing the dialog to close", () => {
    const popupOwner = document.createElement("div");
    popupOwner.setAttribute("data-command-popup-open", "true");
    const popupInput = document.createElement("input");
    popupOwner.appendChild(popupInput);

    const shellOwner = document.createElement("div");
    shellOwner.setAttribute(DIALOG_LOCAL_ESCAPE_ATTR, "true");
    const shellInput = document.createElement("input");
    shellOwner.appendChild(shellInput);

    const plainInput = document.createElement("input");
    plainInput.type = "text";

    expect(getDialogEscapeDeferralAction(popupInput)).toBe("local-owner");
    expect(getDialogEscapeDeferralAction(shellInput)).toBe("local-owner");
    expect(getDialogEscapeDeferralAction(plainInput)).toBe("focus-fallback");
    expect(getDialogEscapeDeferralAction(document.createElement("button"))).toBeNull();
  });
});