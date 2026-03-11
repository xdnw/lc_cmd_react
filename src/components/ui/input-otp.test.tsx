import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("input-otp", () => {
  const React = require("react") as typeof import("react");

  const OTPInputContext = React.createContext({
    slots: [
      { char: "1", hasFakeCaret: false, isActive: false },
      { char: null, hasFakeCaret: true, isActive: true },
    ],
    isFocused: true,
    isHovering: false,
  });

  return {
    OTPInputContext,
    OTPInput: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { containerClassName?: string }>((props, ref) => {
      const { containerClassName, children, ...inputProps } = props;
      return (
        <div data-testid="otp-container" className={containerClassName}>
          <input ref={ref} data-testid="otp-input" {...inputProps} />
          <OTPInputContext.Provider value={{
            slots: [
              { char: "1", hasFakeCaret: false, isActive: false },
              { char: null, hasFakeCaret: true, isActive: true },
            ],
            isFocused: true,
            isHovering: false,
          }}>
            {children}
          </OTPInputContext.Provider>
        </div>
      );
    }),
  };
});

import { InputOTP, InputOTPGroup, InputOTPSlot, INPUT_OTP_SLOT_ACTIVE_ATTR, INPUT_OTP_SLOT_ATTR } from "./input-otp";

describe("InputOTP wrapper", () => {
  it("forwards standard input props to the underlying OTP input and marks slot state explicitly", () => {
    const { container } = render(
      <InputOTP aria-label="mmr" inputMode="numeric" value="1" onChange={() => undefined} maxLength={2}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
      </InputOTP>,
    );

    const input = screen.getByRole("textbox", { name: "mmr" });
    expect(input.getAttribute("inputmode")).toBe("numeric");

    const slots = Array.from(container.querySelectorAll<HTMLElement>(`[${INPUT_OTP_SLOT_ATTR}="true"]`));
    expect(slots).toHaveLength(2);
    expect(slots[0]?.getAttribute(INPUT_OTP_SLOT_ACTIVE_ATTR)).toBe("false");
    expect(slots[1]?.getAttribute(INPUT_OTP_SLOT_ACTIVE_ATTR)).toBe("true");
  });
});